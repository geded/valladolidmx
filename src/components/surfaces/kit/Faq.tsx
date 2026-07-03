import type { FaqVM } from "./types";

export function KitFaq({
  faqs,
  heading = "Preguntas frecuentes",
}: {
  faqs: FaqVM[];
  heading?: string;
}) {
  if (!faqs || faqs.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">{heading}</h2>
      <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
        {faqs.map((f) => (
          <li key={f.id} className="p-4">
            <details>
              <summary className="cursor-pointer text-sm font-semibold">
                {f.question}
              </summary>
              <p className="mt-2 whitespace-pre-line text-sm text-foreground/85">
                {f.answer}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}