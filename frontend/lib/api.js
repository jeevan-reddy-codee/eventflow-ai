import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export class ApiClientError extends Error {
  constructor(message, details = null, statusCode = 0) {
    super(message);
    this.name = "ApiClientError";
    this.details = details;
    this.statusCode = statusCode;
  }
}

function buildUrl(path) {
  if (path.startsWith("http")) return path;
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseResponse(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new ApiClientError("Backend returned an invalid response", null, response.status);
  }
}

export async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();

  if (!headers.has("Content-Type") && options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(buildUrl(path), {
      ...options,
      headers,
      body:
        options.body && typeof options.body !== "string"
          ? JSON.stringify(options.body)
          : options.body,
    });
    const payload = await parseResponse(response);

    if (!response.ok || payload?.success === false) {
      throw new ApiClientError(
        payload?.message || `Request failed with status ${response.status}`,
        payload?.details || null,
        response.status
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    throw new ApiClientError("Unable to reach EventFlow AI backend. Check your connection and API URL.");
  }
}

export function get(path, options = {}) {
  return request(path, { ...options, method: "GET" });
}

export function post(path, body, options = {}) {
  return request(path, { ...options, method: "POST", body });
}

export function patch(path, body, options = {}) {
  return request(path, { ...options, method: "PATCH", body });
}

export function del(path, options = {}) {
  return request(path, { ...options, method: "DELETE" });
}

export const api = {
  get,
  post,
  patch,
  delete: del,
  request,
};
