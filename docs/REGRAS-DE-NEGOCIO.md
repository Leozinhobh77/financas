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
| RN016 — Baixa cruzada: pagar a conta ≠ debitar a caixinha | `testes/motor.teste.js` · `RN016-*` + `test_metas.py` (4b–4e) |
| RN017 — Dinheiro movimentado não sai por mudança de filtro | `testes/motor.teste.js` · casos `RN017-*` |
| RN018 — Desfazer o pagamento devolve o dinheiro à caixinha | `testes/motor.teste.js` · `RN018-*` + `test_metas.py` (4f) |
| RN019 — Movimento guarda fotografia da conta | `testes/motor.teste.js` · casos `RN019-*` |
| RN020 — Conta que entra sozinha na meta é sinalizada | `testes/motor.teste.js` · `RN020-*` + `test_metas.py` (6d) |
| RN021 — Mês cujas contas passam da caixinha é alertado | `testes/motor.teste.js` · `RN021-*` + `test_metas.py` (6e) |
| RN022 — Até onde o dinheiro em mãos alcança | `testes/motor.teste.js` · casos `RN022-*` |
| RN023 — Relatório: série real × plano, sequência e simulador | `testes/motor.teste.js` · `RN023-*` + `test_metas.py` (6b) |
| RN024 — Duplicar campanha desloca os meses mantendo os buracos | `testes/motor.teste.js` · `RN024-*` |

Meta: 100%. `/harness doctor` reprova regra sem teste em projeto T2+.

> As regras de Meta (RN010+) têm o **manual em linguagem comum** em `docs/METAS.md`, com os
> exemplos que o usuário deu. Aqui fica só a regra formal e o teste que a prova.

---

---

## Onde está o texto de cada regra

O índice acima é a fonte única da **cobertura**. O texto de cada regra — enunciado, exemplos com
números e procedência — mora em dois arquivos, separados por assunto:

| Arquivo | Regras | Leia antes de mexer em |
|---|---|---|
| [`regras/contas.md`](regras/contas.md) | **RN001–RN009** | recorrência, parcelamento, datas, semanas, filtros |
| [`regras/metas.md`](regras/metas.md) | **RN010–RN024** | caixinha, sobra, cofre, baixa cruzada, relatório |

**Por que separado:** quem vai mexer em recorrência não precisa das 15 regras de meta, e
vice-versa. Junto num arquivo só eram 587 linhas, e ~290 delas eram ruído em qualquer tarefa
concreta. Ver `DECISOES.md` D008.

**Regra nova entra assim:** o texto vai no arquivo do assunto, e **a linha do índice acima é
obrigatória** — é ela que o `/harness doctor` usa para cobrar teste.
