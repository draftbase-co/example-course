"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface SearchDoc {
	title: string;
	course: string;
	href: string;
	snippet: string;
	/** Lowercased title + course + body, pre-joined at build time. */
	haystack: string;
}

export function SearchClient({ docs }: { docs: SearchDoc[] }) {
	const [query, setQuery] = useState("");

	const results = useMemo(() => {
		const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
		if (terms.length === 0) return [];
		// Substring match on every term, ranked by title hits first. Good enough for a few
		// hundred docs; swap in a real index (minisearch, lunr) when it stops being.
		return docs
			.filter((doc) => terms.every((term) => doc.haystack.includes(term)))
			.sort((a, b) => {
				const score = (doc: SearchDoc) =>
					terms.filter((term) => doc.title.toLowerCase().includes(term)).length;
				return score(b) - score(a);
			})
			.slice(0, 20);
	}, [docs, query]);

	return (
		<>
			<input
				type="search"
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				placeholder="Search lessons…"
				aria-label="Search lessons"
			/>

			<ul className="results">
				{results.map((doc) => (
					<li key={doc.href}>
						<Link href={doc.href}>
							<h3>{doc.title}</h3>
							<p className="muted" style={{ margin: 0 }}>
								{doc.course}
							</p>
							<p className="muted">{doc.snippet}…</p>
						</Link>
					</li>
				))}
			</ul>

			{query && results.length === 0 && <p className="muted">No lessons match “{query}”.</p>}
		</>
	);
}
