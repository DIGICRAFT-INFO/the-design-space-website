/**
 * Date utility functions for dashboard widgets
 */

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Formats a Date object as "Monday, 15 January 2025"
 */
export function formatDate(date: Date): string {
  const dayName = DAYS[date.getDay()];
  const day = date.getDate();
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${dayName}, ${day} ${month} ${year}`;
}

/**
 * Returns an array representing the calendar grid for a given month.
 * Leading nulls pad the start to align days with the correct day-of-week column (Sunday = 0).
 * Followed by day numbers 1 through the last day of the month.
 */
export function getCalendarDays(year: number, month: number): (number | null)[] {
  // month is 0-indexed (0 = January)
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun, 6=Sat
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = [];

  // Add leading nulls for day-of-week offset
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add day numbers
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  return days;
}

/**
 * Checks if a given day/month/year matches today's date
 */
export function isToday(day: number, month: number, year: number): boolean {
  const now = new Date();
  return (
    now.getDate() === day &&
    now.getMonth() === month &&
    now.getFullYear() === year
  );
}
