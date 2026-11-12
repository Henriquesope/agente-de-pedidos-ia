import { useState } from 'react'
import type { Carrinho as DadosCarrinho } from '../types'
import { IconeAbrir, IconeSacola } from './Icones'

const formatoReais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Carrinho({ carrinho }: { carrinho: DadosCarrinho }) {
  // No celular o carrinho é uma barra que abre e fecha; no desktop fica sempre aberto.
  const [aberto, setAberto] = useState(false)

  const unidades = carrinho.itens.reduce((soma, item) => soma + item.quantidade, 0)
  const vazio = unidades === 0
  const resumo = vazio ? 'Vazio' : `${unidades} ${unidades === 1 ? 'item' : 'itens'}`

  return (
    <aside
      aria-label="Carrinho"
      className="order-first flex shrink-0 flex-col border-b border-linha bg-painel md:order-none md:w-88 md:border-b-0 md:border-l"
    >
      {/* Barra do celular */}
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
        className="flex items-center gap-3 px-4 py-3 text-left md:hidden"
      >
        <IconeSacola className="size-5 text-marca" />
        <span className="flex-1 font-medium">
          Carrinho <span className="font-normal text-tinta-suave">· {resumo}</span>
        </span>
        {!vazio && <span className="font-semibold tabular-nums">{formatoReais.format(carrinho.total)}</span>}
        <IconeAbrir className={`size-4 text-tinta-suave transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {/* Título do desktop */}
      <div className="hidden items-baseline justify-between px-6 pt-6 md:flex">
        <h2 className="text-lg font-semibold tracking-tight">Seu carrinho</h2>
        <span className="text-sm text-tinta-suave">{resumo}</span>
      </div>

      <div
        className={`${aberto ? 'flex' : 'hidden'} max-h-[55dvh] min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 md:flex md:max-h-none md:px-6 md:pb-6`}
      >
        {vazio ? (
          <div className="py-4 md:my-auto md:py-0 md:text-center">
            <span className="mx-auto hidden size-12 place-items-center rounded-full bg-fundo text-tinta-suave md:grid">
              <IconeSacola className="size-6" />
            </span>
            <p className="font-medium md:mt-4">Nada por aqui ainda</p>
            <p className="mt-1 text-sm text-tinta-suave">Faça um pedido no chat e os itens escolhidos aparecem aqui.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-tinta-suave md:mt-1">
              Pedido em <span className="font-medium text-tinta">{carrinho.restaurante}</span>
            </p>

            <ul className="mt-4 divide-y divide-linha border-y border-linha">
              {carrinho.itens.map((item) => (
                <li key={item.item_id} className="flex animate-entrar items-start gap-3 py-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-md bg-marca-suave text-xs font-semibold text-marca-forte tabular-nums">
                    {item.quantidade}
                  </span>
                  <span className="flex-1 leading-snug">{item.nome}</span>
                  <span className="shrink-0 tabular-nums">{formatoReais.format(item.preco * item.quantidade)}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-1.5 text-sm tabular-nums">
              <div className="flex justify-between text-tinta-suave">
                <dt>Subtotal</dt>
                <dd>{formatoReais.format(carrinho.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-tinta-suave">
                <dt>Taxa de entrega</dt>
                <dd>{carrinho.taxa_entrega === 0 ? 'Grátis' : formatoReais.format(carrinho.taxa_entrega)}</dd>
              </div>
              <div className="flex items-baseline justify-between pt-2 text-tinta">
                <dt className="text-base font-semibold">Total</dt>
                <dd className="text-xl font-semibold tracking-tight">{formatoReais.format(carrinho.total)}</dd>
              </div>
            </dl>

            <p className="mt-6 text-xs text-tinta-suave md:mt-auto md:pt-6">
              Projeto de demonstração: restaurantes fictícios, nenhum pedido é enviado de verdade.
            </p>
          </>
        )}
      </div>
    </aside>
  )
}
