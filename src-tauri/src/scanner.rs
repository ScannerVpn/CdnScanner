// Native scanner: TCP + HTTP/HTTPS probe to a direct IP with custom SNI Host header.
//
// Why we need this on Android (and as a desktop Tauri fallback):
//   - The Tauri webview is just Chromium-based WebView, which enforces TLS
//     hostname validation. `fetch('https://1.2.3.4/')` fails with NET::ERR_CERT_COMMON_NAME_INVALID
//     because the IP doesn't match the certificate's SAN.
//   - Rust has full control of the TCP/TLS stack and can override SNI,
//     so we can meaningfully test HTTPS reachability of any IP directly.
//
// JS calls `invoke('check_ip', { ip, port, config })` once per IP, in parallel,
// using the same worker-pool pattern that client-scanner.ts uses in the browser.

use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use tauri::command;
use tokio::net::TcpStream;

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
    ip: String,
    port: u16,
    config: NativeScanConfig,
) -> Result<NativeScanResult, String> {
    let timeout = Duration::from_millis(config.timeout_ms.max(100).min(60_000));
    let addr_str = format!("{}:{}", ip, port);
    let start = Instant::now();

    // 1) Raw TCP probe — fast, exact round-trip time, definitive liveness signal.
    let tcp_ok = match tokio::time::timeout(timeout, TcpStream::connect(&addr_str)).await {
        Ok(Ok(_stream)) => true, // immediately drop the stream; we only need SYN-ACK
        Ok(Err(e)) => {
            return Ok(NativeScanResult {
                ok: false,
                latency_ms: start.elapsed().as_millis() as u64,
                tls_ok: None,
                http_ok: None,
                tcp_ok: false,
                error: Some(format!("tcp: {}", e)),
            })
        }
        Err(_) => {
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

        match client.head(&url).send().await {
            Ok(resp) => {
                let status = resp.status();
                // 2xx, 3xx, 4xx (server replies — alive). We only care about liveness.
                let alive = status.is_success() || status.is_redirection() || status.is_client_error();
                if config.check_tls {
                    // Reaching any TLS response means the cert was negotiated (even mismatched,
                    // because we set danger_accept_invalid_certs = true).
                    tls_ok = Some(port == 443);
                }
                if config.check_http {
                    http_ok = Some(alive);
                }
            }
            Err(e) => {
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
