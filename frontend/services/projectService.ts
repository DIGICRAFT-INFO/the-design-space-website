

import API_BASE_URL from "@/lib/config";

export type Project = {
  id?: string;
  client: string; // UUID string
  client_name?: string;

  name: string;
  property_type: string;
  style_category: string;
  area_sqft: number | string | null;
  budget_range: string;
  start_date: string;
  expected_end_date: string;
  status: string;
  notes: string;
};

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token")
      : null;

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function handleUnauthorized(status: number) {
  if (status === 401 && typeof window !== "undefined") {
    ["access", "access_token", "token", "refresh", "refresh_token"].forEach((k) =>
      localStorage.removeItem(k)
    );
    window.location.href = "/login";
  }
}

// nested endpoint payload me client/id/client_name mat bhejo
function toProjectPayload(data: Partial<Project>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, client, client_name, ...payload } = data as any;
  return payload;
}

// ✅ Global: GET /projects/
export async function getProjects(): Promise<Project[]> {
  const response = await fetch(`${API_BASE_URL}/clients/projects/`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  handleUnauthorized(response.status);

  if (!response.ok) throw new Error(`Projects fetch failed: ${response.status}`);
  const data = await response.json();
  return (data.results ?? data) as Project[];
}

// ✅ Client-wise: GET /clients/:clientId/projects/
export async function getProjectsByClient(clientId: string): Promise<Project[]> {
  const response = await fetch(`${API_BASE_URL}/clients/${clientId}/projects/`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  handleUnauthorized(response.status);

  if (!response.ok) throw new Error(`Projects fetch failed: ${response.status}`);
  const data = await response.json();
  return (data.results ?? data) as Project[];
}

// ✅ POST /clients/:clientId/projects/
export async function createProject(clientId: string, data: Project): Promise<Project> {
  const payload ={
    ...data,
    client: clientId, // ✅ force include client always
  };
  const response = await fetch(`${API_BASE_URL}/clients/${clientId}/projects/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  handleUnauthorized(response.status);

  const json = await response.json().catch(() => null);

  if (!response.ok) throw new Error(JSON.stringify(json) || "Create project failed");
  return json as Project;
}

export async function updateProject(
  clientId: string | { id: string }, // Accept either string or object
  projectId: string,
  data: Partial<Project>
): Promise<Project> {
  // 1. Resolve the actual string ID
  const actualClientId = typeof clientId === 'object' && clientId !== null 
    ? (clientId as any).id 
    : clientId;

  // 2. Ensure payload uses the clean ID string
  const payload = { 
    ...data, 
    client: actualClientId 
  };

  // 3. Use the clean string ID in the URL
  const response = await fetch(
    `${API_BASE_URL}/clients/${actualClientId}/projects/${projectId}/`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );

  handleUnauthorized(response.status);

  const json = await response.json().catch(() => null);

  if (!response.ok) throw new Error(JSON.stringify(json) || "Update project failed");
  return json as Project;
}
export async function deleteProject(clientId: string, projectId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/clients/${clientId}/projects/${projectId}/`,
    { method: "DELETE", headers: getAuthHeaders() }
  );

  handleUnauthorized(response.status);

  if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
}