# CdnScanner - SNI Scanner

> اسکنر IP تمیز CDN — پیدا کردن IP های سالم برای V2Ray / VLESS / VMess / Trojan

یک ابزار قدرتمند برای اسکن و پیدا کردن IP های تمیز و سالم شبکه‌های CDN مختلف. این ابزار با بررسی TCP، TLS، HTTP و WebSocket، IP های واقعی و کاربردی را شناسایی می‌کند.

## ویژگی‌ها

- **اسکن چندین CDN**: Cloudflare, AWS CloudFront, Fastly, Vercel, Azure, Google Cloud, Bunny CDN, و بیشتر
- **تست دقیق**: TCP connect, TLS handshake, HTTP HEAD, WebSocket upgrade
- **پینگ ICMP واقعی**: پشتیبانی از ICMP ping روی Windows و Linux/macOS
- **تست کانفیگ**: امکان تست IP ها با کانفیگ V2Ray واقعی شما
- **خروجی V2Ray**: تولید خودکار لینک‌های VLESS/VMess/Trojan با IP های پیدا شده
- **رابط کاربری مدرن**: داشبورد زیبا با RTL فارسی
- **نسخه دسکتاپ**: ساخت EXE ویندوز با Tauri (حجم ~5MB)

## پیش‌نیازها

- **Node.js 18+** — [دانلود](https://nodejs.org)
- **npm** یا **bun** — برای نصب پکیج‌ها

### برای ساخت نسخه دسکتاپ (اختیاری)

- **Rust** — [دانلود](https://rustup.rs)
- **Microsoft Visual Studio C++ Build Tools** — [دانلود](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

## نصب و اجرا

### روش ۱: فایل BAT (توصیه‌شده برای ویندوز)

```cmd
# اجرای سریع - ایجاد وب‌سرور و باز شدن مرورگر
start-web.bat

# ساخت EXE ویندوز
build-tauri.bat
```

### روش ۲: دستی

```bash
# نصب پکیج‌ها
npm install --no-audit --no-fund

# اجرای سرور توسعه
npm run dev
```

مرورگر را باز کنید: `http://localhost:3000`

## ساخت نسخه دسکتاپ (EXE ویندوز)

### پیش‌نیازها

1. **Node.js 18+**: https://nodejs.org
2. **Rust**: https://rustup.rs — فایل `rustup-init.exe` را اجرا کنید و Enter بزنید
3. **Visual Studio C++ Build Tools**: https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - تیک **"Desktop development with C++"** را بزنید
   - Install (حدود 6 گیگابایت)

### ساخت

```cmd
# روش آسان
build-tauri.bat

# یا دستی
npm run build:static
npm run tauri:build
```

### خروجی

فایل‌ها در پوشه `src-tauri\target\release\bundle\` قرار می‌گیرند:
- `nsis\SNI-Scanner_1.0.0_x64-setup.exe` — نصب‌کننده
- `msi\SNI-Scanner_1.0.0_x64_en-US.msi` — نصب‌کننده MSI

## CDN های پشتیبانی شده

| CDN | توضیح | تعداد رنج |
|------|--------|-----------|
| Cloudflare | IP های edge کلودفلر (v4) | 15 رنج |
| Cloudflare WARP | WARP / Zero Trust | 7 رنج |
| AWS CloudFront | Amazon CloudFront edge | 30+ رنج |
| Fastly | فستلی edge | 16 رنج |
| Vercel | شبکه edge ورسل | 6 رنج |
| Azure | Azure Front Door + CDN | 5 رنج |
| Google Cloud | GCP + Google Frontends | 10 رنج |
| Bunny CDN | بانی.نت CDN | 8 رنج |
| Gcore CDN | جی‌کور CDN | 9 رنج |
| ArvanCloud | آروان کلود | 7 رنج |
| StackPath | استک‌پث CDN | 6 رنج |
| Fly.io | فلای‌آی‌او | 6 رنج |
| Render | رندر.کام | 10 رنج |
| Railway | ریلوی.آپ | 14 رنج |
| Hugging Face | هوگینگ‌فیس | 11 رنج |

## نحوه کار

### مراحل اسکن هر IP

1. **پینگ** (ICMP یا TCP) — بررسی زنده بودن IP
2. **TCP Connect** — برقراری اتصال TCP روی پورت مورد نظر
3. **TLS Handshake** — برقراری اتصال TLS با SNI مشخص شده
4. **HTTP HEAD** — درخواست HTTP برای راستی‌آزمایی
5. **WebSocket Test** — تست upgrade WebSocket با کانفیگ شما

### تنظیمات قابل تغییر

- **پورت‌ها**: 443, 80, 2053, 2083, 2087, 2096, 8443, و بیشتر
- **همزمانی**: 5 تا 200 کانکشن همزمان
- **Timeout**: 500ms تا 10000ms
- **حداکثر تأخیر**: فیلتر بر اساس latency
- **تست ICMP**: پینگ واقعی یا TCP-based
- **تست TLS/HTTP**: قابل غیرفعال کردن

## ساختار پروژه

```
sni-scanner-source/
├── src/
│   ├── app/
│   │   ├── api/scanner/        # API endpoints (SSE)
│   │   │   ├── start/route.ts  # شروع اسکن
│   │   │   ├── stop/route.ts   # توقف اسکن
│   │   │   └── platforms/route.ts  # لیست پلتفرم‌ها
│   │   └── page.tsx            # صفحه اصلی
│   ├── components/scanner/     # کامپوننت‌های React
│   │   ├── scanner-shell.tsx   # کامپوننت اصلی
│   │   ├── platform-grid.tsx   # انتخاب پلتفرم
│   │   ├── scan-results.tsx    # نمایش نتایج
│   │   ├── settings-dialog.tsx # تنظیمات
│   │   └── export-dialog.tsx   # خروجی V2Ray
│   └── lib/scanner/
│       ├── platforms.ts        # تعریف پلتفرم‌ها و رنج IP
│       ├── server-scanner.ts   # موتور اسکن اصلی
│       ├── types.ts            # تایپ‌ها
│       ├── store.ts            # State management (Zustand)
│       ├── sse-client.ts       # کلاینت SSE
│       ├── sample-config.ts    # پارسر لینک‌های V2Ray
│       └── export.ts           # تولید خروجی
├── src-tauri/                  # Tauri desktop config
├── start-web.bat               # اجرای سریع (ویندوز)
├── build-tauri.bat             # ساخت EXE (ویندوز)
└── package.json
```

## مشکلات رایج

### پینگ کار نمی‌کند
- در ویندوز، ICMP ping نیاز به دسترسی Admin دارد
- اگر ICMP بلاک شده باشد، اسکنر از TCP ping استفاده می‌کند

### نتایج نادرست است
- تعداد پورت‌های بیشتری را امتحان کنید (مثلاً 443 و 80 با هم)
- Timeout را افزایش دهید
- کانفیگ نمونه خود را وارد کنید تا فقط IP های مرتبط نشان داده شوند

### build-tauri.bat بسته می‌شود
- خطاها در cmd نمایش داده می‌شوند
- مطمئن شوید Rust و Visual Studio C++ Build Tools نصب هستند

## مشارکت

برای مشارکت در توسعه این پروژه:

1. مخزن را Fork کنید
2. شاخه جدید بسازید (`git checkout -b feature/amazing-feature`)
3. تغییرات را commit کنید (`git commit -m 'Add amazing feature'`)
4. Push کنید (`git push origin feature/amazing-feature`)
5. Pull Request بزنید

## مجوز

MIT License

---

ساخته شده برای پیدا کردن IP تمیز CDN
