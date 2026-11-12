import { useState } from 'react'
import { enviarMensagem } from './api'
import Carrinho from './components/Carrinho'
import Chat from './components/Chat'
import { IconeMais, Marca } from './components/Icones'
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

  // Chama a API e coloca a resposta do agente na tela.
  async function pedirResposta(texto: string) {
    setErro(null)
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

  function enviar(texto: string) {
    setMensagens((anteriores) => [...anteriores, { autor: 'usuario', texto }])
    void pedirResposta(texto)
  }

  // Depois de um erro: reenvia a última mensagem do usuário, sem duplicá-la na tela.
  function tentarDeNovo() {
    const ultima = mensagens.findLast((mensagem) => mensagem.autor === 'usuario')
    if (ultima) void pedirResposta(ultima.texto)
  }

  // Sessão nova = id novo. O back cria histórico e carrinho vazios para ele.
  function novoPedido() {
    setSessionId(crypto.randomUUID())
    setMensagens([])
    setCarrinho(CARRINHO_VAZIO)
    setErro(null)
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-linha bg-painel px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Marca />
          <h1 className="text-base font-semibold tracking-tight">Agente de Pedidos</h1>
        </div>
        <button
          type="button"
          onClick={novoPedido}
          disabled={carregando || mensagens.length === 0}
          className="flex items-center gap-1.5 rounded-lg border border-linha px-3 py-2 text-sm font-medium transition-colors hover:bg-fundo active:bg-linha disabled:opacity-40"
        >
          <IconeMais className="size-4" />
          Novo pedido
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col md:flex-row">
        <Chat
          mensagens={mensagens}
          carregando={carregando}
          erro={erro}
          aoEnviar={enviar}
          aoTentarDeNovo={tentarDeNovo}
        />
        <Carrinho carrinho={carrinho} />
      </main>
    </div>
  )
}
