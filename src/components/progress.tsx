"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

/**
 * Lesson progress lives in localStorage. A static site has no server and no accounts, so
 * this is per-browser and cannot be shared or verified — which is also why the lessons
 * themselves are public rather than gated. See the README.
 */
const storageKey = (course: string) => `progress:${course}`;
const listeners = new Set<() => void>();
const snapshots = new Map<string, { raw: string | null; value: string[] }>();

function emit() {
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	// Keeps two tabs in sync; `storage` doesn't fire in the tab that wrote it.
	window.addEventListener("storage", emit);
	return () => {
		listeners.delete(listener);
		window.removeEventListener("storage", emit);
	};
}

// useSyncExternalStore requires a stable reference between renders, so parsed values are
// cached against the raw string they came from.
function getSnapshot(course: string): string[] {
	const raw = localStorage.getItem(storageKey(course));
	const cached = snapshots.get(course);
	if (cached && cached.raw === raw) return cached.value;
	const value = raw ? (JSON.parse(raw) as string[]) : [];
	snapshots.set(course, { raw, value });
	return value;
}

const EMPTY: string[] = [];

function useCompleted(course: string): string[] {
	return useSyncExternalStore(
		subscribe,
		() => getSnapshot(course),
		() => EMPTY, // server render: nothing is complete yet
	);
}

function toggle(course: string, lesson: string) {
	const current = getSnapshot(course);
	const next = current.includes(lesson)
		? current.filter((slug) => slug !== lesson)
		: [...current, lesson];
	localStorage.setItem(storageKey(course), JSON.stringify(next));
	emit();
}

export function ProgressBar({ course, total }: { course: string; total: number }) {
	const done = useCompleted(course).length;
	const percent = total === 0 ? 0 : Math.round((done / total) * 100);

	return (
		<>
			<p className="muted" style={{ margin: 0 }}>
				{done} of {total} lessons complete
			</p>
			<div className="bar" role="progressbar" aria-valuenow={percent}>
				<div style={{ width: `${percent}%` }} />
			</div>
		</>
	);
}

export function CompleteButton({ course, lesson }: { course: string; lesson: string }) {
	const done = useCompleted(course).includes(lesson);

	return (
		<button className="buy" type="button" onClick={() => toggle(course, lesson)}>
			{done ? "Mark as not complete" : "Mark as complete"}
		</button>
	);
}

export interface CurriculumModule {
	title: string;
	lessons: { title: string; slug: string }[];
}

export function Curriculum({
	course,
	modules,
	current,
}: {
	course: string;
	modules: CurriculumModule[];
	current?: string;
}) {
	const completed = useCompleted(course);

	return (
		<ul className="curriculum">
			{modules.map((module) => (
				<li key={module.title}>
					<strong>{module.title}</strong>
					<ol>
						{module.lessons.map((lesson) => (
							<li key={lesson.slug}>
								<Link
									href={`/courses/${course}/${lesson.slug}`}
									aria-current={lesson.slug === current}
									className={completed.includes(lesson.slug) ? "done" : undefined}
								>
									{lesson.title}
								</Link>
							</li>
						))}
					</ol>
				</li>
			))}
		</ul>
	);
}
