/**
 * Renders the body of a legal page (privacy / terms) from a plain-text setting.
 * Convention: lines starting with `## ` become H2 headings; blank lines split
 * paragraphs. No markdown processing — keeps the surface tiny and review-able.
 */
export function LegalDocBody({ text }: { text: string }): React.ReactNode {
  if (!text || text.trim() === "") {
    return (
      <p className="text-ink-500 italic">
        Content not yet published. Check back soon.
      </p>
    );
  }

  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="prose-rfac max-w-2xl space-y-5">
      {blocks.map((block, i) => {
        if (block.startsWith("## ")) {
          return (
            <h2
              key={i}
              className="font-display text-2xl text-ink-900 mt-10 first:mt-0"
            >
              {block.slice(3)}
            </h2>
          );
        }
        return (
          <p
            key={i}
            className="text-ink-700 leading-relaxed whitespace-pre-line"
          >
            {block}
          </p>
        );
      })}
    </div>
  );
}
