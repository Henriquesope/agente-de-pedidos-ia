"""Loop manual do agente.

Ciclo de uma mensagem do usuário:
  1. Mandamos o histórico inteiro para o modelo, junto com as declarações das tools.
  2. Se o modelo responder pedindo tools (function_calls), nós executamos cada uma,
     anexamos os resultados ao histórico e voltamos ao passo 1.
  3. Se o modelo responder só com texto, essa é a resposta final.

O modelo nunca executa nada: ele só devolve "quero chamar a tool X com os argumentos Y".
Quem executa é este arquivo. A chamada automática de funções do SDK fica desligada.
"""

import os
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types

from app import tools
from app.prompts import SYSTEM_PROMPT
from app.session import Carrinho, Sessao

MODELO = "gemini-3.6-flash"
MAX_PASSOS = 8  # trava de segurança: evita loop infinito de tool calls

CONFIG = types.GenerateContentConfig(
    system_instruction=SYSTEM_PROMPT,
    temperature=0.2,  # respostas mais consistentes (ajuda nos evals)
    tools=[types.Tool(function_declarations=tools.DECLARACOES)],
    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
)

_client: genai.Client | None = None


def _obter_client() -> genai.Client:
    """Cria o client na primeira chamada (precisa do .env carregado)."""
    global _client
    if _client is None:
        load_dotenv()
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY não encontrada. Confira o arquivo .env.")
        _client = genai.Client(api_key=api_key)
    return _client


def _chamar_modelo(historico: list[types.Content]) -> types.GenerateContentResponse:
    """Uma chamada ao Gemini.

    Se a API falhar (por exemplo 429, limite do free tier), o erro sobe direto:
    a API HTTP devolve 502 na hora e o script de evals decide se espera e tenta de novo.
    """
    client = _obter_client()
    return client.models.generate_content(model=MODELO, contents=historico, config=CONFIG)


def executar_tool(nome: str, args: dict[str, Any], carrinho: Carrinho) -> dict[str, Any]:
    """Traduz o pedido do modelo (nome + args) na chamada da função Python correspondente."""
    if nome == "buscar_itens":
        return tools.buscar_itens(args.get("texto"), args.get("preco_max"), args.get("tags"))
    if nome == "detalhes_restaurante":
        return tools.detalhes_restaurante(args.get("restaurante_id", ""))
    if nome == "adicionar_ao_carrinho":
        # O modelo pode mandar 2.0 em vez de 2; por isso o int().
        return tools.adicionar_ao_carrinho(carrinho, args.get("item_id", ""), int(args.get("quantidade", 1)))
    if nome == "remover_item":
        return tools.remover_item(carrinho, args.get("item_id", ""))
    if nome == "ver_carrinho":
        return tools.ver_carrinho(carrinho)
    return {"erro": f"Tool desconhecida: {nome}"}


def responder(sessao: Sessao, mensagem: str) -> str:
    """Processa uma mensagem do usuário e devolve a resposta final do agente."""
    sessao.historico.append(types.Content(role="user", parts=[types.Part(text=mensagem)]))

    for _ in range(MAX_PASSOS):
        resposta = _chamar_modelo(sessao.historico)

        # Guardamos a resposta do modelo no histórico exatamente como veio
        # (inclui os pedidos de tool, que precisam estar lá na próxima chamada).
        sessao.historico.append(resposta.candidates[0].content)

        chamadas = resposta.function_calls
        if not chamadas:
            return resposta.text or "(o modelo não retornou texto)"

        # O modelo pode pedir mais de uma tool por vez; devolvemos todos os resultados juntos.
        partes: list[types.Part] = []
        for chamada in chamadas:
            resultado = executar_tool(chamada.name, dict(chamada.args or {}), sessao.carrinho)
            partes.append(types.Part.from_function_response(name=chamada.name, response=resultado))
        # A API do Gemini só aceita os papéis "user" e "model" no histórico:
        # o resultado das tools volta como uma mensagem "user" com partes function_response.
        sessao.historico.append(types.Content(role="user", parts=partes))

    return "Não consegui concluir o pedido em poucos passos. Pode reformular?"
