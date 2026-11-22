/**
 * Entrenamiento de Alux · acceso de servidor (cliente de servicio).
 * Registrar una pregunta sin respuesta nunca debe romper la respuesta:
 * todos los errores se tragan y solo se reportan en el log.
 */
import {
  destinationBriefSlug,
  formatDestinationBrief,
  gapQuestionKey,
  scrubGapQuestion,
  type GapChannel,
  type GapReason,
} from "./knowledge-gaps";

type AdminLike = {
  rpc: (fn: never, args: never) => PromiseLike<{ error: { message: string } | null }>;
  from: (t: never) => unknown;
};

export async function recordKnowledgeGapServer(
  admin: unknown,
  input: {
    channel: GapChannel;
    destinationSlug: string | null;
    question: string;
    reason: GapReason;
  },
): Promise<void> {
  try {
    const question = scrubGapQuestion(input.question);
    const key = gapQuestionKey(question);
    if (key.length < 3) return;
    const { error } = await (admin as AdminLike).rpc(
      "alux_record_knowledge_gap" as never,
      {
        _channel: input.channel,
        _destination_slug: input.destinationSlug ?? "",
        _question: question,
        _question_key: key,
        _reason: input.reason,
      } as never,
    );
    if (error) console.warn("[alux.gaps] no se registró", error.message.slice(0, 160));
  } catch (err) {
    console.warn(
      "[alux.gaps] no se registró",
      err instanceof Error ? err.message.slice(0, 160) : err,
    );
  }
}

type BriefQuery = {
  select: (s: string) => {
    eq: (
      a: string,
      b: string,
    ) => {
      eq: (
        a: string,
        b: string,
      ) => {
        maybeSingle: () => PromiseLike<{
          data: {
            title: string;
            summary: string | null;
            body: string;
            tags: string[] | null;
          } | null;
        }>;
      };
    };
  };
};

/** Ficha oficial publicada del destino, lista para el modelo; null si no hay. */
export async function loadDestinationBriefServer(
  admin: unknown,
  destinationSlug: string | null | undefined,
): Promise<string | null> {
  if (!destinationSlug) return null;
  try {
    const q = (admin as { from: (t: string) => BriefQuery }).from("alux_knowledge_entries");
    const { data } = await q
      .select("title, summary, body, tags")
      .eq("slug", destinationBriefSlug(destinationSlug))
      .eq("status", "published")
      .maybeSingle();
    if (!data) return null;
    return formatDestinationBrief({ ...data, tags: data.tags ?? [] });
  } catch {
    return null;
  }
}
