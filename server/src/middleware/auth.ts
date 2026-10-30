import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";
import type { UserRole } from "../db/schema.js";

export async function requireUser(request: Request, response: Response, next: NextFunction) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  if (!session?.user) {
    response.status(401).json({ error: "Chưa đăng nhập." });
    return;
  }
  const current = session.user as typeof session.user & { role?: UserRole };
  const role = current.role === "director" ? "admin" : (current.role ?? "pending");
  if (role === "supplier") {
    response.status(403).json({ error: "Tài khoản Cửa hàng không sử dụng ứng dụng nội bộ này." });
    return;
  }
  request.currentUser = {
    id: current.id,
    name: current.name,
    email: current.email,
    role,
    image: current.image,
  };
  next();
}

export function requireRoles(...roles: UserRole[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.currentUser || !roles.includes(request.currentUser.role)) {
      response.status(403).json({ error: "Bạn không có quyền thực hiện thao tác này." });
      return;
    }
    next();
  };
}
