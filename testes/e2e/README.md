# Testes E2E

Playwright, Chromium headless, aponta direto para `app/index.html` via `file://` (sem
servidor — o app não precisa de um).

## Rodar

```bash
pip install playwright
playwright install chromium

python testes/e2e/test_app_financas.py   # fluxos e regras
python testes/e2e/test_metas.py          # metas: campanha, cofre, lançamento
python testes/e2e/test_sem_corte.py      # layout: nenhum valor cortado
```

## O que cobre

Criar conta avulsa/recorrente/parcelada · marcar paga (RN001, com checagem de não-duplicar) ·
excluir parcela vs. série inteira (RN005) · editar · filtros de período/status/categoria ·
agrupamento por semana (RN003) · tema claro/escuro · nova categoria · exportar backup ·
responsivo mobile (390×844) e desktop (1400×900). Critério: **zero erros de console**.

Screenshots de cada rodada vão para `capturas/` (não versionado — é saída de teste, não fonte).


## `test_metas.py` — por que existe

Cobre o módulo de Metas de ponta a ponta: aba na tabbar, lista de campanhas, visão geral com a
**escada do cofre**, painel do mês, lançamento de dinheiro com atalhos rápidos, assistente de
criação com o divisor automático, e **backup antigo (sem o campo `metas`) abrindo sem quebrar**.

Guarda três regressões que **os testes não teriam pegado sozinhos** — nasceram de olhar a tela:

1. **`elementFromPoint` na caixa de marcar o mês.** `.campo input { width:100% }` (0,1,1) vencia
   `.mes-alvo` (0,1,0), e o campo de valor cobria o checkbox: o toque era engolido. O teste
   agora exige que o elemento no centro do checkbox **seja** o checkbox.
2. **O "+" flutuante dentro de uma meta.** Abria "Nova conta" — a ação errada para a tela. O
   teste exige que abra o lançamento de dinheiro, tanto na visão do mês quanto na Geral.
3. **Nenhum valor cortado** nas mesmas 8 larguras do `test_sem_corte.py`, agora também na lista
   de metas, no painel do mês e na visão geral.

## `test_sem_corte.py` — por que existe

Mede, em **8 larguras reais de celular (320px a 430px)**, se algum valor em dinheiro está sendo
cortado (`scrollWidth > clientWidth`) ou se a página rola na horizontal.

Nasceu de um bug real: o painel do período usava 3 colunas, e em telas de **412px+** (Android
grande, iPhone Pro Max) sobravam 85px para um número que precisa de 94px. O `overflow: hidden`
escondia o dígito **em silêncio** — nenhum erro, nenhum aviso, só um número errado na tela.
Ironicamente, celulares menores funcionavam, porque caíam num breakpoint de 2 colunas.

Usa valores na casa do **milhão** de propósito: se aguenta `R$ 1.234.567,89` a 320px, aguenta
qualquer coisa que o usuário lance de verdade. É esse teste que define o piso da fonte fluida
em `.pp-bloco-valor`.
