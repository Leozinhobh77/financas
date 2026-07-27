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
| D005 | Painel: no máximo 2 colunas no celular, sem `overflow:hidden` em valor | 2026-07-27 | Ativa |
| D004 | Filtro de status usa os valores de `situacao()` (`paga`, não `pago`) | 2026-07-27 | Ativa |
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

### D005 — Painel: no máximo 2 colunas no celular, e valor nunca com `overflow: hidden` (2026-07-27)
**Decisão:** os blocos do painel do período usam **no máximo 2 colunas em qualquer celular**
(1 abaixo de 340px, 3 só a partir de 620px). O bloco de destaque — meta por dia, ou "ficou
pendente", ou "atrasado" no `receber` — ocupa **largura cheia** no celular, com valor à esquerda
e nota à direita. `.pp-bloco-valor` **não tem `overflow: hidden`**; usa
`font-size: clamp(.78rem, 3.1vw, 1.08rem)` para encolher em tela estreita em vez de esconder.
**Motivo:** com 3 colunas, `R$ 3.588,60` precisa de 94px e sobravam **85px** em telas de 412px+
(Android grande, iPhone Pro Max). O `overflow: hidden` cortava o dígito **em silêncio** — sem
erro, sem aviso, só um número errado na tela. Ironicamente os aparelhos **menores** funcionavam,
porque caíam num breakpoint de 2 colunas: o bug só aparecia nas telas maiores.
**Por que a meta ganha a largura cheia:** é o número de ação (total e já pago são consulta), é o
único com semáforo — em largura cheia a cor vira faixa de status legível de longe — e assim o
valor e a nota cabem lado a lado em vez de empilhados apertados.
**Procedência:** relatado pelo usuário ("não consigo ver o valor total, os números são maiores
que o próprio card"). Medido antes de qualquer alteração em 7 larguras reais: corte confirmado
em 412px, 428px e 430px; OK de 360px a 393px.
**Guarda mecânica criada:** `testes/e2e/test_sem_corte.py` mede `scrollWidth > clientWidth` em
**8 larguras (320–430px)**, nas três telas, usando valores na casa do **milhão** de propósito.
É esse teste que define o piso da fonte fluida — ele falhou a 360px com `R$ 1.234.567,89` e o
piso foi calibrado até passar.
**Relacionado:** RN009 (o painel), Plano 0004.

### D004 — Filtro de status usa os valores que `situacao()` produz (2026-07-27)
**Decisão:** os chips de filtro de status em `app/js/app.js` passam a usar `'paga'` (não
`'pago'`), alinhados com o que `Contas.situacao()` devolve. Também os contadores dos chips e
o rótulo "Total já pago".
**Motivo:** havia uma divergência de uma letra entre quem filtra e quem classifica — a
interface mandava `'pago'`, `situacao()` devolve `'paga'`, e `Filtros.aplicar` compara os dois
diretamente. Resultado: a aba "Pagas" vinha **sempre vazia**, mesmo com contas pagas, e o chip
aparecia sem contador. Os outros três status funcionavam porque as palavras coincidiam.
**Por que corrigir na interface e não em `situacao()`:** `situacao()` é usada em todo o app
(cor do card, ícone, texto "Pago em", classe CSS). Mudar o valor lá mexeria em vários pontos e
criaria risco novo; mudar no chip toca um lugar só.
**Procedência:** reportado pelo usuário usando o app no celular. Reproduzido antes de qualquer
alteração: com 2 contas pagas, o filtro retornava 0. Confirmado que `Filtros.aplicar` com
`status: 'paga'` retornava as 2 corretamente — o filtro nunca esteve quebrado, só era chamado
com a palavra errada.
**Falha de teste que permitiu o bug passar:** o teste E2E existente afirmava apenas que a conta
pendente **não** aparecia no filtro "Pagas" — uma asserção de ausência, que passa mesmo com a
lista inteira vazia. Substituído por asserção de **presença** (a conta paga tem que aparecer,
o contador tem que existir), mais dois testes de motor travando o contrato entre `situacao()`
e o filtro. A correção foi validada reintroduzindo o bug de propósito: o teste novo falha.
**Relacionado:** RN004 (situação derivada, nunca gravada).

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
