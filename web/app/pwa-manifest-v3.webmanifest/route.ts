import type { MetadataRoute } from "next";
import { NextResponse } from "next/server";

const manifest: MetadataRoute.Manifest = {
  id: "/",
  name: "Sổ Vật Tư",
  short_name: "Sổ Vật Tư",
  description: "Đặt vật tư, duyệt đơn, theo dõi công trình và chi phí.",
  lang: "vi",
  start_url: "/?source=pwa",
  scope: "/",
  display: "standalone",
  display_override: ["window-controls-overlay", "standalone"],
  orientation: "any",
  background_color: "#ffffff",
  theme_color: "#4f46e5",
  categories: ["business", "productivity"],
  prefer_related_applications: false,
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
  shortcuts: [
    { name: "Tạo đơn vật tư", short_name: "Tạo đơn", url: "/orders/new?source=pwa-shortcut", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    { name: "Đơn đặt vật tư", short_name: "Đơn vật tư", url: "/orders?source=pwa-shortcut", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    { name: "Thông báo", short_name: "Thông báo", url: "/notifications?source=pwa-shortcut", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
  ],
};

export function GET() {
  return NextResponse.json(manifest, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Content-Type": "application/manifest+json; charset=utf-8",
    },
  });
}
