"""Chat no terminal para testar o agente. Rodar com: python -m app.cli"""

from app.agent import responder
from app.session import obter_sessao
from app.tools import ver_carrinho


def main() -> None:
    sessao = obter_sessao("terminal")
    print("Agente de pedidos. Digite 'sair' para encerrar ou 'carrinho' para ver o carrinho.")

    while True:
        try:
            mensagem = input("\nvocê> ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if not mensagem:
            continue
        if mensagem.lower() == "sair":
            break
        if mensagem.lower() == "carrinho":
            print(ver_carrinho(sessao.carrinho))
            continue
        print(f"\nagente> {responder(sessao, mensagem)}")


if __name__ == "__main__":
    main()
