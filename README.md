# CdnScanner - SNI Scanner

> اسکنر IP تمیز CDN — پیدا کردن IP های سالم برای V2Ray / VLESS / VMess / Trojan

## 🎬 نگاهی سریع — What's New in v1.0.0

<p align="center">
  <img src="https://raw.githubusercontent.com/ScannerVpn/CdnScanner/main/screenshots/scan-demo.gif" alt="SNI Scanner — Live scan demo" width="100%">
</p>

<p align="center">
  <em>شروع اسکن → progress bar پر میشه → IP های سالم real-time اضافه میشن → خروجی V2Ray آماده دانلود.</em>
</p>

<p align="center">
  <a href="https://github.com/ScannerVpn/CdnScanner/releases/tag/v1.0.0"><img alt="GitHub release" src="https://img.shields.io/badge/v1.0.0-Release-22c55e?style=flat-square&logo=github"></a>
  <a href="https://github.com/ScannerVpn/CdnScanner/releases/tag/v1.0.0"><img alt="Download NSIS" src="https://img.shields.io/badge/Download-NSIS%20Setup-22c55e?style=flat-square&logo=windows"></a>
  <a href="https://github.com/ScannerVpn/CdnScanner/releases/tag/v1.0.0"><img alt="Download MSI" src="https://img.shields.io/badge/Download-MSI-22c55e?style=flat-square&logo=windows"></a>
  <a href="https://github.com/ScannerVpn/CdnScanner/releases/tag/v1.0.0"><img alt="Download Portable" src="https://img.shields.io/badge/Download-Portable%20EXE-22c55e?style=flat-square&logo=windows"></a>
</p>

**ویژگی‌های کلیدی این نسخه:**
- ⚡ **اسکن real-time** با progress bar و results streaming (EventStream / fetch + WebSocket)
- 🔌 **Dual backend**: Node (نسخه وب — TCP/TLS/ICMP واقعی) و browser-only (نسخه Tauri — fetch)
- 🎯 **تست کانفیگ نمونه**: IP ها فقط وقتی تأیید میشن که با V2Ray واقعی شما جواب بدن
- 📦 **خروجی V2Ray**: لینک‌های VLESS/VMess/Trojan از IP های سالم، یک کلیک کپی/دانلود
- 🖥️ **EXE مستقل**: Tauri 2 installer (NSIS 2.9 MB · MSI 4.1 MB · Portable 12 MB) — بدون نیاز به Node در سیستم کاربر

## ویژگی‌ها

- **اسکن چندین CDN**: Cloudflare (28 رنج), AWS CloudFront, Fastly, Vercel, Azure, Google Cloud, Bunny CDN, Hugging Face, Railway, و بیشتر
- **تست دقیق**: TCP connect + TLS handshake + HTTP HEAD + تست کانفیگ واقعی
- **پینگ ICMP واقعی**: پشتیبانی از ICMP ping روی Windows و Linux/macOS
- **تست کانفیگ**: تست IP ها با SNI و کانفیگ V2Ray واقعی شما
- **خروجی V2Ray**: تولید خودکار لینک‌های VLESS/VMess/Trojan
- **رابط کاربری RTL فارسی**: داشبورد مدرن با RTL
- **پشتیبانی از CIDR**: وارد کردن رنج IP مثل `44.196.116.0/24` یا بازه `1.1.1.0-1.1.1.255`
- **اسکن کل رنج**: قابلیت اسکن تمام IP های هر رنج (نه فقط نمونه)

## پیش‌نیازها

- **Node.js 18+** — [دانلود](https://nodejs.org)

## اجرا

### ویندوز
```cmd
start-web.bat
```
مرورگر روی `http://localhost:3000` باز میشه.

### لینوکس / macOS
```bash
npm install
npm run dev
```

## ساخت پکیج قابل حمل (برای اشتراک‌گذاری)

```cmd
build-portable.bat
```

پوشه `dist/` ساخته میشه که شامل:
- `start.bat` — اجرای سرور
- `server/` — سرور Next.js standalone

برای اجرا: پوشه `dist/` رو کپی کنید و `start.bat` رو اجرا کنید. فقط **Node.js 18+** لازمه.

## ساخت EXE ویندوز (Tauri)

```cmd
build-tauri.bat
```

این اسکریپت همه کار را خودکار انجام می‌دهد:
1. `npm install` — وابستگی‌های Next.js
2. `npm run build:static` — ساخت frontend به صورت static export در `out/`
3. `npm run tauri:build` — کامپایل Rust و ساخت installer

**نیازی به اسکریپت‌های جداگانه نیست.** build-tauri.bat یک فایل است.

پیش‌نیازها:
- [Node.js 18+](https://nodejs.org)
- [Rust](https://rustup.rs)
- [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (تیک "Desktop development with C++")

## CDN های پشتیبانی شده

| CDN | تعداد رنج | توضیح |
|-----|-----------|-------|
| Cloudflare | 28 | Official + Spectrum + Workers |
| Cloudflare WARP | 9 | WARP / Zero Trust / CGNAT |
| AWS CloudFront | 50+ | Global + Regional edges |
| Fastly | 19 | Official API |
| Vercel | 9 | Edge + AWS |
| Azure | 12 | Front Door + CDN (multi-region) |
| Google Cloud | 30 | GCE + Google Frontend |
| Bunny CDN | 13 | EU + Global |
| Gcore CDN | 14 | EU + APAC + Global |
| ArvanCloud | 10 | IR + Edge |
| Fly.io | 12 | AS13454 |
| Hugging Face | 17 | CloudFront + AWS multi-region |
| Railway | 16 | AS399471 + AWS |
| Render | 16 | AS399471 + AWS |
| Akamai | 19 | AS20940 anycast |
| CDN77 | 7 | EU |
| StackPath | 7 | Global |

## نحوه کار اسکنر

### مراحل تست هر IP
1. **ICMP/TCP Ping** — بررسی زنده بودن
2. **TCP Connect** — اتصال به پورت
3. **TLS Handshake** — برقراری اتصال TLS با SNI کانفیگ
4. **HTTP HEAD** — درخواست HTTP برای راستی‌آزمایی
5. **تست کانفیگ** — تست WebSocket upgrade با SNI و Host کانفیگ شما

### تست کانفیگ نمونه
کانفیگ V2Ray خودتون رو وارد کنید تا فقط IP هایی نمایش داده بشن که واقعاً با اون کانفیگ کار میکنن.

## ساختار پروژه

```
├── src/
│   ├── app/api/scanner/     # API endpoints (SSE) — نسخه وب
│   ├── components/scanner/  # کامپوننت‌های React
│   └── lib/scanner/
│       ├── platforms.ts       # تعریف CDN ها و رنج IP
│       ├── server-scanner.ts  # موتور اسکن سمت سرور (Node: net/tls/http/ICMP)
│       ├── client-scanner.ts  # موتور اسکن سمت مرورگر (fetch/WebSocket)
│       ├── sse-client.ts      # رابط — auto-detect بک‌اند، fallback
│       ├── types.ts           # تایپ‌ها
│       ├── store.ts           # State management
│       ├── sample-config.ts   # پارسر لینک V2Ray
│       └── export.ts          # تولید خروجی
├── start-web.bat           # اجرای وب (dev)
├── build.bat                # ساخت پکیج قابل حمل (Node standalone)
├── build-tauri.bat          # ساخت EXE ویندوز (Tauri static)
├── src-tauri/               # کد Rust Tauri
│   ├── src/
│   ├── tauri.conf.json
│   └── icons/
└── package.json
```

## مشارکت

1. Fork کنید
2. شاخه جدید بسازید
3. تغییرات رو commit کنید
4. Push و Pull Request بزنید

## مجوز

MIT License
