"""
Teste do bloco Backup dos Ajustes: importar (juntar x substituir), pontos de restauração,
apagar tudo com trava, limpar histórico — e o layout em 8 larguras de celular.

Cobre o buraco real que motivou o plano 0006: até então `importarBackup` chamava `salvar()`
direto, apagando tudo em silêncio. Aqui se prova que hoje ele pergunta, que "juntar" nunca
reduz a contagem, e que apagar exige digitar a palavra.

⚠️ O botão "Atualizar" (File System Access API) NÃO é testado aqui: a API não existe em
`file://` nem no Chromium headless. O que se prova é o caminho alternativo — que ele nunca
deixa a tela sem uma forma de exportar.

Rodar: python testes/e2e/test_backup.py
"""
import json
import pathlib
import sys
from playwright.sync_api import sync_playwright

# O console do Windows nasce em cp1252 e engasga no ✓/✗. Sem isto o teste morre no primeiro
# print — falha de terminal, não de aplicação, e das mais confusas de diagnosticar.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

RAIZ = pathlib.Path(__file__).resolve().parent.parent.parent
url = (RAIZ / "app" / "index.html").as_uri()

LARGURAS = [320, 360, 375, 390, 393, 412, 428, 430]

falhas = []
oks = []


def checa(cond, msg):
    (oks if cond else falhas).append(msg)
    print(("  ✓ " if cond else "  ✗ ") + msg)


def secao(t):
    print("\n" + t)


def conta(cid, desc, valor, venc, status="pendente"):
    return {
        "id": cid, "tipo": "pagar", "descricao": desc, "categoria": "casa",
        "valor": valor, "vencimento": venc, "status": status,
        "pagoEm": venc if status == "pago" else None, "recorrente": False,
        "recorrenciaOrigemId": None, "parcela": None, "criadoEm": "", "notas": "",
    }


ESTADO_APP = {
    "contas": [
        conta("c1", "Luz", 100, "2026-07-05"),
        conta("c2", "Água", 80, "2026-07-10"),
        conta("c3", "Antiga paga", 50, "2023-01-10", "pago"),
        conta("c4", "Paga e usada por meta", 200, "2023-02-10", "pago"),
    ],
    "metas": [{
        "id": "m1", "nome": "Campanha", "meses": [],
        "selecao": {"categorias": ["casa"], "incluidas": [], "excluidas": []},
        "movimentos": [{"id": "mv1", "tipo": "baixa", "contaId": "c4", "valor": 200, "data": "2026-07-01"}],
    }],
    "categorias": ["casa", "mercado"],
    "config": {"tema": "sistema", "versaoDados": 5},
}

# arquivo com 1 conta em comum (c1) e 1 nova (c9) — juntar deve virar 5, substituir vira 2
ARQUIVO = {
    "contas": [conta("c1", "Luz do arquivo", 999, "2026-07-05"), conta("c9", "Internet", 120, "2026-08-01")],
    "metas": [], "categorias": ["casa", "pet"], "config": {"tema": "escuro"},
}


def semear(page, estado=ESTADO_APP):
    page.evaluate("d => { localStorage.clear(); localStorage.setItem('financas_v1', JSON.stringify(d)); }", estado)


def ir_ajustes(page):
    page.evaluate("() => { location.hash = '#/config'; }")
    page.wait_for_selector("#cartaoBackup")


def importar(page, dado, esperar=True):
    """Usa o caminho real: entrega o arquivo ao <input type=file>, sem seletor nativo."""
    texto = dado if isinstance(dado, str) else json.dumps(dado)
    page.set_input_files("#fArquivoBackup", files=[{
        "name": "financas.json", "mimeType": "application/json", "buffer": texto.encode("utf-8"),
    }])
    if esperar:
        page.wait_for_selector("#camadaConfirm:not([hidden])")
    else:
        page.wait_for_timeout(250)


def clicar_no_confirm(page, rotulo):
    page.click(f"#confirmBotoes button:text-is('{rotulo}')")


def n_contas(page):
    return page.evaluate("() => JSON.parse(localStorage.getItem('financas_v1')).contas.length")


with sync_playwright() as p:
    navegador = p.chromium.launch(headless=True)
    page = navegador.new_page(viewport={"width": 390, "height": 844})
    erros = []
    page.on("console", lambda m: erros.append(m.text) if m.type == "error" else None)

    page.goto(url)
    page.wait_for_load_state("networkidle")

    # ---------------------------------------------------------------- painel
    secao("Painel de backup")
    semear(page)
    ir_ajustes(page)
    checa(page.locator("#btnExportar").count() == 1, "Sempre existe um botão de exportar cópia")
    checa(page.locator("#btnImportar").count() == 1, "Sempre existe um botão de importar")
    checa(page.locator("#listaPontos").count() == 1, "Existe a área de pontos de restauração")
    checa(page.locator("#btnApagarTudo").count() == 1, "Existe o botão de apagar tudo")
    checa(page.locator("#btnLimparAntigas").count() == 1, "Existe a limpeza de histórico")
    cartao = page.locator("#cartaoBackup").inner_text().lower()
    checa("backup" in cartao or "arquivo" in cartao, f"O cartão diz algo sobre o backup: {cartao[:60]!r}")

    # ---------------------------------------------------------------- importar: juntar
    secao("Importar — juntar")
    semear(page)
    ir_ajustes(page)
    importar(page, ARQUIVO)
    texto = page.locator("#confirmTexto").inner_text()
    checa("4 contas" in texto, f"O diálogo mostra quantas contas você tem: {texto[:80]!r}")
    checa("2 contas" in texto, "O diálogo mostra quantas contas o arquivo tem")
    checa(page.locator("#confirmBotoes button:text-is('Juntar')").count() == 1, "Oferece Juntar")
    checa(page.locator("#confirmBotoes button:text-is('Substituir')").count() == 1, "Oferece Substituir")

    clicar_no_confirm(page, "Juntar")
    page.wait_for_timeout(200)
    checa(n_contas(page) == 5, f"Juntar acrescentou só a conta nova (esperado 5, veio {n_contas(page)})")
    luz = page.evaluate("() => JSON.parse(localStorage.getItem('financas_v1')).contas.find(c=>c.id==='c1').descricao")
    checa(luz == "Luz", f"Juntar NÃO sobrescreveu a conta que já existia (veio {luz!r})")
    tema = page.evaluate("() => JSON.parse(localStorage.getItem('financas_v1')).config.tema")
    checa(tema == "sistema", "O tema do aparelho não veio do arquivo")

    # ---------------------------------------------------------------- importar: substituir
    secao("Importar — substituir")
    semear(page)
    ir_ajustes(page)
    importar(page, ARQUIVO)
    checa("perde 3" in page.locator("#confirmTexto").inner_text(),
          "O diálogo avisa quantas contas se perdem ao substituir")
    clicar_no_confirm(page, "Substituir")
    page.wait_for_timeout(200)
    checa(n_contas(page) == 2, f"Substituir deixou só o arquivo (esperado 2, veio {n_contas(page)})")

    # ---------------------------------------------------------------- ponto de restauração
    secao("Pontos de restauração")
    page.evaluate("() => { location.hash = '#/dashboard'; }")
    ir_ajustes(page)
    pontos = page.locator("#listaPontos [data-ponto]")
    checa(pontos.count() >= 1, f"Importar deixou ponto de restauração ({pontos.count()} ponto(s))")
    pontos.first.click()
    page.wait_for_selector("#camadaConfirm:not([hidden])")
    clicar_no_confirm(page, "Restaurar")
    page.wait_for_timeout(250)
    checa(n_contas(page) == 4, f"Restaurar devolveu as 4 contas de antes da importação (veio {n_contas(page)})")

    # ---------------------------------------------------------------- importar lixo
    secao("Arquivo inválido")
    semear(page)
    ir_ajustes(page)
    importar(page, '{"foo":1}', esperar=False)
    checa(page.locator("#camadaConfirm").is_hidden(), "Arquivo sem contas nem abre o diálogo")
    checa(n_contas(page) == 4, "Arquivo inválido não encostou nos dados")

    # ---------------------------------------------------------------- apagar tudo
    secao("Apagar tudo — trava de digitação")
    page.click("#btnApagarTudo")
    page.wait_for_selector("#camadaConfirm:not([hidden])")
    botao_apagar = page.locator("#confirmBotoes button:text-is('Apagar tudo')")
    checa(botao_apagar.is_disabled(), "O botão nasce desabilitado")
    page.fill("#confirmEntrada", "apagr")
    checa(botao_apagar.is_disabled(), "Palavra errada mantém o botão desabilitado")
    page.fill("#confirmEntrada", "APAGAR")
    checa(not botao_apagar.is_disabled(), "A palavra certa libera o botão")
    botao_apagar.click()
    page.wait_for_timeout(250)
    checa(n_contas(page) == 0, f"Apagou tudo (veio {n_contas(page)})")
    ir_ajustes(page)
    checa(page.locator("#listaPontos [data-ponto]").count() >= 1, "Apagar tudo deixou ponto de restauração")

    # ---------------------------------------------------------------- limpar histórico
    secao("Limpar histórico — protege conta de meta")
    semear(page)
    ir_ajustes(page)
    page.select_option("#selCorteLimpeza", "12")
    page.click("#btnLimparAntigas")
    page.wait_for_selector("#camadaConfirm:not([hidden])")
    t = page.locator("#confirmTexto").inner_text()
    checa("1 conta" in t, f"Só 1 conta é podável — a outra está em uso por meta: {t[:90]!r}")
    checa("meta" in t.lower(), "O diálogo explica por que uma conta ficou de fora")
    clicar_no_confirm(page, "Limpar")
    page.wait_for_timeout(250)
    ids = page.evaluate("() => JSON.parse(localStorage.getItem('financas_v1')).contas.map(c=>c.id)")
    checa("c3" not in ids, "A conta paga antiga saiu")
    checa("c4" in ids, "A conta paga que uma meta abateu FICOU (RN027)")

    # ---------------------------------------------------------------- layout
    secao("Layout — nenhuma tela estica em 8 larguras")
    semear(page)
    for largura in LARGURAS:
        page.set_viewport_size({"width": largura, "height": 844})
        ir_ajustes(page)
        page.wait_for_timeout(120)
        estica = page.evaluate(
            "() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
        checa(not estica, f"{largura}px — a página não estica de lado")
        cortado = page.evaluate("""() => {
          const ruins = [];
          document.querySelectorAll('.bk-cartao strong, .ponto-linha strong, .risco-linha strong')
            .forEach(el => { if (el.scrollWidth > el.clientWidth + 1) ruins.push(el.innerText.trim()); });
          return ruins;
        }""")
        checa(not cortado, f"{largura}px — nenhum título cortado {cortado if cortado else ''}")

    page.set_viewport_size({"width": 390, "height": 844})
    checa(not erros, f"Zero erros de console {erros[:3] if erros else ''}")

    navegador.close()

print("\n" + "=" * 60)
if falhas:
    print(f"FALHAS: {len(falhas)} de {len(falhas) + len(oks)}")
    for f in falhas:
        print("  - " + f)
    raise SystemExit(1)
print(f"TUDO PASSOU — {len(oks)} de {len(oks)} verificações")
print("=" * 60)
