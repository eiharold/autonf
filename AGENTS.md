# AutoNF NFS-e — Manual do Projeto

> Projeto **AutoNF NFS-e** — extensão Chrome para automação assistida de NFS-e.

## Fonte de contexto

A fonte canônica de contexto está no Harold:
`~/Harold/Dados/04_projetos/Profissionais/autonf.md`.

Leia primeiro `_contexto/CONTEXT_BUNDLE.md`. Ele é um resumo portátil derivado do
`Dados`; em caso de dúvida, o `Dados` manda.

## Sobre o projeto

- **Cliente/área:** eiHarold.
- **Tipo:** extensão Chrome Manifest V3.
- **Categoria no Dados:** profissional.
- **Caminho local:** `~/Harold/Projetos/Pessoais/AutoNF`.
- **Portal alvo:** `https://www.nfse.gov.br/EmissorNacional/DPS/Pessoas`.

## Regras

- Não automatizar login nem emissão final da nota; a conferência fica com o Harold.
- Não commitar dados reais de clientes, credenciais ou arquivos de exportação fiscal.
- Manter a extensão simples, local e auditável.
- Antes de publicar ou empacotar, revisar permissões do `manifest.json`.

## Ao terminar uma sessão

Atualize `MAPA.md` se a estrutura mudar e registre decisões duráveis no `Dados`.

