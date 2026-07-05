# SNI Scanner v1.1.0 — Tauri Android Fixes

> اسکنر IP تمیز CDN — نسخه ۱.۱ روی موبایل و Android بهینه شد
> CDN clean-IP scanner — v1.1 brings a proper mobile side-drawer and a working Stop button on Android.

## ✨ چه خبر؟ / What's New

این نسخه دو مشکل اصلی اپلیکیشن Android رو برطرف می‌کنه:

1. **دکمه‌ی Stop واقعاً متوقف می‌کنه** — قبلاً روی موبایل، کلیک روی «توقف» فقط status رو به `stopped` تغییر می‌داد ولی in-flight probeها (TCP + TLS + HTTP) همچنان تا timeout کامل (۳ ثانیه × چند صد IP موازی) ادامه پیدا می‌کردن. حالا Rust-side با `tokio::select!` یه `AtomicBool` سراسری رو چک می‌کنه و ظرف ~۵۰ms همه‌ی probeها abort می‌شن.

2. **منوی کناری (Side Drawer) برای پلتفرم‌ها** — تو نسخه‌ی قبلی dropdown منو روی صفحه‌ی کوچک موبایل جا نمی‌شد. حالا یه همبرگر (☰) بالا-راست هست که Sheet (drawer) رو از سمت راست باز می‌کنه و PlatformGrid + سه دکمه‌ی اکشن (کانفیگ / تنظیمات / V2Ray) رو توش نشون می‌ده.

3. **Mobile polish**: safe-area insets برای ناچ، 16px input floor برای جلوگیری از zoom خودکار Android WebView، overscroll-contain، scrollbar نازک‌تر.

## 📸 اسکرین‌شات / Screenshots

| Drawer باز | منوی اصلی |
|---|---|
| پلتفرم‌ها + ۳ اکشن در فوتر | حالت استراحت با StatusPanel |

## 🎯 دانلود / Downloads

فایل APK امضا‌شده‌ی Android ضمیمه شده:

| فایل | حجم | پلتفرم | توضیح |
|------|-----|--------|-------|
| **`SNI-Scanner-v1.1.0-universal-release.apk`** | ~57 MB | Android 7.0+ (API 24) | Universal APK — روی همه‌ی architectureها (arm64, x86_64, armeabi-v7a, x86) نصب می‌شه |

> ⚠️ این APK با **debug keystore** امضا شده (برای تست). برای انتشار در Google Play باید release keystore بسازید و دوباره sign کنید.

> 💾 روش نصب: فایل APK رو دانلود کنید، روی دستگاه باز کنید، اجازه‌ی "Install from unknown sources" بدید، یا از طریق `adb install -r file.apk` نصب کنید.

> 🖥️ نسخه‌ی Windows (setup.exe / msi / portable) تغییر نکرده — همون فایل‌های v1.0.0 قابل استفاده‌ان.

## 🐛 رفع باگ / Bug Fixes

- **Stop scan does not actually stop on Android** (issue observed on v1.0.0) — fixed by adding a Rust-side session cancellation registry (`OnceLock<Mutex<HashMap<String, Arc<AtomicBool>>>>`) and racing both the TCP connect and the reqwest HTTP probe against a polling `wait_for_cancel` future. In-flight probes abort within ~50ms instead of waiting for the full 3s timeout.
- **Drawer dropdown was too wide on mobile** — replaced `DropdownMenu` with `Sheet` (side drawer) at `w-4/5 max-w-sm` (80% width, capped) instead of the previous 92%.
- **Tauri Android build: ANDROID_HOME not set warning** — auto-detect Android SDK from default install paths (`%USERPROFILE%\AppData\Local\Android\Sdk` or `%LOCALAPPDATA%\Android\Sdk`) in `build-tauri-android.bat`.
- **Android auto-zoom on input focus** — enforce `font-size: max(16px, 1rem)` on all form elements in `globals.css`.

## 🔧 تغییرات فنی / Technical Changes

### Backend (Rust)
- `src-tauri/src/scanner.rs`:
  - `start_session` / `cancel_session` / `end_session` commands
  - `check_ip` now takes a `session_id` parameter and races TCP + HTTP against cancellation
- `src-tauri/src/lib.rs`: registered 3 new commands in `invoke_handler`
- `src-tauri/Cargo.toml`: reqwest 0.12 (rustls, no OpenSSL) for clean cross-compile

### Frontend (TypeScript / React)
- `src/lib/scanner/native-scanner.ts`:
  - Register session via `start_session` at scan start
  - `cancel` function: flip local flag, invoke `cancel_session`, then `end_session`
  - Worker loop: drop results that arrive after cancellation
- `src/lib/scanner/client-scanner.ts`: post-cancel result drop for browser fallback path
- `src/components/scanner/scanner-shell.tsx`: replaced `DropdownMenu` with `Sheet` (side drawer) containing PlatformGrid + footer action buttons
- `src/app/globals.css`: mobile polish utilities (safe-area, input floor, overscroll, scrollbar)

## 🏗️ Build از Source / Build from Source

### Android APK
```cmd
git clone https://github.com/ScannerVpn/CdnScanner.git
cd CdnScanner
git checkout v1.1.0
build-tauri-android.bat
```
پیش‌نیازها: Node.js 20+، Rust (همراه با targetهای `aarch64-linux-android` و `x86_64-linux-android`)، Android SDK (API 24+)، JDK 17.

### Web (Windows / macOS / Linux)
```cmd
git clone https://github.com/ScannerVpn/CdnScanner.git
cd CdnScanner
git checkout v1.1.0
start-web.bat        # یا: bun install && bun run dev
```

### Windows EXE
همون روش v1.0.0: `build.bat` در ریشه پروژه. خروجی در `src-tauri\target\release\bundle\` ساخته می‌شه.

## 📋 مستندات / Documentation

- [README.md](https://github.com/ScannerVpn/CdnScanner/blob/v1.1.0/README.md) — راهنمای انگلیسی
- [TAURI.md](https://github.com/ScannerVpn/CdnScanner/blob/v1.1.0/TAURI.md) — راهنمای فارسی Tauri، troubleshooting، معماری با دیاگرام
- [release-notes-v1.0.0.md](https://github.com/ScannerVpn/CdnScanner/blob/main/release-notes.md) — یادداشت‌های نسخه‌ی قبلی

## 🐛 گزارش مشکل / Report Issues

https://github.com/ScannerVpn/CdnScanner/issues

## مجوز / License

MIT
