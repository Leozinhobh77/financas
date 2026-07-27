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
| RN005 — Exclusão de parcela vs. série | `testes/e2e/test_app_financas.py` |
| RN006 — Meta por dia (mês) | `testes/motor.teste.js` · casos `RN006-*` |
| RN007 — Ritmo da semana com arrasto em cascata | `testes/motor.teste.js` · casos `RN007-*` |
| RN008 — "Veio de antes" separado do mês corrente | `testes/motor.teste.js` · `pendenteDeMesesAnteriores` |
| RN009 — Painel do período não responde ao filtro de status | `testes/motor.teste.js` · casos `RN009-*` + E2E |
| RN010 — Meta é campanha de N meses selecionáveis, com alvo por mês | `testes/motor.teste.js` · casos `RN010-*` |
| RN011 — Seleção por categoria é regra viva, não fotografia | `testes/motor.teste.js` · casos `RN011-*` |
| RN012 — Uma conta pertence a no máximo uma meta | `testes/motor.teste.js` · casos `RN012-*` |
| RN013 — Duas linhas por dia: alvo (juntar) e piso (não dever) | `testes/motor.teste.js` · casos `RN013-*` |
| RN014 — Sobra prevista × real; cofre nunca negativo; arrasto | `testes/motor.teste.js` · casos `RN014-*` |
| RN015 — Ritmo real, projeção e dia da virada | `testes/motor.teste.js` · casos `RN015-*` |
| RN017 — Dinheiro movimentado não sai por mudança de filtro | `testes/motor.teste.js` · casos `RN017-*` |
| RN019 — Movimento guarda fotografia da conta | `testes/motor.teste.js` · casos `RN019-*` |

Meta: 100%. `/harness doctor` reprova regra sem teste em projeto T2+.

> As regras de Meta (RN010+) têm o **manual em linguagem comum** em `docs/METAS.md`, com os
> exemplos que o usuário deu. Aqui fica só a regra formal e o teste que a prova.

---

## As regras

### RN010 — Meta é uma campanha de N meses, com alvo próprio por mês
**Regra:** uma meta tem **nome livre** e uma lista de meses **selecionáveis** — 1 a N, podendo
**pular** meses e **atravessar o ano**. Cada mês tem a sua **caixinha** (alvo). O total da
campanha é a soma dos alvos. O assistente aceita um total e **divide igual em centavos**.

**Exemplos:**
- ago 9.000 + set 9.000 + out 9.000 + nov 8.000 = campanha de **R$ 35.000** em 4 meses
- nov/26 + jan/27 + fev/27 (dezembro pulado) é válido e sai sempre ordenado
- 36.000 ÷ 4 = 9.000 exatos · 10.000 ÷ 3 = 3.333,33 + 3.333,33 + 3.333,**34** (não some centavo)

**Teste:** `motor.teste.js` · `RN010-1..3`.
**Procedência:** pedido do usuário — "eu posso escolher se eu quero um mês, dois, três, quantos
meses eu quiser... agosto nove mil, setembro nove, outubro nove, e novembro oito".

---

### RN011 — A seleção de contas é uma regra viva, não uma fotografia
**Regra:** a meta escolhe contas **por categoria**. Isso é uma **regra permanente**: conta nova
que caia numa categoria marcada **entra sozinha**, inclusive em meses futuros. Ajustes pontuais
por conta (`incluidas` / `excluidas`) sobrepõem a categoria. **Só contas a pagar** entram.

**Ordem de precedência:** movimento registrado (RN017) > excluída > incluída > categoria.

**Exemplos:**
- Meta marca `casa`; chega um IPTU novo de `casa` em agosto → entra sem o usuário fazer nada
- Excluir só a Energia tira a Energia; incluir a fatura de `cartão` traz só ela
- Um salário (`receber`) nunca entra, mesmo com a categoria marcada

**Teste:** `motor.teste.js` · `RN011-1..3`.
**Procedência:** pedido do usuário — "como os outros três meses ainda não vou ter conta nenhuma,
vai ficar vazio; de acordo o mês vai virando e o recorrente vai virando, vai aparecendo conta".

---

### RN012 — Uma conta pertence a no máximo uma meta
**Regra:** se duas metas selecionariam a mesma conta, apenas **uma** fica com ela. Desempate,
nesta ordem: (1) a meta que **já mexeu no dinheiro** daquela conta; (2) a meta **mais antiga**
(`criadoEm`, com o `id` como critério final para ser determinístico).

**Por quê:** sem isso, duas campanhas que marquem `casa` contam o mesmo aluguel duas vezes; ao
pagar por uma, a outra continua achando que deve. **Os dois cofres mentem e nada denuncia.**

**Na tela:** a conta já reservada aparece **travada**, com o nome de quem a tem.

**Exemplos:**
- "Reserva" (criada em 01/07) e "Viagem" (20/07) marcam `casa` → as 4 contas ficam na Reserva
- Se a Viagem já deu baixa no aluguel, o aluguel é **dela**, mesmo sendo a mais nova

**Teste:** `motor.teste.js` · `RN012-1..3`.
**Procedência:** furo **F1** da auditoria de 2026-07-27 (ver `DECISOES.md` D007.1).

---

### RN013 — Duas linhas por dia: o alvo e o piso
**Regra:** todo mês em curso tem **dois** números diários:

- **Juntar hoje** = `(alvo − juntado no mês) ÷ dias que restam`
- **Mínimo do dia** = `(o que falta pagar − o que está em mãos) ÷ dias que restam`

Os dias **incluem hoje** (o dia ainda não acabou) e têm **piso 1** — nunca divide por zero.
O "em mãos" é o saldo da **campanha inteira**, não do mês: dinheiro de agosto continua
existindo em setembro.

**Exemplos (agosto, 31 dias, caixinha 9.000, contas 6.000):**
- Dia 1º, nada juntado → juntar **R$ 290,32/dia**; mínimo **R$ 193,55/dia**
- Lançou 300 e 600 nos dias 1 e 2 → no dia 3 cai para **R$ 279,31**
- Não lançou nada no dia 3 → no dia 4 sobe para **R$ 289,29**
- Já com 4.000 em mãos → o mínimo cai para **R$ 64,52/dia** (2.000 ÷ 31)
- Dia 31 → `dias = 1`, sem divisão por zero

**Teste:** `motor.teste.js` · `RN013-1..5`.
**Procedência:** pedido do usuário — "se eu não coloquei nada, amanhã provavelmente vai ser
maior a quantidade que eu tenho que [juntar]".

---

### RN014 — Sobra prevista × sobra real, cofre e arrasto
**Regra:**

- **Sobra prevista** = `caixinha − contas` (o plano)
- **Sobra real** = `juntado − retirado − pago` (o fato)
- **O cofre soma a real**, mês a mês, e **nunca é negativo**: o que faltou vira **conta em
  aberto**, não saldo negativo.
- Conta pendente de um mês **encerrado** é **arrastada** para o **primeiro mês ainda aberto** —
  é lá que ela vai ser paga de verdade, e é lá que ela encolhe a sobra.
- Mês futuro **sem contas lançadas** é marcado como tal — não vira "mínimo R$ 0,00", que
  pareceria boa notícia sendo apenas ausência de dado.

**Exemplos (campanha 9/9/9/8 = 35.000, contas 6.000/6.000/6.600/4.400):**
- Nada lançado → cofre previsto **R$ 12.000**; escada 3.000 → 6.000 → 8.400 → 12.000
- Juntou 12.400 em agosto e pagou os 6.000 → cofre hoje **6.400**, previsto **R$ 15.400**;
  setembro **continua pedindo 9.000**
- Agosto fechou com 4.000 juntados e 4.000 pagos → foi pro cofre **R$ 0**, e 2.000 arrastados
  para setembro, cuja sobra cai de 3.000 para **1.000**; cofre previsto vira **R$ 7.000**
- Pagou 5.000 tendo juntado 1.000 → saldo bruto −4.000, mas **cofre = 0**

**Teste:** `motor.teste.js` · `RN014-1..6`.
**Procedência:** pedido do usuário, nas três rodadas — "o intuito é de sobrar três mil";
"vamos supor que eu junte quatro mil, como é que ficaria?"; "eu sei que eu tenho uma caixinha
de doze mil sobrando".

---

### RN015 — Ritmo real, projeção e dia da virada
**Regra:** no mês em curso o app calcula o **ritmo real** (`juntado ÷ dias corridos`), a
**projeção** (`ritmo × dias do mês`) e o **dia da virada**: a data em que o dinheiro em mãos
passa a cobrir tudo que falta pagar. Se já cobre, está virado e não há data pendente.

**Exemplos:**
- 400/dia por 10 dias em agosto → ritmo 400, projeção **R$ 12.400**
- 4.000 em mãos, 6.000 a pagar, ritmo 400 → descoberto 2.000 → virada em **15/08** (5 dias)
- 7.000 em mãos com 6.000 a pagar → **já virou**, sem data

**Teste:** `motor.teste.js` · `RN015-1..3`.
**Procedência:** enriquecimento aprovado na auditoria de 2026-07-27.

---

### RN017 — Dinheiro que já se moveu não é desfeito por mudança de filtro
**Regra (invariante do módulo):** conta com movimento registrado **continua na meta**, mesmo
que a categoria dela mude, mesmo que a categoria saia da seleção, mesmo que ela seja excluída
manualmente. Para tirá-la, é preciso **desfazer o lançamento** primeiro.

**Por quê:** a seleção é uma regra viva (RN011). Sem esta trava, trocar a categoria do aluguel
de `casa` para `lazer` **levava junto uma baixa de R$ 1.800 que já tinha acontecido** — o cofre
mudava sozinho sem ninguém encostar em dinheiro.

**Teste:** `motor.teste.js` · `RN017-1..3`.
**Procedência:** furo **F3** da auditoria de 2026-07-27 (ver `DECISOES.md` D007.3).

---

### RN019 — Todo movimento guarda a fotografia da conta
**Regra:** um lançamento ligado a uma conta guarda `descricao`, `valor`, `vencimento` e
`categoria` **no momento em que foi feito**. O extrato não depende da conta continuar existindo
nem continuar com o mesmo valor.

**Por quê:** abater o aluguel e depois **excluir** a conta deixava o extrato apontando para um
id inexistente; **editar** o valor de 340 para 400 deixava a baixa mentindo em 60 reais.

**Exemplo:** meta com aporte de 1.000 e baixa de 340; a conta é apagada → o saldo continua
**R$ 660** e o extrato continua mostrando "Energia".

**Teste:** `motor.teste.js` · `RN019-1..2`.
**Procedência:** furo **F2** da auditoria de 2026-07-27 (ver `DECISOES.md` D007.2).

---

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

**Teste:** `testes/e2e/test_app_financas.py` · cenário "excluir parcela: deve perguntar o escopo"

**Procedência:** aplicação da regra de ouro nº 1 do harness (nunca agir sem confirmar quando a
ação é difícil de reverter), combinada com RN002.

---

### RN006 — Meta por dia: quanto preciso juntar por dia até o fim do mês
**Regra:** `meta = o que ainda falta pagar no mês ÷ dias que restam até o último dia do mês`.
O **dia de hoje conta** como dia restante (ele ainda não acabou). O divisor tem **piso 1** —
nunca zero. A meta **sobe sozinha** conforme os dias passam sem pagamento, e **cai na hora**
quando qualquer conta é paga.

**Por quê:** o usuário tem renda diária/variável ("trabalho todo dia, arrumo dinheiro todo
dia"). O total devido no mês não responde a pergunta que ele realmente faz — quanto preciso
gerar por dia. E o número precisa refletir a pressão crescente do atraso, senão não serve
como alerta.

**Não inclui:**
- Contas a **receber** (decisão explícita: o número é o bruto que ele precisa *gerar*; se
  descontasse, ficaria otimista e sumiria quando o salário entrasse).
- Pendências de **meses anteriores** (têm bloco próprio; ver "Veio de antes" abaixo).

**Exemplos (dados pelo usuário):**
- Deve R$ 6.000, mês de 30 dias, hoje é dia 1 → 6000 ÷ 30 = **R$ 200/dia**
- Mesmos R$ 6.000, faltam 20 dias → 6000 ÷ 20 = **R$ 300/dia**
- Mesmos R$ 6.000, faltam 10 dias → 6000 ÷ 10 = **R$ 600/dia**
- Pagou R$ 4.000 dos 6.000, faltam 10 dias → 2000 ÷ 10 = **R$ 200/dia**
- Último dia do mês → divisor 1, sem divisão por zero
- Mês sem conta nenhuma → meta 0, sem `NaN`

**Semáforo:** compara a meta atual com o ritmo "ideal" (`total do mês ÷ dias do mês`).
🟢 até 1,05× · 🟡 até 1,5× · 🔴 acima disso.

**Teste:** `testes/motor.teste.js` · casos `RN006-*`
**Procedência:** pedido do usuário, com os três exemplos numéricos acima ditados por ele.

---

### RN007 — Ritmo da semana: o arrasto acumula em cascata
**Regra:** a semana atual precisa cobrir **tudo que está pendente no mês corrente e vence até
o domingo dela** — o que venceu em semanas anteriores e não foi pago (o "arrastado") mais o
que vence nela. Divide-se pelos **dias que restam** até o domingo (hoje conta, piso 1).

O que vence em **semanas futuras fica de fora** — senão o número viraria o mês inteiro e
perderia o sentido de "esta semana".

**Por quê:** é uma regra única que produz a cascata naturalmente (S1 → S2 → S3 → …), sem
precisar somar semana a semana nem guardar estado. Pagar qualquer coisa desmonta a bola de
neve imediatamente.

**Exemplos (dados pelo usuário):**
- S1 devendo R$ 2.100, semana cheia → 2100 ÷ 7 = **R$ 300/dia**
- S1 não paga (R$ 2.100) + S2 vencendo R$ 2.100 → a cobrir R$ 4.200 ÷ 7 = **R$ 600/dia**
- Cascata completa, sem pagar nada, num mês de 5 semanas:

  | Semana | Vence nela | Arrastado | A cobrir |
  |---|---|---|---|
  | S1 | 2.100 | — | 2.100 |
  | S2 | 1.500 | 2.100 | 3.600 |
  | S3 | 800 | 3.600 | 4.400 |
  | S4 | 1.200 | 4.400 | 5.600 |
  | S5 | 900 | 5.600 | 6.500 |

- Pagar o arrastado zera a cascata na hora
- No meio da semana divide pelos dias que faltam, não por 7 fixo
- Conta de **outro mês** nunca entra (tem bloco próprio)

**Teste:** `testes/motor.teste.js` · casos `RN007-*`
**Procedência:** pedido do usuário, incluindo a dúvida que ele levantou sobre o acúmulo
continuar de S2 para S3, S4 e S5 — respondida com a regra única acima.

---

### RN008 — "Veio de antes": pendência de meses anteriores fica separada
**Regra:** contas a pagar pendentes com vencimento **anterior ao primeiro dia do mês corrente**
aparecem num bloco próprio no dashboard, com o total e a lista. Elas **não entram** na Meta por
dia (RN006), **não entram** no Ritmo da semana (RN007), e **não aparecem** em "Próximos
vencimentos" — que passa a mostrar só o mês corrente.

**Por quê:** pedido explícito do usuário ("não misturar com desse mês"). Misturar faria a meta
do mês responder uma pergunta diferente da que ela promete, e ver a mesma conta em dois lugares
empurraria as contas do mês corrente para baixo na lista de urgências.

**Exemplos:**
- 2 contas de junho pendentes, hoje é julho → bloco mostra o total e as duas; a meta de julho
  ignora as duas
- Nenhuma pendência antiga → **o bloco não aparece** (não é um card vazio)
- Conta antiga já paga → não conta

**Teste:** `testes/motor.teste.js` · `pendenteDeMesesAnteriores` e
`"Veio de antes" NÃO entra na meta do mês`
**Procedência:** pedido explícito do usuário, na revisão do esboço.


---

### RN009 — O painel do período não responde ao filtro de status
**Regra:** nas telas de lista (`pagar` e `receber`), o painel do topo mostra o panorama do
**escopo** selecionado: total, já pago/recebido, falta, e meta por dia. Ele responde a
**período, categoria e busca** — e **ignora o filtro de status** (Todas/Pendentes/Atrasadas/
Pagas). Uma linha discreta logo acima da lista mostra, aí sim, o resultado de **todos** os
filtros: `N contas nesta lista · R$ X`.

**Por quê:** é o painel que exibe a quebra por status (pago × falta). Filtrá-lo por status
seria redundante e, pior, faz o total do período desaparecer — era exatamente o problema
relatado: ao clicar em "Pagas", o usuário perdia a noção do mês inteiro.

**Comportamento por filtro:**

| Filtro | Painel muda? |
|---|---|
| Período (mês, semana, personalizado) | ✅ sim — é o escopo |
| Categoria | ✅ sim — analisando "casa", vê o panorama de casa |
| Busca | ✅ sim |
| Status | ❌ **não** |

**Detalhes:**
- **Meta por dia se adapta ao período**: mês → dias restantes do mês; semana → até domingo;
  personalizado → dentro do intervalo escolhido. Mesma lógica da RN006 (hoje conta, piso 1).
- **Período encerrado** (fim < hoje) não tem meta — o terceiro bloco vira **"Ficou pendente"**.
- **Período futuro** usa a duração inteira do intervalo.
- **`receber` tem variante própria**: Total previsto · Já recebido · Atrasado, **sem meta/dia**
  (não se "arruma dinheiro" pra receber).
- **O rótulo do total acompanha o período** — "Total do mês" / "da semana" / "do período".
  Dizer "do mês" numa visão de semana seria falso.
- **O painel continua visível com a lista vazia** — o panorama segue verdadeiro mesmo quando o
  filtro específico não retorna nada.

**Exemplos:**
- Julho com 8 contas, 3 pagas. Filtro "Todas" → painel: falta R$ 1.841,20, total R$ 3.588,60;
  lista: 8 contas · R$ 3.588,60
- Mesmo mês, filtro "Pagas" → **painel idêntico**; lista: 3 contas · R$ 1.747,40
- Mesmo mês, filtro "Pendentes" → **painel idêntico**; lista: 1 conta · R$ 642,30
- Filtro categoria "casa" → painel muda: total R$ 1.718,30, escopo "Casa · Julho de 2026"

**Teste:** `testes/motor.teste.js` · casos `RN009-*` (11 casos, incluindo período encerrado,
futuro, semana, personalizado e vazio) + `testes/e2e/test_app_financas.py`, que compara os
valores do painel antes e depois de trocar o status e exige que **não mudem**.

**Procedência:** pedido do usuário — "caso eu filtre, o valor total também é filtrado; seria
interessante continuar mostrando o valor total devido, mas mostrar o valor já pago, o que falta
e a meta diária".
