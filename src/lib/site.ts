/** Site-level constants. Safe to import from anywhere — no API key, no SDK. */
export const SITE_NAME = "Academy";
export const SITE_DESCRIPTION =
	"Self-paced engineering courses. Every lesson is rendered at build time — no API calls in the browser.";
/** Set by CI so a fork's canonical URLs point at its own deployment. */
export const SITE_URL = process.env.SITE_URL || "https://demo-course.draftbase.co";
