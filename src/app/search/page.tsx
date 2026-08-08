import { getCourseTrees, snippet } from "@/lib/draftbase";
import { SearchClient, type SearchDoc } from "./SearchClient";

/**
 * The index is built here, on the server, and shipped with the page. No API key reaches the
 * browser and no request is made at search time — which only works because the corpus is
 * small. Past a few hundred lessons, generate a separate JSON file and fetch it on demand,
 * or move search server-side and use the delivery API's `search` / `mode=semantic` options.
 */
export default async function SearchPage() {
	const trees = await getCourseTrees();
	const docs: SearchDoc[] = trees.flatMap(({ course, lessons }) =>
		lessons.map((lesson) => ({
			title: lesson.fields.title,
			course: course.fields.title,
			href: `/courses/${course.fields.slug}/${lesson.fields.slug}`,
			snippet: snippet(lesson.fields.body ?? ""),
			haystack: `${lesson.fields.title} ${course.fields.title} ${lesson.fields.body ?? ""}`
				.toLowerCase()
				.slice(0, 4000),
		})),
	);

	return (
		<>
			<h1>Search</h1>
			<p className="muted">{docs.length} lessons indexed at build time.</p>
			<SearchClient docs={docs} />
		</>
	);
}
