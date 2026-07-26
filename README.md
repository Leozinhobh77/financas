# Finanças

Controle pessoal de **contas a pagar e a receber** — site estático, mobile-first, sem servidor.
Os dados ficam só no seu navegador (`localStorage`); nada é enviado pra lugar nenhum.

🌐 **[Abrir o app →](https://leozinhobh77.github.io/financas/)**

## O que ele faz

- Lança contas a pagar/receber com categoria, valor e vencimento.
- **Recorrência sob demanda** — uma conta recorrente (ex.: água) existe como uma única
  ocorrência por vez. A próxima só nasce quando você marca a atual como paga.
- **Parcelamento de cartão** — ao cadastrar, já gera a série inteira (1/N, 2/N... N/N) de uma
  vez, porque a dívida já foi assumida.
- **Semana segunda a domingo, numerada dentro do mês** — a semana 1 começa no dia 1 (pode ter
  menos de 7 dias) e a última termina no fim do mês; nenhuma semana cruza de um mês pro outro.
- Dashboard com totais da semana atual, deste mês e do próximo.
- Filtros por período (semana, mês, mês específico, personalizado), status e categoria.
- Editar, excluir (com aviso claro entre excluir uma parcela ou a série inteira), backup em
  `.json` exportável/importável, tema claro/escuro.

## Rodar localmente

Sem instalação, sem build:

```
duplo clique em app/index.html
```

## Testar

```
node testes/motor.teste.js        # motor de datas/recorrência/parcelamento — puro, sem browser
```

Testes de interface (Playwright) documentados em `testes/e2e/`.

## Como foi construído

Este projeto usa o harness gerado pela skill [`/harness`](https://github.com/Leozinhobh77/harness)
(tier T2+). Ver `AGENTS.md` para o mapa completo, e `docs/REGRAS-DE-NEGOCIO.md` para as regras
de negócio com exemplos e testes — é o documento mais importante do projeto se você for mexer em
recorrência, parcelamento ou no cálculo de semanas.

---

Uso pessoal. Português do Brasil.
