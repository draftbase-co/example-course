import type { Metadata } from "next";
import Link from "next/link";
import "@draftbase/renderer/styles.css";
import "./globals.css";

export const metadata: Metadata = {
	title: { default: "Draftbase Academy", template: "%s — Draftbase Academy" },
	description: "A statically generated course platform powered by Draftbase.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>
				<div className="wrap">
					<header className="site">
						<Link className="brand" href="/">
							Draftbase Academy
						</Link>
						<Link href="/search">Search</Link>
					</header>
					{children}
					<footer className="site">
						<span>
							Demo course platform. Progress is stored in your browser only. Content
							managed in <a href="https://draftbase.co">Draftbase</a>.
						</span>
					</footer>
				</div>
			</body>
		</html>
	);
}
