// Native scanner: TCP + HTTP/HTTPS probe to a direct IP with custom SNI Host header.
//
// Why we need this on Android (and as a desktop Tauri fallback):
//   - The Tauri webview is just Chromium-based WebView, which enforces TLS
//     hostname validation. `fetch('https://1.2.3.4/')` fails with NET::ERR_CERT_COMMON_NAME_INVALID
//     because the IP doesn't match the certificate's SAN.
//   - Rust has full control of the TCP/TLS stack and can override SNI,
//     so we can meaningfully test HTTPS reachability of any IP directly.
//
// JS calls `invoke('check_ip', { sessionId, ip, port, config })` once per IP, in parallel,
// using the same worker-pool pattern that client-scanner.ts uses in the browser.
//
// Cancellation: each scan registers a session via `start_session`, gets an `Arc<AtomicBool>`
// stored in SESSIONS, and `cancel_session` flips it. `check_ip` races the actual probe against
// a polling future on the flag using `tokio::select!`, so cancelling aborts in-flight TCP+HTTP
// within ~50ms instead of waiting for the full timeout (3s default × hundreds of IPs).

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};
use tauri::command;
use tokio::net::TcpStream;

// ---------------------------------------------------------------------------
// Session cancellation registry
// ---------------------------------------------------------------------------

type SessionRegistry = Mutex<HashMap<String, Arc<AtomicBool>>>;

static SESSIONS: OnceLock<SessionRegistry> = OnceLock::new();

fn sessions() -> &'static SessionRegistry {
    SESSIONS.get_or_init(|| Mutex::new(HashMap::new()))
}

/// Resolves when the flag becomes true. Polled every 50ms — used to race probes against cancel.
async fn wait_for_cancel(flag: Arc<AtomicBool>) {
    while !flag.load(Ordering::SeqCst) {
        tokio::time::sleep(Duration::from_millis(50)).await;
    }
}

#[command]
pub async fn start_session(session_id: String) -> Result<(), String> {
    sessions()
        .lock()
        .unwrap()
        .insert(session_id, Arc::new(AtomicBool::new(false)));
    Ok(())
}

#[command]
pub async fn cancel_session(session_id: String) -> Result<(), String> {
    if let Some(flag) = sessions().lock().unwrap().get(&session_id) {
        flag.store(true, Ordering::SeqCst);
    }
    Ok(())
}

#[command]
pub async fn end_session(session_id: String) -> Result<(), String> {
    sessions().lock().unwrap().remove(&session_id);
    Ok(())
}

// ---------------------------------------------------------------------------
// Probe config + result types
// ---------------------------------------------------------------------------

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NativeScanConfig {
    pub timeout_ms: u64,
    pub sni_host: String,
    #[serde(default)]
    pub check_tls: bool,
    #[serde(default = "default_true")]
    pub check_http: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NativeScanResult {
    pub ok: bool,
    pub latency_ms: u64,
    pub tls_ok: Option<bool>,
    pub http_ok: Option<bool>,
    pub tcp_ok: bool,
    pub error: Option<String>,
}

#[command]
pub async fn check_ip(
    session_id: String,
    ip: String,
    port: u16,
    config: NativeScanConfig,
) -> Result<NativeScanResult, String> {
    // Grab the cancel flag (clone the Arc so we don't hold the registry lock across awaits).
    let cancel_flag = sessions().lock().unwrap().get(&session_id).cloned();

    // Helper: is this session already cancelled?
    let is_cancelled = || {
        cancel_flag
            .as_ref()
            .map(|f| f.load(Ordering::SeqCst))
            .unwrap_or(false)
    };

    if is_cancelled() {
        return Err("cancelled".into());
    }

    let timeout = Duration::from_millis(config.timeout_ms.max(100).min(60_000));
    let addr_str = format!("{}:{}", ip, port);
    let start = Instant::now();

    // 1) Raw TCP probe — race with cancellation via tokio::select!.
    type TcpOutcome = Result<Result<std::io::Result<TcpStream>, tokio::time::error::Elapsed>, ()>;
    let tcp_outcome: TcpOutcome = if let Some(flag) = cancel_flag.clone() {
        tokio::select! {
            r = tokio::time::timeout(timeout, TcpStream::connect(&addr_str)) => Ok(r),
            _ = wait_for_cancel(flag) => Err(()),
        }
    } else {
        Ok(tokio::time::timeout(timeout, TcpStream::connect(&addr_str)).await)
    };

    if is_cancelled() {
        return Err("cancelled".into());
    }

    let tcp_ok = match tcp_outcome {
        Err(()) => return Err("cancelled".into()),
        Ok(Ok(Ok(_stream))) => true, // stream dropped here — we only needed SYN-ACK
        Ok(Ok(Err(e))) => {
            return Ok(NativeScanResult {
                ok: false,
                latency_ms: start.elapsed().as_millis() as u64,
                tls_ok: None,
                http_ok: None,
                tcp_ok: false,
                error: Some(format!("tcp: {}", e)),
            })
        }
        Ok(Err(_)) => {
            return Ok(NativeScanResult {
                ok: false,
                latency_ms: 0,
                tls_ok: None,
                http_ok: None,
                tcp_ok: false,
                error: Some("tcp timeout".into()),
            })
        }
    };

    let tcp_latency_ms = start.elapsed().as_millis() as u64;
    let mut tls_ok: Option<bool> = None;
    let mut http_ok: Option<bool> = None;

    // 2) Optional HTTP/TLS probe with custom SNI override.
    //    We force reqwest to resolve `sni_host` to our target IP via .resolve(),
    //    so the SNI extension in TLS ClientHello equals `sni_host`, while the
    //    actual TCP destination is the scanned IP. This is identical to running
    //    `openssl s_client -connect <ip>:<port> -servername <sni_host>`.
    if config.check_http || config.check_tls {
        if is_cancelled() {
            return Err("cancelled".into());
        }

        let sni = if config.sni_host.is_empty() {
            "speedtest.net".to_string()
        } else {
            config.sni_host.clone()
        };
        let addr = match addr_str.parse() {
            Ok(a) => a,
            Err(e) => {
                return Ok(NativeScanResult {
                    ok: tcp_ok,
                    latency_ms: tcp_latency_ms,
                    tls_ok: None,
                    http_ok: None,
                    tcp_ok,
                    error: Some(format!("addr parse: {}", e)),
                })
            }
        };

        // reqwest.rs with rustls-tls doesn't need OpenSSL — clean cross-compile to Android.
        let client = match reqwest::Client::builder()
            .timeout(timeout)
            .connect_timeout(timeout)
            .resolve(sni.as_str(), addr)
            .danger_accept_invalid_certs(true) // we test reachability, not cert trust
            .no_proxy() // skip env proxy — these are direct IP probes
            .build()
        {
            Ok(c) => c,
            Err(e) => {
                return Ok(NativeScanResult {
                    ok: tcp_ok,
                    latency_ms: tcp_latency_ms,
                    tls_ok: Some(false),
                    http_ok: Some(false),
                    tcp_ok,
                    error: Some(format!("client build: {}", e)),
                })
            }
        };

        let scheme = if port == 443 { "https" } else { "http" };
        let url = format!("{}://{}/", scheme, sni);

        // Race the HTTP HEAD against cancellation so an in-flight reqwest request
        // is dropped (and its socket closed) the instant the user clicks Stop.
        let send_fut = client.head(&url).send();
        let send_result: Result<reqwest::Result<reqwest::Response>, ()> =
            if let Some(flag) = cancel_flag.clone() {
                tokio::select! {
                    res = send_fut => Ok(res),
                    _ = wait_for_cancel(flag) => Err(()),
                }
            } else {
                Ok(send_fut.await)
            };

        if is_cancelled() {
            return Err("cancelled".into());
        }

        match send_result {
            Err(()) => return Err("cancelled".into()),
            Ok(Ok(resp)) => {
                let status = resp.status();
                // 2xx, 3xx, 4xx (server replies — alive). We only care about liveness.
                let alive =
                    status.is_success() || status.is_redirection() || status.is_client_error();
                if config.check_tls {
                    // Reaching any TLS response means the cert was negotiated (even mismatched,
                    // because we set danger_accept_invalid_certs = true).
                    tls_ok = Some(port == 443);
                }
                if config.check_http {
                    http_ok = Some(alive);
                }
            }
            Ok(Err(e)) => {
                if config.check_tls {
                    tls_ok = Some(false);
                }
                if config.check_http {
                    http_ok = Some(false);
                }
                // Don't overwrite tcp_ok — TCP succeeded but app-layer failed.
                return Ok(NativeScanResult {
                    ok: tcp_ok,
                    latency_ms: tcp_latency_ms,
                    tls_ok,
                    http_ok,
                    tcp_ok,
                    error: Some(format!("http: {}", e)),
                });
            }
        }
    }

    Ok(NativeScanResult {
        ok: tcp_ok,
        latency_ms: tcp_latency_ms,
        tls_ok,
        http_ok,
        tcp_ok,
        error: None,
    })
}
