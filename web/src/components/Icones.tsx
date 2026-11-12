// Ícones em SVG, todos no mesmo estilo de traço. A cor vem do texto (currentColor).

import type { ReactNode } from 'react'

function Icone({ children, className = 'size-5' }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  )
}

type Props = { className?: string }

export const IconeSacola = (props: Props) => (
  <Icone {...props}>
    <path d="M5.5 8h13l-1 12h-11z" />
    <path d="M9 8V7a3 3 0 0 1 6 0v1" />
  </Icone>
)

export const IconeEnviar = (props: Props) => (
  <Icone {...props}>
    <path d="M12 19V5" />
    <path d="m6 11 6-6 6 6" />
  </Icone>
)

export const IconeMais = (props: Props) => (
  <Icone {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icone>
)

export const IconeSeta = (props: Props) => (
  <Icone {...props}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </Icone>
)

export const IconeAbrir = (props: Props) => (
  <Icone {...props}>
    <path d="m6 9 6 6 6-6" />
  </Icone>
)

export const IconeAlerta = (props: Props) => (
  <Icone {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16.5v.01" />
  </Icone>
)

// Marca do app: balão de conversa num quadrado vermelho (o mesmo desenho do favicon).
export function Marca() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="size-8 shrink-0">
      <rect width="32" height="32" rx="9" className="fill-marca" />
      <path d="M9 10h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-8l-4.5 3.5V20H9a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z" fill="#fff" />
    </svg>
  )
}
