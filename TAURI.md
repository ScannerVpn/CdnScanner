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

---

ساخته‌شده با ❤️
