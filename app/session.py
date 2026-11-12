"""Estado por sessão: histórico da conversa e carrinho, guardados em memória.

Cada session_id tem uma Sessao própria. Isso vai ser usado pela API na etapa 4;
na etapa 3 o chat de terminal usa uma sessão única.
"""

from dataclasses import dataclass, field

from google.genai import types


@dataclass
class ItemCarrinho:
    item_id: str
    nome: str
    preco: float
    quantidade: int


@dataclass
class Carrinho:
    """Carrinho de um único restaurante (regra do iFood)."""

    restaurante_id: str | None = None
    itens: list[ItemCarrinho] = field(default_factory=list)


@dataclass
class Sessao:
    historico: list[types.Content] = field(default_factory=list)
    carrinho: Carrinho = field(default_factory=Carrinho)


_sessoes: dict[str, Sessao] = {}


def obter_sessao(session_id: str) -> Sessao:
    """Devolve a sessão desse id, criando uma nova se for a primeira mensagem."""
    if session_id not in _sessoes:
        _sessoes[session_id] = Sessao()
    return _sessoes[session_id]
