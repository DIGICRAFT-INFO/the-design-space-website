// lib/api.ts
export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("access") || localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    // Clear all auth keys — not just "token" — to prevent stale state
    localStorage.removeItem("access");
    localStorage.removeItem("token");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    window.location.href = "/login";
    return response;
  }

  // Bug 4 fix: throw a proper Error for non-2xx responses instead of returning
  // the raw Response — callers calling .json() on an HTML error body would
  // otherwise get a SyntaxError with no useful context.
  if (!response.ok) {
    let message = response.statusText || "Request failed";
    try {
      const errData = await response.json();
      message = errData.detail || errData.message || message;
    } catch {
      // body is not JSON (e.g. HTML error page from gateway) — keep statusText
    }
    throw new Error(message);
  }

  return response;
};