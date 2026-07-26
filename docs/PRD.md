# PRD — Finanças (o quê e por quê)

> Requisitos de produto: visão, objetivos, escopo. Para **como** é construído, ver `SPEC.md`.
> Para o fluxo de trabalho, ver `GOVERNANCA.md`.

## Visão

Controle pessoal de **contas a pagar e a receber**. O usuário lança o que deve e o que vai
receber, marca como pago/recebido quando acontece, e o app cuida sozinho de duas coisas que
hoje ele faz de cabeça: **projetar a próxima recorrência só depois que a atual foi paga** e
**parcelar no cartão sem ele ter que lançar mês a mês**.

## Quem usa

Uso pessoal e solo, no celular principalmente (também funciona no computador). Sem login,
sem multiusuário — os dados ficam no próprio navegador.

## Objetivos do produto

1. **Lançar contas a pagar/receber** — valor, vencimento, categoria, se é recorrente ou
   parcelada.
2. **Recorrência sob demanda** — conta recorrente existe como uma ocorrência por vez; a
   próxima só nasce quando a atual é marcada paga (não projeta o ano inteiro).
3. **Parcelamento de cartão** — ao cadastrar, já lança a série inteira (1/N, 2/N... N/N), porque
   a dívida toda já foi assumida de uma vez.
4. **Ver por semana e por mês** — semana de segunda a domingo, numerada dentro do mês (a
   semana 1 pode ter menos de 7 dias); total do período sempre visível.
5. **Filtrar** — por status (pago/pendente/atrasado), categoria, tipo (pagar/receber), período
   customizado.
6. **Editar e excluir** qualquer lançamento, com clareza sobre o que acontece a uma parcela
   isolada vs. a série inteira, e a uma recorrência já paga vs. a próxima gerada.
7. **Dashboard** — visão geral: quanto devo essa semana, esse mês, o que vence no próximo mês,
   quanto vou receber.

## Fora de escopo (v1)

- Multiusuário, login, nuvem, sincronização entre dispositivos.
- Integração bancária, importação de extrato, OCR de boleto.
- Orçamento/metas (budget) — só controle de contas, não planejamento de gasto.
- App nativo — é um site, funciona no navegador do celular (inclusive "adicionar à tela
  inicial").

Essas exclusões podem mudar; trazer algo de volta ao escopo vira um **plano novo** em `Planos/`
e uma entrada em `DECISOES.md`.

## Como saber que está indo bem

- O usuário confia no número que o app mostra pra "quanto eu devo essa semana" sem precisar
  conferir de cabeça.
- Marcar uma conta recorrente como paga e ver a próxima aparecer certa no mês seguinte, sem
  precisar lançar de novo.
- Cadastrar uma compra parcelada uma vez só e nunca mais pensar nela até a fatura chegar.
- Abre bem e é fácil de tocar no celular — é onde o usuário realmente vai usar todo dia.
