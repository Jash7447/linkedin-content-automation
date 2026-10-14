import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { generateJson } from "@/lib/ai/gemini";
import { getGeminiModel } from "@/lib/env.server";
import { validateMermaidSource } from "@/lib/mermaid";
import type { AnalysisContent } from "@/lib/analysis";

/**
 * Callable draft-generation unit: analysis -> Gemini (drafting key) ->
 * personal-learning LinkedIn post (+ optional Mermaid) -> persisted draft and
 * its first immutable version.
 *
 * Designed as a plain function (not tied to a request) so a future pipeline or
 * cron can invoke it too (see ROADMAP automation notes). Returns identifiers
 * the caller can use to display/fetch the draft.
 */

const POST_MIN_CHARS = 1500;
const POST_MAX_CHARS = 2200;

const SYSTEM_INSTRUCTION = `You write a LinkedIn post in a PERSONAL LEARNING voice about a technical paper the author studied.

Voice & style:
- First person, reflective ("I was reading…", "what struck me…"). The author is sharing what they learned, NOT claiming they built or tested the system.
- Technically accurate and concrete. No generic hype, no empty buzzwords.
- A strong first-line hook, then a few short paragraphs, then 2-4 crisp takeaways.
- Target ${POST_MIN_CHARS}-${POST_MAX_CHARS} characters. A few relevant hashtags at the end are fine; do not spam.

Grounding:
- Use ONLY the provided analysis. Do NOT invent specific numbers, metrics, dataset names, or citations not present in it.
- If a specific figure is not given, speak generally rather than fabricating one.

Diagram (optional):
- If a simple diagram would genuinely help explain the architecture/flow, include Mermaid source. Otherwise set mermaid to null.
- Keep Mermaid minimal and valid (e.g. "flowchart TD" or "graph LR"). Do not wrap it in markdown fences.

Return JSON with exactly:
{
  "title": string,          // short internal title for the draft
  "post_text": string,      // the LinkedIn post
  "mermaid": string | null  // Mermaid source, or null if no diagram
}`;

type DraftGenResult = {
  title: string;
  post_text: string;
  mermaid: string | null;
};

export async function generateDraft(
  supabase: SupabaseClient,
  params: { analysisId: string; userId: string },
): Promise<
  | { ok: true; draftId: string; versionId: string }
  | { ok: false; error: string }
> {
  const { analysisId, userId } = params;

  const generated = await generateFromAnalysis(supabase, { analysisId });
  if (!generated.ok) {
    return { ok: false, error: generated.error };
  }

  // Create the draft container.
  const { data: draft, error: draftError } = await supabase
    .from("drafts")
    .insert({
      user_id: userId,
      source_analysis_id: generated.analysisId,
      source_document_id: generated.documentId,
      title: generated.title,
    })
    .select("id")
    .single();

  if (draftError || !draft) {
    return {
      ok: false,
      error: `Could not create draft: ${draftError?.message ?? "unknown"}`,
    };
  }

  // Create the first immutable version (version_number = 1, pending).
  const { data: version, error: versionError } = await supabase
    .from("draft_versions")
    .insert({
      draft_id: draft.id,
      user_id: userId,
      version_number: 1,
      post_text: generated.postText,
      mermaid_source: generated.mermaid,
      review_status: "pending",
      model: getGeminiModel(),
    })
    .select("id")
    .single();

  if (versionError || !version) {
    // Roll back the empty draft container.
    await supabase.from("drafts").delete().eq("id", draft.id);
    return {
      ok: false,
      error: `Could not create draft version: ${versionError?.message ?? "unknown"}`,
    };
  }

  // Point the draft at its current version.
  await supabase
    .from("drafts")
    .update({ current_version_id: version.id })
    .eq("id", draft.id);

  return { ok: true, draftId: draft.id, versionId: version.id };
}

/**
 * Generation core shared by initial generation and regeneration: load an
 * analysis, prompt Gemini (drafting key), validate Mermaid. Does NOT persist
 * anything — the caller decides whether to create a new draft or append a
 * version.
 */
async function generateFromAnalysis(
  supabase: SupabaseClient,
  params: { analysisId: string },
): Promise<
  | {
      ok: true;
      analysisId: string;
      documentId: string;
      title: string;
      postText: string;
      mermaid: string | null;
    }
  | { ok: false; error: string }
> {
  // Load the analysis (RLS limits to the caller's own rows).
  const { data: analysis, error: loadError } = await supabase
    .from("analyses")
    .select("id, document_id, summary, content")
    .eq("id", params.analysisId)
    .single();

  if (loadError || !analysis) {
    return { ok: false, error: "Analysis not found." };
  }

  const content = (analysis.content ?? {}) as Partial<AnalysisContent>;

  const prompt = [
    `Title: ${content.title ?? ""}`,
    `Summary: ${analysis.summary ?? ""}`,
    `Problem: ${content.problem ?? ""}`,
    `Contributions:\n- ${(content.contributions ?? []).join("\n- ")}`,
    `Method: ${content.method ?? ""}`,
    `Results: ${content.results ?? ""}`,
    `Takeaways:\n- ${(content.takeaways ?? []).join("\n- ")}`,
  ].join("\n\n");

  let gen: DraftGenResult;
  try {
    gen = await generateJson<DraftGenResult>({
      task: "drafting",
      systemInstruction: SYSTEM_INSTRUCTION,
      prompt,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Draft generation failed.",
    };
  }

  const postText = (gen.post_text ?? "").trim();
  if (postText.length === 0) {
    return { ok: false, error: "Model returned an empty post." };
  }

  // Validate Mermaid; drop it (don't fail the draft) if invalid.
  let mermaid: string | null = null;
  if (gen.mermaid && gen.mermaid.trim().length > 0) {
    const check = validateMermaidSource(gen.mermaid);
    if (check.ok) mermaid = gen.mermaid.trim();
  }

  const title = (gen.title ?? content.title ?? "Untitled draft").slice(0, 200);

  return {
    ok: true,
    analysisId: analysis.id,
    documentId: analysis.document_id,
    title,
    postText,
    mermaid,
  };
}

/**
 * Shared helper: append a NEW immutable version to an existing draft and point
 * the draft at it. New versions always start 'pending' — approval is never
 * inherited from a prior version (steering §6). Returns the new version id.
 */
async function appendVersion(
  supabase: SupabaseClient,
  params: {
    draftId: string;
    userId: string;
    postText: string;
    mermaidSource: string | null;
  },
): Promise<
  { ok: true; versionId: string; versionNumber: number } | { ok: false; error: string }
> {
  const { draftId, userId, postText, mermaidSource } = params;

  // Next version number = max(existing) + 1.
  const { data: last } = await supabase
    .from("draft_versions")
    .select("version_number")
    .eq("draft_id", draftId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextNumber = (last?.version_number ?? 0) + 1;

  const { data: version, error: versionError } = await supabase
    .from("draft_versions")
    .insert({
      draft_id: draftId,
      user_id: userId,
      version_number: nextNumber,
      post_text: postText,
      mermaid_source: mermaidSource,
      review_status: "pending",
      model: getGeminiModel(),
    })
    .select("id")
    .single();

  if (versionError || !version) {
    return {
      ok: false,
      error: `Could not create version: ${versionError?.message ?? "unknown"}`,
    };
  }

  await supabase
    .from("drafts")
    .update({ current_version_id: version.id })
    .eq("id", draftId);

  return { ok: true, versionId: version.id, versionNumber: nextNumber };
}

/**
 * Create a new version from USER-EDITED content. The edited text is a content
 * change, so it becomes a new immutable version (never an in-place edit).
 * Mermaid is validated; invalid source is dropped (post still saved).
 */
export async function createEditedVersion(
  supabase: SupabaseClient,
  params: {
    draftId: string;
    userId: string;
    postText: string;
    mermaidSource?: string | null;
  },
): Promise<
  { ok: true; versionId: string; versionNumber: number } | { ok: false; error: string }
> {
  const postText = (params.postText ?? "").trim();
  if (postText.length === 0) {
    return { ok: false, error: "Post text cannot be empty." };
  }

  // Ownership check (RLS also enforces this).
  const { data: draft, error } = await supabase
    .from("drafts")
    .select("id")
    .eq("id", params.draftId)
    .single();
  if (error || !draft) {
    return { ok: false, error: "Draft not found." };
  }

  let mermaid: string | null = null;
  if (params.mermaidSource && params.mermaidSource.trim().length > 0) {
    const check = validateMermaidSource(params.mermaidSource);
    if (check.ok) mermaid = params.mermaidSource.trim();
    else return { ok: false, error: `Invalid diagram: ${check.error}` };
  }

  return appendVersion(supabase, {
    draftId: params.draftId,
    userId: params.userId,
    postText,
    mermaidSource: mermaid,
  });
}

/**
 * Regenerate: produce a fresh LLM draft from the draft's SOURCE analysis and
 * append it as a new version. Reuses the same generation prompt as the initial
 * draft. Fails if the draft has no source analysis.
 */
export async function regenerateVersion(
  supabase: SupabaseClient,
  params: { draftId: string; userId: string },
): Promise<
  { ok: true; versionId: string; versionNumber: number } | { ok: false; error: string }
> {
  const { data: draft, error } = await supabase
    .from("drafts")
    .select("id, source_analysis_id")
    .eq("id", params.draftId)
    .single();

  if (error || !draft) {
    return { ok: false, error: "Draft not found." };
  }
  if (!draft.source_analysis_id) {
    return {
      ok: false,
      error: "This draft has no source to regenerate from.",
    };
  }

  const generated = await generateFromAnalysis(supabase, {
    analysisId: draft.source_analysis_id,
  });
  if (!generated.ok) {
    return { ok: false, error: generated.error };
  }

  return appendVersion(supabase, {
    draftId: params.draftId,
    userId: params.userId,
    postText: generated.postText,
    mermaidSource: generated.mermaid,
  });
}
