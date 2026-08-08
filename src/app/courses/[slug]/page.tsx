import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXContent } from "@draftbase/renderer";
import { Curriculum, ProgressBar } from "@/components/progress";
import { getCourseTree, getCourseTrees } from "@/lib/draftbase";

export async function generateStaticParams() {
	const trees = await getCourseTrees();
	return trees.map(({ course }) => ({ slug: course.fields.slug }));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const tree = await getCourseTree((await params).slug);
	return { title: tree?.course.fields.title, description: tree?.course.fields.summary };
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

	return (
		<div className="layout">
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

			<main>
				<h1>{course.fields.title}</h1>
				<p className="muted">
					{course.fields.level} · {lessons.length} lessons · {totalMinutes} min ·
					Instructor: {course.fields.instructor}
				</p>
				{course.fields.cover?.url && (
					<img
						src={course.fields.cover.url}
						alt={course.fields.cover.altText ?? course.fields.title}
					/>
				)}
				<MDXContent source={course.fields.description ?? ""} />
				{lessons[0] && (
					<Link className="buy" href={`/courses/${slug}/${lessons[0].fields.slug}`}>
						Start course
					</Link>
				)}
			</main>
		</div>
	);
}
