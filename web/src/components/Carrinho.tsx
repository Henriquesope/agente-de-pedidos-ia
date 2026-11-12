import type { Carrinho as DadosCarrinho } from '../types'

const formatoReais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Carrinho({ carrinho }: { carrinho: DadosCarrinho }) {
  const vazio = carrinho.itens.length === 0

  return (
    <aside className="max-h-64 shrink-0 overflow-y-auto border-t border-stone-200 bg-white p-4 md:max-h-none md:w-80 md:border-t-0 md:border-l">
      <h2 className="font-semibold">Carrinho</h2>

      {vazio ? (
        <p className="mt-2 text-sm text-stone-500">Vazio por enquanto. Os itens aparecem aqui conforme o agente adiciona.</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-stone-500">{carrinho.restaurante}</p>

          <ul className="mt-3 divide-y divide-stone-100">
            {carrinho.itens.map((item) => (
              <li key={item.item_id} className="flex justify-between gap-3 py-2 text-sm">
                <span>
                  <span className="font-medium text-red-700">{item.quantidade}×</span> {item.nome}
                </span>
                <span className="shrink-0 tabular-nums">{formatoReais.format(item.preco * item.quantidade)}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-3 space-y-1 border-t border-stone-200 pt-3 text-sm tabular-nums">
            <div className="flex justify-between text-stone-600">
              <dt>Subtotal</dt>
              <dd>{formatoReais.format(carrinho.subtotal)}</dd>
            </div>
            <div className="flex justify-between text-stone-600">
              <dt>Taxa de entrega</dt>
              <dd>{carrinho.taxa_entrega === 0 ? 'Grátis' : formatoReais.format(carrinho.taxa_entrega)}</dd>
            </div>
            <div className="flex justify-between pt-1 text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatoReais.format(carrinho.total)}</dd>
            </div>
          </dl>
        </>
      )}
    </aside>
  )
}
