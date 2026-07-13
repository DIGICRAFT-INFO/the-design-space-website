// Strip any trailing slash to prevent double-slash in API URLs
const raw = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";
const API_BASE_URL = raw.replace(/\/+$/, "");
export default API_BASE_URL;
