"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export type ToastState = { message: string; type: "success" | "error" | "info" } | null;

export default function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg = { success: "#10B981", error: "#EF4444", info: "#C8922A" }[type];

  return (
    <div
      className="fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-[13px] font-semibold"
      style={{ backgroundColor: bg }}
    >
      {message}
      <button onClick={onClose}>
        <X size={14} />
      </button>
    </div>
  );
}
