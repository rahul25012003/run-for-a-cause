/**
 * Typed API client for the RunForACause backend.
 * All requests include credentials (cookies) by default for auth.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  detail: string | undefined;
  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

interface PydanticIssue {
  type?: string;
  loc?: unknown[];
  msg?: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

/** Convert any FastAPI error `detail` shape into a single readable string. */
function flattenDetail(detail: unknown): string | undefined {
  if (detail == null) return undefined;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    // Pydantic 422: combine each issue's last loc segment + msg
    return detail
      .map((d) => {
        if (typeof d === "string") return d;
        if (d && typeof d === "object") {
          const issue = d as PydanticIssue;
          const loc = Array.isArray(issue.loc)
            ? issue.loc.filter((p) => p !== "body").join(".")
            : "";
          const msg = issue.msg ?? "Invalid value";
          return loc ? `${loc}: ${msg}` : msg;
        }
        return String(d);
      })
      .filter(Boolean)
      .join("; ");
  }
  if (typeof detail === "object") {
    try {
      return JSON.stringify(detail);
    } catch {
      return undefined;
    }
  }
  return String(detail);
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };

  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });

  if (!response.ok) {
    let detail: string | undefined;
    try {
      // FastAPI returns either:
      //   - HTTPException: { detail: "string" }
      //   - Pydantic 422:  { detail: [{type, loc, msg, input, ctx}, ...] }
      // Sonner can't render the array as a React child, so flatten here
      // before it ever reaches the toast.
      const body = (await response.json()) as { detail?: unknown };
      detail = flattenDetail(body.detail);
    } catch {
      detail = await response.text();
    }
    throw new ApiError(
      detail ?? `Request failed with ${response.status}`,
      response.status,
      detail,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "DELETE",
      body: body ? JSON.stringify(body) : undefined,
    }),
};
