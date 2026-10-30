import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WebApp } from "@/components/web-app";
import "./globals.css";
import { PwaManager } from "@/components/pwa-manager";

const manrope = localFont({
  variable: "--font-manrope",
  display: "swap",
  src: [
    { path: "../../node_modules/@expo-google-fonts/manrope/400Regular/Manrope_400Regular.ttf", weight: "400", style: "normal" },
    { path: "../../node_modules/@expo-google-fonts/manrope/500Medium/Manrope_500Medium.ttf", weight: "500", style: "normal" },
    { path: "../../node_modules/@expo-google-fonts/manrope/600SemiBold/Manrope_600SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../../node_modules/@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "Sổ Vật Tư | Quản lý vật tư công trình",
  description: "Đặt vật tư, duyệt đơn, theo dõi công trình và chi phí.",
  applicationName: "Sổ Vật Tư",
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sổ Vật Tư",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/app-icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#4f46e5",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="vi" className={manrope.variable}><body className="min-h-screen bg-background font-sans text-foreground antialiased"><TooltipProvider><WebApp />{children}</TooltipProvider><PwaManager/><Toaster richColors position="top-right" /></body></html>;
}
