"use client";

import { useState, useEffect } from "react";
import { formatDate, getCalendarDays, isToday } from "@/lib/dateUtils";

const DAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function DateCalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    // Check every 60 seconds if the day has changed (midnight crossover)
    const interval = setInterval(() => {
      const now = new Date();
      if (now.getDate() !== currentDate.getDate()) {
        setCurrentDate(now);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [currentDate]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = getCalendarDays(year, month);

  return (
    <div className="bg-white rounded-2xl border border-[#EDE8DF] p-4">
      {/* Formatted date */}
      <p className="text-[13px] font-semibold text-[#1C1C1C] mb-3">
        {formatDate(currentDate)}
      </p>

      {/* Mini calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {/* Day headers */}
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="text-[10px] font-medium text-[#9A8F82] pb-1"
          >
            {d}
          </div>
        ))}

        {/* Calendar days */}
        {days.map((day, idx) => (
          <div
            key={idx}
            className={`text-[11px] w-6 h-6 flex items-center justify-center rounded-full mx-auto ${
              day === null
                ? ""
                : isToday(day, month, year)
                ? "bg-[#C8922A] text-white font-bold"
                : "text-[#6B6259]"
            }`}
          >
            {day ?? ""}
          </div>
        ))}
      </div>
    </div>
  );
}
