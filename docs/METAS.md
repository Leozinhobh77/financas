# METAS — o manual

> **Fonte única do conceito de Meta.** As regras formais (com teste) estão em
> `REGRAS-DE-NEGOCIO.md` (RN010–RN019); as decisões e os furos que elas fecham, em
> `DECISOES.md` (D007.1–D007.10). Aqui está o **porquê**, em português claro, com os exemplos reais
> que o usuário deu ao pedir a funcionalidade.

---

## 1. A frase que define tudo

> "Eu tenho seis mil de conta mas quero juntar uma caixinha de nove mil, justamente pra ter
> três mil sobrando pra outras coisas ou conta de emergência."

Leia de novo, porque quase todo app de finanças erra isso: **a caixinha paga as contas.** Não
são dois bolsos. Quem junta 9.000 para pagar 6.000 não quer juntar 15.000 — quer **ficar com
3.000**.

Por isso o número grande da tela do mês é a **sobra**, não o quanto falta juntar.

---

## 2. As quatro palavras

| Palavra | O que é | Exemplo |
|---|---|---|
| 💰 **Caixinha** | quanto quero juntar naquele mês. **Eu digito.** | R$ 9.000 |
| 🧾 **Contas** | o que tenho a pagar naquele mês. **O app calcula.** | R$ 6.000 |
| ✨ **Sobra** | caixinha − contas. **É o propósito.** | R$ 3.000 |
| 🏦 **Cofre** | a soma das sobras da campanha inteira. | R$ 12.000 |

O cofre responde à pergunta final: *"quanto eu vou ter sobrando lá no banco?"*

---

## 3. Uma meta é uma campanha, não um mês

Nome livre, 1 a N meses, **meses selecionáveis** (dá para pular, dá para atravessar o ano), e
**alvo próprio por mês**:

```
META: "Reserva de emergência"                    4 meses

  ☑ AGO/26   R$ 9.000        ☐ dez/26  — pulei
  ☑ SET/26   R$ 9.000
  ☑ OUT/26   R$ 9.000
  ☑ NOV/26   R$ 8.000
  ──────────────────────
  TOTAL      R$ 35.000
```

No assistente dá para digitar o **total** (R$ 36.000) e mandar **dividir igual** — a divisão é
feita em centavos, então 10.000 ÷ 3 vira 3.333,33 + 3.333,33 + 3.333,**34**, e não some um
centavo (RN010).

---

## 4. As duas linhas de cada mês

Toda meta tem **duas** metas embutidas, não uma:

```
R$ 0 ──────────── R$ 6.000 ──────────── R$ 9.000 ──→
                      ▲                     ▲
                    O PISO                O ALVO
              (pagar as contas)        (a sobra de 3.000)

  🔴 ABAIXO DO PISO      🟡 ENTRE OS DOIS      🟢 ALVO BATIDO
  não cobre as contas    paga tudo, sobra      sobra completa
  → fica devendo         menos que 3.000
```

Daí os dois números por dia no painel:

- **Juntar hoje** = (caixinha − já juntado) ÷ dias que restam
- **Mínimo do dia** = (o que falta pagar − o que já está em mãos) ÷ dias que restam

Nos dias ruins, o segundo é o que salva: *"não consigo os 290 hoje, mas se eu botar 194 pelo
menos não fico devendo."*

---

## 5. A cascata

O número do dia **recalcula sozinho**. Juntar acima do ritmo alivia amanhã; não lançar aperta.

| Dia | Lançou | Juntou | Falta | Dias | **Juntar hoje** | |
|---|---|---|---|---|---|---|
| 1/8 | — | 0 | 9.000 | 31 | R$ 290,32 | ponto de partida |
| 2/8 | 300 | 300 | 8.700 | 30 | R$ 290,00 | no ritmo |
| 3/8 | 600 | 900 | 8.100 | 29 | **R$ 279,31** | ⬇️ adiantou, aliviou |
| 4/8 | *nada* | 900 | 8.100 | 28 | **R$ 289,29** | ⬆️ subiu |
| 5/8 | *nada* | 900 | 8.100 | 27 | R$ 300,00 | ⬆️ subiu de novo |

O app usa os **dias reais do mês** (31 em agosto), então dá R$ 290,32 e não os R$ 300
arredondados de cabeça.

---

## 6. Os três finais possíveis de um mês

### 6.1 Juntou mais que a meta — 400/dia, R$ 12.400

Ao bater os 9.000 (dia 23), o mês entra em **modo bônus**: a barra passa de 100% em vez de
travar, e o **excedente** ganha destaque próprio. E aí vale a distinção mais importante do
módulo:

| | Conta | Agosto |
|---|---|---|
| **Sobra prevista** | caixinha − contas | 9.000 − 6.000 = **3.000** |
| **Sobra real** | o que **juntei** − o que **paguei** | 12.400 − 6.000 = **6.400** |

**O cofre soma a real, nunca a prevista.** Plano é intenção; cofre é dinheiro.

E **setembro continua pedindo 9.000.** Descontar o excedente comeria exatamente o dinheiro que
custou esforço guardar — o app estaria punindo quem foi bem. Existe uma chave nos ajustes da
meta para quem quer o contrário (D007.5).

### 6.2 Juntou menos que o piso — R$ 4.000

Zona vermelha, que é **diferente** de "não bati a meta". Não bater a meta é frustração; ficar
abaixo do piso é **dívida**.

```
Juntei          R$ 4.000
Paguei          R$ 4.000
───────────────────────
Foi pro cofre   R$ 0

🔺 FICOU DEVENDO  R$ 2.000 · Fatura Nubank, venceu 28/08
```

Três coisas acontecem, e nenhuma delas é "número negativo":

1. **O cofre recebe R$ 0 — nunca fica negativo.** Cofre é dinheiro guardado; dívida é outra
   coisa e mora em outra linha. Um número só esconderia as duas informações.
2. **A conta não some.** Continua pendente, vira atrasada.
3. **Ela é arrastada para o primeiro mês ainda aberto.** Setembro passa a ter 6.000 + 2.000 =
   8.000 de contas, e a sobra dele encolhe de 3.000 para 1.000 — visível **no dia 1º**, não no
   fim do mês.

### 6.3 Fechou no meio — pagou tudo, sobrou menos

O caso comum. A sobra real fica entre 0 e a prevista, e a escada mostra a diferença.

---

## 7. A escada do cofre

```
 ─── COMO O COFRE ENCHE ─────────────────────────
                     previsto   realizado
   ago  ✓ fechado     +3.000         0    🔴 −3.000
        ↳ arrastou R$ 2.000 de conta
   set  ▸ em curso     +1.000         —
        ↳ contas: 6.000 + 2.000 de agosto = 8.000
   out                 +2.400         —
   nov                 +3.600         —
 ─────────────────────────────────────────────────
   COFRE PREVISTO      R$ 7.000   (era 12.000)
```

Em quatro linhas se lê **de onde vem cada real do cofre** — e quando um mês rende menos, o
motivo está logo embaixo.

---

## 8. O dia da virada

O dia em que o que já se juntou **cobre todas as contas que faltam**:

> 🌅 A partir de 18/08 suas contas estão garantidas. Depois disso é só cofre.

É o número que responde *"a partir de quando eu posso respirar?"*.

---

## 9. Quem manda em quê

A meta **lê** as contas. Nunca as possui.

- Excluir uma meta **não encosta em nenhuma conta** (D007.8).
- A seleção por categoria é uma **regra viva**, não uma fotografia: conta nova numa categoria
  marcada entra sozinha — é isso que faz os meses futuros se encherem sozinhos conforme
  recorrências e parcelas chegam (RN011).
- **Uma conta pertence a no máximo uma meta** (RN012). Sem isso, duas campanhas que marquem
  `casa` contariam o mesmo aluguel duas vezes e os dois cofres mentiriam.
- **Dinheiro que já se moveu nunca é desfeito por mudança de filtro** (RN017). Conta com
  movimento fica na meta mesmo que a categoria mude. Para tirar, desfaça o lançamento antes.

---

## 9b. Pagar uma conta: os dois lugares

Pagar a conta e tirar o dinheiro da caixinha são **duas coisas diferentes** — pode ser que você
tenha pago com o salário, e não com o dinheiro guardado. Só você sabe qual foi.

| Onde você marca | Baixa na conta? | Debita a caixinha? |
|---|---|---|
| **Dentro da Meta** | ✅ automático | ✅ automático |
| **Em Contas a Pagar** | ✅ | ❌ **não** — mas a meta avisa |

Pagando fora, o card dentro da meta fica assim:

```
┌────────────────────────────────────────────┐
│ ✓  Internet          🏠 casa · Pago 27/07  │
│                                    R$ 130  │
│ ⚠️ Paga em Contas a Pagar —                │
│    ainda não abatida da caixinha           │
│                        [ Abater da meta ]  │
└────────────────────────────────────────────┘
```

O aviso **já traz o botão que resolve**. Aviso que só avisa e não deixa agir vira ruído: você
ignora depois da terceira vez.

E se tentar pagar de novo por dentro da meta, em vez de pagar duas vezes:

> **Esta conta já foi paga** em 27/07, em Contas a Pagar.
> Quer abater os R$ 130,00 da caixinha agora?
> `[ Não, só marcar ]` `[ Sim, abater da meta ]`

**Voltar atrás devolve tudo.** Desmarcar o pagamento, excluir a conta ou mudar o valor dela
ajusta a caixinha junto — nunca fica metade do fato de pé (RN018).

---

## 10. O extrato é a fonte da verdade

Todo o dinheiro da meta vive numa **lista só**, em ordem de tempo — aportes, retiradas e baixas
juntos:

```
  01/08  ↑ aporte                 +400,00     400,00
  02/08  ↑ aporte                 +400,00     800,00
  05/08  ✓ pagou Energia          −340,00     460,00
  06/08  ↑ aporte                 +400,00     860,00
  12/08  ↓ retirada (emergência)  −200,00     660,00
```

**Qualquer número de painel pode ser conferido a olho nu aqui.** Três listas paralelas para o
mesmo dinheiro é exatamente como um saldo desanda (D007.4). O teste `D007.4-1` exige que o fim do
extrato seja igual ao saldo — se divergir, algum painel está mentindo.

Cada lançamento ligado a uma conta guarda uma **fotografia** dela (descrição e valor da época).
Apagar ou editar a conta depois não deixa o extrato órfão nem mentindo (RN019).

---

## 10b. O que o app percebe sozinho

**Conta nova entrou.** Como a seleção é uma regra viva, conta nova numa categoria marcada entra
sozinha — inclusive nos meses futuros. Entrar em silêncio seria péssimo, então:

```
⚠️  Entraram 2 contas novas na meta
    SETEMBRO · R$ 850,00
      IPVA parcela 2/3            R$ 600,00
      Dentista                    R$ 250,00
    Sobra do mês: R̶$̶ ̶2̶.̶4̶0̶0̶ → R$ 1.550,00
                  [ Tirar da meta ]  [ Ok, entendi ]
```

Conta que já tem dinheiro movimentado **não sai** por "Tirar da meta" — o aviso diz quantas
ficaram e por quê (RN017).

**Mês no vermelho.** Quando as contas passam da caixinha, o alarme aparece no mês **e** na visão
geral: *"outubro fecharia R$ 600 no vermelho — aumente a caixinha ou tire alguma conta"*.

**Até onde o dinheiro alcança.** Na lista de contas, uma linha de corte por ordem de vencimento:

```
  ○ Seguro           25/07      460
 ━━━━━━━ SEUS R$ 4.000 ACABAM AQUI · SOBRAM R$ 100 ━━━━━━━
  ○ Fatura Nubank    28/07    2.100    ✗ faltam 2.000
```

**O que entra no mês.** Um rodapé discreto com as contas a receber do mês. Não mexe em cálculo
nenhum — é o contexto que responde "dá pra juntar 9.000 esse mês?".

---

## 10c. O relatório

Três coisas, na aba **Relatório**:

**O gráfico.** Duas linhas: a reta do plano e a sua de verdade, dia a dia. Se a sua está acima,
você está adiantado — não precisa ler número nenhum. Abaixo, o veredito em reais.

**A sequência.** 🔥 dias seguidos lançando. **Ontem ainda conta**: a sequência só quebra depois
de um dia inteiro em branco — senão ela morreria toda manhã, antes do primeiro lançamento.

**O simulador.** Arraste e veja: *"se eu juntar R$ 400/dia, o mês fecha com R$ 12.400 e a
campanha com R$ 15.400 no cofre"*. É o mesmo número que o motor calcula pelo caminho normal —
os dois caminhos são testados um contra o outro.

E no fim, **repetir a meta**: uma cópia começando logo depois do fim desta, com os mesmos
valores e categorias. Mês pulado continua pulado.

---

## 11. Uma limitação, dita na cara

**O app não sabe o seu saldo no banco.** O cofre é um **registro do que você declarar**, não um
extrato bancário. Se você juntar R$ 400 e não lançar, ele não fica sabendo.

Não dá para resolver sem integração bancária, que está fora de escopo (`PRD.md`). Dá para
reduzir o esquecimento — e é por isso que existem os **atalhos de valor rápido** (+50 / +100 /
+200 / repetir o último) no lançamento: precisa ser mais fácil lançar do que não lançar.

---

## 12. Onde está cada coisa no código

| Arquivo | Papel |
|---|---|
| `app/js/metas.js` | Motor puro: seleção, sobra, cofre, escada, cascata, dia da virada. Roda no Node. |
| `app/js/render-metas.js` | Telas da meta. Reaproveita as classes `.pp`, já provadas contra valor cortado (D005). |
| `app/js/app.js` | Rotas `#/metas` e `#/metas/<id>`, assistente de criação, lançamento. |
| `app/js/armazenamento.js` | `metas[]` + CRUD + migração de backup antigo. |
| `testes/motor.teste.js` | RN010–RN019, com os quatro cenários deste manual conferidos no centavo. |
| `testes/e2e/test_metas.py` | Telas, lançamento, assistente e as 8 larguras de celular. |
