# REGRAS DE NEGÓCIO — Finanças

> As regras que, se quebrarem, o usuário **só descobre tarde demais**. É por isso que este
> documento existe separado — e por isso cada regra aqui **tem que ter um teste**.
>
> ⚠️ **Regra sem teste é só um parágrafo bonito.** Prosa nunca avisa quando é violada.

## Cobertura

| Regra | Teste existe? |
|---|---|
| RN001 — Recorrência só avança ao marcar paga | `testes/motor.teste.js` + `testes/e2e/test_app_financas.py` (guarda contra duplicar) |
| RN002 — Parcelamento gera a série inteira de uma vez | `testes/motor.teste.js` |
| RN003 — Semana seg-dom, numerada dentro do mês | `testes/motor.teste.js` |
| RN004 — Conta atrasada = pendente com vencimento no passado | `testes/motor.teste.js` |
| RN005 — Exclusão de parcela vs. série | `testes/e2e/contas.spec.js` |

Meta: 100%. `/harness doctor` reprova regra sem teste em projeto T2+.

---

## As regras

### RN001 — Recorrência só avança quando a atual é marcada paga
**Regra:** uma conta recorrente existe, a cada momento, como **uma única ocorrência ativa**.
O sistema nunca projeta um ano de ocorrências futuras. Só quando o usuário marca a ocorrência
atual como **paga**, o sistema gera automaticamente a **próxima** (mesmo dia do mês seguinte,
mesma descrição/categoria/valor), com status pendente.

**Por quê:** é a regra que o usuário pediu com mais ênfase. Projetar o ano inteiro adiantado
significa que, se o valor mudar (a conta de água varia todo mês), o usuário teria que caçar e
editar 12 lançamentos fantasmas. Gerar só a próxima, sob demanda, mantém a lista sempre com o
que é real.

**Exemplos:**
- Conta "Água", recorrente, vence 10/07/2026, R$100, pendente. Usuário marca paga em 10/07/2026.
  → sistema cria "Água", vence 10/08/2026, R$100, pendente. A de julho continua no histórico
  como paga; agosto mostra a nova, pendente.
- Vencimento dia 31 (ex.: 31/01) → mês seguinte não tem dia 31 (fevereiro) → vencimento ajusta
  para o **último dia** do mês seguinte (28 ou 29/02).
- Usuário **desmarca** uma conta paga (volta pra pendente) depois que a próxima já foi gerada
  → a próxima gerada **não é removida automaticamente** (evita apagar lançamento que o usuário
  já pode ter mexido).
- Usuário desmarca e marca **paga de novo** → o sistema **não gera uma segunda ocorrência**.
  Antes de gerar, verifica se já existe uma conta com `recorrenciaOrigemId` apontando pra esta
  (`app/js/app.js`, função `alternarPago`); se existir, só avisa que a próxima já existe.
- Conta recorrente **nunca marcada como paga** simplesmente fica pendente/atrasada — não gera
  próxima sozinha. A geração é **sempre** um efeito do pagamento, nunca do tempo passando.

**Teste:** `testes/motor.teste.js` · casos `RN001-*`

**Procedência:** pedido explícito do usuário, com o exemplo da conta de água de julho/agosto.

---

### RN002 — Parcelamento gera a série inteira de uma vez (diferente da recorrência)
**Regra:** ao cadastrar uma conta como **parcelada** (cartão), o usuário informa o valor da
parcela, a quantidade total de parcelas (N) e o vencimento da 1ª. O sistema cria as **N
ocorrências de uma vez**, uma por mês a partir daquele vencimento, cada uma rotulada
"descrição (X/N)". As parcelas futuras já nascem no sistema — diferente da recorrência, porque
a dívida inteira já foi assumida no cartão numa tacada só; não é uma incerteza mês a mês.

**Por quê:** é o padrão que todo app de cartão usa (e o usuário pediu explicitamente: "de uma
vez, duas vezes, três vezes"). Gerar sob demanda como a recorrência seria errado aqui — o
usuário já sabe hoje que vai pagar em setembro, não faz sentido esconder isso dele.

**Exemplos:**
- "TV", parcelado 3x de R$100, 1ª parcela vence 15/07/2026 → gera "TV (1/3)" 15/07, "TV (2/3)"
  15/08, "TV (3/3)" 15/09 — todas R$100, pendentes, mesmo `grupoId`.
- Compra à vista no cartão = parcelamento 1x (mesmo motor, N=1) — não precisa de caminho
  separado.

**Teste:** `testes/motor.teste.js` · casos `RN002-*`

**Procedência:** pedido explícito do usuário.

---

### RN003 — Semana começa segunda e termina domingo; numerada dentro do mês
**Regra:** dentro de cada mês, a **Semana 1** vai do dia 1 até o primeiro domingo daquele mês
(pode ter menos de 7 dias, se o dia 1 não cair numa segunda). As semanas do meio são blocos
cheios de segunda a domingo. A **última semana** do mês vai da última segunda-feira até o
último dia do mês (também pode ter menos de 7 dias).

**Por quê:** é a numeração de semana que o usuário usa de cabeça pra pensar em contas do mês —
diferente da "semana ISO" do calendário, que ignora limite de mês. Aqui a semana nunca cruza
de um mês pro outro.

**Exemplos (dados literalmente pelo usuário):**
- Mês cujo dia 1 cai numa **quarta-feira** → Semana 1 = quarta a domingo (5 dias).
- Mês de 30 dias cujo dia 30 cai numa **quinta-feira** → última semana = segunda (dia 27) a
  quinta (dia 30) — 4 dias.
- Caso geral: mês cujo dia 1 é segunda-feira → Semana 1 já é a semana cheia (7 dias),
  segunda a domingo.

**Teste:** `testes/motor.teste.js` · casos `RN003-*` (varre os 7 dias-da-semana possíveis pro
dia 1, mais fevereiro bissexto/não-bissexto)

**Procedência:** pedido explícito do usuário, com os dois exemplos acima ditados por ele.

---

### RN004 — "Atrasada" é derivado, nunca um status gravado
**Regra:** não existe status "atrasado" salvo no dado. Uma conta aparece como atrasada quando,
**no momento de exibir**, `status === "pendente"` e `vencimento < hoje`. É calculado toda vez
que a tela renderiza, nunca escrito no armazenamento.

**Por quê:** se fosse um status gravado, o app precisaria rodar algum job "todo dia à meia-noite
marca como atrasado" — impossível num site estático sem servidor. Calculado na leitura, o dado
nunca fica desatualizado (o mesmo princípio do `ESTADO.md` do harness: **vista, não fonte**).

**Exemplos:**
- Conta pendente, vencimento ontem → exibida como atrasada (visual diferente: vermelho).
- Conta paga, vencimento no passado → **não** é atrasada (já foi resolvida).
- Conta pendente, vencimento hoje → **não** é atrasada ainda (vence hoje, não venceu).

**Teste:** `testes/motor.teste.js` · casos `RN004-*`

**Procedência:** decisão de arquitetura para manter o app sem servidor (Lei da SPEC: sem
backend).

---

### RN005 — Excluir parcela isolada vs. excluir a série inteira
**Regra:** excluir uma conta parcelada, por padrão, remove **só aquela ocorrência** (ex.: só a
parcela 2/3). A interface **sempre pergunta** se o usuário quer excluir a série inteira quando
detecta que a conta tem `parcela.grupoId`. Excluir uma conta recorrente (não paga ainda) remove
só aquela ocorrência — não existem "futuras" recorrentes no sistema (RN001), então não há
série pra oferecer.

**Por quê:** apagar sem querer 3 meses de fatura de cartão por engano, com a mesma tecla que
apagaria um lançamento avulso, é o tipo de erro que o usuário só percebe quando confere o
extrato — tarde demais.

**Teste:** `testes/e2e/contas.spec.js` · cenário "excluir parcela pergunta o escopo"

**Procedência:** aplicação da regra de ouro nº 1 do harness (nunca agir sem confirmar quando a
ação é difícil de reverter), combinada com RN002.
