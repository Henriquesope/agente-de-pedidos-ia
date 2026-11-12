// Tipos que espelham os modelos Pydantic da API (app/api.py).

export interface ItemCarrinho {
  item_id: string
  nome: string
  preco: number
  quantidade: number
}

export interface Carrinho {
  restaurante_id: string | null
  restaurante: string | null
  itens: ItemCarrinho[]
  subtotal: number
  taxa_entrega: number
  total: number
}

export interface ChatResponse {
  resposta: string
  carrinho: Carrinho
}

// Uma mensagem na tela do chat (só existe no front).
export interface Mensagem {
  autor: 'usuario' | 'agente'
  texto: string
}
