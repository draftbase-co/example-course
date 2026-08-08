/**
 * Creates this example's templates and a few published entries in your Draftbase org.
 *
 * Run locally only — it needs a MANAGEMENT-scoped key, which can write and delete content.
 * Never put that key in CI or in a hosting provider's environment.
 *
 *   cp .env.example .env   # add DRAFTBASE_MANAGEMENT_API_KEY
 *   npm run seed
 *
 * Safe to re-run: existing templates are left alone and entries are matched by title.
 */
const BASE_URL = process.env.DRAFTBASE_API_URL ?? "https://api.draftbase.co";
const API_KEY = process.env.DRAFTBASE_MANAGEMENT_API_KEY;
const ENV_ID = process.env.DRAFTBASE_ENVIRONMENT ?? "production";
const LOCALE = "en-US";

if (!API_KEY) {
	console.error("Set DRAFTBASE_MANAGEMENT_API_KEY in .env (see .env.example).");
	process.exit(1);
}

async function api(path, { method = "GET", body } = {}) {
	const res = await fetch(new URL(path, BASE_URL), {
		method,
		headers: {
			Authorization: `Bearer ${API_KEY}`,
			...(body ? { "Content-Type": "application/json" } : {}),
		},
		body: body ? JSON.stringify(body) : undefined,
	});
	if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
	return res.status === 204 ? null : res.json();
}

/** A template's key is derived from its name ("Blog Post" -> "blogPost"), and is what
 *  entries and the delivery API refer to as `templateId`. */
async function ensureTemplate(template) {
	const existing = await api(`/templates?envId=${ENV_ID}`);
	const match = existing.find((t) => t._id === template.key);
	if (match) {
		console.log(`template ${template.key} already exists`);
		return match._id;
	}
	const { key, ...body } = template;
	const created = await api("/templates", { method: "POST", body: { ...body, envId: ENV_ID } });
	console.log(`template ${created._id ?? key} created`);
	return created._id ?? key;
}

/** Downloads a remote image and pushes it through Draftbase's presigned-upload flow. */
async function uploadImage(url, fileName, altText) {
	const file = await fetch(url);
	if (!file.ok) throw new Error(`could not download ${url}`);
	const contentType = file.headers.get("content-type") ?? "image/jpeg";
	const blob = await file.blob();

	const upload = await api("/media/upload-url", {
		method: "POST",
		body: { fileName, contentType, envId: ENV_ID },
	});
	const form = new FormData();
	for (const [name, value] of Object.entries(upload.fields)) form.append(name, value);
	form.append("file", blob, fileName);
	const put = await fetch(upload.url, { method: "POST", body: form });
	if (!put.ok) throw new Error(`storage upload failed: ${put.status} ${await put.text()}`);

	const { id } = await api("/media/confirm", {
		method: "POST",
		body: { storageKey: upload.storageKey, contentType, envId: ENV_ID, altText },
	});
	return id;
}

async function ensureEntry(templateId, titleField, fields, tags = []) {
	const list = await api(`/entries?envId=${ENV_ID}&templateId=${templateId}&limit=100`);
	const match = list.items.find((e) => e.fields[titleField] === fields[titleField]);
	if (match) {
		console.log(`entry "${fields[titleField]}" already exists`);
		return match._id;
	}
	const { id } = await api("/entries", {
		method: "POST",
		body: { templateId, locale: LOCALE, envId: ENV_ID, fields, tags },
	});
	await api(`/entries/${id}/status`, { method: "PATCH", body: { status: "published" } });
	console.log(`entry "${fields[titleField]}" created and published`);
	return id;
}

const templates = [
	{
		key: "course",
		name: "Course",
		titleField: "title",
		fields: [
			{ key: "title", label: "Title", type: "text", required: true },
			{ key: "slug", label: "Slug", type: "text", required: true, isSlug: true },
			{ key: "summary", label: "Summary", type: "text", multiline: true, maxLength: 220 },
			{ key: "description", label: "Description", type: "richText" },
			{ key: "cover", label: "Cover image", type: "media" },
			{
				key: "level",
				label: "Level",
				type: "text",
				options: ["Beginner", "Intermediate", "Advanced"],
			},
			{ key: "instructor", label: "Instructor", type: "text" },
		],
	},
	{
		key: "module",
		name: "Module",
		titleField: "title",
		fields: [
			{ key: "title", label: "Title", type: "text", required: true },
			{ key: "slug", label: "Slug", type: "text", required: true, isSlug: true },
			{ key: "order", label: "Order", type: "number", required: true },
			{ key: "summary", label: "Summary", type: "text", multiline: true },
			{ key: "course", label: "Course", type: "reference", referenceTemplateId: "course" },
		],
	},
	{
		key: "lesson",
		name: "Lesson",
		titleField: "title",
		fields: [
			{ key: "title", label: "Title", type: "text", required: true },
			{ key: "slug", label: "Slug", type: "text", required: true, isSlug: true },
			{ key: "order", label: "Order", type: "number", required: true },
			{ key: "durationMinutes", label: "Duration (minutes)", type: "number", min: 1 },
			{ key: "videoUrl", label: "Video URL", type: "text" },
			{ key: "body", label: "Body", type: "richText", required: true },
			// Two levels of reference: lesson -> module -> course. The site fetches lessons
			// with include=2 so both hops arrive resolved.
			{ key: "module", label: "Module", type: "reference", referenceTemplateId: "module" },
		],
	},
];

const courses = [
	{
		title: "Headless CMS Fundamentals",
		slug: "headless-cms-fundamentals",
		level: "Beginner",
		instructor: "Dana Okafor",
		image: "https://picsum.photos/seed/course-cms/1200/675",
		summary:
			"Model content so it outlives the design it was written for, then get it onto a page.",
		description: `Four short lessons on the part of a CMS that actually matters: the shape
of the content. Everything else — the editor, the API, the framework — is replaceable.

You will need a Draftbase org and about an hour.`,
		modules: [
			{
				title: "Modelling content",
				slug: "modelling-content",
				summary: "Deciding what a thing is before deciding how it looks.",
				lessons: [
					{
						title: "What a content type actually is",
						slug: "what-a-content-type-is",
						durationMinutes: 8,
						body: `A content type is a promise about shape. Every entry of that type has
the same fields, so anything consuming it can rely on them being there.

## Start from the consumer

Ask what a page, a feed, and an app screen each need from this thing. The fields they agree
on are the content type. The rest is either presentation or a different type wearing a
disguise.

## A worked example

A blog post has a title, a body, an author and a date. It does not have a hero image
alignment, a background colour, or a "show sidebar" toggle. Those are decisions the renderer
makes, and freezing them into entries is how content stops being portable.`,
					},
					{
						title: "Fields, references and when to split a type",
						slug: "fields-and-references",
						durationMinutes: 11,
						body: `The question is always the same: does this thing have an identity of
its own?

## Split it out when it is reused

An author appears on many posts and has a name, a bio and a photo. That is an entity, so it
gets its own type and posts point at it with a reference. Change the bio once, every post
updates.

## Keep it inline when it is not

A post's excerpt belongs to exactly one post. Giving it a type of its own buys nothing and
costs an extra hop on every read.

## Depth costs

Resolving references is not free — each level of \`include\` is another lookup. Three levels
deep usually means the model wants restructuring, not a bigger include.`,
					},
					{
						title: "Rich text without regret",
						slug: "rich-text-without-regret",
						durationMinutes: 9,
						body: `Rich text is where layout sneaks back into content.

## Store markup, not styling

Markdown and MDX store structure: this is a heading, this is a list, this is a link. HTML
pasted from a word processor stores fonts, colours and inline widths, which is the thing you
were trying to avoid.

## Components are the escape hatch

When a post genuinely needs a callout or an embed, expose it as a named component the writer
can use — \`<Callout>\` — rather than letting them hand-write a styled div. The renderer
decides what a callout looks like. The writer decides where one goes.`,
					},
				],
			},
			{
				title: "Reading content back",
				slug: "reading-content-back",
				summary: "Delivery APIs, caching, and where the keys go.",
				lessons: [
					{
						title: "Delivery keys and why they are boring",
						slug: "delivery-keys",
						durationMinutes: 7,
						body: `A delivery key is read-only and only ever returns published entries.
That is the whole feature, and the boringness is the point.

## What it cannot do

It cannot write. It cannot delete. It cannot see drafts. If one leaks, an attacker gets
content that was already on your public website.

## What still deserves care

Scope is not a substitute for handling. Keep it out of client bundles anyway, rotate it if it
escapes, and never let a management key anywhere near CI.`,
					},
					{
						title: "Pagination, includes and one honest request count",
						slug: "pagination-and-includes",
						durationMinutes: 10,
						body: `Two knobs decide how many requests a build makes: page size and
include depth.

## Cursors over offsets

The delivery API returns a \`nextCursor\`. Loop until it is null and you have walked the
collection exactly once, with no risk of skipping or repeating an entry that moved.

## Fetch wide, assemble in memory

For a build, fetching each type once and joining the results locally beats fetching per page.
Three requests build a hundred pages. The per-page version makes three hundred.`,
					},
				],
			},
		],
	},
	{
		title: "Shipping Static Sites",
		slug: "shipping-static-sites",
		level: "Intermediate",
		instructor: "Marco Lind",
		image: "https://picsum.photos/seed/course-static/1200/675",
		summary:
			"Build pipelines, deploy targets and the security work that static hosting does not do for you.",
		description: `Static output removes the runtime, not the responsibility. This course
covers the build, the deploy, and the parts people skip.`,
		modules: [
			{
				title: "The build",
				slug: "the-build",
				summary: "What happens between a publish and a page.",
				lessons: [
					{
						title: "Rebuilding on publish with webhooks",
						slug: "rebuilding-on-publish",
						durationMinutes: 9,
						body: `A static site is stale by definition between builds. The fix is a
webhook: the CMS calls CI on publish, CI rebuilds, the CDN gets new HTML.

## Keep the trigger dumb

The webhook should say "something changed", not "rebuild page 47". Partial rebuilds are an
optimisation, and they are wrong more often than they are fast.

## Where the credential lives

The token that lets the CMS start a build belongs in the CMS's webhook config, scoped to one
repository. It does not belong in the repository it triggers.`,
					},
					{
						title: "Secrets in a build that has no server",
						slug: "secrets-in-a-build",
						durationMinutes: 8,
						body: `Every framework has a prefix that means "put this in the browser
bundle": \`PUBLIC_\`, \`NEXT_PUBLIC_\`, \`VITE_\`. Renaming a variable is enough to publish a
credential.

## Three habits

1. Use the narrowest scope that can build the site.
2. Keep write-capable keys off CI entirely. Seed from a laptop.
3. Grep the build output for the key before trusting the setup.

The third one takes five seconds and replaces an assumption with a fact.`,
					},
				],
			},
			{
				title: "The deploy",
				slug: "the-deploy",
				summary: "Hosting, paths and the limits you are accepting.",
				lessons: [
					{
						title: "GitHub Pages, base paths and the underscore problem",
						slug: "github-pages-base-paths",
						durationMinutes: 7,
						body: `Project sites serve from \`/<repo>\`, so every absolute link needs a
prefix. Frameworks expose this as \`base\` or \`basePath\`; set it once and use the framework's
link helper everywhere.

## The underscore problem

Jekyll ignores directories starting with an underscore, which is exactly what Next names its
asset folder. Deploying through GitHub Actions skips Jekyll entirely, and a \`.nojekyll\` file
covers the older path.`,
					},
					{
						title: "Knowing when static stops being the answer",
						slug: "when-static-stops-working",
						durationMinutes: 6,
						body: `Static rendering fails at three specific edges, and recognising them
early is cheaper than discovering them at launch.

## The edges

- **Per-visitor content.** Accounts, carts, anything gated. There is nothing to gate with.
- **Build time exceeding publishing cadence.** A hundred thousand pages rebuilt for one typo.
- **Data that changes by the second.** Prices, stock levels, live scores.

## The good news

Most sites hit none of these, and the ones that do usually hit them on two routes out of
fifty. Render those on a server and leave the rest alone.`,
					},
				],
			},
		],
	},
];

async function main() {
	for (const template of templates) await ensureTemplate(template);
	// The CLI (`npm create draftbase`) seeds schema only, so a new project starts empty.
	if (process.env.SEED_TEMPLATES_ONLY) return;

	for (const { modules, image, ...course } of courses) {
		const cover = await uploadImage(image, `${course.slug}.jpg`, `${course.title} cover`);
		const courseId = await ensureEntry("course", "title", { ...course, cover });

		for (const [moduleIndex, { lessons, ...module }] of modules.entries()) {
			const moduleId = await ensureEntry("module", "title", {
				...module,
				order: moduleIndex + 1,
				course: courseId,
			});

			for (const [lessonIndex, lesson] of lessons.entries()) {
				await ensureEntry("lesson", "title", {
					...lesson,
					// Ordering is global across the course so prev/next walks modules in order.
					order: moduleIndex * 100 + lessonIndex + 1,
					module: moduleId,
				});
			}
		}
	}

	console.log("\nSeed complete. Run `npm run dev`.");
}

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
