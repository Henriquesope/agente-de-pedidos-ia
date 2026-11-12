"""API HTTP do agente. Rodar com: uvicorn app.api:app --reload

A API não tem lógica de negócio: ela só valida a entrada, busca a sessão,
chama o agente e devolve a resposta junto com o carrinho atual.
"""

import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.genai import errors
from pydantic import BaseModel, Field

from app.agent import responder
from app.session import obter_sessao
from app.tools import ver_carrinho

load_dotenv()

# Origens do front liberadas no CORS, separadas por vírgula.
# Em produção: FRONT_ORIGINS=https://meu-front.vercel.app
FRONT_ORIGINS = os.getenv("FRONT_ORIGINS", "http://localhost:5173").split(",")


class ChatRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=100)
    message: str = Field(min_length=1, max_length=2000)


class ItemCarrinhoResposta(BaseModel):
    item_id: str
    nome: str
    preco: float
    quantidade: int


class CarrinhoResposta(BaseModel):
    restaurante_id: str | None
    restaurante: str | None
    itens: list[ItemCarrinhoResposta]
    subtotal: float
    taxa_entrega: float
    total: float


class ChatResponse(BaseModel):
    resposta: str
    carrinho: CarrinhoResposta


app = FastAPI(title="Agente de Pedidos com IA")

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONT_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# "def" normal (não "async def"): a chamada ao Gemini é bloqueante, então o FastAPI
# roda esta função numa thread separada e o servidor continua atendendo outros pedidos.
@app.post("/chat")
def chat(pedido: ChatRequest) -> ChatResponse:
    sessao = obter_sessao(pedido.session_id)
    try:
        resposta = responder(sessao, pedido.message)
    except errors.APIError as erro:
        # Falha do lado do Gemini (limite do free tier, modelo fora do ar etc.).
        raise HTTPException(status_code=502, detail=f"Erro ao chamar o modelo: {erro.code}") from erro
    return ChatResponse(resposta=resposta, carrinho=CarrinhoResposta(**ver_carrinho(sessao.carrinho)))
