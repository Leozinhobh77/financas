# REGRAS — metas (caixinha, sobra e cofre)

> **RN010 a RN024.** O índice de todas as regras está em
> [`../REGRAS-DE-NEGOCIO.md`](../REGRAS-DE-NEGOCIO.md); o manual em linguagem comum, com os
> exemplos do usuário, em [`../METAS.md`](../METAS.md). As regras de **contas e datas**
> estão em [`contas.md`](contas.md).
>
> ⚠️ **Regra sem teste é só um parágrafo bonito.** Prosa nunca avisa quando é violada.

---

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

### RN016 — Baixa cruzada: pagar a conta e debitar a caixinha são fatos separados
**Regra:** "a conta foi paga" e "o dinheiro saiu da minha caixinha" são **duas informações
diferentes**. A conta tem um estado só (`pago` / `pendente`); a meta tem o **registro do
débito**. Quatro situações:

| Situação | Significa |
|---|---|
| `aberta` | pendente, sem movimento — o caso normal |
| `abatida` | paga **e** debitada da caixinha — o ciclo completo |
| `paga-fora` | paga em Contas a Pagar, **ainda não debitada** — precisa de aviso |
| `abatida-sem-pagamento` | debitada, mas a conta voltou a pendente — inconsistência |

**Comportamento:**

- **Pagar por dentro da meta** → dá baixa na conta **e** debita a caixinha, num gesto só.
- **Pagar em Contas a Pagar** → a conta fica paga; a caixinha **não** é debitada. O card, dentro
  da meta, mostra o aviso **com o botão que resolve** ("Abater da meta").
- **Tentar pagar de novo por dentro da meta** uma conta já paga → em vez de pagar duas vezes,
  aparece o alerta: *"já foi paga em DD/MM. Quer abater os R$ X da caixinha agora?"*
- **Uma conta só pode ser abatida uma vez**, e por uma meta só (RN012).

**Por quê:** pode ser que a conta tenha sido paga com o salário, e não com o dinheiro guardado.
Debitar automático faria o cofre mentir para baixo; não avisar faria mentir para cima. O débito
acontece quando o usuário diz que aconteceu — e o app não deixa ele esquecer.

**Exemplos:**
- Abater não muda o "Já paguei" do painel (a conta já estava paga); muda o **saldo da caixinha**
- Meta com R$ 1.000 e conta paga de R$ 340: antes de abater, saldo 1.000; depois, **660**

**Teste:** `motor.teste.js` · `RN016-1..7` + `test_metas.py` (4b, 4c, 4d, 4e).
**Procedência:** pedido do usuário — "quando eu marcar numa conta [na meta] automaticamente ela
vai dar baixa geral... já ao contrário, minhas contas a pagar deu baixa lá, ela não vai dar baixa
na meta não; ou então fica alguma sinalização, pra não dar conflito de dar baixa duas vezes".

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

### RN018 — Desfazer o pagamento devolve o dinheiro à caixinha
**Regra:** desmarcar o pagamento de uma conta remove o débito correspondente **em todas as
metas**. O mesmo vale ao **excluir** a conta: o valor volta para a caixinha, e a confirmação
avisa isso antes. Editar o valor de uma conta já abatida **atualiza a baixa junto**.

**Por quê:** sem isso a conta voltaria a ser cobrada por inteiro enquanto o dinheiro dela
continuava debitado — a meta cobraria **duas vezes** o mesmo dinheiro, e nada na tela
denunciaria. É o estado `abatida-sem-pagamento` da RN016, que por isso existe sinalizado.

**Exemplos:**
- Caixinha com 1.000, baixa de 340 → saldo 660. Desmarcou o pagamento → volta a **1.000**
- Excluiu a conta já abatida → o valor volta, e o aviso disse isso antes de excluir
- Conta de 340 abatida, editada para 400 → a baixa passa a 400, e o toast avisa

**Teste:** `motor.teste.js` · `RN018-1..2` + `test_metas.py` (4f).
**Procedência:** furo identificado na fase 3, junto com a RN016 — a volta atrás não pode deixar
metade do fato de pé.

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

### RN020 — Conta que entra sozinha na meta é sinalizada
**Regra:** como a seleção é uma regra viva (RN011), conta nova numa categoria marcada **entra
sozinha**. Entrar é o comportamento certo; entrar **em silêncio** não é. A meta guarda uma
fotografia (`contasConhecidas` + `snapshotEm`) e avisa o que apareceu depois, **com o tamanho
exato do estrago na sobra daquele mês** e duas saídas: *Tirar da meta* ou *Ok, entendi*.

- Meta **sem `snapshotEm`** ainda não foi fotografada → não acusa nada. Sem essa trava, toda
  meta criada antes desta versão acusaria o acervo inteiro como novidade.
- *Tirar da meta* respeita a **RN017**: conta que já tem dinheiro movimentado **não sai**, e o
  aviso diz quantas ficaram e por quê.

**Exemplos:**
- Meta marca `casa`; entra um IPVA de R$ 600 em outubro → aviso, e a sobra de outubro cai de
  R$ 2.400 para **R$ 1.800**
- Duas contas novas no mesmo mês vêm agrupadas, com o total (R$ 850) e a sobra antes → depois

**Teste:** `motor.teste.js` · `RN020-1..3` + `test_metas.py` (6d).
**Procedência:** pedido do usuário — "esse mês de agosto já tem contas, mas apareceu uma conta
do novo, aí ela vai aparecer lá; aí vai ter uma caixinha de seleção".

---

### RN021 — Mês cujas contas passam da caixinha é alertado
**Regra:** quando `contas > caixinha` num mês (sobra prevista negativa), o app alerta **no mês**
e **na visão geral**, dizendo de quanto seria o vermelho. Mês **sem contas lançadas** nunca
entra na lista de risco — ausência de dado não é risco.

**Exemplo:** outubro com R$ 9.600 de conta contra caixinha de R$ 9.000 → *"fecharia R$ 600 no
vermelho — aumente a caixinha ou tire alguma conta"*.

**Teste:** `motor.teste.js` · `RN021-1..2` + `test_metas.py` (6e).
**Procedência:** enriquecimento aprovado na auditoria de 2026-07-27.

---

### RN022 — Até onde o dinheiro em mãos alcança
**Regra:** com o saldo da campanha, o app percorre as contas pendentes **por ordem de
vencimento** e marca onde o dinheiro acaba: quais dá para pagar, qual é a conta cortada e
quanto falta nela. Se cobre tudo, diz quanto sobra.

**Exemplo (R$ 4.000 em mãos, R$ 6.000 de conta em agosto):** cobre as 7 primeiras (R$ 3.900),
sobram R$ 100, e a **Fatura Nubank** fica faltando **R$ 2.000**.

**Teste:** `motor.teste.js` · `RN022-1..3`.
**Procedência:** enriquecimento aprovado na auditoria — responde "pago quais?" antes do susto.

---

### RN023 — Relatório: série real × plano, sequência e simulador
**Regra:**

- **Série do mês:** para cada dia, o **acumulado real** dos aportes e a **linha reta do plano**
  (`alvo × dia ÷ dias do mês`). Dia sem lançamento mantém o acumulado — a linha não cai.
- **Sequência:** dias seguidos lançando. **Ontem ainda conta** — a sequência só quebra depois de
  um dia inteiro em branco, senão ela morreria toda manhã antes do primeiro lançamento.
- **Simulador:** "e se eu juntar R$ X/dia" projeta o fechamento do mês e o cofre da campanha.
  A conta é a diferença entre o que a hipótese junta e o que ainda faltava juntar.

**Exemplos:**
- 400 no dia 1 e 600 no dia 3 → série: 400, 400, 1.000, 1.000… e a linha ideal fecha nos 9.000
- Lançou dias 8, 9 e 10: no dia 10 a sequência é 3; no dia 11 continua 3; no dia 12 **zera**
- Simulador a 400/dia em agosto → mês fecha com **R$ 12.400** e cofre em **R$ 15.400** (o mesmo
  número da RN014-2, por caminho independente)

**Teste:** `motor.teste.js` · `RN023-1..4` + `test_metas.py` (6b).
**Procedência:** pedido do usuário — "vai ter que ter um negócio de relatório... com gráfico
para saber se eu tava conseguindo acompanhar minha meta direitinho".

---

### RN024 — Duplicar campanha desloca os meses mantendo os buracos
**Regra:** a cópia começa **logo depois do fim** da original e desloca todos os meses pelo mesmo
número de meses que a campanha ocupa. Mês pulado continua pulado. Valores e categorias vêm
juntos; o nome ganha " (2)" para ser conferido.

**Exemplos:**
- ago–nov/2026 → **dez/2026 a mar/2027**
- nov/2026 + jan/2027 (dezembro pulado) → **fev/2027 + abr/2027** (o buraco anda junto)

**Teste:** `motor.teste.js` · `RN024-1..2` + `test_metas.py` (6c).
**Procedência:** enriquecimento aprovado na auditoria de 2026-07-27.
