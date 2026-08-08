import Link from "next/link";
import { getCourseTrees } from "@/lib/draftbase";

export default async function HomePage() {
	const trees = await getCourseTrees();

	return (
		<>
			<h1>Courses</h1>
			<p className="muted">
				Every lesson is rendered at build time. Nothing here talks to an API in the
				browser.
			</p>

			<ul className="grid">
				{trees.map(({ course, lessons }) => (
					<li key={course._id} className="product">
						<Link href={`/courses/${course.fields.slug}`}>
							{course.fields.cover?.url && (
								<img
									src={course.fields.cover.url}
									alt={course.fields.cover.altText ?? course.fields.title}
									loading="lazy"
								/>
							)}
							<h3>{course.fields.title}</h3>
							<p className="muted" style={{ margin: 0 }}>
								{course.fields.level} · {lessons.length} lessons
							</p>
							<p className="muted">{course.fields.summary}</p>
						</Link>
					</li>
				))}
			</ul>

			{trees.length === 0 && (
				<p className="muted">
					No published courses yet. Run <code>npm run seed</code>.
				</p>
			)}
		</>
	);
}
