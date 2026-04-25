import { BootstrapEnrichmentError } from "../lib/errors"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = "google/gemini-2.5-flash"
const REQUEST_TIMEOUT_MS = 10_000
const MAX_TOKENS = 300
const TEMPERATURE = 0.2

const LIMITS = { genres: 5, themes: 5, moods: 5, sampleTitles: 8, stringLen: 100 }

const ALLOWED_GENRES = new Set<string>([
  "action", "adventure", "animation", "comedy", "crime", "documentary",
  "drama", "family", "fantasy", "history", "horror", "music", "mystery",
  "romance", "science fiction", "thriller", "war", "western",
])

const ALLOWED_MOODS = new Set<string>([
  "dark", "light", "funny", "serious", "uplifting", "gritty", "tense",
  "cerebral", "emotional", "intense", "relaxing", "mysterious",
])

const SYSTEM_PROMPT = `You are a movie-taste interpreter. Given a user's free-text description of what they like,
return a JSON object with keys: genres (string[]), themes (string[]), moods (string[]),
sample_titles (string[]). Use only lowercase English strings. Pick at most 5 genres and
5 moods from the controlled vocabulary. Keep sample_titles to 3-5 real movie titles that
match the description. Do not include explanations outside the JSON.

Controlled genres: action, adventure, animation, comedy, crime, documentary, drama, family,
fantasy, history, horror, music, mystery, romance, science fiction, thriller, war, western.
Controlled moods: dark, light, funny, serious, uplifting, gritty, tense, cerebral,
emotional, intense, relaxing, mysterious.`

export type EnrichedData = {
  genres: string[]
  themes: string[]
  moods: string[]
  sample_titles: string[]
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured")

const REQUEST_HEADERS = {
  Authorization: `Bearer ${OPENROUTER_API_KEY}`,
  "Content-Type": "application/json",
}

const RESPONSE_FORMAT = { type: "json_object" } as const

function buildBody(rawPrompt: string): string {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: rawPrompt },
  ]
  const payload = { model: MODEL, messages, response_format: RESPONSE_FORMAT, temperature: TEMPERATURE, max_tokens: MAX_TOKENS }
  return JSON.stringify(payload)
}

async function callOpenRouter(rawPrompt: string): Promise<Response> {
  return fetch(OPENROUTER_URL, {
    method: "POST",
    headers: REQUEST_HEADERS,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    body: buildBody(rawPrompt),
  })
}

async function readResponseText(response: Response): Promise<string> {
  try { return await response.clone().text() } catch { return "" }
}

async function readResponseJson(response: Response): Promise<unknown> {
  try { return await response.clone().json() } catch { return null }
}

async function failOnBadStatus(response: Response): Promise<void> {
  if (response.status === 429) {
    throw new BootstrapEnrichmentError("quota_exceeded", "OpenRouter rate limit")
  }
  if (response.ok) return
  throw new Error(`OpenRouter ${response.status}: ${await readResponseText(response)}`)
}

async function extractContent(response: Response): Promise<string> {
  const data = (await readResponseJson(response)) as
    | { choices?: Array<{ message?: { content?: unknown } }> }
    | null
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== "string" || content.length === 0) {
    throw new BootstrapEnrichmentError("safety_blocked", "empty content from upstream")
  }
  return content
}

function parseJsonContent(content: string): unknown {
  try { return JSON.parse(content) } catch {
    throw new BootstrapEnrichmentError("unparsable_json", "model returned malformed JSON")
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) =>
    typeof item === "string" ? [item.slice(0, LIMITS.stringLen)] : [],
  )
}

function pickAllowed(value: unknown, allowed: Set<string>, max: number): string[] {
  return asStringArray(value).filter((v) => allowed.has(v)).slice(0, max)
}

function buildEnriched(parsed: unknown): EnrichedData {
  const raw = (parsed ?? {}) as Record<string, unknown>
  const genres = pickAllowed(raw.genres, ALLOWED_GENRES, LIMITS.genres)
  if (genres.length === 0) {
    throw new BootstrapEnrichmentError("empty_after_filter", "couldn't interpret your input")
  }
  return {
    genres,
    moods: pickAllowed(raw.moods, ALLOWED_MOODS, LIMITS.moods),
    themes: asStringArray(raw.themes).slice(0, LIMITS.themes),
    sample_titles: asStringArray(raw.sample_titles).slice(0, LIMITS.sampleTitles),
  }
}

export async function enrichPrompt(rawPrompt: string): Promise<EnrichedData> {
  const response = await callOpenRouter(rawPrompt)
  await failOnBadStatus(response)
  const content = await extractContent(response)
  return buildEnriched(parseJsonContent(content))
}
