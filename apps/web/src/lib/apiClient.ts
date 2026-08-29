import { getCurrentSession } from "./cognitoAuth";
import { getRuntimeConfig } from "./runtimeConfig";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

const request = async <T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> => {
  const { apiUrl } = getRuntimeConfig();
  // getCurrentSession() はアクセストークンが期限切れの場合、
  // 内部でリフレッシュトークンを使って自動的に再取得する。
  const session = await getCurrentSession();
  if (!session) {
    throw new ApiError(401, "ログインが必要です");
  }

  const res = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      // HttpJwtAuthorizer はIDトークンのクレーム(sub/email)を参照するためIDトークンを送る
      Authorization: session.idToken,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    throw new ApiError(
      res.status,
      (data as { message?: string })?.message ?? `Request failed: ${res.status}`,
      data,
    );
  }

  return data as T;
};

export const apiClient = {
  get: <T>(path: string): Promise<T> => request<T>("GET", path),
  post: <T>(path: string, body: unknown): Promise<T> =>
    request<T>("POST", path, body),
};
