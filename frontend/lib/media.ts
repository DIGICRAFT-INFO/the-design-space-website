import API_BASE_URL from "@/lib/config";

export const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

/** Turns a backend-relative path like "/uploads/website/images/foo.jpg" into
 *  an absolute URL. Leaves already-absolute URLs (http/https) untouched. */
export function resolveMediaUrl(fileUrl?: string | null): string {
  if (!fileUrl) return "";
  return fileUrl.startsWith("http") ? fileUrl : `${BACKEND_ORIGIN}${fileUrl}`;
}
