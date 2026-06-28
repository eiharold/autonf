# MAPA — AutoNF NFS-e

## Pastas principais

```txt
.
├── extension/       # >>> A extensão carregável (selecione ESTA pasta no Chrome) <<<
│   ├── assets/      # Ícones e assets da extensão
│   ├── src/         # Código-fonte da extensão
│   └── manifest.json # Manifest V3 do Chrome
├── README.md        # Documentação de uso
├── AGENTS.md        # Manual para agentes
├── MAPA.md          # Este mapa
├── _contexto/       # Meta do Harold OS (resumo portátil) — fora de extension/
│   └── CONTEXT_BUNDLE.md
└── _logs/           # Meta do Harold OS (logs de sessão) — fora de extension/
```

> **Por que a subpasta `extension/`?** O Chrome recusa carregar extensões com pastas de
> nome iniciando em `_` (reservado pelo sistema). Isolando a extensão em `extension/`, a
> meta do Harold OS (`_contexto/`, `_logs/`) pode seguir o padrão na raiz sem conflito.

## Pontos de entrada

- `extension/manifest.json`
- `extension/src/`
- `README.md`

## Onde fica o quê

- Código: `extension/src/`
- Configuração da extensão: `extension/manifest.json`
- Contexto portátil: `_contexto/CONTEXT_BUNDLE.md`
- Contexto canônico: `~/Harold/Dados/04_projetos/Profissionais/autonf.md`

