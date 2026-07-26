"""
Teste E2E do app (Playwright, Chromium headless). Cobre os fluxos completos: criar conta
avulsa/recorrente/parcelada, marcar paga (RN001, sem duplicar), excluir parcela vs. série
(RN005), editar, filtros, tema, config — em mobile e desktop.

Rodar:  python testes/e2e/test_app_financas.py
Requer: pip install playwright && playwright install chromium
"""
import pathlib
from playwright.sync_api import sync_playwright

RAIZ = pathlib.Path(__file__).resolve().parent.parent.parent
url = (RAIZ / "app" / "index.html").as_uri()
CAPTURAS = pathlib.Path(__file__).resolve().parent / "capturas"
CAPTURAS.mkdir(exist_ok=True)

erros = []


def checar(cond, msg):
    if not cond:
        erros.append(msg)


def nova_pagina(browser, viewport):
    console_errs = []
    page = browser.new_page(viewport=viewport)
    page.on("console", lambda m: console_errs.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: console_errs.append("PAGEERROR: " + str(e)))
    page.goto(url)
    page.wait_for_load_state("networkidle")
    return page, console_errs


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # =================================================================
    # MOBILE — fluxo completo
    # =================================================================
    page, console_errs = nova_pagina(browser, {"width": 390, "height": 844})

    checar(page.locator(".tabbar").is_visible(), "MOBILE: tabbar não visível")
    checar(not page.locator(".topo-nav").is_visible(), "MOBILE: nav desktop aparecendo")
    checar(page.locator(".fab").is_visible(), "MOBILE: FAB não visível")

    overflow = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    checar(overflow <= 1, f"MOBILE: overflow horizontal de {overflow}px")

    page.screenshot(path=str(CAPTURAS / "1-dashboard.png"))

    # --- criar conta RECORRENTE a pagar (o exemplo exato do usuário: água R$100, 10/07) ---
    page.click("#btnNovaConta")
    page.wait_for_timeout(200)
    checar(page.locator("#camadaModal").is_visible(), "MOBILE: modal não abriu")
    page.click('#segTipo .seg-opcao[data-valor="pagar"]')
    page.fill("#fDescricao", "Água")
    page.fill("#fValor", "100")
    page.fill("#fVencimento", "2026-07-10")
    page.select_option("#fCategoria", "casa")
    page.click('#segModo .seg-opcao[data-valor="recorrente"]')
    page.click("#salvarModalConta")
    page.wait_for_timeout(300)
    checar(page.locator("#camadaModal").is_hidden(), "MOBILE: modal não fechou após salvar recorrente")

    # --- outra conta recorrente ---
    page.click("#btnNovaConta")
    page.wait_for_timeout(200)
    page.click('#segTipo .seg-opcao[data-valor="pagar"]')
    page.fill("#fDescricao", "Aluguel")
    page.fill("#fValor", "1500")
    page.fill("#fVencimento", "2026-07-05")
    page.select_option("#fCategoria", "casa")
    page.click('#segModo .seg-opcao[data-valor="recorrente"]')
    checar(page.locator("#dicaRecorrente").is_visible(), "MOBILE: dica de recorrência não apareceu")
    page.click("#salvarModalConta")
    page.wait_for_timeout(300)

    # --- criar conta PARCELADA a pagar (TV, 3x) ---
    page.click("#btnNovaConta")
    page.wait_for_timeout(200)
    page.click('#segTipo .seg-opcao[data-valor="pagar"]')
    page.fill("#fDescricao", "TV")
    page.fill("#fValor", "100")
    page.fill("#fVencimento", "2026-07-15")
    page.select_option("#fCategoria", "cartão")
    page.click('#segModo .seg-opcao[data-valor="parcelada"]')
    checar(page.locator("#campoParcelas").is_visible(), "MOBILE: campo de parcelas não apareceu")
    page.fill("#fParcelas", "3")
    page.click("#salvarModalConta")
    page.wait_for_timeout(300)

    # --- criar conta a RECEBER ---
    page.click("#btnNovaConta")
    page.wait_for_timeout(200)
    page.click('#segTipo .seg-opcao[data-valor="receber"]')
    page.fill("#fDescricao", "Freela")
    page.fill("#fValor", "800")
    page.fill("#fVencimento", "2026-07-20")
    page.click("#salvarModalConta")
    page.wait_for_timeout(300)

    # ir para Contas a Pagar e conferir que tudo apareceu
    page.click('.tabbar [data-rota="pagar"]')
    page.wait_for_timeout(300)
    page.select_option("#fSelPeriodo", "mes-especifico")
    page.wait_for_timeout(200)
    page.select_option("#fSelMes", "2026-7")
    page.wait_for_timeout(300)

    texto_pagar = page.locator("#conteudo").inner_text()
    checar("Água" in texto_pagar, "MOBILE: Água não aparece em Contas a Pagar")
    checar("Aluguel" in texto_pagar, "MOBILE: Aluguel não aparece em Contas a Pagar")
    checar("TV" in texto_pagar, "MOBILE: TV não aparece em Contas a Pagar")
    checar("1/3" in texto_pagar, "MOBILE: rótulo de parcela 1/3 não aparece")
    checar("Semana" in texto_pagar, "MOBILE: agrupamento por semana não aparece no filtro de mês")

    page.screenshot(path=str(CAPTURAS / "2-pagar-julho.png"))

    page.select_option("#fSelMes", "2026-8")
    page.wait_for_timeout(300)
    texto_agosto = page.locator("#conteudo").inner_text()
    checar("TV" in texto_agosto and "2/3" in texto_agosto, "MOBILE: parcela 2/3 da TV não aparece em agosto")

    page.select_option("#fSelMes", "2026-7")
    page.wait_for_timeout(300)

    # --- RN001: marcar Água como paga -> deve gerar próxima em agosto ---
    page.locator('.item-conta:has-text("Água") .item-status').click()
    page.wait_for_timeout(400)
    toast_texto = page.locator("#toast").inner_text()
    checar("agosto" in toast_texto.lower() or "10/08" in toast_texto,
           f"MOBILE: toast de recorrência não menciona a próxima data (veio: {toast_texto!r})")

    texto_julho_dps = page.locator("#conteudo").inner_text()
    checar("Água" in texto_julho_dps, "MOBILE: Água sumiu de julho depois de paga (deveria continuar no histórico)")

    page.select_option("#fSelMes", "2026-8")
    page.wait_for_timeout(300)
    texto_agosto_dps = page.locator("#conteudo").inner_text()
    checar("Água" in texto_agosto_dps, "MOBILE: nova ocorrência de Água não apareceu em agosto")

    # RN001: desmarcar e marcar paga de novo não duplica (D002)
    page.select_option("#fSelMes", "2026-7")
    page.wait_for_timeout(300)
    page.locator('.item-conta:has-text("Água") .item-status').click()
    page.wait_for_timeout(300)
    page.locator('.item-conta:has-text("Água") .item-status').click()
    page.wait_for_timeout(300)
    page.select_option("#fSelMes", "2026-8")
    page.wait_for_timeout(300)
    qtd_agua_agosto = page.locator('.item-conta:has-text("Água")').count()
    checar(qtd_agua_agosto == 1, f"MOBILE: RN001 gerou {qtd_agua_agosto} ocorrências em agosto (deveria ser 1)")

    # --- excluir parcela: deve perguntar o escopo (RN005) ---
    page.select_option("#fSelMes", "2026-7")
    page.wait_for_timeout(300)
    page.locator('.item-conta:has-text("TV") .item-acoes [data-acao="excluir"]').first.click()
    page.wait_for_timeout(300)
    checar(page.locator("#camadaConfirm").is_visible(), "MOBILE: modal de confirmação de exclusão de parcela não abriu")
    confirm_texto = page.locator("#confirmTexto").inner_text()
    checar("parcelada" in confirm_texto.lower(), "MOBILE: texto de confirmação não menciona parcelamento")
    page.click('#confirmBotoes button:has-text("série")')
    page.wait_for_timeout(300)
    texto_pos_exclusao = page.locator("#conteudo").inner_text()
    checar("TV" not in texto_pos_exclusao, "MOBILE: TV ainda aparece depois de excluir a série inteira")

    page.select_option("#fSelMes", "2026-9")
    page.wait_for_timeout(300)
    texto_setembro = page.locator("#conteudo").inner_text()
    checar("TV" not in texto_setembro, "MOBILE: parcela 3/3 da TV (setembro) não foi removida junto com a série")

    # --- editar conta ---
    page.select_option("#fSelMes", "2026-7")
    page.wait_for_timeout(300)
    page.locator('.item-conta:has-text("Aluguel") .item-acoes [data-acao="editar"]').first.click()
    page.wait_for_timeout(300)
    checar(page.locator("#camadaModal").is_visible(), "MOBILE: modal de edição não abriu")
    checar(page.locator("#fDescricao").input_value() == "Aluguel", "MOBILE: campo descrição não veio preenchido na edição")
    page.fill("#fValor", "1600")
    page.click("#salvarModalConta")
    page.wait_for_timeout(300)
    texto_editado = page.locator("#conteudo").inner_text()
    checar("1.600,00" in texto_editado, "MOBILE: valor editado (1600) não refletiu na lista")

    # --- excluir conta avulsa simples ---
    page.click('.tabbar [data-rota="receber"]')
    page.wait_for_timeout(300)
    page.select_option("#fSelPeriodo", "mes-especifico")
    page.wait_for_timeout(200)
    page.select_option("#fSelMes", "2026-7")
    page.wait_for_timeout(300)
    page.locator('.item-conta:has-text("Freela") [data-acao="excluir"]').first.click()
    page.wait_for_timeout(300)
    page.click('#confirmBotoes button:has-text("Excluir")')
    page.wait_for_timeout(300)
    texto_pos = page.locator("#conteudo").inner_text()
    checar("Freela" not in texto_pos, "MOBILE: Freela ainda aparece depois de excluída")

    # --- filtro por status ---
    page.click('.tabbar [data-rota="pagar"]')
    page.wait_for_timeout(300)
    page.click('.chip[data-valor="pago"]')
    page.wait_for_timeout(300)
    texto_pagas = page.locator("#conteudo").inner_text()
    checar("Aluguel" not in texto_pagas, "MOBILE: filtro 'Pagas' mostra conta pendente (Aluguel)")

    # --- tema ---
    tema_antes = page.evaluate("document.documentElement.getAttribute('data-theme')")
    page.click("#btnTema")
    page.wait_for_timeout(200)
    tema_depois = page.evaluate("document.documentElement.getAttribute('data-theme')")
    checar(tema_antes != tema_depois, "MOBILE: tema não mudou ao clicar")

    page.screenshot(path=str(CAPTURAS / "3-tema.png"))

    # --- config: nova categoria + backup ---
    page.click('.tabbar [data-rota="config"]')
    page.wait_for_timeout(300)
    page.fill("#fCategoriaConfig", "educação")
    page.click('#formNovaCategoria button[type="submit"]')
    page.wait_for_timeout(300)
    texto_config = page.locator("#conteudo").inner_text()
    checar("educação" in texto_config.lower(), "MOBILE: nova categoria não apareceu na lista")

    with page.expect_download() as info_download:
        page.click("#btnExportar")
    download = info_download.value
    checar(download.suggested_filename.startswith("financas-backup-"), "MOBILE: nome do arquivo de backup inesperado")

    if console_errs:
        erros.append(f"MOBILE: erros de console: {console_errs[:8]}")

    page.close()

    # =================================================================
    # DESKTOP — checagem estrutural + responsividade
    # =================================================================
    page, console_errs_d = nova_pagina(browser, {"width": 1400, "height": 900})
    checar(page.locator(".topo-nav").is_visible(), "DESKTOP: nav desktop não visível")
    checar(not page.locator(".tabbar").is_visible(), "DESKTOP: tabbar mobile aparecendo no desktop")

    overflow_d = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    checar(overflow_d <= 1, f"DESKTOP: overflow horizontal de {overflow_d}px")

    page.click('.topo-nav [data-rota="pagar"]')
    page.wait_for_timeout(300)
    page.click("#btnNovaConta")
    page.wait_for_timeout(200)
    checar(page.locator("#camadaModal").is_visible(), "DESKTOP: modal não abriu")
    page.screenshot(path=str(CAPTURAS / "4-desktop-modal.png"))
    page.keyboard.press("Escape")
    page.wait_for_timeout(200)
    checar(page.locator("#camadaModal").is_hidden(), "DESKTOP: Escape não fechou o modal")

    page.click('.topo-nav [data-rota="dashboard"]')
    page.wait_for_timeout(300)
    page.screenshot(path=str(CAPTURAS / "5-desktop-dashboard.png"))

    if console_errs_d:
        erros.append(f"DESKTOP: erros de console: {console_errs_d[:8]}")

    page.close()
    browser.close()

print("=" * 70)
if erros:
    print(f"FALHAS ({len(erros)}):")
    for e in erros:
        print(" -", e)
    raise SystemExit(1)
else:
    print("TUDO PASSOU — motor + interface, mobile e desktop, 0 erros de console.")
print("=" * 70)
