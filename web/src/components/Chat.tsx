import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Markdown from 'react-markdown'
import type { Mensagem } from '../types'

const SUGESTOES = [
  'Quero algo leve pro jantar, até R$40, sem lactose',
  'Uma pizza gastando no máximo 35 reais no total',
  'Sou vegano, quero um lanche',
]

interface Props {
  mensagens: Mensagem[]
  carregando: boolean
  erro: string | null
  aoEnviar: (texto: string) => void
}

export default function Chat({ mensagens, carregando, erro, aoEnviar }: Props) {
  const [texto, setTexto] = useState('')
  const fimDaLista = useRef<HTMLDivElement>(null)

  // Rola para a última mensagem sempre que a conversa muda.
  useEffect(() => {
    fimDaLista.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, carregando, erro])

  function aoSubmeter(evento: FormEvent) {
    evento.preventDefault()
    const limpo = texto.trim()
    if (!limpo || carregando) return
    aoEnviar(limpo)
    setTexto('')
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {mensagens.length === 0 && (
          <div className="mx-auto max-w-md pt-8 text-center">
            <p className="mb-4 text-stone-500">Experimente um destes pedidos:</p>
            <div className="flex flex-col gap-2">
              {SUGESTOES.map((sugestao) => (
                <button
                  key={sugestao}
                  type="button"
                  onClick={() => aoEnviar(sugestao)}
                  disabled={carregando}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-sm hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
                >
                  {sugestao}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensagens.map((mensagem, indice) => (
          <Balao key={indice} mensagem={mensagem} />
        ))}

        {carregando && (
          <p className="w-fit animate-pulse rounded-2xl bg-white px-4 py-2 text-sm text-stone-500 shadow-sm">
            Buscando nos cardápios…
          </p>
        )}

        {erro && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {erro}
          </p>
        )}

        <div ref={fimDaLista} />
      </div>

      <form onSubmit={aoSubmeter} className="flex gap-2 border-t border-stone-200 bg-white p-3">
        <input
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          placeholder="O que você quer pedir?"
          aria-label="Mensagem"
          maxLength={2000}
          className="min-w-0 flex-1 rounded-xl border border-stone-300 px-4 py-2 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
        />
        <button
          type="submit"
          disabled={carregando || !texto.trim()}
          className="rounded-xl bg-red-600 px-5 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </section>
  )
}

function Balao({ mensagem }: { mensagem: Mensagem }) {
  if (mensagem.autor === 'usuario') {
    return (
      <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-red-600 px-4 py-2 text-white">
        {mensagem.texto}
      </p>
    )
  }
  // O agente responde em Markdown (negrito, listas), então usamos react-markdown.
  return (
    <div className="w-fit max-w-[85%] space-y-2 rounded-2xl rounded-bl-sm bg-white px-4 py-2 shadow-sm [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5">
      <Markdown>{mensagem.texto}</Markdown>
    </div>
  )
}
