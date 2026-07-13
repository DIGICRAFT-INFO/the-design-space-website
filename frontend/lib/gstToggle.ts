// src/lib/gstToggle.ts
const KEY = "gst_enabled";

export function setGstEnabledLocal(v: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, v ? "1" : "0");
  window.dispatchEvent(new Event("gst_enabled_changed")); // same tab update
}

export function getGstEnabledLocal(defaultValue = true) {
  if (typeof window === "undefined") return defaultValue;
  const v = localStorage.getItem(KEY);
  if (v === null) return defaultValue;
  return v === "1";
}