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
  <a href="https://github.com/ScannerVpn/CdnScanner/releases/tag/v1.0.0"><img alt="Download Android" src="https://img.shields.io/badge/Download-Android%20APK-3DDC84?style=flat-square&logo=android"></a>
</p>

**ویژگی‌های کلیدی این نسخه:**
- ⚡ **اسکن real-time** با progress bar و results streaming (EventStream / fetch + WebSocket)
- 🔌 **Dual backend**: Node (نسخه وب — TCP/TLS/ICMP واقعی) و browser-only (نسخه Tauri — fetch)
- 🎯 **تست کانفیگ نمونه**: IP ها فقط وقتی تأیید میشن که با V2Ray واقعی شما جواب بدن
- 📦 **خروجی V2Ray**: لینک‌های VLESS/VMess/Trojan از IP های سالم، یک کلیک کپی/دانلود
- 🖥️ **EXE مستقل**: Tauri 2 installer (NSIS 2.9 MB · MSI 4.1 MB · Portable 12 MB) — بدون نیاز به Node در سیستم کاربر
- 📱 **APK اندروید**: Tauri 2 mobile build (aarch64/armv7/x86/x86_64) — اسکنر روی Android 7.0+؛ یک release، هر دو پلتفرم

## ویژگی‌ها

- **اسکن ۱۷ CDN**: Cloudflare (28 رنج + Spectrum/Workers)، Cloudflare WARP، AWS CloudFront (52+ رنج)، Fastly، Vercel، Azure (Front Door 12 رنج)، Google Cloud (32 رنج GCE/GFE)، Bunny CDN، Gcore، ArvanCloud (ایران)، Fly.io، Hugging Face، Railway، Render، **Akamai (AS20940)**، **CDN77**، StackPath
- **HTTP Scanner**: کارت اختصاصی برای اسکن هر IP/دامنه/CIDR که خودت وارد می‌کنی (با `1.1.1.0/24` یا `1.1.1.0-1.1.1.255` رنج‌ها خودکار باز میشن)
- **Dual backend خودکار**: نسخه وب روی Node (`net/tls/http` + ICMP واقعی) اسکن می‌کنه؛ نسخه Tauri (EXE) خودکار fallback می‌کنه به اسکنر مرورگر (`fetch` + WebSocket) — هیچ تنظیمی لازم نیست
- **تست دقیق هر IP**: TCP connect + TLS Handshake (با SNI) + HTTP HEAD + تست واقعی کانفیگ V2Ray شما
- **پینگ ICMP واقعی**: پشتیبانی از ICMP ping روی Windows و Linux/macOS (با TCP fallback اگر ICMP بلاک باشه)
- **تست کانفیگ نمونه**: IP ها فقط وقتی تأیید میشن که با کانفیگ V2Ray واقعی شما (SNI + Host + Path) جواب بدن
- **خروجی V2Ray**: تولید خودکار لینک‌های VLESS/VMess/Trojan از IP های سالم — کپی یا دانلود یک‌کلیکه
- **رابط کاربری RTL فارسی**: داشبورد مدرن با toast، progress bar، stats cards، و modal‌های راست‌چین
- **اسکن کل رنج**: قابلیت اسکن تمام IP های هر رنج (نه فقط نمونه تصادفی)

## پیش‌نیازها

- **Node.js 20+** (توصیه شده برای Next.js 16) — [دانلود LTS](https://nodejs.org)
- **bun یا npm** — bun سریع‌تره ولی npm هم اوکیه

## اجرا

### ویندوز
```cmd
start-web.bat
```
مرورگر خودکار روی `http://localhost:3000` باز میشه.

### لینوکس / macOS
```bash
npm install
npm run dev
# یا
bun install
bun run dev
```

## ساخت پکیج قابل حمل (Node standalone)

```cmd
build.bat
```

`build.bat` خودکار `npm install`، `next build`، و کپی خروجی standalone به `dist/` رو انجام می‌ده. بعد از build:
- `dist\start.bat` — اجرای سرور و باز کردن مرورگر روی `http://localhost:3000`
- `dist\server.js` — سرور Next.js standalone (فقط Node.js لازمه، بدون وابستگی اضافی)

برای اشتراک‌گذاری: پوشه `dist/` رو زیپ کنید. گیرنده فقط **Node.js 20+** نیاز داره.

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
- [Node.js 20+](https://nodejs.org)
- [Rust](https://rustup.rs)
- [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (تیک "Desktop development with C++")

## ساخت APK اندروید (Tauri)

```cmd
build-tauri-android.bat
```

این اسکریپت APK رو با **release keystore** امضا می‌کنه (signing با کلید واقعی، آماده برای distribution در هر مارکت یا sideload). خروجی:

- `src-tauri\gen\android\app\build\outputs\apk\release\` — **۴ فایل APK** (یکی برای هر ABI):
  - `sni-scanner-<version>-arm64-v8a.apk` — **اکثر گوشی‌های امروزی** (Redmi, Samsung, Pixel، همه گوشی‌های 2017 به بعد)
  - `sni-scanner-<version>-armeabi-v7a.apk` — گوشی‌های قدیمی‌تر 32-bit (Android 7+)
  - `sni-scanner-<version>-x86.apk` — emulator (32-bit)
  - `sni-scanner-<version>-x86_64.apk` — emulator (64-bit)

> 📌 برای گوشی Redmi (یا هر Android 7+)، فایل `arm64-v8a` رو بگیر و نصب کن.

نصب روی device متصل:
```cmd
adb install -r src-tauri\gen\android\app\build\outputs\apk\release\sni-scanner-1.0.0-arm64-v8a.apk
```

پیش‌نیازها:
- [Node.js 20+](https://nodejs.org)
- [Rust](https://rustup.rs) با targetهای Android:
  ```bash
  rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
  ```
- [Android Studio](https://developer.android.com/studio) (برای SDK + NDK)
- JDK 17+ (مثلاً [Temurin](https://adoptium.net))

> 🔑 keystore release از قبل در `src-tauri\keystore\release.keystore` ساخته شده. اگه می‌خوای خودت از اول بسازی، `src-tauri\keystore\README.md` رو ببین.

## انتشار خودکار (CI/CD) — یک release، هر دو پلتفرم

وقتی تگ `v*` رو push می‌کنی (مثلاً `git tag v1.1.0 && git push origin v1.1.0`)، workflow اندروید به‌طور خودکار:

1. APK release (signed) رو با keystore می‌سازه
2. فایل(های) APK رو به **همون release page** گیت‌هاب که فایل‌های ویندوز هست ضمیمه می‌کنه

یعنی کاربر هر دو نسخه PC و Android رو یکجا می‌بینه — جداسازی قبلی حذف میشه.

**تنظیم Secrets (فقط یک‌بار، در Settings → Secrets and variables → Actions ریپو):**

| Secret | مقدار |
|--------|-------|
| `ANDROID_KEYSTORE_BASE64` | خروجی `base64 -w 0 src-tauri/keystore/release.keystore` (در bash/Git Bash) یا `[Convert]::ToBase64String([IO.File]::ReadAllBytes("src-tauri/keystore/release.keystore"))` (در PowerShell) |
| `ANDROID_KEYSTORE_PASSWORD` | پسورد از `keystore.properties` |
| `ANDROID_KEY_ALIAS` | alias کلید (پیش‌فرض: `release`) |
| `ANDROID_KEY_PASSWORD` | پسورد key (معمولاً همون store password) |

> امنیت: فایل `.keystore` هرگز commit نمی‌شه — workflow اون رو از secret می‌خونه و در CI می‌سازه.

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
│   ├── app/
│   │   ├── layout.tsx             # Root layout فارسی RTL
│   │   ├── page.tsx               # Mount کردن <ScannerShell />
│   │   └── api/scanner/           # API endpoints (SSE) — فقط نسخه وب
│   ├── components/
│   │   ├── ui/                    # کامپوننت‌های shadcn/ui (45+ فایل)
│   │   └── scanner/               # کامپوننت‌های اصلی اپ
│   │       ├── scanner-shell.tsx      # shell اصلی
│   │       ├── status-panel.tsx       # Start / Stop + حالت اسکن
│   │       ├── stats-cards.tsx        # کارت‌های کل/اسکن‌شده/زنده/تست‌کانفیگ/زمان
│   │       ├── platform-grid.tsx      # گرید انتخاب CDN
│   │       ├── scan-results.tsx       # جدول نتایج real-time
│   │       ├── http-scanner-dialog.tsx  # مودال ورود IP/CIDR دلخواه
│   │       ├── sample-config-dialog.tsx # وارد کردن کانفیگ V2Ray نمونه
│   │       ├── settings-dialog.tsx      # تنظیمات (timeout, ports, concurrency)
│   │       └── export-dialog.tsx        # خروجی V2Ray
│   └── lib/
│       ├── db.ts                  # Prisma client (scaffolding)
│       ├── utils.ts               # cn() — class-name merger
│       └── scanner/
│           ├── platforms.ts       # ۱۷ CDN × 250+ رنج IP (Cloudflare, Akamai, ...)
│           ├── server-scanner.ts  # موتور اسکن سمت سرور (Node: net/tls/http/ICMP)
│           ├── client-scanner.ts  # موتور اسکن سمت مرورگر (fetch + WebSocket)
│           ├── sse-client.ts      # رابط — auto-detect بک‌اند Node/مرورگر، fallback
│           ├── types.ts           # تایپ‌های Platform/, ScanResult/, ScanProgress
│           ├── store.ts           # Zustand store (state management)
│           ├── sample-config.ts  # پارسر لینک V2Ray (vless/vmess/trojan)
│           └── export.ts          # تولید خروجی V2Ray
├── scripts/
│   ├── build-static.js             # Orchestrator: جابجایی src/app/api + next build (با try/finally)
│   ├── capture-gif.js              # CDP driver: فیلم‌برداری از UI با chrome remote debugging
│   └── stitch-gif.js               # ffmpeg two-pass palette → GIF
├── screenshots/                    # تصاویر و GIF برای release notes / README
├── start-web.bat                   # اجرای وب (dev) — ویندوز
├── build.bat                       # ساخت پکیج قابل حمل (Node standalone) — ویندوز
├── build-tauri.bat                 # ساخت EXE ویندوز (Tauri static) — یک فایل، همه چیز خودکار
├── src-tauri/                      # کد Rust Tauri 2
│   ├── src/{lib.rs,main.rs}        # Backend Rust
│   ├── tauri.conf.json             # تنظیمات Tauri (icon, identifier, frontendDist)
│   ├── Cargo.toml                  # وابستگی‌های Rust
│   └── icons/                      # آیکون‌های EXE
├── README.md                       # این فایل
├── TAURI.md                        # مستندات کامل Tauri build + troubleshooting
└── package.json                    # Next.js + Tauri scripts + deps
```

## مشارکت

1. Fork کنید
2. شاخه جدید بسازید (`git checkout -b feature/amazing`)
3. تغییرات رو commit کنید (`git commit -m 'Add some amazing feature'`)
4. Push کنید (`git push origin feature/amazing`)
5. Pull Request باز کنید

اگه رنج IP جدیدی برای یه CDN پیدا کردید، فقط توی `src/lib/scanner/platforms.ts` اضافه‌اش کنید. اگه CDN کاملاً جدید می‌خواهید، یه entry جدید به آرایه‌ی `PLATFORMS` اضافه کنید.

## لایسنس

MIT License — استفاده آزاد برای پروژه‌های شخصی و تجاری.
