const OPENROUTER_URL = "https://openrouter.ai/api/v1/embeddings"
const MODEL = "openai/text-embedding-3-small"

function getApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured")
  }
  return apiKey
}

async function requestEmbedding(text: string, apiKey: string): Promise<Response> {
  return fetch(OPENROUTER_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, input: text }),
  })
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await requestEmbedding(text, getApiKey())
  if (!response.ok) {
    const body = await response.text()
    throw new Error("OpenRouter embedding failed (" + response.status + "): " + body)
  }
  const data = await response.json()
  return data.data[0].embedding
}
