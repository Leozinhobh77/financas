---
id: 0002
titulo: Dashboard avançado + repaginada visual completa
status: ✔️ Concluído
prioridade: Alta
criado_em: 2026-07-26
atualizado_em: 2026-07-26
autor: Claude
relacionados: [0001-2026-07-26-mvp-contas-a-pagar-receber.md]
---

# 0002 — Dashboard avançado + repaginada visual completa

## Contexto
O MVP (Plano 0001) entregou tudo que foi pedido e funciona, mas o usuário avaliou que "o
dashboard e o próprio aplicativo está muito simples com a cara muito simples". Pediu:
dashboard bem mais avançado, cards de conta mais bonitos e com mais informação (ex.: mostrar
o dia em que a conta foi paga), pesquisa dos apps de finanças mais queridos do mundo, e uma
repaginada visual total.

## Objetivo
O app deixa de ser "uma lista de contas que funciona" e passa a ser um painel que responde,
em 3 segundos e sem o usuário fazer conta de cabeça: quanto devo, quando vence, onde meu
dinheiro está indo, e como estou comparado ao mês passado.

## Escopo
**Dentro:**
- Dashboard novo: número-herói, anel de progresso pago/pendente, barras por semana do mês,
  donut por categoria, próximos vencimentos com contagem de dias, comparativo com mês anterior
- Cards de conta ricos: cor + ícone por categoria, situação visual explícita, **data de
  pagamento quando paga**, "vence em N dias"/"atrasada há N dias", selos de parcela/recorrência
- Sistema de cor por categoria (cada categoria tem hue própria, consistente no app inteiro)
- Marcar como paga com **data escolhível** (não obrigatoriamente hoje)
- Busca por descrição e ordenação na lista
- Repaginada visual completa (tipografia, espaçamento, profundidade, micro-interações),
  claro e escuro
**Fora (por agora):**
- Integração bancária, importação de extrato, metas/orçamento, multiusuário — seguem fora
  do escopo do produto (`docs/PRD.md`)
- Biblioteca de gráficos externa: os gráficos são SVG desenhado à mão, mantendo a regra de
  zero dependência em runtime (`docs/SPEC.md`)

## Decisões e premissas
- **Gráficos em SVG puro**, sem lib — preserva "sem dependência externa em runtime" do SPEC e
  mantém o app 100% offline.
- **Cálculos do dashboard em módulo próprio e puro** (`app/js/analise.js`), testável em Node
  como o resto do motor — nenhum número do painel nasce dentro de código de tela.
- **Barras por semana usam a RN003** (semana seg-dom numerada dentro do mês). É a métrica que
  nenhum app genérico tem e que o usuário pediu desde o começo.
- Pesquisa de referência: Copilot Money (hierarquia visual, "tudo numa tela"), Monarch
  (dashboard configurável), Mobills/Organizze (contexto BR, alertas de conta a pagar).

## Porta de Entrada (Definition of Ready)
- [x] Investiguei o sistema real: li o app inteiro construído no Plano 0001.
- [x] Não conflita com `docs/PRD.md` / `SPEC.md` / `REGRAS-DE-NEGOCIO.md` — nenhuma regra de
      negócio (RN001–RN005) muda; isto é camada de apresentação + análise derivada.
- [x] Autorização explícita do usuário ("enriqueça tudo", "me surpreenda", "repaginada total").
- [x] Working tree limpo antes de começar (commit `3d353ea` publicado).

## Etapas
> Progresso: 8 de 8 tarefas (100%)

### Fase 1 — Motor de análise (puro, testado)
- [x] `app/js/categorias.js` — cor + ícone por categoria, com fallback determinístico
- [x] `app/js/analise.js` — totais, comparativo mês anterior, por categoria, por semana,
      próximos vencimentos, progresso de pagamento
- [x] Testes em `testes/motor.teste.js` cobrindo `analise.js`

### Fase 2 — Gráficos e visual
- [x] `app/js/graficos.js` — donut, barras e anel de progresso em SVG puro
- [x] `app/css/estilo.css` repaginado: escala tipográfica, profundidade, cor por categoria,
      claro e escuro

### Fase 3 — Telas
- [x] Dashboard novo (`render.js` + `app.js`)
- [x] Cards de conta ricos + data de pagamento escolhível + busca/ordenação

### Fase 4 — Verificação e publicação
- [x] Testes E2E atualizados, zero erros de console, mobile e desktop; publicar

## Critérios de aceite (Definition of Done)
**(a) Produto**
- [x] Dashboard mostra: número-herói do mês, progresso pago/total, barras por semana,
      donut por categoria, próximos vencimentos, comparativo com mês anterior.
- [x] Card de conta paga mostra **a data em que foi paga**.
- [x] Card mostra "vence em N dias" / "atrasada há N dias" quando pendente.
- [x] Cada categoria tem cor e ícone consistentes no app inteiro.
- [x] Ao marcar como paga, o usuário pode escolher a data (padrão: hoje).
- [x] Busca por descrição e ordenação funcionam na lista.
- [x] Visual claro e escuro repaginados; responsivo, testado em viewport de celular.

**(b) Processo**
- [x] Testado (motor em Node + E2E Playwright), zero erros de console.
- [x] `docs/SPEC.md` sincronizado (arquitetura de arquivos nova).
- [x] Baixa dada neste plano e no `Planos/INDICE.md`.
- [x] Commit(s) feito(s) e publicado no GitHub.

## Riscos e mitigações
- **Risco:** gráfico SVG feito à mão sair errado em caso de borda (categoria única, valor zero,
  mês sem conta nenhuma) → **Mitigação:** `analise.js` é puro e testado justamente nesses casos;
  os gráficos recebem dado já normalizado.
- **Risco:** repaginada quebrar algo que funcionava no MVP → **Mitigação:** a suíte E2E do
  Plano 0001 continua rodando inteira; nenhuma regra de negócio é tocada.

## Verificação
`node testes/motor.teste.js` + `python testes/e2e/test_app_financas.py` (mobile e desktop),
critério zero erros de console.

## Registro de progresso
- 2026-07-26 — Plano criado após pesquisa de referência (Copilot, Monarch, Mobills, Organizze);
  autorizado pelo usuário na mesma mensagem; execução iniciada.
- 2026-07-26 — Entregue. `analise.js` + `categorias.js` + `graficos.js` novos, motor com 37/37
  testes verdes (12 novos só de análise, cobrindo mês vazio e divisão por zero). Interface
  repaginada e E2E ampliada (dashboard, card rico, busca, ordenação) — tudo verde, 0 erros de
  console, mobile e desktop, claro e escuro. Três defeitos de layout achados por inspeção das
  capturas de tela e corrigidos: nome de categoria colapsando pra uma letra na legenda, texto
  colado em "próximos vencimentos", e o valor-herói quebrando em duas linhas no celular.

## Pendências / próximos passos
- Ideias não pedidas, guardadas: gráfico de evolução mês a mês (12 meses), exportar relatório,
  lembrete de vencimento próximo. Nenhuma entra sem pedido — o app está no tamanho certo.
