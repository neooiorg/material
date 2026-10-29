import { fetch } from "expo/fetch";
import { authClient } from "./auth-client";
import { apiBaseUrl } from "./runtime-config";
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const baseUrl = apiBaseUrl;
  if (!baseUrl) throw new ApiError("EXPO_PUBLIC_API_URL chưa được cấu hình.", 0);
  const cookie = await authClient.getCookie();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      // Native requests authenticate through the Expo cookie adapter. On web,
      // the browser owns the httpOnly cookie, so it must be included on each
      // cross-origin API request.
      credentials: init.credentials ?? (process.env.EXPO_OS === "web" ? "include" : "omit"),
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...init.headers },
    });
  }
  catch { throw new ApiError("Không thể kết nối máy chủ.", 0); }
  if (!response.ok) { const body = await response.json().catch(() => ({})) as { error?: string }; throw new ApiError(body.error ?? `HTTP ${response.status}`, response.status); }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}
export const jsonBody = (value: unknown): RequestInit => ({ body: JSON.stringify(value) });
