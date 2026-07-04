# SNI Scanner — Build Windows EXE with Tauri

این راهنما ساختن فایل EXE ویندوز رو با **Tauri** توضیح میده. حجم نهایی حدود ۵ مگابایت خواهد بود (به‌جای ۱۵۰ مگابایت Electron).

## 📋 پیش‌نیازها

### ۱. Node.js 18+
اگه قبلاً نصب داری، skip کن.
- دانلود: https://nodejs.org
- نسخه LTS رو نصب کن

### ۲. Rust (ضروری برای Tauri)
- دانلود: https://rustup.rs
- فایل `rustup-init.exe` رو اجرا کن
- تنظیمات پیش‌فرض رو قبول کن (فقط Enter بزن)
- بعد از نصب، کامپیوتر رو ری‌استارت کن

### ۳. Microsoft Visual Studio C++ Build Tools (ضروری)
- دانلود: https://visualstudio.microsoft.com/visual-cpp-build-tools/
- در installer، تیک **"Desktop development with C++"** رو بزن
- Install رو بزن (حدود ۶ گیگ)

## 🚀 ساخت EXE

### روش ۱: فایل BAT
1. روی `build-tauri.bat` دابل‌کلیک کن
2. صبر کن (اولین بار ۵-۱۵ دقیقه)
3. EXE در پوشه `src-tauri\target\release\bundle\` ساخته میشه

### روش ۲: فایل PowerShell
1. راست‌کلیک روی `build-tauri.ps1`
2. `Run with PowerShell`

### روش ۳: دستی
```cmd
npm install --no-audit --no-fund
npm run build:static
npm run tauri:build
```

## 📦 خروجی

پس از اتمام build:
- **`src-tauri\target\release\bundle\nsis\SNI-Scanner_1.0.0_x64-setup.exe`** — نصب‌کننده NSIS (توصیه‌شده)
- **`src-tauri\target\release\bundle\msi\SNI-Scanner_1.0.0_x64_en-US.msi`** — نصب‌کننده MSI

## ⚠️ مشکلات رایج

### مشکل: "rustc not found"
Rust نصب نیست. از https://rustup.rs نصب کن و کامپیوتر رو ری‌استارت کن.

### مشکل: "link.exe not found"
Visual Studio C++ Build Tools نصب نیست. از لینک بالا نصب کن (تیک "Desktop development with C++" رو بزن).

### مشکل: build خیلی طول می‌کشه
اولین بار Rust باید همه dependency ها رو compile کنه (۵-۱۵ دقیقه). دفعات بعد خیلی سریع‌تر میشه.

### مشکل: error در next build
```cmd
rmdir /s /q .next
npm run build:static
```

## 🎯 استفاده از EXE

پس از نصب:
- در Start Menu: `SNI Scanner`
- در Desktop: شورت‌کات `SNI Scanner`
- برای اجرا: دابل‌کلیک روی شورت‌کات

## 📝 نکات

- حجم EXE: حدود ۵ مگابایت (بسیار سبک‌تر از Electron)
- نیازی به Node.js روی کامپیوتر کاربر نهایی نیست
- نیازی به اینترنت برای اجرا نیست (فقط برای اسکن IP)

---

ساخته‌شده با ❤️
