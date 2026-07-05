import type { NextConfig } from "next";

const isTauriBuild = process.env.TAURI_BUILD === "true";

// Two build modes:
//   - Web (start-web.bat, build.bat): output "standalone" → .next/standalone (Node server)
//   - Tauri (build-tauri.bat, build:static): output "export" → out/ (static HTML/CSS/JS for Tauri webview)
//
// Static export means API routes won't exist — the client scanner handles that automatically.

const nextConfig: NextConfig = isTauriBuild
  ? {
      // ===== TAURI / STATIC EXPORT =====
      output: "export",
      images: { unoptimized: true },
      trailingSlash: false,
      reactStrictMode: false,
      typescript: {
        ignoreBuildErrors: true,
      },
    }
  : {
      // ===== WEB / STANDALONE SERVER =====
      output: "standalone",
      typescript: {
        ignoreBuildErrors: true,
      },
      reactStrictMode: false,
    }

export default nextConfig;
