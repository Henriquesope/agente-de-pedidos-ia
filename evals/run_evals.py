"""Roda os casos de evals/casos.jsonl contra o agente e calcula a taxa de acerto.

Uso:
    python -m evals.run_evals                 # todos os casos
    python -m evals.run_evals orcamento-01    # só os casos com esses ids

Cada caso roda numa sessão nova. Depois da conversa, olhamos o CARRINHO FINAL
(não o texto da resposta) e conferimos as expectativas em código. Isso deixa o
eval objetivo: ou o carrinho respeita o orçamento/tags/itens, ou não respeita.
"""

import json
import sys
import time
from collections import Counter
from pathlib import Path
from typing import Any

from google.genai import errors

from app.agent import responder
from app.session import Sessao
from app.tools import ITENS, ver_carrinho

PASTA = Path(__file__).resolve().parent
CAMINHO_CASOS = PASTA / "casos.jsonl"
CAMINHO_RESULTADOS = PASTA / "resultados.json"

PAUSA_ENTRE_CASOS = 15  # segundos; free tier permite ~10 requisições por minuto
ESPERA_APOS_ERRO = 60
MAX_TENTATIVAS = 3


class CotaDiariaEsgotada(Exception):
    """A cota de requisições por dia do free tier acabou; só volta no dia seguinte."""


def carregar_casos() -> list[dict[str, Any]]:
    with open(CAMINHO_CASOS, encoding="utf-8") as arquivo:
        return [json.loads(linha) for linha in arquivo if linha.strip()]


def rodar_conversa(caso: dict[str, Any]) -> tuple[Sessao, list[str]]:
    """Manda o pedido (e os seguimentos, se houver) numa sessão nova."""
    sessao = Sessao()
    respostas = []
    for mensagem in [caso["pedido"], *caso.get("seguimentos", [])]:
        respostas.append(responder(sessao, mensagem))
    return sessao, respostas


def rodar_com_retry(caso: dict[str, Any]) -> tuple[Sessao, list[str]]:
    """Se a API falhar (429 de limite, 503 de sobrecarga), espera e recomeça o caso do zero."""
    for tentativa in range(1, MAX_TENTATIVAS + 1):
        try:
            return rodar_conversa(caso)
        except errors.APIError as erro:
            # Cota DIÁRIA esgotada: esperar 60s não resolve, então paramos a suíte inteira.
            if erro.code == 429 and "PerDay" in str(erro):
                raise CotaDiariaEsgotada(str(erro)) from erro
            if tentativa == MAX_TENTATIVAS:
                raise
            print(f"    erro {erro.code} da API, esperando {ESPERA_APOS_ERRO}s (tentativa {tentativa})")
            time.sleep(ESPERA_APOS_ERRO)
    raise RuntimeError("inalcançável")


def checar(caso: dict[str, Any], carrinho: dict[str, Any]) -> list[tuple[str, str]]:
    """Compara o carrinho final com as expectativas. Devolve a lista de falhas (tipo, detalhe)."""
    falhas: list[tuple[str, str]] = []
    ids_no_carrinho = [item["item_id"] for item in carrinho["itens"]]

    if caso["deve_ter_itens"] and not ids_no_carrinho:
        return [("carrinho_vazio", "esperava itens no carrinho")]
    if not caso["deve_ter_itens"]:
        if ids_no_carrinho:
            falhas.append(("deveria_estar_vazio", f"adicionou {ids_no_carrinho}"))
        return falhas

    if "preco_max_total" in caso and carrinho["total"] > caso["preco_max_total"]:
        falhas.append(("orcamento", f"total {carrinho['total']} > {caso['preco_max_total']}"))

    for tag in caso.get("tags_obrigatorias", []):
        sem_tag = [item_id for item_id in ids_no_carrinho if tag not in ITENS[item_id]["tags"]]
        if sem_tag:
            falhas.append(("tags", f"{sem_tag} sem a tag {tag}"))

    faltando = [item_id for item_id in caso.get("itens_esperados", []) if item_id not in ids_no_carrinho]
    if faltando:
        falhas.append(("item_esperado", f"faltou {faltando}, carrinho tem {ids_no_carrinho}"))

    if "restaurante_esperado" in caso and carrinho["restaurante_id"] != caso["restaurante_esperado"]:
        falhas.append(("restaurante", f"veio {carrinho['restaurante_id']}"))

    if "quantidade_total" in caso:
        quantidade = sum(item["quantidade"] for item in carrinho["itens"])
        if quantidade != caso["quantidade_total"]:
            falhas.append(("quantidade", f"{quantidade} unidades, esperava {caso['quantidade_total']}"))

    return falhas


def tools_chamadas(sessao: Sessao) -> list[str]:
    """Trilha de tool calls da conversa, para entender as falhas depois."""
    trilha = []
    for conteudo in sessao.historico:
        for parte in conteudo.parts or []:
            if parte.function_call:
                trilha.append(f"{parte.function_call.name}({dict(parte.function_call.args or {})})")
    return trilha


def main() -> None:
    casos = carregar_casos()
    ids_pedidos = sys.argv[1:]
    if ids_pedidos:
        casos = [caso for caso in casos if caso["id"] in ids_pedidos]

    resultados = []
    contagem_falhas: Counter[str] = Counter()

    for numero, caso in enumerate(casos, start=1):
        print(f"[{numero}/{len(casos)}] {caso['id']}: {caso['pedido']}")
        try:
            sessao, respostas = rodar_com_retry(caso)
            carrinho = ver_carrinho(sessao.carrinho)
            falhas = checar(caso, carrinho)
            trilha = tools_chamadas(sessao)
        except CotaDiariaEsgotada:
            sys.exit(f"\nCota diária do Gemini esgotada no caso {numero}/{len(casos)}. Nada foi salvo; rode de novo depois.")
        except Exception as erro:  # um caso quebrado não derruba o resto
            respostas, carrinho, trilha = [], None, []
            falhas = [("erro", f"{type(erro).__name__}: {erro}")]

        for tipo, detalhe in falhas:
            contagem_falhas[tipo] += 1
            print(f"    FALHOU ({tipo}): {detalhe}")
        if not falhas:
            print("    ok")

        resultados.append(
            {
                "id": caso["id"],
                "passou": not falhas,
                "falhas": [{"tipo": tipo, "detalhe": detalhe} for tipo, detalhe in falhas],
                "carrinho": carrinho,
                "tools": trilha,
                "respostas": respostas,
            }
        )
        if numero < len(casos):
            time.sleep(PAUSA_ENTRE_CASOS)

    acertos = sum(1 for resultado in resultados if resultado["passou"])
    print(f"\nTaxa de acerto: {acertos}/{len(resultados)} ({100 * acertos / len(resultados):.0f}%)")
    if contagem_falhas:
        print("Falhas por tipo:")
        for tipo, quantidade in contagem_falhas.most_common():
            print(f"  {tipo}: {quantidade}")

    if not ids_pedidos:  # só salva quando roda a suíte inteira
        with open(CAMINHO_RESULTADOS, "w", encoding="utf-8") as arquivo:
            json.dump(
                {"acertos": acertos, "total": len(resultados), "falhas_por_tipo": dict(contagem_falhas), "casos": resultados},
                arquivo,
                ensure_ascii=False,
                indent=2,
            )
        print(f"Resultados salvos em {CAMINHO_RESULTADOS.relative_to(PASTA.parent)}")


if __name__ == "__main__":
    main()
