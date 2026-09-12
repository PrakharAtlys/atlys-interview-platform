const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// Thin proxy to OpenRouter so the system prompt (which is the actual secret
// in challenges 8/16) never reaches the client — only the backend ever sees
// it. Uses whatever OPENROUTER_MODEL is configured (default: a $0 free-tier
// model) so running these two challenges costs nothing.
export async function callLLM(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured on the server')
  }

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'openrouter/free',
      messages,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenRouter request failed (${res.status}): ${body}`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const reply = data.choices?.[0]?.message?.content
  if (!reply) throw new Error('OpenRouter returned no reply')
  return reply
}
