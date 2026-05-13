import { Lightbulb, ExternalLink } from "lucide-react";

interface AwarenessBlock {
  title: string;
  body: string;
  source_url: string | null;
}

interface CausePublic {
  id: string;
  title: string;
  awareness_blocks: AwarenessBlock[];
}

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function fetchCause(causeId: string): Promise<CausePublic | null> {
  try {
    // /causes/{slug} requires a slug, but we have an id — use the by-id route
    // if we have it; otherwise fall back to listing and matching by id.
    const res = await fetch(`${apiUrl}/causes/?limit=200`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const list = (await res.json()) as CausePublic[];
    return list.find((c) => c.id === causeId) ?? null;
  } catch {
    return null;
  }
}

/**
 * "Why this cause matters" — fact/myth-buster cards from the Cause model
 * (admin/manager edits via the cause editor; renders identically on every
 * runner profile under that cause). Server component — auto-hides when
 * the cause has no awareness blocks set.
 */
export async function AwarenessBlocks({
  causeId,
}: {
  causeId: string | null;
}): Promise<React.ReactNode> {
  if (!causeId) return null;
  const cause = await fetchCause(causeId);
  if (!cause || cause.awareness_blocks.length === 0) return null;

  return (
    <div className="card mt-6 p-8 md:p-10">
      <div className="flex items-center justify-between mb-6">
        <span className="eyebrow">Why this cause matters</span>
        <Lightbulb className="w-5 h-5 text-primary-500" />
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {cause.awareness_blocks.map((block, i) => (
          <li
            key={i}
            className="rounded-xl bg-cream-50 border border-ink-100 p-5"
          >
            <p className="font-display text-lg text-ink-900 leading-snug">
              {block.title}
            </p>
            <p className="mt-2 text-sm text-ink-700 leading-relaxed">
              {block.body}
            </p>
            {block.source_url && (
              <a
                href={block.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline"
              >
                Source <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
