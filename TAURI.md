# SNI Scanner — ساخت EXE ویندوز با Tauri

این راهنما ساختن فایل EXE ویندوز رو با **Tauri 2** توضیح می‌ده. حجم نهایی حدود **۵ مگابایت** خواهد بود (نسبت به ~۱۵۰MB Electron).

## معماری

```
┌─────────────────────────────────────────────────────┐
│   Web version (npm run dev / build.bat)             │
│  ┌──────────────┐        ┌────────────────────┐      │
│  │   Browser    │  ───►  │   Next.js API      │      │
│  │  (frontend)  │  ◄───  │ (server-scanner)   │      │
│  └──────────────┘   SSE   └────────────────────┘      │
│        scanner flow: full (TCP/TLS/HTTP/ICMP)       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│   Tauri EXE version (build-tauri.bat)               │
│  ┌──────────────────────────────────────┐           │
│  │  Tauri Webview (Edge WebView2)       │           │
│  │  ┌──────────────────────────────┐    │           │
│  │  │  Static HTML/CSS/JS (out/)   │    │           │
│  │  │  client-scanner.ts           │    │           │
│  │  │  fetch + WebSocket           │    │           │
│  │  └──────────────────────────────┘    │           │
│  │   ↓ Rust window + shell              │           │
│  └──────────────────────────────────────┘           │
│        scanner flow: HTTP probe + WS test           │
│        (no ICMP / no cert issuer check)             │
└─────────────────────────────────────────────────────┘
```

برنامه به طور خودکار تشخیص می‌دهد کدام حالت در دسترس است (از طریق `hasServerScanner()`).

## 📋 پیش‌نیازها

### ۱. Node.js 18+
اگه قبلاً نصب داری، skip کن.
- دانلود: https://nodejs.org
- نسخه LTS رو نصب کن

### ۲. Rust (ضروری برای Tauri)
- دانلود: https://rustup.rs
- فایل `rustup-init.exe` رو اجرا کن
- تنظیمات پیش‌فرض رو قبول کن (فقط Enter بزن)
- بعد از نصب، **کامپیوتر رو ری‌استارت کن**

### ۳. Microsoft Visual Studio C++ Build Tools (ضروری)
- دانلود: https://visualstudio.microsoft.com/visual-cpp-build-tools/
- در installer، تیک **"Desktop development with C++"** رو بزن
- Install رو بزن (حدود ۶ گیگ)

## 🚀 ساخت EXE

### روش ۱: فایل BAT (ساده‌ترین)
```cmd
build-tauri.bat
```
روی فایل دابل‌کلیک کن. اسکریپت همه کار رو خودکار انجام می‌ده:
1. ✅ نصب وابستگی‌های npm
2. ✅ ساخت frontend به صورت static export (پوشه `out/`)
3. ✅ کامپایل Rust و ساخت installer

اولین بار ۵-۱۵ دقیقه طول می‌کشه (Rust باید همه dep ها رو compile کنه). دفعات بعد خیلی سریع‌تر.

### روش ۲: دستی
```cmd
npm install --no-audit --no-fund
npm run build:static
npm run tauri:build
```

### روش ۳: Tauri Dev (برای تست در حالت dev)
```cmd
npm run tauri:dev
```
Webview باز می‌شه و به `localhost:3000` (Next.js dev server) متصل می‌شه — کاملاً مثل مرورگر، ولی در Webview2.

## 📦 خروجی

پس از اتمام موفق:
- **`src-tauri\target\release\sni-scanner.exe`** — فایل EXE قابل اجرا (بدون نصب)
- **`src-tauri\target\release\bundle\nsis\SNI Scanner_1.0.0_x64-setup.exe`** — installer NSIS (توصیه‌شده)
- **`src-tauri\target\release\bundle\msi\SNI Scanner_1.0.0_x64_en-US.msi`** — installer MSI

## 🎯 استفاده از EXE

### اجرای مستقیم (بدون نصب)
دابل‌کلیک روی `sni-scanner.exe` — نیازی به نصب نیست!

### نصب
دابل‌کلیک روی `SNI Scanner_*_setup.exe` → next → install:
- Start Menu shortcut
- Desktop shortcut
- Uninstaller در Add/Remove Programs

## ⚠️ مشکلات رایج

### ❌ "rustc not found"
Rust نصب نیست یا PATH تنظیم نشده. حل:
```cmd
:: ری‌استارت Cmd بعد از نصب
where cargo
:: باید مسیر cargo رو نشان بده
```

### ❌ "link.exe not found"
Visual Studio C++ Build Tools نصب نیست یا Desktop development with C++ تیک نخورده.

### ❌ "out\index.html not created"
frontend build نشکست. جزئیات در پنجره cmd. معمولاً:
- error در `next build`
- error در یکی از dependency ها

### ❌ خروجی "out\" خالی است
یعنی Next.js static export کار نکرده. مطمئن شو `next.config.ts` در حالت TAURI_BUILD=true مقدار `output: "export"` را دارد.

### ❌ EXE باز می‌شه ولی scanner کار نمی‌کنه (loading forever)
- F12 رو بزن → Console رو چک کن
- معمولاً به خاطر CORS یا firewall است. webview2 پورت‌های غیر استاندارد رو بلاک می‌کنه.
- Browser DevTools را از `tauri.conf.json > app > windows` با اضافه کردن `"devtools": true` فعال کن (فقط برای debug).

## 🔍 تفاوت‌های دو حالت

| قابلیت | Web (server) | Tauri EXE (client) |
|---------|--------------|---------------------|
| TCP probe دقیق | ✅ net.Socket | ⚠️ فقط از طریق HTTP(S) |
| TLS handshake جداگانه | ✅ با cert info | ⚠️ fetch TLS داخلی |
| TLS cert issuer | ✅ Cloudflare/AWS/... | ❌ browser expose نمی‌کنه |
| ICMP ping واقعی | ✅ system ping.exe | ❌ browser دسترسی نداره |
| HTTP HEAD | ✅ | ✅ |
| WebSocket config test | ✅ با SNI/Host کامل | ⚠️ فقط به IP (تقریبی) |
| Concurrency | 200 IP همزمان | 50 IP همزمان (browser cap) |
| HARD_CAP | ۵۰,۰۰۰ IP | ۱۰,۰۰۰ IP |
| بدون Node.js روی سیستم کاربر | ❌ نیاز به Node | ✅ |

## 💡 نکات

- حجم EXE: حدود **۵ مگابایت** (بسیار سبک‌تر از Electron ~150MB)
- در Tauri WebView2 (Edge) به طور پیش‌فرض نصب هست روی Windows 10/11
- اگه WebView2 نباشه، installer خودش دانلودش می‌کنه (`webviewInstallMode: downloadBootstrapper`)
- صفر وابستگی runtime — فقط خود EXE کافیه

## 📱 ساخت Android APK

همون پروژه با همون کد Rust رو میشه برای Android کامپایل کرد. این کار رو **Tauri Mobile** انجام می‌ده.

### چرا به اسکنر Rust نیاز داریم؟

در Android، WebView همون Chromium هست که **validation TLS hostname** را اجرا می‌کنه. مثل دسکتاپ Tauri، `fetch('https://1.2.3.4/')` به دلیل mismatch گواهی TLS شکست می‌خوره.

برای حل این مشکل، یه ماژول Rust در `src-tauri/src/scanner.rs` اضافه کردیم که از طریق `tauri::command` در دسترس JS قرار می‌گیره:

```rust
#[command]
pub async fn check_ip(ip: String, port: u16, config: NativeScanConfig)
    -> Result<NativeScanResult, String> { ... }
```

این دستور:
1. **TCP probe** خام با `tokio::net::TcpStream` (SYN-ACK)، دقیق و بدون وب
2. **HTTP/HTTPS probe** با `reqwest` + `rustls-tls` — با `.resolve()` SNI رو override می‌کنه (مثل `openssl s_client -connect <ip> -servername <sni>`)
3. همه چیز بدون نیاز به OpenSSL (rustls خالص) → cross-compile به Android بدون دردسر

JS در `src/lib/scanner/native-scanner.ts` این دستور رو فراخوانی می‌کنه و در یه worker pool با concurrency تا ۲۰۰ همزمان اجرا می‌کنه.

### شناسایی خودکار

در `sse-client.ts` از طریق `window.__TAURI_INTERNALS__` تشخیص میدیم که در Tauri (دسکتاپ یا Android) هستیم. اگه آره، اول `startNativeScan()` رو امتحان می‌کنیم؛ اگه fail شد به client-scanner fallback می‌کنیم.

### پیش‌نیازهای Android

علاوه بر Node.js 20+ و Rust (که قبلاً نیاز Tauri بود):

1. **Android Studio** (آخرین نسخه) — https://developer.android.com/studio
   - نصب SDK و NDK از طریق SDK Manager
   - NDK version: 26+ (Tauri 2 نیاز دارد)
2. **JDK 17+** (Temurin یا OpenJDK) — Gradle نیاز داره
3. **Rust Android targets**:
   ```bash
   rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
   ```
4. **ANDROID_HOME** env var یا قبول کردن default (مثلاً `C:\Users\<you>\AppData\Local\Android\Sdk` در ویندوز)

برای ساختن OpenSSL-free، در `Cargo.toml` به جای OpenSSL از **rustls** استفاده کردیم:
```toml
reqwest = { version = "0.12", default-features = false, features = ["rustls-tls"] }
```

### ساخت APK

#### روش ۱: فایل BAT (ساده‌ترین)
```cmd
build-tauri-android.bat
```
روی فایل دابل‌کلیک کن. این اسکریپت خودکار:
1. ✅ پیش‌نیازها را چک می‌کنه (Node، Rust، Java، Android SDK)
2. ✅ `npm install`
3. ✅ `npx tauri android init` (اگه قبلاً init نشده — یک‌بار)
4. ✅ `npm run build:static` (ساخت frontend)
5. ✅ `npx tauri android build --apk true --target aarch64-linux-android`

اولین بار ۱۰-۲۵ دقیقه طول می‌کشه (Gradle و Rust باید همه dep‌ها رو از اول compile کنن). دفعات بعد فقط ۳-۵ دقیقه.

#### روش ۲: dev با hot-reload
```cmd
npm run tauri:android
```
روی emulator یا device با USB debugging — هر تغییر frontend فوری re-load می‌شه. Logs در `adb logcat` قابل دیدنه.

### خروجی

APK در این مسیرها:
- **release (signed)**: `src-tauri\gen\android\app\build\outputs\apk\release\app-release.apk`
- **debug (unsigned)**: `src-tauri\gen\android\app\build\outputs\apk\debug\app-debug.apk`

نصب روی device با ADB:
```bash
adb install -r src-tauri/gen/android/app/build/outputs/apk/release/app-release.apk
```

### معماری در Android

```
┌─────────────────────────────────────────────────────┐
│   Android device                                    │
│  ┌──────────────────────────────────────────────┐   │
│  │  Tauri 2 (Rust runtime + Kotlin shell)       │   │
│  │  ┌─────────────────────────────────────────┐ │   │
│  │  │  WebView (Chromium-based)               │ │   │
│  │  │  ┌────────────────────────────────────┐ │ │   │
│  │  │  │  Static HTML/CSS/JS (out/)         │ │ │   │
│  │  │  │  - scanner-shell.tsx (UI)          │ │ │   │
│  │  │  │  - native-scanner.ts               │ │ │   │
│  │  │  └────────────────────────────────────┘ │ │   │
│  │  │       │ invoke('check_ip', ...)        │ │   │
│  │  │       ▼                                │ │   │
│  │  │  ┌─────────────────────────────────┐   │ │   │
│  │  │  │ scanner.rs (tokio + reqwest)     │   │ │   │
│  │  │  │ TCP SYN-ACK + HTTPS w/ SNI       │   │ │   │
│  │  │  └─────────────────────────────────┘   │ │   │
│  │  └─────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### ⚠️ مشکلات رایج Android

#### ❌ `No Android SDK found`
ANDROID_HOME تنظیم نیست. در PowerShell:
```powershell
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")
```
سپس **Cmd رو ری‌استارت کن**.

#### ❌ `NDK not configured`
در Android Studio → Tools → SDK Manager → SDK Tools → تیک **NDK (Side by side)** + **CMake** + **Android SDK Platform-Tools**.

#### ❌ `linker not found` (Rust)
اضافه کردن target اشتباه یا نبود clang. حل:
```cmd
rustup target add aarch64-linux-android
```

#### ❌ `cleartext HTTP traffic blocked`
Android 9+ به طور پیش‌فرض HTTP (پورت 80) رو بلاک می‌کنه. در `src-tauri\gen\android\app\src\main\AndroidManifest.xml` اضافه کنید:
```xml
<application
  android:usesCleartextTraffic="true"
  ...>
```

#### ❌ اسکنر کار می‌کنه ولی IP ها رو پیدا نمی‌کنه
- device باید به اینترنت متصل باشه
- WiFi محدود/filtered مسدود می‌کنه — تست با mobile data
- Concurrency پایین بذار (`Settings → max concurrency = 50`) برای device های ضعیف‌تر

### تفاوت Web، دسکتاپ Tauri، Android Tauri

| قابلیت | Web (Node) | Desktop Tauri | Android Tauri |
|---------|-----------|---------------|----------------|
| TCP probe | ✅ Node net | ⚠️ HTTP probe فقط | ✅ tokio (Rust) |
| TLS با SNI override | ✅ Node tls | ❌ (browser-like) | ✅ reqwest + rustls |
| ICMP ping | ✅ system ping.exe | ❌ | ❌ (needs root) |
| HTTP HEAD probe | ✅ | ✅ | ✅ |
| WebSocket config test | ✅ | ⚠️ محدود (browser-like TLS) | ⚠️ محدود |
| Concurrency | ۲۰۰ | ۵۰ (browser cap) | ۲۰۰ (Rust tokio) |
| HARD_CAP IP | ۵۰,۰۰۰ | ۱۰,۰۰۰ | ۵۰,۰۰۰ |
| نیاز به Node.js در device | ✅ بله | ❌ | ❌ |
| حجم installer | — | ۵ MB (NSIS) | ۸-۱۵ MB (APK) |

برای کاربران ایرانی که از CDN IP تمیز استفاده می‌کنن، **نسخه Android** بهترین گزینه‌ست: بدون نیاز به Node، بدون نیاز به لپ‌تاپ، و با اسکنر native که مثل نسخه وب دقیقه.

---

ساخته‌شده با ❤️
