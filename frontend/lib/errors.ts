/** Safely extracts a human-readable message from a caught value of type
 *  `unknown` — avoids `catch (e: any)` throughout the app. */
export function getErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === "string") return err;
  return fallback;
}
