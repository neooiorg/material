import webpush, { type PushSubscription } from "web-push";
import { EventEmitter } from "node:events";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { notifications, pushSubscriptions, pushVapidKeys } from "../db/schema.js";
import { config } from "../config.js";

type SubscriptionInput = {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
};

type PushPayload = { title: string; body: string; url?: string; tag?: string };
const KEY_ID = "default";
let initialized = false;
let publicKey = "";
const notificationEvents = new EventEmitter();
notificationEvents.setMaxListeners(0);

export function subscribeToNotificationEvents(userId: string, listener: () => void) {
  const eventName = `notification:${userId}`;
  notificationEvents.on(eventName, listener);
  return () => notificationEvents.off(eventName, listener);
}

export function publishNotificationEvents(userIds: string[]) {
  for (const userId of userIds) notificationEvents.emit(`notification:${userId}`);
}

function validText(value: unknown, max: number) {
  return typeof value === "string" && value.length > 0 && value.length <= max ? value : null;
}

export async function initializePushService() {
  if (initialized) return;
  let [keys] = await db.select().from(pushVapidKeys).where(eq(pushVapidKeys.id, KEY_ID));
  if (!keys) {
    const generated = webpush.generateVAPIDKeys();
    [keys] = await db.insert(pushVapidKeys).values({
      id: KEY_ID,
      publicKey: generated.publicKey,
      privateKey: generated.privateKey,
    }).onConflictDoNothing().returning();
    if (!keys) [keys] = await db.select().from(pushVapidKeys).where(eq(pushVapidKeys.id, KEY_ID));
  }
  if (!keys) throw new Error("Không thể khởi tạo khóa Web Push.");
  publicKey = keys.publicKey;
  webpush.setVapidDetails(config.appUrl, keys.publicKey, keys.privateKey);
  initialized = true;
}

export async function getPushStatus(userId: string) {
  await initializePushService();
  const [subscription] = await db.select({ id: pushSubscriptions.id }).from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)).limit(1);
  return { publicKey, subscribed: Boolean(subscription) };
}

export async function savePushSubscription(userId: string, input: SubscriptionInput) {
  const endpoint = validText(input.endpoint, 4096);
  const p256dh = validText(input.keys?.p256dh, 1024);
  const auth = validText(input.keys?.auth, 1024);
  if (!endpoint || !p256dh || !auth || !endpoint.startsWith("https://")) throw new Error("Subscription Web Push không hợp lệ.");
  await db.insert(pushSubscriptions).values({ userId, endpoint, p256dh, auth, updatedAt: new Date() }).onConflictDoUpdate({
    target: pushSubscriptions.endpoint,
    set: { userId, p256dh, auth, updatedAt: new Date() },
  });
  return { ok: true };
}

export async function removePushSubscription(userId: string, endpoint: unknown) {
  const value = validText(endpoint, 4096);
  if (value) await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, value)));
  else await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  return { ok: true };
}

export async function sendPushNotifications(userIds: string[], payload: PushPayload) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return 0;
  publishNotificationEvents(ids);
  await initializePushService();
  const subscriptions = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, ids));
  let sent = 0;
  await Promise.all(subscriptions.map(async (item) => {
    const subscription: PushSubscription = { endpoint: item.endpoint, keys: { p256dh: item.p256dh, auth: item.auth } };
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 60 * 60, urgency: "high" });
      sent += 1;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, item.id));
      else console.error("Không thể gửi Web Push.", { statusCode, userId: item.userId });
    }
  }));
  return sent;
}

export async function sendTestPush(userId: string) {
  const title = "Kiểm tra thông báo PWA";
  const body = "Thông báo Web Push của Sổ Vật Tư đang hoạt động trên thiết bị này.";
  await db.insert(notifications).values({ userId, title, message: body });
  const sent = await sendPushNotifications([userId], { title, body, url: "/notifications", tag: `push-test-${Date.now()}` });
  return { ok: true, sent };
}
