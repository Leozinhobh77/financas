# DECISÕES — memória sob demanda

> Estilo ADR, enxuto. Cada entrada: **o quê**, **por quê**, **quando**. Nunca edite uma decisão
> antiga para "corrigi-la" — adicione uma nova que a supersede e referencie o número.
>
> Esta é a **memória portável** do projeto: qualquer IA, lendo só isto, entende decisões que não
> são óbvias olhando o código.

## Índice

> ⚠️ **Mantenha esta tabela em dia.** Ela existe para a IA achar a decisão certa sem carregar o
> arquivo inteiro. Passou de **15 decisões**? `/harness doctor` vai mandar quebrar em
> `docs/decisoes/D0NN-slug.md` — e ele está certo.

| # | Decisão | Data | Status |
|---|---|---|---|
| D003 | `guarda.ps1` normaliza caminho e força UTF-8 (evita falso positivo em push de outro repo) | 2026-07-26 | Ativa |
| D002 | Guarda contra duplicar recorrência ao desmarcar/remarcar paga | 2026-07-26 | Ativa |
| D001 | Stack: HTML/CSS/JS vanilla, sem servidor, `localStorage` | 2026-07-26 | Ativa |

## Como adicionar

Próximo número sequencial, **no topo** da lista (mais nova primeiro).

```
### D0NN — Título curto (AAAA-MM-DD)
**Decisão:** ...
**Motivo:** ...
**Procedência:** que erro/pergunta real motivou isto  (obrigatório — Lei 1)
**Alternativas consideradas:** ... (opcional)
**Relacionado:** Plano NNNN / D0MM (opcional)
```

Registre aqui: decisões de produto/arquitetura relevantes, e **toda vez que a regra do flywheel
for acionada** (`docs/GOVERNANCA.md` §6).

---

_(as decisões entram abaixo, mais nova primeiro)_

### D003 — `guarda.ps1` normaliza caminho e força UTF-8 no stdin (2026-07-26)
**Decisão:** o hook `.claude/hooks/guarda.ps1` agora (1) resolve o diretório efetivo de um
comando `Bash` antes de aplicar `comandos_proibidos` — se o comando começa com `cd <fora do
projeto> && ...`, a checagem é pulada, pois o comando não mexe neste repositório; (2) força
`[Console]::InputEncoding = UTF8` antes de ler o evento do stdin, evitando que caminhos com
acento (ex.: a própria pasta do usuário, `Usuário`) cheguem corrompidos.
**Motivo:** a guarda `sem-push` bloqueou, por engano, um `git push` **legítimo e já
autorizado** no repositório `harness` (completamente sem relação com Finanças), só porque o
texto do comando continha "git push" — mesmo com um `cd` explícito levando pra outra pasta.
**Procedência:** achado ao vivo, fora deste projeto, ao publicar uma atualização do harness a
partir de uma sessão cujo projeto ativo era este. Depurado com log de diagnóstico temporário
(duas correções por suposição erraram antes de achar a causa real: formato do `cd` do Bash
deste ambiente e formato híbrido do próprio `$env:CLAUDE_PROJECT_DIR`). Documentado como P006
na memória da skill `/harness` — ver `~/.claude/skills/harness/memoria/PADROES.md`.
**Relacionado:** `~/.claude/skills/harness` v1.2.1 (o fix nasceu lá, no template; propagado
manualmente aqui porque este projeto já existia antes do fix).

### D002 — Guarda contra duplicar recorrência ao desmarcar/remarcar paga (2026-07-26)
**Decisão:** `alternarPago` (`app/js/app.js`) checa, antes de gerar a próxima ocorrência de uma
conta recorrente, se já existe uma conta com `recorrenciaOrigemId` apontando para a que acabou
de ser paga. Se existir, não gera outra — só avisa que a próxima já existia.
**Motivo:** sem a checagem, o fluxo "marcar paga → desmarcar → marcar paga de novo" gerava
**duas** ocorrências no mês seguinte, violando a RN001 (recorrência nunca duplica).
**Procedência:** achado pelo teste E2E Playwright (`testes/e2e/test_app_financas.py`), não por
revisão manual — o cenário replica o que RN001 já previa como caso de borda em
`docs/REGRAS-DE-NEGOCIO.md`, mas a defesa ainda não existia na primeira versão do código.
**Relacionado:** Plano 0001, RN001.

### D001 — Stack: HTML/CSS/JS vanilla, sem servidor, `localStorage` (2026-07-26)
**Decisão:** site estático puro (sem framework, sem build, sem backend), dados no
`localStorage` do navegador, com exportar/importar backup em `.json`. Design próprio (paleta
"ledger" em petróleo/verde/âmbar/vermelho), tipografia do sistema (sem webfont — mantém o app
100% offline depois de carregado). Navegação: tabbar fixa no rodapé no celular (4 destinos +
botão flutuante de adicionar), nav no topo no desktop.
**Motivo:** mesma filosofia comprovada no projeto de referência (Pizza e Cia BH) — simplicidade
para uso pessoal de longo prazo, sem dependência apodrecer, sem custo de hospedagem com backend.
Uso é majoritariamente no celular (pedido explícito do usuário), daí a tabbar em vez de um menu
lateral tipo gaveta (que é o padrão usado no manual do harness, mas errado aqui: apps de uso
diário e frequente favorecem navegação inferior de alcance do polegar, não um menu que precisa
abrir).
**Relacionado:** Plano 0001, `docs/SPEC.md`.
