export const API_URL =
  import.meta.env.VITE_API_URL ?? "/api";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type ApiOptions = Omit<RequestInit, "body"> & {
  token?: string | null;
  body?: unknown;
};

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { token, headers, body, ...rest } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(body !== undefined && !isFormData
        ? { "Content-Type": "application/json" }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body:
      body === undefined
        ? undefined
        : isFormData
          ? body
          : JSON.stringify(body),
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new ApiError(extractMessage(payload), response.status, payload);
  }

  return payload as T;
}

export function extractMessage(error: unknown): string {
  if (!error) {
    return "Ocurrió un error inesperado.";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  if (typeof error === "object") {
    const candidate = error as {
      message?: string;
      error?: string;
      errors?: Record<string, string[]>;
    };

    if (candidate.message) {
      return candidate.message;
    }

    if (candidate.error) {
      return candidate.error;
    }

    if (candidate.errors) {
      const firstGroup = Object.values(candidate.errors)[0];

      if (firstGroup?.[0]) {
        return firstGroup[0];
      }
    }
  }

  return "Ocurrió un error inesperado.";
}
