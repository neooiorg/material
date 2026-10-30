"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff, Send } from "lucide-react";
import { toast } from "sonner";
import { api, jsonBody } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PushStatus = { publicKey: string; subscribed: boolean };

function decodePublicKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function clearPushSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  const subscription = await currentSubscription().catch(() => null);
  if (!subscription) return;
  await api("/api/push/subscribe", { method: "DELETE", ...jsonBody({ endpoint: subscription.endpoint }) }).catch(() => undefined);
  await subscription.unsubscribe().catch(() => undefined);
}

export function PushNotificationSettings() {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const available = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(available);
    if (!available) return;
    setPermission(Notification.permission);
    api<PushStatus>("/api/push/status").then(async (result) => {
      setStatus(result);
      const subscription = await currentSubscription();
      setEnabled(Boolean(subscription));
      if (subscription && Notification.permission === "granted") {
        await api("/api/push/subscribe", { method: "POST", ...jsonBody(subscription.toJSON()) });
      }
    }).catch(() => undefined);
  }, []);

  async function enable() {
    if (!status) return;
    setBusy(true);
    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted") throw new Error("Trình duyệt chưa được cấp quyền gửi thông báo.");
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const applicationServerKey = decodePublicKey(status.publicKey);
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer.slice(applicationServerKey.byteOffset, applicationServerKey.byteOffset + applicationServerKey.byteLength),
      });
      await api("/api/push/subscribe", { method: "POST", ...jsonBody(subscription.toJSON()) });
      setEnabled(true);
      toast.success("Đã bật thông báo PWA trên thiết bị này.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể bật thông báo PWA.");
    } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true);
    try {
      const subscription = await currentSubscription();
      if (subscription) {
        await api("/api/push/subscribe", { method: "DELETE", ...jsonBody({ endpoint: subscription.endpoint }) });
        await subscription.unsubscribe();
      }
      setEnabled(false);
      toast.success("Đã tắt thông báo PWA trên thiết bị này.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tắt thông báo PWA.");
    } finally { setBusy(false); }
  }

  async function test() {
    setBusy(true);
    try {
      const result = await api<{ sent: number }>("/api/push/test", { method: "POST" });
      if (!result.sent) throw new Error("Thiết bị chưa có subscription hoạt động. Hãy tắt rồi bật lại thông báo.");
      toast.success("Đã gửi thông báo thử đến thiết bị này.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể gửi thông báo thử.");
    } finally { setBusy(false); }
  }

  return <Card className="mb-6">
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><BellRing className="size-5" aria-hidden="true"/>Thông báo PWA</CardTitle>
      <CardDescription>Nhận thông báo đơn hàng và phân quyền kể cả khi Sổ Vật Tư đang đóng.</CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm">
        <p className="font-medium">{!supported ? "Trình duyệt chưa hỗ trợ" : enabled ? "Đang bật trên thiết bị này" : permission === "denied" ? "Quyền thông báo đang bị chặn" : "Chưa bật trên thiết bị này"}</p>
        <p className="mt-1 text-muted-foreground">Mỗi tài khoản và thiết bị được đăng ký riêng; đăng xuất sẽ gỡ subscription khỏi thiết bị.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {enabled ? <><Button variant="outline" disabled={busy} onClick={() => void test()}><Send aria-hidden="true"/>Gửi thử</Button><Button variant="outline" disabled={busy} onClick={() => void disable()}><BellOff aria-hidden="true"/>Tắt thông báo</Button></> : <Button disabled={!supported || permission === "denied" || busy || !status} onClick={() => void enable()}><BellRing aria-hidden="true"/>{busy ? "Đang bật…" : "Bật thông báo"}</Button>}
      </div>
    </CardContent>
  </Card>;
}
