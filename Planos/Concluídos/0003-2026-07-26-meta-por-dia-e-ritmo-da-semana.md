---
id: 0003
titulo: Meta por dia (mês) + Ritmo desta semana + bloco "Veio de antes"
status: ✔️ Concluído
prioridade: Alta
criado_em: 2026-07-26
atualizado_em: 2026-07-26
autor: Claude
relacionados: [0002-2026-07-26-dashboard-avancado-e-repaginada.md]
---

# 0003 — Meta por dia + Ritmo da semana + "Veio de antes"

## Contexto
O usuário trabalha com renda diária/variável ("trabalho todo dia, arrumo dinheiro todo dia").
Saber o total que deve no mês não responde a pergunta que ele realmente faz: **quanto preciso
juntar por dia pra fechar?** E esse número precisa **subir sozinho** conforme os dias passam
sem pagamento — é um termômetro de pressão, não um valor fixo.

Esboço apresentado e aprovado pelo usuário antes da implementação, com 5 decisões confirmadas
por ele (ver seção Decisões).

## Objetivo
O usuário abre o app e sabe, sem fazer conta de cabeça: quanto precisa juntar por dia até o
fim do mês, quanto precisa por dia até o fim desta semana (já contando o que arrastou das
semanas anteriores), e quanto ficou pendurado de meses passados — sem misturar as três coisas.

## Escopo
**Dentro:**
- `Meta por dia` do mês: `falta pagar ÷ dias restantes` (hoje conta)
- `Ritmo desta semana`: `(vence até domingo desta semana + arrastado das anteriores) ÷ dias restantes`
- Bloco `Veio de antes`: pendências de meses anteriores, **separado**, fora dos dois cálculos
- Semáforo 🟢🟡🔴 comparando o ritmo atual com o ritmo "ideal" (se estivesse tudo em dia)
- Marcador ⚠ nas barras das semanas que deixaram resto, ▲ na semana atual
**Fora:**
- Descontar contas a receber da meta (decisão explícita: o número é o bruto que precisa gerar)
- Meta em semanas futuras ou passadas — só a atual tem "pressão"
- Sugestão de qual conta pagar primeiro; projeção de meses futuros

## Decisões e premissas (confirmadas pelo usuário)
1. **O dia de hoje conta** nos dias restantes (o dia ainda não acabou).
2. **Não desconta o que há a receber** — o número útil é quanto precisa *gerar*.
3. **Pendência de mês anterior fica separada**, em bloco próprio, e **não entra** na meta do mês
   nem no ritmo da semana. (O usuário pediu explicitamente "não misturar".)
4. **Meta só na semana atual.** Futuras não têm pressão ainda; passadas já eram.
5. **Divide pelos dias que faltam**, não por 7 fixo — consistente com a lógica do mês.

**Regra do arrasto (a dúvida que o usuário levantou):** não se soma semana a semana. A semana
atual cobre **tudo que está pendente no mês e vence até o domingo dela**. Isso produz a cascata
naturalmente (S1 → S2 → S3 → …) numa regra só, e o que vence em semanas futuras fica de fora.

## Porta de Entrada (Definition of Ready)
- [x] Investiguei o sistema real: `analise.js`, `render.js`, `app.js` e o dashboard do Plano 0002.
- [x] Não conflita com PRD/SPEC/REGRAS-DE-NEGOCIO — RN001–RN005 seguem intactas; isto é
      derivação nova sobre dado existente.
- [x] Esboço apresentado ao usuário e **aprovado** ("pode"), com as 5 decisões confirmadas.
- [x] Working tree limpo (commit `f2db050` publicado).

## Etapas
> Progresso: 7 de 7 tarefas (100%)

### Fase 1 — Motor (puro, testado)
- [x] `analise.js`: `diasRestantesNoMes`, `metaPorDia`, `ritmoDaSemana`, `pendenteDeMesesAnteriores`
- [x] Semáforo: comparar ritmo atual × ritmo ideal
- [x] Testes em Node: cascata das 5 semanas, casos de borda (último dia, tudo pago, mês vazio)

### Fase 2 — Interface
- [x] Faixa "Meta por dia" dentro do card-herói
- [x] Card "Ritmo desta semana" com detalhamento (vence / arrastado / a cobrir)
- [x] Bloco "Veio de antes" (só aparece se existir) + marcadores nas barras
- [x] CSS: semáforo, faixa do herói, bloco de alerta

### Fase 3 — Verificação
- [x] E2E + capturas, mobile e desktop, claro e escuro; documentar RN006/RN007; publicar

## Critérios de aceite (Definition of Done)
**(a) Produto**
- [x] Card-herói mostra "Meta por dia" e quantos dias faltam no mês.
- [x] A meta sobe quando os dias passam sem pagamento, e cai ao pagar.
- [x] Card "Ritmo desta semana" mostra o valor/dia e o detalhamento das 3 linhas.
- [x] O arrasto das semanas anteriores entra no ritmo da semana atual (cascata).
- [x] Bloco "Veio de antes" aparece só quando há pendência de mês anterior, e não afeta os cálculos.
- [x] Semáforo muda de cor conforme a pressão.
- [x] Nenhuma divisão por zero em nenhum caso de borda.

**(b) Processo**
- [x] Motor testado em Node; E2E verde, 0 erros de console, mobile e desktop.
- [x] RN006 (meta por dia) e RN007 (ritmo com arrasto) documentadas com teste.
- [x] Baixa dada aqui e no `INDICE.md`; publicado.

## Riscos e mitigações
- **Risco:** divisão por zero no último dia do mês/semana → **Mitigação:** dias restantes tem
  piso 1 (hoje sempre conta); testado explicitamente.
- **Risco:** número assustar sem contexto → **Mitigação:** o detalhamento de 3 linhas e o
  semáforo dão o "porquê" junto do "quanto".

## Verificação
`node testes/motor.teste.js` + `python testes/e2e/test_app_financas.py`, zero erros de console.

## Registro de progresso
- 2026-07-26 — Esboço aprovado pelo usuário; plano criado; execução iniciada.
- 2026-07-26 — Entregue. Motor com 58/58 testes verdes (21 novos: RN006, RN007 e "Veio de
  antes"), incluindo os exemplos numéricos exatos ditados pelo usuário (200/300/600 por dia no
  mês; 300 e 600 por dia na cascata semanal) e a cascata completa S1→S5. E2E verde, 0 erros de
  console. Documentadas RN006, RN007 e RN008.
  **Ajuste feito durante a implementação, por inspeção de captura:** as contas de meses
  anteriores apareciam TAMBÉM em "Próximos vencimentos", voltando a se misturar com o mês
  corrente — contrariando o pedido do usuário. `proximosVencimentos` ganhou o corte `desdeISO`
  e o dashboard passa a listar só o mês corrente ali.

## Pendências / próximos passos
- Nenhuma. Observação honesta pro futuro: o exemplo do usuário "S1 devendo 2.100 em 7 dias =
  300/dia" assume semana cheia; numa S1 curta (ex.: julho/2026, que começa numa quarta e tem
  5 dias) o mesmo valor dá 420/dia. O comportamento está correto por RN003 — a semana 1 tem
  menos dias mesmo — mas vale saber que o número pode surpreender no começo do mês.
