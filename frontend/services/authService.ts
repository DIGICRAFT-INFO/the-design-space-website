import API_BASE_URL from "@/lib/config";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  full_name: string;
  email: string;
  password: string;
  role: string;
};

export type User = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string | null;
  profile_image?: string | null;
  is_active?: boolean;
  created_at?: string;
};

export type AuthResponse = {
  access: string;
  refresh: string;
  user: User;
};

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────

export async function loginUser(
  payload: LoginPayload
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Invalid login credentials");
  }

  // Store tokens — single canonical key only
  localStorage.setItem("access", data.access);
  localStorage.setItem("refresh", data.refresh);
  localStorage.setItem("user", JSON.stringify(data.user));

  return data;
}

// ─────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────

export async function registerUser(payload: RegisterPayload): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data: any = {};
  try {
    data = JSON.parse(text);
  } catch {
    console.error("NON-JSON RESPONSE:", text);
    throw new Error("Server error. Please try again.");
  }

  if (!response.ok) {
    throw new Error(
      data.email?.[0] ||
        data.password?.[0] ||
        data.role?.[0] ||
        data.detail ||
        "Registration failed"
    );
  }
}

// ─────────────────────────────────────────────
// TOKEN REFRESH
// ─────────────────────────────────────────────

async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem("refresh");
  if (!refresh) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    // Store under single canonical key only
    localStorage.setItem("access", data.access);
    return data.access;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// AUTH FETCH
// ─────────────────────────────────────────────

export async function authFetch(url: string, options: RequestInit = {}) {
  let token = localStorage.getItem("access");

  if (!token) {
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  // Only inject Content-Type for non-FormData bodies so multipart uploads
  // get the correct boundary set automatically by the browser.
  const isFormData = options.body instanceof FormData;
  const baseHeaders: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
  };

  let response = await fetch(url, {
    ...options,
    headers: {
      ...baseHeaders,
      ...(options.headers as Record<string, string> || {}),
    },
  });

  // If token expired, try refreshing
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryHeaders: Record<string, string> = {
        Authorization: `Bearer ${newToken}`,
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
      };
      response = await fetch(url, {
        ...options,
        headers: {
          ...retryHeaders,
          ...(options.headers as Record<string, string> || {}),
        },
      });
    } else {
      localStorage.clear();
      window.location.href = "/login";
      throw new Error("Session expired. Please login again.");
    }
  }

  return response;
}

// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────

export async function logoutUser(): Promise<void> {
  const refresh = localStorage.getItem("refresh");

  try {
    await fetch(`${API_BASE_URL}/auth/logout/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("access")}`,
      },
      body: JSON.stringify({ refresh }),
    });
  } catch (err) {
    console.error("Logout request failed:", err);
  }

  localStorage.clear();
  window.location.href = "/login";
}

// ─────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────

export function getProfileImageUrl(path?: string | null): string | null {
  if (!path) return null;
  const origin = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
  return `${origin}/${path.replace(/^\//, "")}`;
}

function syncStoredUser(user: User) {
  localStorage.setItem("user", JSON.stringify(user));
}

export async function getCurrentUser(): Promise<User> {
  const response = await authFetch(`${API_BASE_URL}/auth/me/`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Failed to load profile");
  }
  syncStoredUser(data);
  return data;
}

export async function updateProfile(payload: {
  full_name?: string;
  email?: string;
  phone?: string;
}): Promise<User> {
  const response = await authFetch(`${API_BASE_URL}/auth/me/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      data.detail || data.email?.[0] || data.full_name?.[0] || "Update failed"
    );
  }
  syncStoredUser(data);
  return data;
}

export async function changePassword(
  old_password: string,
  new_password: string
): Promise<void> {
  const response = await authFetch(`${API_BASE_URL}/auth/me/change-password/`, {
    method: "POST",
    body: JSON.stringify({ old_password, new_password }),
  });
  const data = await response.json();
  if (!response.ok) {
    // Surface the most specific error from backend
    const msg =
      data.old_password?.[0] ||
      data.new_password?.[0] ||
      data.detail ||
      "Password change failed";
    throw new Error(msg);
  }
}

export async function uploadAvatar(file: File): Promise<User> {
  const token = localStorage.getItem("access");
  if (!token) throw new Error("Unauthorized");

  const formData = new FormData();
  formData.append("avatar", file);

  // Use raw fetch (not authFetch) so the browser sets the multipart/form-data boundary
  const response = await fetch(`${API_BASE_URL}/auth/me/avatar/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.detail || "Upload failed");
  }

  syncStoredUser(data.user);
  return data.user;
}

export async function deleteAvatar(): Promise<User> {
  const response = await authFetch(`${API_BASE_URL}/auth/me/avatar/`, {
    method: "DELETE",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.detail || "Failed to remove image");
  }
  syncStoredUser(data.user);
  return data.user;
}
