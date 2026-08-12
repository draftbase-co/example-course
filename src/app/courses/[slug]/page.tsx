import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXContent } from "@draftbase/renderer";
import { Curriculum, ProgressBar } from "@/components/progress";
import { getCourseTree, getCourseTrees } from "@/lib/draftbase";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export async function generateStaticParams() {
	const trees = await getCourseTrees();
	return trees.map(({ course }) => ({ slug: course.fields.slug }));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	const tree = await getCourseTree(slug);
	return {
		title: tree?.course.fields.title,
		description: tree?.course.fields.summary,
		alternates: { canonical: `/courses/${slug}/` },
		openGraph: {
			type: "website",
			title: tree?.course.fields.title,
			description: tree?.course.fields.summary,
			images: tree?.course.fields.cover?.url ?? undefined,
		},
	};
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const tree = await getCourseTree(slug);
	if (!tree) notFound();

	const { course, modules, lessons } = tree;
	const totalMinutes = lessons.reduce(
		(sum, lesson) => sum + (lesson.fields.durationMinutes ?? 0),
		0,
	);
	const canonical = `${SITE_URL}/courses/${slug}/`;

	const schema = [
		{
			"@context": "https://schema.org",
			"@type": "Course",
			name: course.fields.title,
			description: course.fields.summary,
			url: canonical,
			image: course.fields.cover?.url ?? undefined,
			provider: { "@type": "Organization", name: SITE_NAME, sameAs: SITE_URL },
			// Google requires an offer or a free flag on Course; these lessons are public.
			isAccessibleForFree: true,
			hasCourseInstance: {
				"@type": "CourseInstance",
				courseMode: "online",
				courseWorkload: `PT${totalMinutes}M`,
				instructor: course.fields.instructor
					? { "@type": "Person", name: course.fields.instructor }
					: undefined,
			},
			syllabusSections: modules.map(({ module, lessons: moduleLessons }) => ({
				"@type": "Syllabus",
				name: module.fields.title,
				description: module.fields.summary,
				timeRequired: `PT${moduleLessons.reduce(
					(sum, lesson) => sum + (lesson.fields.durationMinutes ?? 0),
					0,
				)}M`,
			})),
		},
		{
			"@context": "https://schema.org",
			"@type": "BreadcrumbList",
			itemListElement: [
				{ "@type": "ListItem", position: 1, name: "Courses", item: `${SITE_URL}/` },
				{
					"@type": "ListItem",
					position: 2,
					name: course.fields.title,
					item: canonical,
				},
			],
		},
	];

	return (
		<div className="layout">
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
			/>

			<aside>
				<ProgressBar course={slug} total={lessons.length} />
				<Curriculum
					course={slug}
					modules={modules.map(({ module, lessons: moduleLessons }) => ({
						title: module.fields.title,
						lessons: moduleLessons.map((lesson) => ({
							title: lesson.fields.title,
							slug: lesson.fields.slug,
						})),
					}))}
				/>
			</aside>

			<article>
				<div className="eyebrow">{course.fields.level}</div>
				<h1 style={{ fontSize: "var(--text-4xl)", margin: "0 0 12px" }}>
					{course.fields.title}
				</h1>
				<p className="muted">
					{lessons.length} lessons · {totalMinutes} min · Instructor:{" "}
					{course.fields.instructor}
				</p>
				{course.fields.cover?.url && (
					<img
						src={course.fields.cover.url}
						alt={course.fields.cover.altText ?? course.fields.title}
						style={{ margin: "24px 0" }}
					/>
				)}
				<div className="db-content">
					<MDXContent source={course.fields.description ?? ""} />
				</div>
				{lessons[0] && (
					<p style={{ marginTop: "32px" }}>
						<Link
							className="button"
							href={`/courses/${slug}/${lessons[0].fields.slug}`}
						>
							Start course
						</Link>
					</p>
				)}
			</article>
		</div>
	);
}
