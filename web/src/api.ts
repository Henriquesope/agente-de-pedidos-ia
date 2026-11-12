import type { ChatResponse } from './types'

// Em produção a URL vem da variável VITE_API_URL (configurada na Vercel).
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function enviarMensagem(sessionId: string, message: string): Promise<ChatResponse> {
  let resposta: Response
  try {
    resposta = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, message }),
    })
  } catch {
    // fetch só lança erro quando nem chegou a ter resposta (API fora do ar, CORS, sem rede).
    throw new Error('Não consegui falar com a API. Confira se ela está rodando.')
  }

  if (resposta.status === 502) {
    throw new Error('O modelo de IA está indisponível agora (limite do plano gratuito). Tente de novo mais tarde.')
  }
  if (!resposta.ok) {
    throw new Error(`A API respondeu com erro ${resposta.status}.`)
  }
  return resposta.json()
}
