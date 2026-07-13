"use client";

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="animate-spin w-8 h-8 border-4 border-[#C8922A] border-t-transparent rounded-full" />
      {message && (
        <p className="text-[#9A8F82] text-sm font-medium">{message}</p>
      )}
    </div>
  );
}
