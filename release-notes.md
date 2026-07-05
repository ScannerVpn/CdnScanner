# SNI Scanner v1.0.0 — Initial Release

> اسکنر IP تمیز CDN — پیدا کردن آی‌پی‌های سالم برای V2Ray / VLESS / VMess / Trojan
> CDN clean-IP scanner for V2Ray — find healthy IPs for V2Ray/Xray on top of Cloudflare, AWS, Fastly, Azure, etc.

## 📸 اسکرین‌شات / Screenshot

![SNI Scanner — Main Overview](https://raw.githubusercontent.com/ScannerVpn/CdnScanner/main/screenshots/01-main-overview.png)

*داشبورد اصلی — انتخاب پلتفرم CDN، تنظیمات پورت و همزمانی، نمایش live IP های پیدا شده با latency و تست کانفیگ*
*Main dashboard — pick CDN platform, configure ports and concurrency, watch live IPs being discovered with latency and config tests*

## 🎯 دانلود / Downloads

سه فایل برای Windows x64 ضمیمه شده‌اند. هر کدام روش متفاوتی برای نصب/اجرا دارد:

| فایل | حجم | روش |
|------|-----|------|
| **`SNI Scanner_1.0.0_x64-setup.exe`** (NSIS) | ~2.9 MB | نصب‌کننده گرافیکی — دابل‌کلیک کنید |
| **`SNI Scanner_1.0.0_x64_en-US.msi`** (MSI) | ~4.1 MB | نصب‌کننده سازمانی (Group Policy, SCCM) |
| **`sni-scanner.exe`** (Portable) | ~12 MB | بدون نصب — دابل‌کلیک کنید و اجرا شود |

> ⚠️ هر سه فایل روی **Windows 10/11** کار می‌کنند. روی ویندوز 7/8 ممکن است WebView2 نصب نباشد که خود installer دانلودش می‌کند.

## ✨ ویژگی‌ها / Features

- **پشتیبانی از ۱۵+ CDN**: Cloudflare, Cloudflare WARP, AWS CloudFront, Fastly, Vercel, Azure, Google Cloud, Bunny CDN, Gcore, ArvanCloud, Fly.io, Hugging Face, Railway, Render, StackPath
- **اسکن دقیق با چند مرحله قابل تنظیم**: TCP connect → TLS handshake → HTTP HEAD → تست کانفیگ V2Ray واقعی
- **پینگ واقعی ICMP** (در نسخه وب روی ویندوز، با استفاده از `ping.exe`)
- **پشتیبانی از کانفیگ نمونه**: لینک V2Ray خودت رو بچسبان تا فقط IPهایی که با کانفیگ واقعی شما کار می‌کنند نمایش داده شوند
- **خروجی V2Ray/Xray**: VLESS / VMess / Trojan share link، JSON config، IP list خام
- **رابط کاربری فارسی RTL** با داشبورد مدرن و متریال‌های زنده
- **پشتیبانی از CIDR**: رنج‌های CIDR یا بازه IP (مثلاً `44.196.116.0/24` یا `1.1.1.0-1.1.1.255`)
- **اسکن کل رنج** یا نمونه‌برداری تصادفی
- **HTTP Scanner**: لیست IP/دامنه دلخواه خودتون رو وارد کنید

## 🏗️ دو روش استفاده / Two Ways to Use

### روش ۱ — نسخه وب (Node.js mورد نیاز)
اگه Node.js 18+ دارید:
```cmd
git clone https://github.com/ScannerVpn/CdnScanner.git
cd CdnScanner
start-web.bat
```
مرورگر روی `http://localhost:3000` باز میشه. اسکنر کامل با ICMP ping واقعی و TLS cert issuer check.

### روش ۲ — نسخه EXE (بدون نیاز به Node.js)
فایل `SNI Scanner_1.0.0_x64-setup.exe` رو دانلود و نصب کنید.
یا `sni-scanner.exe` رو مستقیم اجرا کنید.

> 🔍 تفاوت‌های دو حالت:
> - **وب**: اسکن کامل (TCP/TLS/HTTP/ICMP/Config-aware) با Node backend
> - **EXE**: فقط HTTP پورت 80 پروب (browser TLS hostname validation اجازه HTTPS-to-IP نمی‌ده). ولی برای اکثر CDN‌ها کافیه چون پورت 80 با redirect 301 به HTTPS پاسخ می‌ده.
> - رابط کاربری و دیگر قابلیت‌ها یکسان است.

## 🔧 پیش‌نیازها / Prerequisites

**برای EXE**: فقط Windows 10 یا بالاتر (WebView2 خودش نصب میشه).

**برای Web Version**:
- [Node.js 18+](https://nodejs.org)

**برای Build از Source**:
- [Node.js 18+](https://nodejs.org)
- [Rust](https://rustup.rs)
- [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (تیک «Desktop development with C++»)
- بعد از نصب Rust یا VS Build Tools، سیستم رو ری‌استارت کنید

## 🚀 ساخت از Source / Build from Source

```cmd
git clone https://github.com/ScannerVpn/CdnScanner.git
cd CdnScanner
build-tauri.bat
```
اولین بار ۵-۱۵ دقیقه طول می‌کشه (Rust باید همه depها رو کامپایل کنه). دفعات بعد خیلی سریع‌تر.

## 📋 مستندات کامل / Full Documentation

- [README.md](https://github.com/ScannerVpn/CdnScanner/blob/main/README.md) — راهنمای انگلیسی
- [TAURI.md](https://github.com/ScannerVpn/CdnScanner/blob/main/TAURI.md) — راهنمای فارسی Tauri، troubleshooting، معماری با دیاگرام

## 🐛 گزارش مشکل / Report Issues

https://github.com/ScannerVpn/CdnScanner/issues

## مجوز / License

MIT
