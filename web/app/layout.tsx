import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

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
  title: "Material | Quản lý vật tư công trình",
  description: "Đặt vật tư, duyệt đơn, theo dõi công trình và chi phí.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="vi" className={manrope.variable}><body className="min-h-screen bg-background font-sans text-foreground antialiased"><TooltipProvider>{children}</TooltipProvider><Toaster richColors position="top-right" /></body></html>;
}
