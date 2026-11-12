"""Tools que o modelo pode chamar.

Este arquivo tem duas partes:
1. As funções Python (lógica de negócio pura, sem nada do Gemini).
2. DECLARACOES: a descrição de cada tool em JSON Schema, que é o que o modelo
   "enxerga" para decidir qual tool chamar e com quais argumentos.

Todas as tools devolvem um dict, porque o resultado volta para o modelo como JSON.
Erros de negócio também voltam como dict ({"erro": "..."}) em vez de exceção:
assim o modelo lê o erro e decide o que fazer (avisar o usuário, tentar outra coisa).
"""

import json
import unicodedata
from pathlib import Path
from typing import Any

from google.genai import types

from app.session import Carrinho, ItemCarrinho

CAMINHO_DADOS = Path(__file__).resolve().parent.parent / "data" / "restaurantes.json"
MAX_RESULTADOS = 15  # limita o tamanho da resposta da busca (menos tokens)

with open(CAMINHO_DADOS, encoding="utf-8") as arquivo:
    _dados = json.load(arquivo)

RESTAURANTES: dict[str, dict[str, Any]] = {r["id"]: r for r in _dados["restaurantes"]}
ITENS: dict[str, dict[str, Any]] = {i["id"]: i for i in _dados["itens"]}


def _normalizar(texto: str) -> str:
    """Minúsculas e sem acento, para 'feijão' casar com 'feijao'."""
    sem_acento = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("ascii")
    return sem_acento.lower()


def _texto_do_item(item: dict[str, Any]) -> str:
    """Texto onde a busca procura: nome, descrição e dados do restaurante."""
    restaurante = RESTAURANTES[item["restaurante_id"]]
    partes = [item["nome"], item["descricao"], restaurante["nome"], restaurante["categoria"]]
    return _normalizar(" ".join(partes))


def buscar_itens(
    texto: str | None = None,
    preco_max: float | None = None,
    tags: list[str] | None = None,
) -> dict[str, Any]:
    """Busca itens nos cardápios. Todos os filtros são opcionais e combinados com E."""
    palavras = _normalizar(texto).split() if texto else []
    encontrados: list[tuple[int, dict[str, Any]]] = []

    for item in ITENS.values():
        if preco_max is not None and item["preco"] > preco_max:
            continue
        if tags and not set(tags).issubset(item["tags"]):
            continue

        # Pontuação = quantas palavras da busca aparecem no item.
        pontos = 0
        if palavras:
            alvo = _texto_do_item(item)
            pontos = sum(1 for palavra in palavras if palavra in alvo)
            if pontos == 0:
                continue

        encontrados.append((pontos, item))

    # Mais relevantes primeiro; em caso de empate, os mais baratos.
    encontrados.sort(key=lambda par: (-par[0], par[1]["preco"]))

    itens = []
    for _, item in encontrados[:MAX_RESULTADOS]:
        restaurante = RESTAURANTES[item["restaurante_id"]]
        itens.append(
            {
                **item,
                "restaurante": restaurante["nome"],
                "taxa_entrega": restaurante["taxa_entrega"],
            }
        )
    return {"total_encontrados": len(encontrados), "itens": itens}


def detalhes_restaurante(restaurante_id: str) -> dict[str, Any]:
    restaurante = RESTAURANTES.get(restaurante_id)
    if restaurante is None:
        return {"erro": f"Restaurante '{restaurante_id}' não existe."}
    return restaurante


def ver_carrinho(carrinho: Carrinho) -> dict[str, Any]:
    """Itens, subtotal, taxa de entrega e total do carrinho."""
    subtotal = sum(i.preco * i.quantidade for i in carrinho.itens)
    restaurante = RESTAURANTES.get(carrinho.restaurante_id or "")
    taxa = restaurante["taxa_entrega"] if restaurante else 0.0
    return {
        "restaurante_id": carrinho.restaurante_id,
        "restaurante": restaurante["nome"] if restaurante else None,
        "itens": [
            {"item_id": i.item_id, "nome": i.nome, "preco": i.preco, "quantidade": i.quantidade}
            for i in carrinho.itens
        ],
        "subtotal": round(subtotal, 2),
        "taxa_entrega": taxa,
        "total": round(subtotal + taxa, 2),
    }


def adicionar_ao_carrinho(carrinho: Carrinho, item_id: str, quantidade: int = 1) -> dict[str, Any]:
    item = ITENS.get(item_id)
    if item is None:
        return {"erro": f"Item '{item_id}' não existe. Use buscar_itens para achar ids válidos."}
    if quantidade < 1:
        return {"erro": "A quantidade precisa ser pelo menos 1."}

    # Regra de negócio: um restaurante por carrinho.
    if carrinho.restaurante_id and carrinho.restaurante_id != item["restaurante_id"]:
        atual = RESTAURANTES[carrinho.restaurante_id]["nome"]
        novo = RESTAURANTES[item["restaurante_id"]]["nome"]
        return {
            "erro": (
                f"O carrinho já tem itens do restaurante {atual} e só aceita um restaurante "
                f"por vez. Para adicionar itens do {novo}, remova antes os itens atuais."
            )
        }

    existente = next((i for i in carrinho.itens if i.item_id == item_id), None)
    if existente:
        existente.quantidade += quantidade
    else:
        carrinho.itens.append(ItemCarrinho(item_id, item["nome"], item["preco"], quantidade))
    carrinho.restaurante_id = item["restaurante_id"]
    return ver_carrinho(carrinho)


def remover_item(carrinho: Carrinho, item_id: str) -> dict[str, Any]:
    existente = next((i for i in carrinho.itens if i.item_id == item_id), None)
    if existente is None:
        return {"erro": f"O item '{item_id}' não está no carrinho."}
    carrinho.itens.remove(existente)
    if not carrinho.itens:
        carrinho.restaurante_id = None  # carrinho vazio aceita qualquer restaurante de novo
    return ver_carrinho(carrinho)


# ---------------------------------------------------------------------------
# Declarações: o que o modelo recebe para saber que tools existem.
# O modelo nunca vê o código acima, só nome + descrição + schema dos parâmetros.
# ---------------------------------------------------------------------------

TAGS_VALIDAS = sorted({tag for item in ITENS.values() for tag in item["tags"]})

DECLARACOES: list[types.FunctionDeclaration] = [
    types.FunctionDeclaration(
        name="buscar_itens",
        description=(
            "Busca itens nos cardápios de todos os restaurantes. Todos os filtros são opcionais. "
            "Cada item retornado traz o restaurante e a taxa de entrega dele."
        ),
        parameters_json_schema={
            "type": "object",
            "properties": {
                "texto": {
                    "type": "string",
                    "description": "Palavras para procurar no nome/descrição do item ou no restaurante. Ex.: 'salada', 'pizza'.",
                },
                "preco_max": {
                    "type": "number",
                    "description": "Preço máximo do item em reais (não inclui taxa de entrega).",
                },
                "tags": {
                    "type": "array",
                    "items": {"type": "string", "enum": TAGS_VALIDAS},
                    "description": "O item precisa ter TODAS as tags informadas.",
                },
            },
        },
    ),
    types.FunctionDeclaration(
        name="detalhes_restaurante",
        description="Retorna nome, categoria, tempo de entrega (min) e taxa de entrega de um restaurante.",
        parameters_json_schema={
            "type": "object",
            "properties": {"restaurante_id": {"type": "string"}},
            "required": ["restaurante_id"],
        },
    ),
    types.FunctionDeclaration(
        name="adicionar_ao_carrinho",
        description=(
            "Adiciona um item ao carrinho e retorna o carrinho atualizado. "
            "O carrinho só aceita itens de um restaurante por vez."
        ),
        parameters_json_schema={
            "type": "object",
            "properties": {
                "item_id": {"type": "string", "description": "Id do item, como retornado por buscar_itens."},
                "quantidade": {"type": "integer", "minimum": 1},
            },
            "required": ["item_id", "quantidade"],
        },
    ),
    types.FunctionDeclaration(
        name="remover_item",
        description="Remove um item do carrinho (todas as unidades) e retorna o carrinho atualizado.",
        parameters_json_schema={
            "type": "object",
            "properties": {"item_id": {"type": "string"}},
            "required": ["item_id"],
        },
    ),
    types.FunctionDeclaration(
        name="ver_carrinho",
        description="Retorna os itens do carrinho, o subtotal, a taxa de entrega e o total.",
        parameters_json_schema={"type": "object", "properties": {}},
    ),
]
