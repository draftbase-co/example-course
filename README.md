# Draftbase example — Course platform

A learning platform with courses, modules, lessons, a curriculum sidebar, prev/next
navigation, progress tracking and search — built with [Next.js](https://nextjs.org)
(`output: "export"`) and [Draftbase](https://draftbase.co), deployed to GitHub Pages as
static HTML.

The most complex of the four examples. It adds **two-level reference resolution**
(lesson → module → course), a **build-time search index**, and **client-side state** layered
onto static pages.

## Quickstart

```bash
npm install
cp .env.example .env      # add your API keys
npm run seed              # creates the templates + 2 courses, 4 modules, 10 lessons
npm run dev
```

## Content model

**`course`**

| Field | Type | |
| --- | --- | --- |
| `title` | text | required |
| `slug` | text | required, used as the URL |
| `summary` | text | max 220 chars |
| `description` | richText | |
| `cover` | media | |
| `level` | text | Beginner / Intermediate / Advanced |
| `instructor` | text | |

**`module`** — `title`, `slug`, `order` (number), `summary`, `course` (reference → `course`)

**`lesson`** — `title`, `slug`, `order` (number), `durationMinutes`, `videoUrl`, `body`
(richText), `module` (reference → `module`)

`order` is a plain number on both. Lesson order is seeded globally across the course
(`module index × 100 + position`) so prev/next walks modules in sequence.

## How it works

- `getCourseTrees()` in [`src/lib/draftbase.ts`](src/lib/draftbase.ts) fetches all three
  templates **once each** and joins them in memory. Three requests build every page; a
  fetch-per-page version would make hundreds.
- Lessons are fetched with `include: 2`, so `lesson.fields.module.fields.course` arrives
  resolved. Depth goes to 5, but each level is another lookup — past two or three, the model
  usually wants restructuring.
- [`src/components/progress.tsx`](src/components/progress.tsx) is the only client code:
  `useSyncExternalStore` over `localStorage`, with a `getServerSnapshot` that returns empty
  so the static HTML and the first client render agree.
- [`src/app/search/page.tsx`](src/app/search/page.tsx) builds the search index on the server
  and ships it with the page. No key, no request at search time. It is a substring match —
  fine for a few hundred lessons, and the file says what to do when it isn't.

## Why lessons are not gated

Access control needs somewhere trustworthy to check who you are, and a static site has no
such place. Anything "hidden" in the bundle is one View Source away, so this example does
not pretend: lessons are public, and progress is a per-browser convenience with no
authority behind it.

Real gating means a server. The usual shapes: keep the marketing and curriculum pages static
and put lesson bodies behind an authenticated API; or drop `output: "export"` and render
lessons on a server that checks a session.

## Security — this repo is public

- The delivery key is read as `process.env.DRAFTBASE_API_KEY` in server code only, and
  `src/lib/draftbase.ts` imports `server-only` so importing it from a Client Component is a
  **build error**. **Do not rename the variable to `NEXT_PUBLIC_DRAFTBASE_API_KEY`** — that
  prefix inlines it into the browser bundle.
- Use a **delivery-scoped** key: read-only, published entries only. An unpublished lesson
  cannot leak into a build.
- The **management** key is only for `npm run seed`. Local `.env` only, never CI.
- `.env` is gitignored; only the empty `.env.example` is committed.

Verify after a build: `grep -r "$(grep DRAFTBASE_API_KEY .env | cut -d= -f2)" out/` should
find nothing.

## Deploying

1. Settings → Pages → Source: **GitHub Actions**.
2. Settings → Secrets and variables → Actions → add `DRAFTBASE_API_KEY` (delivery-scoped).
3. Optional: on the same page, add a repository **variable** `DRAFTBASE_ENVIRONMENT` if your
   content lives in an environment other than `production`.
4. Push to `main`.

If your repo isn't named `example-course`, update `basePath` in
[`next.config.mjs`](next.config.mjs). On a custom domain, remove `basePath` and
`trailingSlash`.

### Rebuild when content is published

Add a Draftbase webhook pointing at:

```
POST https://api.github.com/repos/<owner>/example-course/dispatches
{ "event_type": "draftbase-publish" }
```

with an `Authorization: Bearer <fine-grained PAT>` header scoped to this repo with
**Contents: read and write**. That token lives in Draftbase's webhook config — never here.

## Not included

- **Accounts, enrolment, certificates, quizzes with stored answers** — all need a server.
- **Server-side progress sync** — same reason; `localStorage` is per browser.
- **Video hosting** — `videoUrl` links out. Embed a player if you have one.
- **Draft previews** — need a running server.
