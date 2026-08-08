import "server-only";
import { createClient, type Entry } from "@draftbase/sdk";

const apiKey = process.env.DRAFTBASE_API_KEY;
if (!apiKey) {
	throw new Error(
		"DRAFTBASE_API_KEY is not set. Copy .env.example to .env and add a delivery-scoped key.",
	);
}

// `server-only` above makes this a build error if a Client Component ever imports this file,
// which is what keeps the API key out of the browser bundle.
const client = createClient({
	apiKey,
	baseUrl: process.env.DRAFTBASE_API_URL ?? "https://api.draftbase.co",
	environment: process.env.DRAFTBASE_ENVIRONMENT ?? "production",
	cacheTtlMs: 60_000,
});

/** The API returns entry-level `tags`; the SDK's `Entry` type doesn't declare them yet. */
export type DbEntry<Fields> = Entry<Fields> & { tags: string[] };

/**
 * All published entries of one template, following cursor pagination to the end.
 * `include` is the reference-resolution depth (max 5): a lesson at depth 2 arrives with its
 * module resolved, and that module's own `course` reference resolved inside it.
 */
export async function getAll<Fields>(templateId: string, include = 1): Promise<DbEntry<Fields>[]> {
	const all: DbEntry<Fields>[] = [];
	let after: string | undefined;
	do {
		// The SDK's option is named `contentTypeId`, but the API's query param is `templateId`.
		const page = await client.getEntries<Fields>({ templateId, after, limit: 100, include });
		all.push(...(page.entries as DbEntry<Fields>[]));
		after = page.nextCursor ?? undefined;
	} while (after);
	return all;
}

export interface Media {
	url?: string | null;
	altText?: string;
}

export interface Course {
	title: string;
	slug: string;
	summary: string;
	description: string;
	cover?: Media | null;
	level?: string;
	instructor?: string;
}

export interface Module {
	title: string;
	slug: string;
	order: number;
	summary?: string;
	course?: { _id: string; fields: Course } | null;
}

export interface Lesson {
	title: string;
	slug: string;
	order: number;
	durationMinutes?: number;
	videoUrl?: string;
	body: string;
	/** Resolved two levels deep, so `module.fields.course` is populated too. */
	module?: { _id: string; fields: Module } | null;
}

/** One course with its modules and lessons, both sorted by their `order` field. */
export interface CourseTree {
	course: DbEntry<Course>;
	modules: {
		module: DbEntry<Module>;
		lessons: DbEntry<Lesson>[];
	}[];
	/** Every lesson in reading order — powers prev/next and the progress count. */
	lessons: DbEntry<Lesson>[];
}

const byOrder = (a: { fields: { order: number } }, b: { fields: { order: number } }) =>
	(a.fields.order ?? 0) - (b.fields.order ?? 0);

/**
 * Fetches all three templates once and assembles them in memory. Three requests total,
 * however many pages get built — the alternative is a request per page per level.
 */
export async function getCourseTrees(): Promise<CourseTree[]> {
	const [courses, modules, lessons] = await Promise.all([
		getAll<Course>("course", 1),
		getAll<Module>("module", 1),
		getAll<Lesson>("lesson", 2),
	]);

	return courses.map((course) => {
		const courseModules = modules
			.filter((module) => module.fields.course?._id === course._id)
			.sort(byOrder)
			.map((module) => ({
				module,
				lessons: lessons
					.filter((lesson) => lesson.fields.module?._id === module._id)
					.sort(byOrder),
			}));

		return {
			course,
			modules: courseModules,
			lessons: courseModules.flatMap((entry) => entry.lessons),
		};
	});
}

export async function getCourseTree(slug: string): Promise<CourseTree | undefined> {
	const trees = await getCourseTrees();
	return trees.find((tree) => tree.course.fields.slug === slug);
}

/** Strips markdown to a short plain-text snippet for the search index. */
export function snippet(body: string, length = 160): string {
	return body
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/[#*_>`\[\]()]/g, "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, length);
}
