# CdnScanner - SNI Scanner

> اسکنر IP تمیز CDN — پیدا کردن IP های سالم برای V2Ray / VLESS / VMess / Trojan

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
| Cloudflare WARP | 7 | WARP / Zero Trust |
| AWS CloudFront | 30+ | Global + Regional edges |
| Fastly | 19 | Official API |
| Vercel | 6 | Edge + AWS |
| Azure | 5 | Front Door + CDN |
| Google Cloud | 10 | GCP + Frontend |
| Bunny CDN | 8 | Global |
| Gcore CDN | 9 | EU |
| ArvanCloud | 7 | IR |
| Fly.io | 6 | AS13454 |
| Hugging Face | 15 | CloudFront + AWS |
| Railway | 14 | AWS us-west-2 + eu-west-1 |
| Render | 11 | AS399471 + AWS |
| StackPath | 6 | Global |

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
