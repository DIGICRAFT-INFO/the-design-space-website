import API_BASE_URL from "@/lib/config";

export interface InAppNotification {
  id: string;
  user: string | null;
  event_type: string;
  title: string;
  message: string;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationsResponse {
  notifications: InAppNotification[];
  total: number;
  page: number;
  totalPages: number;
}

// Returns the auth token from localStorage, or null if SSR / not logged in
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    null
  );
}

function getHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchNotifications(params?: {
  page?: number;
  limit?: number;
  type?: string;
  is_read?: boolean;
}): Promise<NotificationsResponse> {
  // BUG FIX: Don't hit the API if unauthenticated — avoids 401 noise
  if (!getToken()) return { notifications: [], total: 0, page: 1, totalPages: 0 };

  const searchParams = new URLSearchParams();
  if (params?.page)                    searchParams.set("page",    String(params.page));
  if (params?.limit)                   searchParams.set("limit",   String(params.limit));
  if (params?.type)                    searchParams.set("type",    params.type);
  if (params?.is_read !== undefined)   searchParams.set("is_read", String(params.is_read));

  const query = searchParams.toString();
  const url = `${API_BASE_URL}/in-app-notifications/${query ? `?${query}` : ""}`;

  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch notifications: ${res.status}`);
  return res.json();
}

export async function fetchUnreadCount(): Promise<number> {
  // BUG FIX: Guard against unauthenticated calls (SSR, Strict Mode double-invoke,
  // or render before token is written to localStorage). Without this, every mount
  // fires a 401 to the backend and pollutes the console.
  if (!getToken()) return 0;

  const res = await fetch(`${API_BASE_URL}/in-app-notifications/unread-count/`, {
    headers: getHeaders(),
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.count ?? 0;
}

export async function markAsRead(id: string): Promise<InAppNotification> {
  const res = await fetch(`${API_BASE_URL}/in-app-notifications/${id}/read/`, {
    method: "PATCH",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to mark as read: ${res.status}`);
  return res.json();
}

export async function markAllAsRead(): Promise<{ modified_count: number }> {
  const res = await fetch(`${API_BASE_URL}/in-app-notifications/mark-all-read/`, {
    method: "PATCH",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to mark all as read: ${res.status}`);
  return res.json();
}

export async function deleteNotification(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/in-app-notifications/${id}/`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok && res.status !== 204) throw new Error(`Delete failed: ${res.status}`);
}