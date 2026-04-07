const OPENROUTER_URL = "https://openrouter.ai/api/v1/embeddings"
const MODEL = "openai/text-embedding-3-small"

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured")
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      input: text,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`OpenRouter embedding failed (${response.status}): ${body}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}
