# AutoNF NFS-e

Extensão MV3 para automatizar etapas de preenchimento da NFS-e no Emissor Nacional.

## Como carregar

1. Abra `chrome://extensions`.
2. Ative o modo de desenvolvedor.
3. Clique em "Carregar sem compactação".
4. Selecione esta pasta: `/Users/haroldoccj/Documents/AutoNF`.

Depois de qualquer alteração nos arquivos, volte em `chrome://extensions` e clique em "Atualizar" no card da extensão.

Ao clicar no ícone da extensão, a aba atual é redirecionada para `https://www.nfse.gov.br/EmissorNacional` se necessário, e o painel lateral é aberto.

## Fluxo

- Cadastre presets de clientes no painel lateral.
- Faça login manualmente no portal.
- Em cada aba do portal, use o botão correspondente no painel:
  - `Preencher Pessoas`
  - `Preencher Serviço`
  - `Preencher Valores`
- A aba `Emitir` fica sem automação para conferência manual.

## Técnica de injeção

A automação roda no contexto `MAIN` da página via `chrome.scripting.executeScript` e usa setters nativos com `Object.getOwnPropertyDescriptor`, além de eventos `input`, `change`, `blur` e `click`, para que SPAs reconheçam as alterações.
