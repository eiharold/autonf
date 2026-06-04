# AutoNF NFS-e

AutoNF NFS-e é uma extensão Manifest V3 para Google Chrome que auxilia no preenchimento de Notas Fiscais de Serviço Eletrônicas no Emissor Nacional da NFS-e.

O projeto nasceu para reduzir tarefas repetitivas no portal, mantendo a conferência final nas mãos do usuário. A extensão roda em um painel lateral, salva clientes localmente no navegador e executa automações etapa por etapa dentro do portal oficial.

## Recursos

- Gerenciador local de clientes com nome, CNPJ, valor e descrição do serviço.
- Configurações editáveis para município, código de tributação, NBS, regime de apuração, PIS/COFINS, tipo de retenção e valores padrão.
- Botões independentes para preencher as etapas `Pessoas`, `Serviço` e `Valores`.
- Modo `Auto` para preencher e avançar pelas etapas até a tela final de revisão.
- Indicador de status com execução, conclusão e erro.
- Abertura inteligente do portal: reaproveita abas em `nfse.gov.br` e abre nova aba quando a aba atual está em outro domínio.

## Portal alvo

`https://www.nfse.gov.br/EmissorNacional/DPS/Pessoas`

O login no portal deve ser feito manualmente. A etapa final de emissão/revisão também não é automatizada, para que os dados sejam conferidos antes da emissão.

## Como carregar

1. Abra `chrome://extensions`.
2. Ative o modo de desenvolvedor.
3. Clique em "Carregar sem compactação".
4. Selecione a pasta deste projeto.

Depois de qualquer alteração nos arquivos, volte em `chrome://extensions` e clique em "Atualizar" no card da extensão.

Ao clicar no ícone da extensão, a extensão abre `https://www.nfse.gov.br/EmissorNacional/DPS/Pessoas`. Se a aba ativa já estiver em `nfse.gov.br`, ela é reaproveitada; caso contrário, uma nova aba é aberta.

## Fluxo de uso

1. Carregue a extensão no Chrome.
2. Abra o painel lateral pelo ícone da extensão.
3. Faça login manualmente no portal da NFS-e.
4. Cadastre ou selecione um cliente no painel.
5. Ajuste valor e descrição da nota, se necessário.
6. Use os botões `Pessoas`, `Serviço` e `Valores`, ou ative `Auto` para executar o fluxo sequencial.
7. Revise tudo na tela final antes de emitir a nota.

## Técnica de injeção

A automação roda no contexto `MAIN` da página via `chrome.scripting.executeScript` e usa setters nativos com `Object.getOwnPropertyDescriptor`, além de eventos `input`, `change`, `blur` e `click`, para que SPAs reconheçam as alterações.

## Privacidade

Os clientes e configurações são salvos apenas no `chrome.storage` local do navegador. O projeto não possui backend próprio e não envia dados de clientes para servidores externos.

## Créditos

Desenvolvido por Harold.

- Site: [eiharold.com](https://eiharold.com)
- GitHub: [@eiharold](https://github.com/eiharold)
