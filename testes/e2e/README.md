# Testes E2E

Playwright, Chromium headless, aponta direto para `app/index.html` via `file://` (sem
servidor — o app não precisa de um).

## Rodar

```bash
pip install playwright
playwright install chromium

python testes/e2e/test_app_financas.py   # fluxos e regras
python testes/e2e/test_sem_corte.py      # layout: nenhum valor cortado
```

## O que cobre

Criar conta avulsa/recorrente/parcelada · marcar paga (RN001, com checagem de não-duplicar) ·
excluir parcela vs. série inteira (RN005) · editar · filtros de período/status/categoria ·
agrupamento por semana (RN003) · tema claro/escuro · nova categoria · exportar backup ·
responsivo mobile (390×844) e desktop (1400×900). Critério: **zero erros de console**.

Screenshots de cada rodada vão para `capturas/` (não versionado — é saída de teste, não fonte).


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
