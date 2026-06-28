# CONTEXT BUNDLE — AutoNF NFS-e

> Resumo portátil gerado a partir do `Dados`. Não é a fonte canônica.
> Gerado em: 2026-06-27 · Fonte: `~/Harold-OS/Dados`

## Resumo do projeto

- **Nome:** AutoNF NFS-e
- **Cliente/área:** eiHarold (ferramenta interna)
- **Tipo:** extensão Chrome Manifest V3
- **Status:** ativo
- **Objetivo:** agilizar a emissão de NFS-e no Emissor Nacional sem remover a conferência humana,
  e dar suporte ao fechamento contábil mensal (peça da automação de fechamento).

## Estrutura (importante)

- **A extensão carregável fica em `extension/`** — selecionar ESSA subpasta no Chrome, não a raiz.
- A meta do Harold OS (`_contexto/`, `_logs/`) fica na raiz (Chrome recusa pastas `_` na raiz).
- Código: `extension/src/{panel.html,panel.js,panel.css,background.js}` · `extension/manifest.json`.

## Funcionalidades

- **Emissão:** clientes (presets locais), toggles `Pessoas/Serviço/Valores` "vai até aqui",
  botão **Preencher** (para na última etapa, sem emissão final), campos personalizados opcionais.
- **Exportação:** `…/Notas/Emitidas` — Preencher datas do mês, Buscar (lista filtrada por
  Competência), checklist + progresso dos XMLs, Copiar lista.
- **⚙ Configurações:** dados fiscais + **Backup de clientes** (Export/Import JSON).
- **Status** global (log + diagnóstico + copiar).

## Decisões relevantes

- Login e emissão final permanecem **manuais**.
- **Captcha:** não burlar. Download de XML é manual (humano), a extensão só rastreia via
  `chrome.downloads.onCreated`. Zero-clique futuro = API Nacional com e-CNPJ.
- Preenchimento **otimizado** é o padrão (delays a 40%; dropdowns por detecção).
- Dados de clientes ficam locais (`chrome.storage`); **nunca versionar** (seed em
  `clientes-fixos.json`, gitignorado).

## Pendências importantes

- Testar emissão completa com o preenchimento otimizado.
- Subpasta `extension/` como padrão Harold-OS — em revisão no `Dados`.
- Revisar permissões do `manifest.json` antes de empacotar/publicar (inclui `downloads`).

## Links e caminhos úteis

- Caminho local: `~/Harold-OS/Projetos/Pessoais/AutoNF` (extensão em `extension/`)
- Contexto canônico: `~/Harold-OS/Dados/04_projetos/Profissionais/autonf.md`
- Relacionado: `~/Harold-OS/Dados/04_projetos/Profissionais/automacao-fechamento-contabil.md`
</content>
