---
id: 0001
titulo: MVP — Contas a pagar e a receber
status: ✔️ Concluído
prioridade: Alta
criado_em: 2026-07-26
atualizado_em: 2026-07-26
autor: Claude
relacionados: []
---

# 0001 — MVP: Contas a pagar e a receber

## Contexto
Primeiro app do projeto Finanças. Usuário descreveu o escopo completo em conversa (recorrência
sob demanda, parcelamento de cartão, semana seg-dom numerada por mês, filtros por período) e
autorizou explicitamente construir tudo de uma vez, testado, sem parar para aprovação por etapa.

## Objetivo
App funcional (site estático, mobile-first) onde o usuário lança contas a pagar/receber, marca
como pagas, cadastra recorrência e parcelamento, e vê dashboard com totais por semana/mês/
período customizado — publicado num repositório GitHub próprio.

## Escopo
**Dentro:** tudo listado em `docs/PRD.md` §Objetivos (1–7).
**Fora:** tudo listado em `docs/PRD.md` §Fora de escopo (multiusuário, nuvem, integração
bancária, app nativo).

## Decisões e premissas
- Recorrência gera só a próxima ocorrência ao marcar paga (RN001) — não projeta o ano.
- Parcelamento gera a série inteira no cadastro (RN002) — diferente da recorrência de propósito.
- Semana seg-dom numerada dentro do mês, sem cruzar limite de mês (RN003).
- Sem servidor/backend — `localStorage` + export/import de backup, mesma filosofia do projeto
  de referência (Pizza e Cia BH).
- Design próprio (não reaproveita a paleta do manual do harness) — ver decisão de design no
  changelog abaixo.

## Porta de Entrada (Definition of Ready)
- [x] Investiguei: pasta estava vazia, harness T2+ recém-criado.
- [x] Não conflita com nenhum PRD/SPEC anterior (projeto novo).
- [x] Autorização explícita do usuário — pediu para construir tudo, testado, sem pausar.
- [x] Working tree é git limpo (repo vazio, sem commits ainda).

## Etapas
> Progresso: 9 de 9 tarefas (100%)

### Fase 1 — Motor (funções puras, testadas em Node)
- [x] `js/datas.js` — cálculo de semana seg-dom numerada por mês
- [x] `js/contas.js` — motor de recorrência (RN001) e parcelamento (RN002)
- [x] `testes/motor.teste.js` — cobre RN001–RN004 exaustivamente (25/25 testes verdes)

### Fase 2 — Interface
- [x] `js/armazenamento.js` (Store) + `js/formatar.js` + `js/icones.js`
- [x] `app/index.html` + `css/estilo.css` — dashboard, contas a pagar, contas a receber,
      formulário criar/editar, tema claro/escuro, responsivo mobile-first
- [x] `js/render.js` + `js/app.js` — roteador e ligação da UI ao motor

### Fase 3 — Verificação e publicação
- [x] Testes E2E Playwright (criar, editar, excluir, marcar pago → recorrência, parcelamento,
      filtros, tema, responsivo) — zero erros de console, mobile e desktop
- [x] Repositório GitHub próprio criado e publicado
- [x] Documentação sincronizada e baixa dada

## Critérios de aceite (Definition of Done)
**(a) Produto**
- [x] Lança conta a pagar/receber com categoria, valor, vencimento.
- [x] Recorrência: marcar paga gera a próxima ocorrência (mês seguinte), nunca antes.
- [x] Parcelamento: cadastro gera a série completa (X/N) de uma vez.
- [x] Dashboard mostra total da semana atual, do mês atual e do próximo mês.
- [x] Filtros por status/categoria/tipo/período customizado funcionam.
- [x] Editar e excluir funcionam, com aviso claro em exclusão de parcela vs. série.
- [x] Tema claro/escuro. Responsivo, testado em viewport de celular.

**(b) Processo**
- [x] Testado (motor em Node: 25/25 + E2E Playwright: mobile e desktop), zero erros de console.
- [x] `docs/PRD.md`, `SPEC.md`, `REGRAS-DE-NEGOCIO.md` sincronizados com o que foi construído.
- [x] Baixa dada neste plano e no `Planos/INDICE.md`.
- [x] Commit(s) feito(s); repositório GitHub criado e publicado.

## Riscos e mitigações
- **Risco:** bug na numeração de semana em mês bissexto/dia-1-em-cada-dia-da-semana →
  **Mitigação:** teste varre os 7 dias-da-semana possíveis para o dia 1, mais fevereiro.
- **Risco:** perda de dado do usuário (só em `localStorage`) → **Mitigação:** export/import de
  backup em `.json`, mesma rede de segurança do projeto de referência.

## Verificação
`node testes/motor.teste.js` (motor) + Playwright em `testes/e2e/` (interface), critério zero
erros de console, mobile (390×844) e desktop.

## Registro de progresso
- 2026-07-26 — Plano criado, aprovado pelo usuário na mesma mensagem, execução iniciada.
- 2026-07-26 — Motor construído e testado (25/25 em Node). Interface completa construída.
  Testes E2E Playwright encontraram e corrigiram 1 bug real: `alternarPago` gerava uma
  segunda ocorrência de recorrência ao desmarcar e marcar paga de novo (violava RN001) —
  corrigido com checagem de `recorrenciaOrigemId` já existente antes de gerar. Documentado
  em `docs/REGRAS-DE-NEGOCIO.md`. Todos os testes verdes (motor + E2E, mobile e desktop, 0
  erros de console). Plano concluído.

## Pendências / próximos passos
- Nenhuma pendência bloqueante para o MVP. Ideias futuras (fora deste plano): gráfico de
  gastos por categoria, notificação de vencimento próximo, exportar relatório em PDF.
