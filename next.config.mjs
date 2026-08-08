/** @type {import('next').NextConfig} */
export default {
	// Fully static HTML — no Node server at runtime, so this deploys to GitHub Pages.
	// It also rules out ISR, route handlers and server actions; see the README.
	output: "export",
	// Served from demo-course.draftbase.co, so no basePath by default. A fork deployed to a
	// GitHub Pages project URL needs one — `npm create draftbase` sets BASE_PATH for it.
	basePath: process.env.BASE_PATH || undefined,
	assetPrefix: process.env.BASE_PATH || undefined,
	trailingSlash: true,
	// next/image needs a server to optimise; static export has none.
	images: { unoptimized: true },
};
