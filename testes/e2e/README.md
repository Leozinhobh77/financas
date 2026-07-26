# Testes E2E

Playwright, Chromium headless, aponta direto para `app/index.html` via `file://` (sem
servidor — o app não precisa de um).

## Rodar

```bash
pip install playwright
playwright install chromium
python testes/e2e/test_app_financas.py
```

## O que cobre

Criar conta avulsa/recorrente/parcelada · marcar paga (RN001, com checagem de não-duplicar) ·
excluir parcela vs. série inteira (RN005) · editar · filtros de período/status/categoria ·
agrupamento por semana (RN003) · tema claro/escuro · nova categoria · exportar backup ·
responsivo mobile (390×844) e desktop (1400×900). Critério: **zero erros de console**.

Screenshots de cada rodada vão para `capturas/` (não versionado — é saída de teste, não fonte).
