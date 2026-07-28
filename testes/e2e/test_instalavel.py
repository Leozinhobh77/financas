"""
Teste de instalabilidade (plano 0007): manifesto, service worker e abrir SEM INTERNET.

Por que este teste existe: o usuário tentou instalar o app na tela de início e não conseguiu,
porque faltavam o manifesto e o service worker. Aqui se prova que as peças existem, são
válidas, e que o app realmente abre com a rede desligada — que é a promessa mais fácil de
quebrar sem ninguém perceber (basta um arquivo novo em js/ não entrar na lista do sw.js).

⚠️ Este é o ÚNICO teste do projeto que roda por `http://`, e não por `file://`. Service worker
não existe em `file://` — é justamente por isso que o registro em app.js tem guarda de
protocolo. A última seção volta em `file://` para provar que a guarda funciona.

O que NENHUM teste automatizado consegue provar: se o Chrome do Android vai de fato oferecer
"permitir em todas as visitas" para o arquivo do Drive. Isso é olho no aparelho (Fase 4).

Rodar: python testes/e2e/test_instalavel.py
"""
import functools
import http.server
import json
import pathlib
import socketserver
import sys
import threading
from playwright.sync_api import sync_playwright

# O console do Windows nasce em cp1252 e engasga no ✓/✗. Sem isto o teste morre no primeiro
# print — falha de terminal, não de aplicação, e das mais confusas de diagnosticar.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

RAIZ = pathlib.Path(__file__).resolve().parent.parent.parent

falhas = []
oks = []


def checa(cond, msg):
    (oks if cond else falhas).append(msg)
    print(("  ✓ " if cond else "  ✗ ") + msg)


def secao(t):
    print("\n" + t)


class Silencioso(http.server.SimpleHTTPRequestHandler):
    """O log padrão despeja uma linha por requisição e afoga a saída do teste."""

    def log_message(self, *args):
        pass


handler = functools.partial(Silencioso, directory=str(RAIZ / "app"))
socketserver.TCPServer.allow_reuse_address = True
servidor = socketserver.TCPServer(("127.0.0.1", 0), handler)
porta = servidor.server_address[1]
threading.Thread(target=servidor.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{porta}/"
print(f"Servidor local em {base}")

with sync_playwright() as pw:
    navegador = pw.chromium.launch()
    contexto = navegador.new_context(viewport={"width": 390, "height": 844})
    page = contexto.new_page()

    erros = []
    page.on("console", lambda m: erros.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: erros.append(str(e)))

    # ---------------------------------------------------------------- 1. MANIFESTO
    secao("1. Manifesto")
    page.goto(base + "index.html")
    page.wait_for_load_state("networkidle")

    href = page.get_attribute('link[rel="manifest"]', "href")
    checa(href is not None, f"index.html aponta para um manifesto ({href})")

    resp = page.request.get(base + (href or "manifest.json"))
    checa(resp.status == 200, f"manifesto responde 200 (veio {resp.status})")
    man = json.loads(resp.text())

    checa(bool(man.get("name")), f"tem name ({man.get('name')!r})")
    checa(len(man.get("short_name", "")) <= 12,
          f"short_name curto o bastante para caber sob o ícone ({man.get('short_name')!r})")
    checa(man.get("display") == "standalone",
          f"display=standalone — abre em janela própria (veio {man.get('display')!r})")
    checa(bool(man.get("start_url")), f"tem start_url ({man.get('start_url')!r})")
    checa(bool(man.get("theme_color")) and bool(man.get("background_color")),
          "tem theme_color e background_color")

    tamanhos = {i.get("sizes") for i in man.get("icons", []) if "any" in i.get("purpose", "any")}
    checa("192x192" in tamanhos, "tem ícone 192x192 (exigência do Android)")
    checa("512x512" in tamanhos, "tem ícone 512x512 (exigência do Android)")

    maskaveis = [i for i in man.get("icons", []) if "maskable" in i.get("purpose", "")]
    checa(len(maskaveis) >= 1,
          f"tem ícone maskable — sem ele o Android decapita o desenho no recorte ({len(maskaveis)})")

    # O manifesto pode listar um ícone que não existe: o campo está lá, o arquivo não.
    for icone in man.get("icons", []):
        r = page.request.get(base + icone["src"])
        checa(r.status == 200 and len(r.body()) > 0,
              f"ícone {icone['src']} existe de verdade ({r.status})")

    # ------------------------------------------------------- 2. SERVICE WORKER
    secao("2. Service worker")
    estado = page.evaluate("""async () => {
      const reg = await navigator.serviceWorker.ready;
      return { ativo: !!reg.active, estado: reg.active && reg.active.state, escopo: reg.scope };
    }""")
    checa(estado["ativo"] and estado["estado"] == "activated",
          f"service worker chegou a activated ({estado['estado']})")
    checa(estado["escopo"].startswith(base), f"escopo cobre o app ({estado['escopo']})")
    checa(not erros, f"zero erros de console em http {erros[:3] if erros else ''}")

    # ------------------------------------------------------- 3. SEM INTERNET
    secao("3. Abrir com a rede desligada")
    # Segunda visita com a rede viva: garante que o cache foi populado antes do corte.
    page.reload()
    page.wait_for_load_state("networkidle")

    contexto.set_offline(True)
    erros.clear()
    page.reload()
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(600)

    checa(page.locator(".topo-marca").count() == 1, "offline: a marca do topo renderizou")
    checa(page.locator("#tabbar a, #tabbar button").count() > 0,
          "offline: a navegação inferior renderizou")
    tem_conteudo = page.evaluate("() => document.getElementById('conteudo').innerText.trim().length")
    checa(tem_conteudo > 0, f"offline: o dashboard desenhou conteúdo ({tem_conteudo} caracteres)")

    # A prova mais dura: os módulos de regra de negócio precisam ter vindo do cache.
    modulos = page.evaluate(
        "() => ['Store','Contas','Datas','Analise','Metas','Backup','Arquivo','Icones']"
        ".filter(n => typeof window[n] === 'undefined')"
    )
    checa(not modulos, f"offline: todos os módulos js carregaram {modulos if modulos else ''}")
    checa(not erros, f"offline: zero erros de console {erros[:3] if erros else ''}")

    contexto.set_offline(False)
    contexto.close()

    # ------------------------------------------------------- 4. A GUARDA DO file://
    secao("4. Por file:// continua limpo (a guarda de protocolo)")
    ctx2 = navegador.new_context(viewport={"width": 390, "height": 844})
    p2 = ctx2.new_page()
    erros2 = []
    p2.on("console", lambda m: erros2.append(m.text) if m.type == "error" else None)
    p2.on("pageerror", lambda e: erros2.append(str(e)))
    p2.goto((RAIZ / "app" / "index.html").as_uri())
    p2.wait_for_load_state("networkidle")
    checa(p2.locator(".topo-marca").count() == 1, "file://: o app abre normalmente")
    checa(not erros2,
          f"file://: zero erros — o registro do sw foi pulado, não tentado {erros2[:3] if erros2 else ''}")
    ctx2.close()

    navegador.close()

servidor.shutdown()

print("\n" + "=" * 60)
if falhas:
    print(f"FALHAS: {len(falhas)} de {len(falhas) + len(oks)}")
    for f in falhas:
        print("  - " + f)
    raise SystemExit(1)
print(f"TUDO PASSOU — {len(oks)} de {len(oks)} verificações")
print("=" * 60)
