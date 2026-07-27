---
id: 0004
titulo: Painel do período nas telas de contas (total, pago, falta, meta/dia)
status: ✔️ Concluído
prioridade: Alta
criado_em: 2026-07-27
atualizado_em: 2026-07-27
autor: Claude
relacionados: [0003-2026-07-26-meta-por-dia-e-ritmo-da-semana.md]
---

# 0004 — Painel do período nas telas de contas

## Contexto
Hoje as telas de contas mostram só "Total do filtro", que muda junto com o filtro de status.
Ao clicar em "Pagas", o usuário perde a noção do mês inteiro — o número vira só o que já foi
pago. Ele pediu para ver, ao mesmo tempo, o panorama do período (total devido, já pago, falta
pagar, meta por dia) **e** o resultado do filtro atual.

Esboço apresentado e aprovado, com as 3 decisões confirmadas.

## Objetivo
Ao abrir "Contas a pagar" (ou receber) e mexer em qualquer filtro, o usuário nunca perde a
referência do período: quanto vence no total, quanto já resolveu, quanto falta, e quanto
precisa juntar por dia — sem deixar de saber o que exatamente está listado abaixo.

## Escopo
**Dentro:**
- Painel do período no topo das telas `pagar` e `receber`
- Regra de qual filtro afeta o painel (ver Decisões)
- Meta por dia adaptada ao período filtrado (mês, semana ou personalizado)
- Período já encerrado troca a meta por "Ficou pendente"
- Variante da tela `receber`: Total previsto · Já recebido · Falta receber (sem meta/dia)
- Linha discreta com o resultado do filtro logo acima da lista
- Cabeçalho do painel mostrando o escopo real (ex.: "Casa · Julho de 2026")
**Fora:**
- Mudar o dashboard (já tem o card-herói do mês corrente; este painel é do período filtrado)
- Gráficos novos nas telas de lista

## Decisões e premissas (confirmadas pelo usuário)
1. **O painel responde a período, categoria e busca. NÃO responde ao filtro de status** — ele
   já mostra a quebra por status (pago/falta), então filtrar por status nele seria redundante
   e é justamente o que hoje faz o total sumir.
2. **`receber` troca a meta/dia** por "Falta receber" (não se "arruma dinheiro" pra receber).
3. **O painel aparece sempre**, mesmo quando o filtro deixa a lista vazia — o panorama do
   período continua verdadeiro, e sumir seria perder a referência justo quando o usuário
   confirmou que está tudo em dia.
4. **Período encerrado** (fim < hoje) não mostra meta/dia — vira "Ficou pendente".

## Porta de Entrada (Definition of Ready)
- [x] Investiguei `telaLista`, `barraFiltros`, `Filtros.aplicar` e `Analise` — o cálculo hoje é
      `Filtros.total(filtradas)`, que por construção segue o status.
- [x] Não conflita com PRD/SPEC/REGRAS — RN001–RN008 intactas; é derivação nova + apresentação.
- [x] Esboço aprovado pelo usuário ("seguir todas as suas recomendações").
- [x] Working tree limpo (commit `3d73b11` publicado).

## Etapas
> Progresso: 7 de 7 tarefas (100%)

### Fase 1 — Motor
- [x] `Analise.resumoDoPeriodo(lista, inicio, fim, tipo, hoje)` — total, pago, falta, contagens
- [x] `Analise.metaDoPeriodo(...)` — meta/dia adaptada ao intervalo, com estado `encerrado`
- [x] Testes: mês, semana, personalizado, período encerrado, categoria, vazio

### Fase 2 — Interface
- [x] `Render.painelPeriodo(...)` — variantes pagar/receber
- [x] CSS do painel
- [x] `app.js`: montar o painel ignorando o status; linha de resultado do filtro

### Fase 3 — Verificação
- [x] E2E + capturas; documentar RN009; publicar

## Critérios de aceite (Definition of Done)
**(a) Produto**
- [x] Painel mostra total, já pago, falta pagar e meta/dia do período.
- [x] Trocar o filtro de status **não** altera os números do painel.
- [x] Trocar período, categoria ou busca **altera** os números do painel.
- [x] Meta/dia se adapta a semana e período personalizado.
- [x] Período encerrado mostra "Ficou pendente" no lugar da meta.
- [x] Tela `receber` usa os rótulos próprios, sem meta/dia.
- [x] Linha "N contas nesta lista · R$ X" reflete todos os filtros.
- [x] Painel continua visível com a lista vazia.

**(b) Processo**
- [x] Motor testado em Node; E2E verde, 0 erros de console, mobile e desktop.
- [x] RN009 documentada com teste. Baixa dada aqui e no `INDICE.md`. Publicado.

## Riscos e mitigações
- **Risco:** confundir o usuário com dois números diferentes na mesma tela → **Mitigação:**
  rótulos explícitos ("Falta pagar" no painel × "nesta lista" na linha) e cabeçalho com o
  escopo.
- **Risco:** divisão por zero em período de 1 dia ou encerrado → **Mitigação:** piso 1 e caminho
  separado para encerrado; testado.

## Verificação
`node testes/motor.teste.js` + `python testes/e2e/test_app_financas.py`, zero erros de console.

## Registro de progresso
- 2026-07-27 — Esboço aprovado; plano criado; execução iniciada.
- 2026-07-27 — Entregue. `resumoDoPeriodo` e `metaDoPeriodo` generalizam o cálculo para
  qualquer intervalo (mês, semana, personalizado, encerrado, futuro). 71/71 no motor (11 novos,
  RN009) e E2E verde. O teste E2E compara os valores do painel antes e depois de trocar o
  filtro de status e **exige que não mudem** — é a garantia mecânica da regra central.
  **Erro meu, achado por inspeção de saída:** o bloco de total dizia "Total do mês" mesmo com
  o filtro em semana. Corrigido: o rótulo acompanha o período ("do mês" / "da semana" / "do
  período"). Também removi a nota redundante "N lançamento(s)" do bloco de total — o cabeçalho
  já traz a contagem — trocando por "N atrasada(s)" / "N em aberto" / "tudo resolvido".

## Pendências / próximos passos
- Nenhuma.
