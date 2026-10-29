import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, context: Context) {
  const configured = process.env.MATERIAL_API_URL?.trim();
  const base = configured || (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");
  if (!base) return NextResponse.json({ error: "MATERIAL_API_URL chưa được cấu hình cho web." }, { status: 503 });

  let target: URL;
  try {
    const backend = new URL(base);
    if (!(["http:", "https:"] as string[]).includes(backend.protocol)) throw new Error("Invalid protocol");
    const { path } = await context.params;
    target = new URL(`/api/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`, backend);
  } catch {
    return NextResponse.json({ error: "MATERIAL_API_URL không hợp lệ." }, { status: 503 });
  }

  const headers = new Headers(request.headers);
  for (const name of ["host", "connection", "content-length", "accept-encoding", "x-forwarded-host", "x-forwarded-proto"]) headers.delete(name);
  const publicOrigin = process.env.MATERIAL_WEB_URL?.trim()
    || (process.env.NODE_ENV === "production" ? "https://material.apps.neooi.com" : request.nextUrl.origin);
  const publicUrl = new URL(publicOrigin);
  headers.set("x-forwarded-host", publicUrl.host);
  headers.set("x-forwarded-proto", publicUrl.protocol.replace(":", ""));
  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      redirect: "manual",
      cache: "no-store",
    });
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete("set-cookie");
    for (const cookie of upstream.headers.getSetCookie()) responseHeaders.append("set-cookie", cookie);
    responseHeaders.delete("transfer-encoding");
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    return new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ error: "Không thể kết nối máy chủ API." }, { status: 502 });
  }
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const PUT = forward;
export const DELETE = forward;
