/** @type {import('next').NextConfig} */
export default {
	// Fully static HTML — no Node server at runtime, so this deploys to GitHub Pages.
	// It also rules out ISR, route handlers and server actions; see the README.
	output: "export",
	// GitHub Pages serves project sites from /<repo>. Delete both lines on a custom domain.
	basePath: "/example-course",
	trailingSlash: true,
	// next/image needs a server to optimise; static export has none.
	images: { unoptimized: true },
};
