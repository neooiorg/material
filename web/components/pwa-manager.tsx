"use client";

import { useEffect, useState } from "react";
import { Download, Share2, WifiOff, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "material:pwa-install-dismissed";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function PwaManager() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);

    const handleOnline = () => {
      setOnline(true);
      toast.success("Đã kết nối lại mạng.");
    };
    const handleOffline = () => setOnline(false);
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setShowIosGuide(false);
      toast.success("Sổ Vật Tư đã được cài trên thiết bị.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    const userAgent = navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    const dismissed = localStorage.getItem(DISMISSED_KEY) === "true";
    const iosGuideTimer = ios && !isStandalone() && !dismissed
      ? window.setTimeout(() => setShowIosGuide(true), 1200)
      : undefined;

    if ("serviceWorker" in navigator) {
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((registration) => {
        const offerUpdate = (worker: ServiceWorker | null) => {
          if (!worker) return;
          toast.info("Có phiên bản Sổ Vật Tư mới.", {
            duration: Infinity,
            action: {
              label: "Cập nhật",
              onClick: () => worker.postMessage({ type: "SKIP_WAITING" }),
            },
          });
        };

        if (registration.waiting) offerUpdate(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) offerUpdate(worker);
          });
        });

        void registration.update();
      }).catch(() => {
        // The web app remains usable if service-worker registration is unavailable.
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      if (iosGuideTimer) window.clearTimeout(iosGuideTimer);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  function dismissIosGuide() {
    localStorage.setItem(DISMISSED_KEY, "true");
    setShowIosGuide(false);
  }

  return <>
    {!online ? (
      <div className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-foreground px-4 py-3 text-sm text-background shadow-lg" role="status">
        <WifiOff className="size-4 shrink-0" aria-hidden="true" />
        <span>Đang ngoại tuyến. Dữ liệu trực tuyến sẽ tải lại khi có mạng.</span>
      </div>
    ) : null}

    {installPrompt ? (
      <aside className="pwa-install-panel" aria-label="Cài ứng dụng Sổ Vật Tư">
        <BrandLogo className="h-9 w-auto shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Cài Sổ Vật Tư trên thiết bị</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Mở nhanh như ứng dụng và dùng được giao diện cơ bản khi mất mạng.</p>
        </div>
        <Button size="sm" onClick={() => void install()}><Download aria-hidden="true" />Cài đặt</Button>
      </aside>
    ) : null}

    {showIosGuide ? (
      <aside className="pwa-install-panel" aria-label="Hướng dẫn cài Sổ Vật Tư trên iPhone hoặc iPad">
        <Share2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Cài Sổ Vật Tư trên iPhone/iPad</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Mở bằng Safari, chạm Chia sẻ rồi chọn “Thêm vào Màn hình chính”.</p>
        </div>
        <Button size="icon" variant="ghost" onClick={dismissIosGuide} aria-label="Đóng hướng dẫn cài đặt"><X aria-hidden="true" /></Button>
      </aside>
    ) : null}
  </>;
}
