# AutoNF — Reestruturação e otimização

Data: 2026-06-27

## Feito
- Extensão movida para `extension/` (carregar essa subpasta no Chrome); `_contexto`/`_logs`
  restaurados na raiz. `git mv` preservou histórico.
- UI em abas: **Emissão · Exportação · ⚙**; Configurações virou aba; Status global.
- Emissão: removido `Auto`; toggles "vai até aqui"; botão **Preencher** (para na última etapa);
  checkbox de valor/descrição personalizados.
- Exportação: Preencher datas do mês (auto-fill), Buscar (filtra por Competência), checklist +
  progresso (marca via `chrome.downloads.onCreated`), Copiar lista. Permissão `downloads` no manifest.
- Backup de clientes: Export/Import JSON. Seed `clientes-fixos.json` (gitignorado).
- Otimização: delays fixos a 40%; dropdowns de lista por detecção (`waitFor` + `waitForSelectValue`).

## Decisões
- **Captcha:** não burlar; download manual + rastreio passivo. Futuro: API Nacional com e-CNPJ.
- Preenchimento otimizado é o padrão (sem modo beta).

## Pendências
- Testar emissão completa (município/código no modo detecção).
- `extension/` como padrão Harold-OS — em revisão no Dados.

> Contexto canônico: `~/Harold-OS/Dados/04_projetos/Profissionais/autonf.md`.
</content>
