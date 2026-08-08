import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXContent } from "@draftbase/renderer";
import { CompleteButton, Curriculum, ProgressBar } from "@/components/progress";
import { getCourseTree, getCourseTrees, snippet } from "@/lib/draftbase";

// One static page per lesson of every course.
export async function generateStaticParams() {
	const trees = await getCourseTrees();
	return trees.flatMap(({ course, lessons }) =>
		lessons.map((lesson) => ({ slug: course.fields.slug, lesson: lesson.fields.slug })),
	);
}

async function find(slug: string, lessonSlug: string) {
	const tree = await getCourseTree(slug);
	const index = tree?.lessons.findIndex((entry) => entry.fields.slug === lessonSlug) ?? -1;
	if (!tree || index === -1) return undefined;
	return {
		tree,
		lesson: tree.lessons[index],
		previous: tree.lessons[index - 1],
		next: tree.lessons[index + 1],
	};
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string; lesson: string }>;
}): Promise<Metadata> {
	const { slug, lesson } = await params;
	const found = await find(slug, lesson);
	return {
		title: found?.lesson.fields.title,
		description: found && snippet(found.lesson.fields.body ?? ""),
	};
}

export default async function LessonPage({
	params,
}: {
	params: Promise<{ slug: string; lesson: string }>;
}) {
	const { slug, lesson: lessonSlug } = await params;
	const found = await find(slug, lessonSlug);
	if (!found) notFound();

	const { tree, lesson, previous, next } = found;

	return (
		<div className="layout">
			<aside>
				<ProgressBar course={slug} total={tree.lessons.length} />
				<Curriculum
					course={slug}
					current={lessonSlug}
					modules={tree.modules.map(({ module, lessons }) => ({
						title: module.fields.title,
						lessons: lessons.map((entry) => ({
							title: entry.fields.title,
							slug: entry.fields.slug,
						})),
					}))}
				/>
			</aside>

			<main>
				<p className="muted" style={{ margin: 0 }}>
					<Link href={`/courses/${slug}`}>{tree.course.fields.title}</Link>
				</p>
				<h1 style={{ marginTop: "0.25rem" }}>{lesson.fields.title}</h1>
				<p className="muted">{lesson.fields.durationMinutes} min</p>

				{lesson.fields.videoUrl && (
					<p>
						<a href={lesson.fields.videoUrl} rel="noopener noreferrer">
							Watch the video for this lesson
						</a>
					</p>
				)}

				<MDXContent source={lesson.fields.body ?? ""} />

				<div style={{ marginTop: "2rem" }}>
					<CompleteButton course={slug} lesson={lessonSlug} />
				</div>

				<nav className="lesson-nav">
					{previous ? (
						<Link href={`/courses/${slug}/${previous.fields.slug}`}>
							← {previous.fields.title}
						</Link>
					) : (
						<span />
					)}
					{next ? (
						<Link href={`/courses/${slug}/${next.fields.slug}`}>
							{next.fields.title} →
						</Link>
					) : (
						<span />
					)}
				</nav>
			</main>
		</div>
	);
}
