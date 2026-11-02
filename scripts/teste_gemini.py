"""Etapa 1: confirma que a chave e o SDK do Gemini funcionam mandando um "oi"."""

import os
import sys

from dotenv import load_dotenv
from google import genai

MODELO = "gemini-2.5-flash"


def main() -> None:
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        sys.exit("GEMINI_API_KEY não encontrada. Copie .env.example para .env e coloque sua chave.")

    client = genai.Client(api_key=api_key)
    resposta = client.models.generate_content(model=MODELO, contents="oi")
    print(f"[{MODELO}] {resposta.text}")


if __name__ == "__main__":
    main()
