import { useState } from 'react'
import { enviarMensagem } from './api'
import Carrinho from './components/Carrinho'
import Chat from './components/Chat'
import type { Carrinho as DadosCarrinho, Mensagem } from './types'

const CARRINHO_VAZIO: DadosCarrinho = {
  restaurante_id: null,
  restaurante: null,
  itens: [],
  subtotal: 0,
  taxa_entrega: 0,
  total: 0,
}

export default function App() {
  // O session_id identifica a conversa no back: é ele que liga este navegador
  // ao histórico e ao carrinho guardados na API.
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID())
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [carrinho, setCarrinho] = useState<DadosCarrinho>(CARRINHO_VAZIO)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function enviar(texto: string) {
    setErro(null)
    setMensagens((anteriores) => [...anteriores, { autor: 'usuario', texto }])
    setCarregando(true)
    try {
      const dados = await enviarMensagem(sessionId, texto)
      setMensagens((anteriores) => [...anteriores, { autor: 'agente', texto: dados.resposta }])
      setCarrinho(dados.carrinho) // o carrinho da tela é sempre o que a API devolveu
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Erro inesperado.')
    } finally {
      setCarregando(false)
    }
  }

  // Sessão nova = id novo. O back cria histórico e carrinho vazios para ele.
  function novoPedido() {
    setSessionId(crypto.randomUUID())
    setMensagens([])
    setCarrinho(CARRINHO_VAZIO)
    setErro(null)
  }

  return (
    <div className="flex h-dvh flex-col bg-stone-100 text-stone-900">
      <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">Agente de Pedidos</h1>
          <p className="text-sm text-stone-500">Diga o que quer comer e eu monto o carrinho.</p>
        </div>
        <button
          type="button"
          onClick={novoPedido}
          disabled={carregando}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-stone-50 disabled:opacity-50"
        >
          Novo pedido
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col md:flex-row">
        <Chat mensagens={mensagens} carregando={carregando} erro={erro} aoEnviar={enviar} />
        <Carrinho carrinho={carrinho} />
      </main>
    </div>
  )
}
