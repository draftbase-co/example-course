import Link from "next/link";
import { FaqSection } from "@/components/FaqSection";
import { getCourseTrees, getFaqs } from "@/lib/draftbase";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export default async function HomePage() {
	const [trees, faqs] = await Promise.all([getCourseTrees(), getFaqs()]);

	const itemList = {
		"@context": "https://schema.org",
		"@type": "ItemList",
		itemListElement: trees.map(({ course, lessons }, index) => ({
			"@type": "Course",
			position: index + 1,
			name: course.fields.title,
			description: course.fields.summary,
			url: `${SITE_URL}/courses/${course.fields.slug}/`,
			provider: { "@type": "Organization", name: SITE_NAME },
			hasCourseInstance: {
				"@type": "CourseInstance",
				courseMode: "online",
				courseWorkload: `PT${lessons.reduce(
					(sum, lesson) => sum + (lesson.fields.durationMinutes ?? 0),
					0,
				)}M`,
			},
		})),
	};

	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
			/>

			<section className="hero">
				<p>
					<span className="badge">Self-paced</span>
					<span className="badge">{trees.length} courses</span>
				</p>
				<h1>Learn how real systems are built</h1>
				<p>
					Short lessons, worked examples, no fluff. Every page is rendered at build time —
					nothing here talks to an API in the browser.
				</p>
				<Link className="button" href="/search">
					Search lessons
				</Link>
			</section>

			<section id="courses" className="wrap" style={{ paddingBottom: "48px" }}>
				<h2 className="section-title">Courses</h2>
				<ul className="grid">
					{trees.map(({ course, lessons }) => (
						<li key={course._id} className="card">
							<Link href={`/courses/${course.fields.slug}`}>
								{course.fields.cover?.url && (
									<img
										src={course.fields.cover.url}
										alt={course.fields.cover.altText ?? course.fields.title}
										loading="lazy"
									/>
								)}
								<div className="body">
									<div className="eyebrow">
										{course.fields.level} · {lessons.length} lessons
									</div>
									<h3>{course.fields.title}</h3>
									<p>{course.fields.summary}</p>
								</div>
							</Link>
						</li>
					))}
				</ul>

				{trees.length === 0 && (
					<p className="muted">
						No published courses yet. Run <code>npm run seed</code>.
					</p>
				)}
			</section>

			<FaqSection faqs={faqs} />
		</>
	);
}
