"use client";

import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
        <AlertCircle size={28} className="text-red-500" />
      </div>
      <p className="text-[#6B6259] text-sm font-medium text-center max-w-md">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
