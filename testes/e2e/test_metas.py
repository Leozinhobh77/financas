"""
E2E das METAS — fase 1: criar campanha, visão geral, escada do cofre, painel do mês e
lançamento de dinheiro.

Critério duro em todas as etapas: ZERO erro de console e NENHUM valor cortado.

Rodar: python testes/e2e/test_metas.py
"""
import json
import pathlib
import sys
from playwright.sync_api import sync_playwright

RAIZ = pathlib.Path(__file__).resolve().parent.parent.parent
URL = (RAIZ / "app" / "index.html").as_uri()
CAPTURAS = pathlib.Path(__file__).resolve().parent / "capturas"
CAPTURAS.mkdir(exist_ok=True)

LARGURAS = [320, 360, 375, 390, 393, 412, 428, 430]


def conta(cid, desc, cat, valor, venc, status="pendente", pago_em=None):
    return {
        "id": cid, "tipo": "pagar", "descricao": desc, "categoria": cat, "valor": valor,
        "vencimento": venc, "status": status, "pagoEm": pago_em, "recorrente": False,
        "recorrenciaOrigemId": None, "parcela": None, "criadoEm": "", "notas": "",
    }


# Julho é o mês corrente do cenário; a campanha vai de julho a outubro.
CONTAS = [
    conta("c1", "Energia", "casa", 340, "2026-07-05", "pago", "2026-07-04"),
    conta("c2", "Água", "casa", 180, "2026-07-10"),
    conta("c3", "Internet", "casa", 130, "2026-07-10"),
    conta("c4", "Celular", "outros", 90, "2026-07-12"),
    conta("c5", "Mercado", "mercado", 900, "2026-07-15"),
    conta("c6", "Aluguel", "casa", 1800, "2026-07-20"),
    conta("c7", "Seguro", "outros", 460, "2026-07-25"),
    conta("c8", "Fatura Nubank", "cartão", 2100, "2026-07-28"),
    conta("c9", "Contas de agosto", "casa", 6000, "2026-08-10"),
    conta("c10", "Contas de setembro", "casa", 6600, "2026-09-10"),
    conta("c11", "Contas de outubro", "casa", 4400, "2026-10-10"),
]

META = {
    "id": "meta-1",
    "nome": "Reserva de emergência",
    "criadoEm": "2026-07-01T10:00:00.000Z",
    "meses": [
        {"ano": 2026, "mes": 7, "alvo": 9000},
        {"ano": 2026, "mes": 8, "alvo": 9000},
        {"ano": 2026, "mes": 9, "alvo": 9000},
        {"ano": 2026, "mes": 10, "alvo": 8000},
    ],
    "selecao": {"categorias": ["casa", "cartão", "mercado", "outros"], "incluidas": [], "excluidas": []},
    "movimentos": [
        {"id": "m1", "tipo": "aporte", "data": "2026-07-01", "valor": 400, "nota": "", "contaId": None, "foto": None, "criadoEm": "2026-07-01T10:00:00.000Z"},
        {"id": "m2", "tipo": "aporte", "data": "2026-07-05", "valor": 400, "nota": "", "contaId": None, "foto": None, "criadoEm": "2026-07-05T10:00:00.000Z"},
        {"id": "m3", "tipo": "baixa", "data": "2026-07-05", "valor": 340, "nota": "", "contaId": "c1",
         "foto": {"descricao": "Energia", "valor": 340, "vencimento": "2026-07-05", "categoria": "casa"},
         "criadoEm": "2026-07-05T11:00:00.000Z"},
        {"id": "m4", "tipo": "aporte", "data": "2026-07-12", "valor": 1200, "nota": "13º", "contaId": None, "foto": None, "criadoEm": "2026-07-12T10:00:00.000Z"},
    ],
    "contasConhecidas": [],
    "config": {"excedente": "cofre"},
}

SEED = "localStorage.setItem('financas_v1', JSON.stringify(%s));" % json.dumps({
    "contas": CONTAS,
    "metas": [META],
    "categorias": ["casa", "cartão", "transporte", "saúde", "lazer", "mercado", "outros"],
    "config": {"tema": "sistema"},
}, ensure_ascii=False)

# Um backup gerado ANTES das metas não tem o campo `metas` — tem que abrir mesmo assim.
SEED_ANTIGO = "localStorage.setItem('financas_v1', JSON.stringify(%s));" % json.dumps({
    "contas": CONTAS[:3],
    "categorias": ["casa"],
    "config": {"tema": "sistema"},
}, ensure_ascii=False)

MEDIR_CORTE = """() => {
  const problemas = [];
  const alvos = ['.pp-bloco-valor', '.pp-bloco-rotulo', '.pp-bloco-nota', '.pp-principal-valor',
                 '.esc-acum', '.esc-delta', '.esc-mes', '.mc-linha .num', '.mt-cofre',
                 '.prev-linha .num', '.barra-valor'];
  for (const sel of alvos) {
    document.querySelectorAll(sel).forEach(el => {
      if (el.scrollWidth > el.clientWidth + 1) {
        problemas.push(sel + ' "' + el.innerText.trim() + '" precisa ' +
          Math.round(el.scrollWidth) + 'px mas cabe ' + Math.round(el.clientWidth) + 'px');
      }
    });
  }
  const doc = document.documentElement;
  if (doc.scrollWidth > doc.clientWidth + 1) {
    problemas.push('a PÁGINA rola na horizontal: ' + doc.scrollWidth + ' > ' + doc.clientWidth);
  }
  return problemas;
}"""

falhas = []
erros_console = []


def checa(nome, condicao, detalhe=""):
    if condicao:
        print(f"  [ok] {nome}")
    else:
        print(f"  [FALHOU] {nome}  {detalhe}")
        falhas.append(nome)


def main():
    with sync_playwright() as p:
        navegador = p.chromium.launch(headless=True)
        pagina = navegador.new_page(viewport={"width": 390, "height": 900})
        pagina.on("console", lambda m: erros_console.append(m.text) if m.type == "error" else None)
        pagina.on("pageerror", lambda e: erros_console.append(str(e)))

        pagina.goto(URL)
        pagina.wait_for_load_state("networkidle")
        pagina.evaluate(SEED)

        # ---------------------------------------------- aba e lista
        print("\n1. Aba Metas e lista de campanhas")
        pagina.goto(URL + "#/metas")
        pagina.reload()
        pagina.wait_for_load_state("networkidle")

        checa("a aba Metas existe na tabbar", pagina.locator(".tabbar [data-rota='metas']").count() == 1)
        checa("a campanha aparece na lista", pagina.locator(".mt").count() == 1)
        texto_card = pagina.locator(".mt").inner_text()
        checa("o card mostra o nome", "Reserva de emergência" in texto_card, texto_card)
        checa("o card mostra o cofre", "cofre" in texto_card.lower(), texto_card)
        pagina.screenshot(path=str(CAPTURAS / "metas-1-lista.png"), full_page=True)

        # ---------------------------------------------- visão geral
        print("\n2. Visão geral: cofre e escada")
        pagina.locator(".mt").click()
        pagina.wait_for_timeout(150)
        # a tela abre no mês corrente; vamos ao "Geral"
        pagina.locator("[data-mes='geral']").click()
        pagina.wait_for_timeout(150)

        geral = pagina.locator(".tela").inner_text().lower()
        checa("mostra o cofre previsto", "cofre previsto" in geral, geral[:200])
        checa("a escada tem um degrau por mês", pagina.locator(".esc").count() == 4)
        checa("o último degrau fecha em 12.000", "12.000" in pagina.locator(".esc").last.inner_text(),
              pagina.locator(".esc").last.inner_text())
        checa("o gráfico do cofre desenhou barras", pagina.locator(".barras .barra").count() == 4)
        pagina.screenshot(path=str(CAPTURAS / "metas-2-geral.png"), full_page=True)

        # ---------------------------------------------- painel do mês
        print("\n3. Painel do mês corrente")
        pagina.locator(".chip--mes").first.click()
        pagina.wait_for_timeout(150)
        # inner_text() devolve o texto RENDERIZADO — os rótulos têm text-transform: uppercase,
        # então a comparação tem de ser sem diferenciar maiúscula de minúscula.
        mes = pagina.locator(".pp--mes").inner_text().lower()
        checa("mostra a sobra do mês", "sobra de julho" in mes, mes[:200])
        checa("mostra a caixinha", "caixinha" in mes, mes[:300])
        checa("mostra quanto juntar hoje", "juntar hoje" in mes or "caixinha batida" in mes, mes[:300])
        checa("mostra a cobertura (em mãos x devo)", pagina.locator(".mes-cobertura").count() == 1)

        # Regressão: dentro de uma meta o "+" flutuante abria "Nova conta" — a ação errada
        # para a tela. Tem que abrir o lançamento de dinheiro, na visão do mês E na Geral.
        for onde in ["mês", "geral"]:
            if onde == "geral":
                pagina.locator("[data-mes='geral']").click()
                pagina.wait_for_timeout(120)
            pagina.locator("#btnNovaConta").click()
            pagina.wait_for_timeout(150)
            checa(f'o "+" lança dinheiro na meta (visão {onde})',
                  pagina.locator("#camadaAporte").is_visible() and not pagina.locator("#camadaModal").is_visible())
            pagina.locator("#cancelarModalAporte").click()
            pagina.wait_for_timeout(100)
        pagina.locator(".chip--mes").first.click()
        pagina.wait_for_timeout(150)
        pagina.screenshot(path=str(CAPTURAS / "metas-3-mes.png"), full_page=True)

        # ---------------------------------------------- lançar dinheiro
        print("\n4. Lançar dinheiro na meta")
        antes = pagina.locator(".mes-cobertura .num").first.inner_text()
        pagina.locator("[data-acao='novo-aporte']").click()
        pagina.wait_for_timeout(120)
        checa("o modal de aporte abriu", pagina.locator("#camadaAporte").is_visible())
        checa("tem atalhos de valor rápido", pagina.locator("#aAtalhos .chip").count() >= 3)

        pagina.locator("#aAtalhos .chip").nth(2).click()   # +200
        valor = pagina.locator("#aValor").input_value()
        checa("o atalho preencheu o valor", valor == "200", f"valor={valor}")
        pagina.locator("#formAporte button[type=submit]").click()
        pagina.wait_for_timeout(250)

        depois = pagina.locator(".mes-cobertura .num").first.inner_text()
        checa("o dinheiro em mãos subiu depois do lançamento", antes != depois, f"{antes} -> {depois}")
        pagina.screenshot(path=str(CAPTURAS / "metas-4-apos-aporte.png"), full_page=True)

        # ---------------------------------------------- criar campanha pelo assistente
        print("\n5. Assistente de criação")
        pagina.goto(URL + "#/metas")
        pagina.reload()
        pagina.wait_for_load_state("networkidle")
        pagina.locator("[data-acao='nova-meta']").click()
        pagina.wait_for_timeout(120)
        checa("o assistente abriu", pagina.locator("#camadaMeta").is_visible())

        pagina.locator("#mNome").fill("Viagem")

        # Regressão: `.campo input { width:100% }` (0,1,1) vencia `.mes-alvo` (0,1,0) e o campo
        # de valor cobria a caixa de marcar — o toque no checkbox era engolido. Se voltar,
        # elementFromPoint no centro do checkbox devolve outra coisa e isto quebra.
        alvo_no_ponto = pagina.evaluate("""() => {
          const chk = document.querySelector('#mMeses input[type=checkbox]');
          const b = chk.getBoundingClientRect();
          const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
          return el === chk ? 'ok' : (el ? el.className || el.tagName : 'nada');
        }""")
        checa("nada cobre a caixa de marcar o mês", alvo_no_ponto == "ok", f"no ponto: {alvo_no_ponto}")

        for i in range(4):
            pagina.locator("#mMeses input[type=checkbox]").nth(i).check()
        pagina.locator("#mTotal").fill("36000")
        pagina.locator("#mDividir").click()
        pagina.wait_for_timeout(120)

        primeiro = pagina.locator("#mMeses .mes-alvo").first.input_value()
        checa("dividir igual distribuiu 9.000 por mês", primeiro == "9000", f"valor={primeiro}")
        previa = pagina.locator("#mPrevia").inner_text()
        checa("a prévia mostra a sobra", "sobra prevista" in previa.lower(), previa)
        pagina.screenshot(path=str(CAPTURAS / "metas-5-assistente.png"), full_page=True)

        pagina.locator("#mCats .chip--cat").first.click()
        pagina.locator("#formMeta button[type=submit]").click()
        pagina.wait_for_timeout(300)
        checa("a nova campanha abriu depois de salvar",
              "Viagem" in pagina.locator(".tela-cabeca--meta").inner_text(),
              pagina.locator(".tela-cabeca--meta").inner_text())

        # ---------------------------------------------- backup antigo
        print("\n6. Backup antigo (sem o campo metas) continua abrindo")
        pagina.evaluate(SEED_ANTIGO)
        pagina.goto(URL + "#/metas")
        pagina.reload()
        pagina.wait_for_load_state("networkidle")
        checa("abre sem quebrar e mostra o estado vazio", pagina.locator(".vazio").count() == 1)

        # ---------------------------------------------- larguras
        print("\n7. Nenhum valor cortado nas 8 larguras")
        pagina.evaluate(SEED)
        for largura in LARGURAS:
            pagina.set_viewport_size({"width": largura, "height": 900})
            for rota, nome in [("#/metas", "lista"), ("#/metas/meta-1", "meta")]:
                pagina.goto(URL + rota)
                pagina.reload()
                pagina.wait_for_load_state("networkidle")
                pagina.wait_for_timeout(80)
                problemas = pagina.evaluate(MEDIR_CORTE)
                checa(f"{largura}px · {nome}", not problemas, "; ".join(problemas))
                if rota.endswith("meta-1"):
                    pagina.locator("[data-mes='geral']").click()
                    pagina.wait_for_timeout(100)
                    problemas = pagina.evaluate(MEDIR_CORTE)
                    checa(f"{largura}px · geral", not problemas, "; ".join(problemas))

        pagina.set_viewport_size({"width": 390, "height": 900})
        pagina.goto(URL + "#/metas/meta-1")
        pagina.reload()
        pagina.wait_for_load_state("networkidle")
        pagina.screenshot(path=str(CAPTURAS / "metas-6-390px.png"), full_page=True)

        # ---------------------------------------------- tema escuro
        print("\n8. Tema escuro")
        pagina.evaluate("document.documentElement.setAttribute('data-theme','dark')")
        pagina.wait_for_timeout(120)
        pagina.screenshot(path=str(CAPTURAS / "metas-7-escuro.png"), full_page=True)
        checa("tema escuro aplicado",
              pagina.evaluate("document.documentElement.getAttribute('data-theme')") == "dark")

        navegador.close()

    print("\n" + "=" * 60)
    checa("zero erros de console", not erros_console, " | ".join(erros_console[:5]))
    if falhas:
        print(f"FALHAS: {len(falhas)}")
        for f in falhas:
            print(f"  - {f}")
        print("=" * 60)
        sys.exit(1)
    print("TUDO PASSOU")
    print("=" * 60)


if __name__ == "__main__":
    main()
