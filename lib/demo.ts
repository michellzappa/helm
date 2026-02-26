/**
 * Demo mode: when DEMO_MODE=1, API endpoints return deterministic fixtures
 * instead of reading real system data. Used for safe screenshots.
 */
export const DEMO_MODE = process.env.DEMO_MODE === "1";
