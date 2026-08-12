import type { MetadataRoute } from "next";
import { getCourseTrees } from "@/lib/draftbase";
import { SITE_URL } from "@/lib/site";

// `output: "export"` writes this to /sitemap.xml at build time, from the same entries the
// pages are built from. /search is left out on purpose — it is noindex.
export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const trees = await getCourseTrees();

	return [
		{ url: `${SITE_URL}/`, priority: 1 },
		...trees.flatMap(({ course, lessons }) => [
			{ url: `${SITE_URL}/courses/${course.fields.slug}/`, lastModified: course.updatedAt },
			...lessons.map((lesson) => ({
				url: `${SITE_URL}/courses/${course.fields.slug}/${lesson.fields.slug}/`,
				lastModified: lesson.updatedAt,
			})),
		]),
	];
}
