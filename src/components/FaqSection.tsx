import type { DbEntry, Faq } from "@/lib/draftbase";

/**
 * The FAQ block plus its FAQPage JSON-LD, from CMS entries. Keeping the visible answers
 * and the structured data on one source means an assistant quoting the page cannot quote
 * something the reader does not see.
 */
export function FaqSection({ faqs }: { faqs: DbEntry<Faq>[] }) {
	if (faqs.length === 0) return null;

	const schema = {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: faqs.map((faq) => ({
			"@type": "Question",
			name: faq.fields.question,
			acceptedAnswer: { "@type": "Answer", text: faq.fields.answer },
		})),
	};

	return (
		<section id="faq" className="faq">
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
			/>
			<h2 className="section-title">Frequently asked questions</h2>
			{faqs.map((faq) => (
				<details key={faq._id}>
					<summary>{faq.fields.question}</summary>
					<div>{faq.fields.answer}</div>
				</details>
			))}
		</section>
	);
}
