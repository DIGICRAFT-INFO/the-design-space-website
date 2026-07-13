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
  // Guard: skip the request entirely if there's no token.
  // Prevents 401 noise during React Strict Mode double-invoke on mount.
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