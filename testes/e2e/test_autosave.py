"""
Teste da gravação automática no arquivo vinculado (plano 0008).

O que se prova aqui: que o app grava sozinho depois de uma alteração, que ele NÃO fica gravando
a cada tecla (debounce), que ele grava na hora quando o usuário sai do app, e — o mais
importante — que ele **nunca mente** sobre o estado: sem permissão, mostra pendente em vez de
fingir que salvou.

⚠️ A File System Access API real não existe em `file://` nem no Chromium headless (mesma
limitação já documentada em `test_backup.py`). Por isso `window.Arquivo` é substituído por um
dublê antes do app iniciar — o que se testa é a LÓGICA do auto-save (quando grava, quantas
vezes, o que mostra), não a API do navegador, que é da plataforma e não nossa.

⚠️ A regra mais importante deste plano é negativa e por isso fácil de quebrar sem ninguém ver:
o auto-save **nunca** pode chamar `requestPermission` (só funciona dentro de um clique real).
O dublê registra qualquer chamada dessas, e o teste falha se acontecer.

Rodar: python testes/e2e/test_autosave.py
"""
import pathlib
import sys
from playwright.sync_api import sync_playwright

# O console do Windows nasce em cp1252 e engasga no ✓/✗. Sem isto o teste morre no primeiro
# print — falha de terminal, não de aplicação, e das mais confusas de diagnosticar.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

RAIZ = pathlib.Path(__file__).resolve().parent.parent.parent
url = (RAIZ / "app" / "index.html").as_uri()

falhas = []
oks = []


def checa(cond, msg):
    (oks if cond else falhas).append(msg)
    print(("  ✓ " if cond else "  ✗ ") + msg)


def secao(t):
    print("\n" + t)


# O dublê. `permitido` controla se a permissão está de pé; `gravacoes` conta o que foi escrito;
# `pedidosDePermissao` é a armadilha — tem que ficar sempre em zero durante o auto-save.
#
# ⚠️ Instalado DEPOIS do `goto`, nunca por `add_init_script`: `arquivo.js` faz
# `global.Arquivo = Arquivo` ao carregar e apagaria o dublê. Como o app lê `Arquivo` no momento
# de usar (e não guarda referência no boot), trocar depois funciona.
DUBLE = """
(() => {
  window.__espiao = { gravacoes: [], pedidosDePermissao: 0, permitido: true, temVinculo: true };
  window.Arquivo = {
    suportado: () => true,
    escolher: () => Promise.resolve({ name: 'financas.json' }),
    vinculado: () => Promise.resolve(
      window.__espiao.temVinculo ? { name: 'financas.json' } : null
    ),
    permissaoConcedida: () => Promise.resolve(window.__espiao.permitido),
    atualizar: () => {
      // Este é o caminho do CLIQUE: aqui pedir permissão é legítimo.
      window.__espiao.pedidosDePermissao++;
      window.__espiao.permitido = true;
      window.__espiao.gravacoes.push({ auto: false, em: Date.now() });
      return Promise.resolve('financas.json');
    },
    atualizarSePuder: () => {
      if (!window.__espiao.temVinculo || !window.__espiao.permitido) return Promise.resolve(null);
      window.__espiao.gravacoes.push({ auto: true, em: Date.now() });
      return Promise.resolve('financas.json');
    },
    esquecer: () => Promise.resolve()
  };
})();
"""

with sync_playwright() as pw:
    navegador = pw.chromium.launch()
    contexto = navegador.new_context(viewport={"width": 390, "height": 844})
    page = contexto.new_page()

    erros = []
    page.on("console", lambda m: erros.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: erros.append(str(e)))

    page.goto(url)
    page.wait_for_load_state("networkidle")
    page.evaluate(DUBLE)

    def nova_conta(desc, valor="10"):
        """Cria uma conta pelo fluxo real da interface (não por atalho no Store)."""
        page.click("#btnNovaConta")
        page.fill("#fDescricao", desc)
        page.fill("#fValor", valor)
        page.fill("#fVencimento", "2026-08-10")
        page.click("#formConta button[type=submit]")
        page.wait_for_timeout(150)

    # ------------------------------------------------- 1. GRAVA SOZINHO
    secao("1. Grava sozinho depois de uma alteração")
    page.evaluate("window.__espiao.gravacoes = []")
    nova_conta("Água")

    logo_depois = page.evaluate("window.__espiao.gravacoes.length")
    checa(logo_depois == 0, f"não gravou instantaneamente — o debounce está segurando ({logo_depois})")

    page.wait_for_timeout(2600)
    depois = page.evaluate("window.__espiao.gravacoes.length")
    checa(depois == 1, f"gravou sozinho depois de ~2s, exatamente uma vez ({depois})")
    checa(page.evaluate("window.__espiao.gravacoes[0].auto") is True,
          "a gravação foi pelo caminho automático (não simulou um clique)")
    checa(page.evaluate("window.__espiao.pedidosDePermissao") == 0,
          "o auto-save NÃO pediu permissão — regra central do plano 0008")

    # ------------------------------------------------- 2. DEBOUNCE JUNTA
    secao("2. Várias alterações seguidas viram uma gravação só")
    # Direto pelo Store, e não pela interface: preencher 3 formulários leva quase 2s por conta,
    # o que estouraria o próprio prazo do debounce e testaria a lentidão do Playwright em vez
    # do código. O que se quer provar aqui é "N alterações rápidas = 1 gravação".
    page.evaluate("""() => {
      window.__espiao.gravacoes = [];
      ['Luz', 'Gás', 'Internet'].forEach((d, i) => Store.adicionarConta({
        id: 'deb' + i, tipo: 'pagar', descricao: d, categoria: 'casa',
        valor: 10, vencimento: '2026-08-10', status: 'pendente'
      }));
    }""")
    page.wait_for_timeout(2600)

    n = page.evaluate("window.__espiao.gravacoes.length")
    checa(n == 1, f"3 alterações seguidas = 1 gravação, não 3 ({n})")

    # ------------------------------------------------- 3. SAIR DO APP GRAVA NA HORA
    secao("3. Sair do app grava na hora (não espera o debounce)")
    page.evaluate("window.__espiao.gravacoes = []")
    nova_conta("Aluguel")
    # Sem esperar os 2s: simula o app indo para segundo plano.
    page.evaluate("""() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    }""")
    page.wait_for_timeout(300)

    n = page.evaluate("window.__espiao.gravacoes.length")
    checa(n >= 1, f"gravou ao sair, sem esperar os 2s ({n})")

    page.evaluate("""() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    }""")
    page.wait_for_timeout(200)

    # ------------------------------------------------- 4. SEM PERMISSÃO: NÃO MENTE
    secao("4. Sem permissão, mostra pendente — nunca finge que salvou")
    page.evaluate("window.__espiao.permitido = false; window.__espiao.gravacoes = []")
    nova_conta("Telefone")
    page.wait_for_timeout(2600)

    n = page.evaluate("window.__espiao.gravacoes.length")
    checa(n == 0, f"não gravou nada, porque não podia ({n})")
    checa(page.evaluate("window.__espiao.pedidosDePermissao") == 0,
          "e mesmo sem permissão, continuou não pedindo — só o clique pede")

    page.click("#btnConfig")
    page.wait_for_timeout(400)
    checa(page.locator(".bk-sinal--pendente").count() == 1,
          "o cartão mostra o aviso laranja de pendente")
    texto = page.locator(".bk-sinal--pendente").inner_text()
    checa("reconectar" in texto.lower(), f"o aviso diz o que fazer, não só a cor ({texto!r})")
    checa(page.locator(".bk-sinal--ok").count() == 0, "e NÃO mostra 'sincronizado' ao mesmo tempo")

    # ------------------------------------------------- 5. O TOQUE RESOLVE
    secao("5. Tocar no aviso reconecta e volta ao verde")
    page.click(".bk-sinal--pendente")
    page.wait_for_timeout(500)
    checa(page.evaluate("window.__espiao.pedidosDePermissao") == 1,
          "o clique do usuário SIM pede permissão (é gesto real)")
    checa(page.locator(".bk-sinal--ok").count() == 1, "voltou para o verde de sincronizado")

    # ------------------------------------------------- 6. SEM VÍNCULO NÃO QUEBRA
    secao("6. Sem arquivo vinculado, nada quebra")
    page.evaluate("window.__espiao.temVinculo = false; window.__espiao.gravacoes = []")
    # Sair e voltar de verdade: clicar em Ajustes estando JÁ em Ajustes não muda o hash, então
    # a tela não redesenha e o cartão continuaria mostrando o estado anterior.
    page.evaluate("location.hash = '#/dashboard'")
    page.wait_for_timeout(200)
    page.click("#btnConfig")
    page.wait_for_timeout(400)
    checa(page.locator("#btnVincular").count() == 1, "volta a oferecer 'Escolher arquivo'")

    nova_conta("Mercado")
    page.wait_for_timeout(2600)
    checa(page.evaluate("window.__espiao.gravacoes.length") == 0,
          "sem vínculo, o auto-save simplesmente não faz nada")

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
