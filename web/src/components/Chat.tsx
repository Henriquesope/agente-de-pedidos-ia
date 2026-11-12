import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Markdown from 'react-markdown'
import type { Mensagem } from '../types'
import { IconeAlerta, IconeEnviar, IconeSeta } from './Icones'

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
  aoTentarDeNovo: () => void
}

export default function Chat({ mensagens, carregando, erro, aoEnviar, aoTentarDeNovo }: Props) {
  const [texto, setTexto] = useState('')
  const fimDaLista = useRef<HTMLDivElement>(null)

  // Rola para a última mensagem sempre que a conversa muda.
  useEffect(() => {
    fimDaLista.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [mensagens, carregando, erro])

  function aoSubmeter(evento: FormEvent) {
    evento.preventDefault()
    const limpo = texto.trim()
    if (!limpo || carregando) return
    aoEnviar(limpo)
    setTexto('')
  }

  return (
    <section aria-label="Conversa" className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 md:px-6">
        {/* Coluna centralizada: linhas de texto curtas são mais fáceis de ler. */}
        <div className="mx-auto flex min-h-full max-w-2xl flex-col gap-3 py-6">
          {mensagens.length === 0 && <Boasvindas aoEscolher={aoEnviar} desativado={carregando} />}

          {mensagens.map((mensagem, indice) => (
            <Balao key={indice} mensagem={mensagem} />
          ))}

          {carregando && <Digitando />}

          {erro && (
            <div
              role="alert"
              className="flex animate-entrar flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-marca-suave px-4 py-3 text-sm text-marca-forte"
            >
              <IconeAlerta className="size-5 shrink-0" />
              <p className="min-w-40 flex-1">{erro}</p>
              <button
                type="button"
                onClick={aoTentarDeNovo}
                className="rounded-lg bg-painel px-3 py-1.5 font-medium transition-colors hover:bg-fundo"
              >
                Tentar de novo
              </button>
            </div>
          )}

          <div ref={fimDaLista} />
        </div>
      </div>

      <div className="border-t border-linha bg-painel px-4 py-3 md:px-6">
        <form
          onSubmit={aoSubmeter}
          className="mx-auto flex max-w-2xl items-center gap-2 rounded-2xl border border-linha bg-fundo py-1.5 pr-1.5 pl-4 transition-colors focus-within:border-marca"
        >
          <input
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder="Ex.: um almoço vegetariano até R$35"
            aria-label="Seu pedido"
            maxLength={2000}
            className="min-w-0 flex-1 bg-transparent py-1.5 outline-none placeholder:text-tinta-suave"
          />
          <button
            type="submit"
            disabled={carregando || !texto.trim()}
            aria-label="Enviar pedido"
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-marca text-white transition-colors hover:bg-marca-forte active:scale-95 disabled:bg-linha disabled:text-tinta-suave"
          >
            <IconeEnviar />
          </button>
        </form>
      </div>
    </section>
  )
}

// Estado vazio: explica o que dá para fazer e oferece pedidos prontos.
function Boasvindas({ aoEscolher, desativado }: { aoEscolher: (texto: string) => void; desativado: boolean }) {
  return (
    <div className="my-auto py-6">
      <h2 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">O que você quer comer hoje?</h2>
      <p className="mt-2 max-w-prose text-tinta-suave">
        Descreva do seu jeito: o prato, quanto quer gastar, o que não pode comer. Eu busco nos cardápios e monto o
        carrinho.
      </p>

      <h3 className="mt-8 text-sm font-medium text-tinta-suave">Ou comece por um destes</h3>
      <ul className="mt-2 divide-y divide-linha border-y border-linha">
        {SUGESTOES.map((sugestao) => (
          <li key={sugestao}>
            <button
              type="button"
              onClick={() => aoEscolher(sugestao)}
              disabled={desativado}
              className="group flex w-full items-center justify-between gap-4 py-3.5 text-left transition-colors hover:text-marca-forte disabled:opacity-50"
            >
              {sugestao}
              <IconeSeta className="size-4 shrink-0 text-tinta-suave transition-transform group-hover:translate-x-1 group-hover:text-marca" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Balao({ mensagem }: { mensagem: Mensagem }) {
  if (mensagem.autor === 'usuario') {
    return (
      <p className="ml-auto w-fit max-w-[85%] animate-entrar rounded-2xl rounded-br-md bg-marca px-4 py-2.5 text-white">
        {mensagem.texto}
      </p>
    )
  }
  // O agente responde em Markdown (negrito, listas), então usamos react-markdown.
  return (
    <div className="w-fit max-w-[85%] animate-entrar space-y-2 rounded-2xl rounded-bl-md border border-linha bg-painel px-4 py-2.5 leading-relaxed [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ul]:marker:text-marca">
      <Markdown>{mensagem.texto}</Markdown>
    </div>
  )
}

// Três pontinhos enquanto o agente consulta os cardápios.
function Digitando() {
  return (
    <div
      role="status"
      className="flex w-fit animate-entrar items-center gap-3 rounded-2xl rounded-bl-md border border-linha bg-painel px-4 py-3 text-sm text-tinta-suave"
    >
      <span className="flex gap-1" aria-hidden="true">
        <span className="size-1.5 animate-ponto rounded-full bg-marca" />
        <span className="size-1.5 animate-ponto rounded-full bg-marca [animation-delay:150ms]" />
        <span className="size-1.5 animate-ponto rounded-full bg-marca [animation-delay:300ms]" />
      </span>
      Buscando nos cardápios
    </div>
  )
}
