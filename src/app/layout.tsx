import type { Metadata } from "next";
import { Geist, Geist_Mono, Vazirmatn } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "SNI Scanner — اسکنر آی‌پی تمیز برای V2Ray",
  description: "اسکنر زنده CDN برای پیدا کردن آی‌پی تمیز و سالم با خروجی V2Ray/Xray. مناسب برای Cloudflare, AWS, Fastly, Azure و غیره.",
  keywords: ["SNI Scanner", "V2Ray", "Xray", "Cloudflare", "CDN IP", "clean IP", "اسکنر آی‌پی"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${vazirmatn.variable} antialiased bg-background text-foreground font-sans`}
        style={{ fontFamily: 'var(--font-vazirmatn), var(--font-geist-sans), system-ui, sans-serif' }}
      >
        {children}
        <Toaster />
        <SonnerToaster
          position="top-center"
          theme="dark"
          richColors
          closeButton
        />
      </body>
    </html>
  );
}
