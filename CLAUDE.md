# Agente de Pedidos com IA

Projeto de portfólio do Henrique na área de engenharia com IA generativa.

## Objetivo
Um agente conversacional que entende pedidos em linguagem natural e monta um carrinho usando **tool calling**.

Exemplo: *"quero algo leve pro jantar, até R$40, sem lactose"* → o agente busca itens nos cardápios, compara opções, adiciona ao carrinho e explica a escolha.

## Regra mais importante: eu preciso entender tudo
Preciso conseguir explicar cada decisão do projeto. Então:
- Antes de implementar algo não trivial, explique em poucas linhas o que vai fazer e por quê.
- Prefira código simples e legível a abstrações "espertas".
- Não use frameworks de agente (LangChain, LlamaIndex, CrewAI etc.). O loop do agente é escrito à mão.
- Não use a chamada automática de funções do SDK do Gemini. O loop (modelo pede tool → executamos → devolvemos o resultado → repete) é manual e explícito.
- Ao terminar uma etapa, resuma o que foi feito e o que eu deveria saber explicar sobre ela.

## Stack
- Python 3.12, FastAPI, Pydantic, python-dotenv
- LLM: Google Gemini via SDK `google-genai` (`from google import genai`), modelo `gemini-2.5-flash` (free tier). **Não** usar o pacote antigo `google-generativeai`.
- Chave em `.env` como `GEMINI_API_KEY`. O `.env` nunca vai para o Git.
- Front (última etapa): React + Vite + Tailwind (SPA, sem Next.js), chat simples com carrinho ao lado, consumindo a API via `fetch`. URL da API em variável de ambiente (`VITE_API_URL`); habilitar CORS no FastAPI para a origem do front.
- Deploy: back no Render, front na Vercel.

## Estrutura planejada
```
data/restaurantes.json   # 6–8 restaurantes fictícios, ~60 itens (um deles é o Restaurante Glória)
app/
  tools.py               # funções que o modelo pode chamar
  agent.py               # loop do agente (manual)
  prompts.py             # system prompt
  session.py             # histórico e carrinho por session_id (em memória)
  api.py                 # FastAPI: POST /chat
evals/
  casos.jsonl            # ~30 pedidos de teste com expectativas
  run_evals.py           # roda os casos e calcula taxa de acerto
web/                     # front React + Vite (última etapa)
README.md
```

## Dados
Cada item tem: `id`, `restaurante_id`, `nome`, `descricao`, `preco` (float, R$), `tags` (ex.: `leve`, `vegetariano`, `vegano`, `sem_lactose`, `sem_gluten`, `picante`, `doce`, `bebida`). Cada restaurante tem: `id`, `nome`, `categoria`, `tempo_entrega_min`, `taxa_entrega`.

## Tools
- `buscar_itens(texto: str | None, preco_max: float | None, tags: list[str] | None)` → lista de itens
- `detalhes_restaurante(restaurante_id: str)` → dados do restaurante
- `adicionar_ao_carrinho(item_id: str, quantidade: int)` → carrinho atualizado
- `remover_item(item_id: str)` → carrinho atualizado
- `ver_carrinho()` → itens, subtotal, taxa de entrega e total

Regras de negócio:
- O carrinho só aceita itens de **um restaurante por vez** (como no iFood). Tentar misturar retorna erro claro para o modelo lidar.
- O agente deve respeitar orçamento e restrições informadas pelo usuário, considerando a taxa de entrega no total.
- Se nada atender ao pedido, o agente diz isso e sugere a alternativa mais próxima, sem inventar itens.

## API
`POST /chat` com `{ "session_id": str, "message": str }` → `{ "resposta": str, "carrinho": {...} }`

## Evals
Cada caso em `casos.jsonl` tem o pedido e as expectativas verificáveis em código, por exemplo:
`{"pedido": "...", "preco_max_total": 40, "tags_obrigatorias": ["sem_lactose"], "deve_ter_itens": true}`

O `run_evals.py` roda cada caso numa sessão nova, checa as expectativas no carrinho final e imprime a taxa de acerto geral e por tipo de falha. Free tier tem limite de ~10 requisições/minuto: colocar intervalo entre chamadas e tratar erro 429 com retry.

## Convenções
- Código e nomes em português quando forem do domínio (`carrinho`, `buscar_itens`); termos técnicos podem ficar em inglês.
- Type hints em tudo; modelos Pydantic para entrada e saída.
- Funções pequenas; nada de lógica de negócio dentro do loop do agente.
- Commits pequenos e descritivos, um por etapa.

## Roteiro
1. Setup e teste do Gemini ("oi")
2. Dataset `restaurantes.json`
3. Tools + agente funcionando no terminal
4. API FastAPI com sessão
5. Evals e ajuste do prompt
6. Front React
7. Deploy + README (arquitetura, como rodar, resultados dos evals, decisões e próximos passos)

Sempre confira em qual etapa estamos antes de começar e não pule etapas.
