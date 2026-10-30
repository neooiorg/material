"use client";

import { useEffect } from "react";

export const NOTIFICATIONS_CHANGED_EVENT = "so-vat-tu:notifications-changed";

export function announceNotificationsChanged() {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}

export function NotificationSync() {
  useEffect(() => {
    const stream = new EventSource("/api/notifications/stream");
    const handleStreamEvent = () => announceNotificationsChanged();
    const handleWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "NOTIFICATION_RECEIVED") announceNotificationsChanged();
    };

    stream.addEventListener("notification", handleStreamEvent);
    navigator.serviceWorker?.addEventListener("message", handleWorkerMessage);
    return () => {
      stream.close();
      navigator.serviceWorker?.removeEventListener("message", handleWorkerMessage);
    };
  }, []);

  return null;
}
