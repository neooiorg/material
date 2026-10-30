export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: { ...(init.body && !isFormData ? { "Content-Type": "application/json" } : {}), ...init.headers },
    });
  } catch { throw new ApiError("Không thể kết nối máy chủ.", 0); }
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string; message?: string };
    throw new ApiError(body.error ?? body.message ?? `HTTP ${response.status}`, response.status);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export const jsonBody = (value: unknown): RequestInit => ({ body: JSON.stringify(value) });
