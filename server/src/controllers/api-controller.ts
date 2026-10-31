import type { Request, Response } from "express";
import { listActivity } from "../services/activity-service.js";
import * as catalog from "../services/catalog-service.js";
import * as orders from "../services/order-service.js";
import * as receipts from "../services/receipt-service.js";
import * as reports from "../services/report-service.js";
import * as notification from "../services/notification-service.js";
import * as members from "../services/member-service.js";
import * as accessRequests from "../services/access-request-service.js";
import * as push from "../services/push-service.js";
import { publicTestAccounts } from "../services/test-account-service.js";

const idParam = (request: Request) => Number(request.params.id);
const me = (request: Request) => request.currentUser!;

export async function testAccounts(_request: Request, response: Response) { response.json(publicTestAccounts()); }
export async function session(request: Request, response: Response) { response.json({ user: me(request) }); }
export async function ownAccessRequest(request: Request, response: Response) { response.json(await accessRequests.getOwnAccessRequest(me(request))); }
export async function accessRequestSubmit(request: Request, response: Response) { response.status(201).json(await accessRequests.submitAccessRequest(me(request), request.body ?? {})); }
export async function dashboard(request: Request, response: Response) { response.json(await reports.getDashboard(me(request))); }
export async function orderList(request: Request, response: Response) { response.json(await orders.listOrders(me(request))); }
export async function orderDetail(request: Request, response: Response) {
  const value = await orders.getOrder(me(request), idParam(request));
  if (!value) { response.status(404).json({ error: "Không tìm thấy đơn." }); return; }
  response.json(value);
}
export async function orderCreate(request: Request, response: Response) { response.status(201).json(await orders.createOrder(me(request), request.body)); }
export async function orderApprove(request: Request, response: Response) { await orders.approveOrder(me(request), idParam(request)); response.json({ ok: true }); }
export async function orderReject(request: Request, response: Response) { await orders.rejectOrder(me(request), idParam(request), String(request.body?.reason ?? "")); response.json({ ok: true }); }
export async function approvalList(_request: Request, response: Response) { response.json(await orders.getApprovalOrders()); }
export async function orderOptions(_request: Request, response: Response) { response.json(await catalog.getOrderOptions()); }
export async function receiptList(request: Request, response: Response) { response.json(await receipts.listReceipts(me(request))); }
export async function orderProofUpload(request: Request, response: Response) {
  response.status(201).json(await receipts.addProofs(me(request), idParam(request), (request.files as Express.Multer.File[] | undefined) ?? []));
}
export async function orderProofFile(request: Request, response: Response) {
  const proofId = Number(request.params.proofId);
  if (!Number.isInteger(proofId) || proofId <= 0) throw new Error("Mã chứng từ không hợp lệ.");
  const proof = await receipts.getProofFile(me(request), idParam(request), proofId);
  const safeAscii = proof.originalName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "chung-tu";
  response.setHeader("Content-Type", proof.mimeType);
  response.setHeader("Content-Length", String(proof.size));
  response.setHeader("Cache-Control", "private, max-age=300");
  response.setHeader("Content-Disposition", `inline; filename="${safeAscii}"; filename*=UTF-8''${encodeURIComponent(proof.originalName)}`);
  response.sendFile(proof.path);
}
export async function orderProofDelete(request: Request, response: Response) {
  const proofId = Number(request.params.proofId);
  if (!Number.isInteger(proofId) || proofId <= 0) throw new Error("Mã chứng từ không hợp lệ.");
  await receipts.deleteProof(me(request), idParam(request), proofId);
  response.json({ ok: true });
}
export async function orderConfirmReceipt(request: Request, response: Response) {
  await receipts.confirmReceipt(me(request), idParam(request), request.body ?? {});
  response.json({ ok: true });
}

export async function projectList(_request: Request, response: Response) { response.json(await catalog.listProjects()); }
export async function technicianList(_request: Request, response: Response) { response.json(await catalog.listTechnicians()); }
export async function projectCreate(request: Request, response: Response) { await catalog.createProject(me(request), request.body); response.status(201).json({ ok: true }); }
export async function projectUpdate(request: Request, response: Response) { await catalog.updateProject(me(request), idParam(request), request.body); response.json({ ok: true }); }
export async function projectDelete(request: Request, response: Response) { await catalog.deleteProject(me(request), idParam(request)); response.json({ ok: true }); }
export async function projectSummary(request: Request, response: Response) { response.json(await reports.getProjectSummary(me(request), idParam(request))); }
export async function materialList(_request: Request, response: Response) { response.json(await catalog.listMaterials()); }
export async function materialCreate(request: Request, response: Response) { await catalog.createMaterial(me(request), request.body); response.status(201).json({ ok: true }); }
export async function materialUpdate(request: Request, response: Response) { await catalog.updateMaterial(me(request), idParam(request), request.body); response.json({ ok: true }); }
export async function materialDelete(request: Request, response: Response) { await catalog.deleteMaterial(me(request), idParam(request)); response.json({ ok: true }); }
export async function supplierContactList(_request: Request, response: Response) { response.json(await catalog.listSupplierContacts()); }
export async function supplierContactCreate(request: Request, response: Response) { await catalog.createSupplierContact(me(request), request.body); response.status(201).json({ ok: true }); }
export async function supplierContactUpdate(request: Request, response: Response) { await catalog.updateSupplierContact(me(request), idParam(request), request.body); response.json({ ok: true }); }
export async function supplierContactDelete(request: Request, response: Response) { await catalog.deleteSupplierContact(me(request), idParam(request)); response.json({ ok: true }); }
export async function budgetList(request: Request, response: Response) { response.json(await catalog.listBudgets(Number(request.query.projectId))); }
export async function budgetUpsert(request: Request, response: Response) { await catalog.upsertBudget(me(request), request.body); response.json({ ok: true }); }
export async function budgetDelete(request: Request, response: Response) { await catalog.deleteBudget(me(request), idParam(request)); response.json({ ok: true }); }

export async function reconcile(request: Request, response: Response) { response.json(await reports.getReconcile(request.query.projectId ? Number(request.query.projectId) : undefined)); }
export async function report(request: Request, response: Response) { response.json(await reports.getReport(request.query.month as string | undefined, request.query.projectId ? Number(request.query.projectId) : undefined)); }
export async function reportExport(request: Request, response: Response) {
  const file = await reports.exportReport(request.query.month as string | undefined, request.query.projectId ? Number(request.query.projectId) : undefined);
  response.setHeader("Content-Type", "text/csv; charset=utf-8");
  response.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
  response.send(file.csv);
}
export async function notificationRecent(request: Request, response: Response) { response.json(await notification.recentNotifications(me(request).id)); }
export async function notificationList(request: Request, response: Response) { response.json(await notification.allNotifications(me(request).id)); }
export async function notificationRead(request: Request, response: Response) {
  await orders.markNotificationsRead(me(request), request.body?.ids);
  push.publishNotificationEvents([me(request).id]);
  response.json({ ok: true });
}
export function notificationStream(request: Request, response: Response) {
  response.status(200);
  response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  response.setHeader("X-Accel-Buffering", "no");
  response.flushHeaders();

  const sendChange = () => response.write(`event: notification\ndata: ${JSON.stringify({ changedAt: new Date().toISOString() })}\n\n`);
  const unsubscribe = push.subscribeToNotificationEvents(me(request).id, sendChange);
  const heartbeat = setInterval(() => response.write(": heartbeat\n\n"), 20_000);
  response.write(`event: connected\ndata: {}\n\n`);

  request.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
    response.end();
  });
}
export async function pushStatus(request: Request, response: Response) { response.json(await push.getPushStatus(me(request).id)); }
export async function pushSubscribe(request: Request, response: Response) { response.status(201).json(await push.savePushSubscription(me(request).id, request.body ?? {})); }
export async function pushUnsubscribe(request: Request, response: Response) { response.json(await push.removePushSubscription(me(request).id, request.body?.endpoint)); }
export async function pushTest(request: Request, response: Response) { response.json(await push.sendTestPush(me(request).id)); }
export async function activityList(_request: Request, response: Response) { response.json(await listActivity()); }
export async function memberList(_request: Request, response: Response) { response.json(await members.listMembers()); }
export async function memberInvite(request: Request, response: Response) { response.status(201).json(await members.inviteMember(me(request), request.body)); }
export async function memberUpdate(request: Request, response: Response) { await members.updateMember(me(request), String(request.params.id), request.body); response.json({ ok: true }); }
export async function memberDelete(request: Request, response: Response) { await members.deleteMember(me(request), String(request.params.id)); response.json({ ok: true }); }
export async function accessRequestList(_request: Request, response: Response) { response.json(await accessRequests.listPendingAccessRequests()); }
export async function accessRequestApprove(request: Request, response: Response) { await accessRequests.approveAccessRequest(me(request), String(request.params.id), request.body ?? {}); response.json({ ok: true }); }
export async function accessRequestReject(request: Request, response: Response) { await accessRequests.rejectAccessRequest(me(request), String(request.params.id)); response.json({ ok: true }); }
