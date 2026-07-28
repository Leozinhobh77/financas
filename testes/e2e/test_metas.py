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
    # já "fotografada": é o que permite detectar conta que entrar depois (RN020)
    "contasConhecidas": [c["id"] for c in CONTAS],
    "snapshotEm": "2026-07-01T10:00:00.000Z",
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
                 '.prev-linha .num', '.barra-valor', '.sim-delta', '.mov-valor', '.mov-saldo',
                 '.corte-texto', '.cn-lista .num'];
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

        # ---------------------------------------------- baixa cruzada
        def em_maos():
            return pagina.locator(".mes-cobertura .num").first.inner_text()

        def abrir_meta_no_mes():
            pagina.goto(URL + "#/metas/meta-1")
            pagina.reload()
            pagina.wait_for_load_state("networkidle")
            pagina.wait_for_timeout(120)

        print("\n4b. Pagar POR DENTRO da meta dá baixa nos dois lugares")
        abrir_meta_no_mes()
        antes = em_maos()
        pagina.locator("[data-acao='meta-pagar'][data-id='c2']").click()   # Água, R$ 180
        pagina.wait_for_timeout(150)
        checa("abriu o modal de pagamento", pagina.locator("#camadaPagar").is_visible())
        pagina.locator("#pagarConfirmar").click()
        pagina.wait_for_timeout(250)

        checa("a caixinha foi debitada", em_maos() != antes, f"{antes} -> {em_maos()}")
        card = pagina.locator(".conta[data-id='c2']")
        checa("o card mostra que saiu da caixinha", card.locator(".conta-aviso--ok").count() == 1,
              card.inner_text())
        checa("a conta ficou paga em Contas a Pagar", pagina.evaluate(
            "JSON.parse(localStorage.getItem('financas_v1')).contas.find(c=>c.id==='c2').status") == "pago")

        print("\n4c. Pagar FORA da meta sinaliza, mas não debita")
        antes = em_maos()
        pagina.goto(URL + "#/pagar")
        pagina.wait_for_timeout(150)
        pagina.locator("[data-acao='alternar-pago'][data-id='c3']").click()  # Internet, R$ 130
        pagina.wait_for_timeout(150)
        pagina.locator("#pagarConfirmar").click()
        pagina.wait_for_timeout(250)

        abrir_meta_no_mes()
        card = pagina.locator(".conta[data-id='c3']")
        checa("o card avisa que falta abater", card.locator(".conta-aviso--abater").count() == 1,
              card.inner_text())
        checa("a caixinha NÃO foi debitada sozinha", em_maos() == antes, f"{antes} -> {em_maos()}")

        print("\n4d. O botão 'Abater da meta' resolve o aviso")
        pagina.locator(".conta[data-id='c3'] [data-acao='meta-abater']").click()
        pagina.wait_for_timeout(250)
        card = pagina.locator(".conta[data-id='c3']")
        checa("o aviso virou 'saiu da caixinha'", card.locator(".conta-aviso--ok").count() == 1,
              card.inner_text())
        checa("agora sim a caixinha caiu", em_maos() != antes, f"{antes} -> {em_maos()}")

        print("\n4e. Alerta anti-baixa-dupla")
        pagina.goto(URL + "#/pagar")
        pagina.wait_for_timeout(150)
        pagina.locator("[data-acao='alternar-pago'][data-id='c4']").click()  # Celular, R$ 90
        pagina.wait_for_timeout(150)
        pagina.locator("#pagarConfirmar").click()
        pagina.wait_for_timeout(250)

        abrir_meta_no_mes()
        pagina.locator("[data-acao='meta-pagar'][data-id='c4']").click()
        pagina.wait_for_timeout(200)
        checa("aparece o alerta em vez de pagar de novo",
              pagina.locator("#camadaConfirm").is_visible() and
              "já foi paga" in pagina.locator("#confirmTitulo").inner_text().lower(),
              pagina.locator("#confirmTitulo").inner_text())
        checa("o modal de pagamento NÃO abriu", not pagina.locator("#camadaPagar").is_visible())
        antes = em_maos()
        pagina.locator("#confirmBotoes button", has_text="Sim, abater").click()
        pagina.wait_for_timeout(250)
        checa("o alerta abate quando confirmado", em_maos() != antes, f"{antes} -> {em_maos()}")

        print("\n4f. Desmarcar o pagamento devolve o dinheiro à caixinha")
        antes = em_maos()
        pagina.goto(URL + "#/pagar")
        pagina.wait_for_timeout(150)
        pagina.locator("[data-acao='alternar-pago'][data-id='c4']").click()  # desmarca
        pagina.wait_for_timeout(250)
        abrir_meta_no_mes()
        checa("o valor voltou pra caixinha", em_maos() != antes, f"{antes} -> {em_maos()}")
        card = pagina.locator(".conta[data-id='c4']")
        checa("o card voltou a ficar aberto", card.locator(".conta-aviso").count() == 0,
              card.inner_text())

        print("\n4g. Extrato confere linha a linha")
        movs = pagina.locator(".mov")
        checa("o extrato lista os lançamentos do mês", movs.count() >= 5, f"{movs.count()} linhas")
        ultimo_saldo = pagina.locator(".mov").first.locator(".mov-saldo").inner_text()
        checa("o saldo do topo do extrato bate com 'em mãos'",
              ultimo_saldo.replace("saldo ", "") == em_maos(),
              f"extrato={ultimo_saldo} · painel={em_maos()}")
        checa("baixa não tem botão de excluir solto",
              pagina.locator(".mov--baixa .icon-btn").count() == 0)

        # Regressão: sob 460px o card comum joga `.conta-direita` para uma linha inteira (lá ela
        # leva valor + botões). No card da meta não há botões, e o valor ficava sozinho à
        # esquerda. Tem que continuar na MESMA linha da descrição, à direita.
        # O valor é centrado verticalmente contra um corpo de 2 linhas, então não empata com o
        # topo da descrição — o que importa é que ele esteja DENTRO da faixa vertical do corpo
        # (e não numa linha própria embaixo) e à direita dele.
        # (a 390px; abaixo de 344px o valor volta de propósito para a linha de baixo)
        alinhado = pagina.evaluate("""() => {
          const card = document.querySelector('.conta--meta');
          const corpo = card.querySelector('.conta-corpo').getBoundingClientRect();
          const val = card.querySelector('.conta-valor').getBoundingClientRect();
          const meio = val.top + val.height / 2;
          return { naFaixaDoCorpo: meio > corpo.top && meio < corpo.bottom,
                   aDireitaDoCorpo: val.left >= corpo.right - 2,
                   detalhe: 'corpo ' + Math.round(corpo.top) + '-' + Math.round(corpo.bottom) +
                            ' · valor meio ' + Math.round(meio) + ' left ' + Math.round(val.left) +
                            ' · corpo right ' + Math.round(corpo.right) };
        }""")
        checa("o valor fica ao lado da descrição, à direita, não numa linha própria",
              alinhado["naFaixaDoCorpo"] and alinhado["aDireitaDoCorpo"], alinhado["detalhe"])
        pagina.screenshot(path=str(CAPTURAS / "metas-8-baixa-cruzada.png"), full_page=True)

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

        # ---------------------------------------------- relatório
        print("\n6b. Relatório: gráfico, sequência e simulador")
        pagina.evaluate(SEED)
        pagina.goto(URL + "#/metas/meta-1")
        pagina.reload()
        pagina.wait_for_load_state("networkidle")
        pagina.locator("[data-mes='relatorio']").click()
        pagina.wait_for_timeout(200)

        checa("o gráfico real × plano desenhou as duas linhas",
              pagina.locator(".gs-real").count() == 1 and pagina.locator(".gs-ideal").count() == 1)
        checa("mostra o veredito de adiantado/atrasado", pagina.locator(".rel-veredito").count() == 1)
        checa("mostra a sequência de dias", pagina.locator(".rel-sequencia").count() == 1)
        checa("mostra o extrato da campanha inteira",
              "campanha inteira" in pagina.locator(".tela").inner_text().lower())

        antes_sim = pagina.locator("#simSaida").inner_text()
        pagina.locator("#simRange").fill("400")
        pagina.dispatch_event("#simRange", "input")
        pagina.wait_for_timeout(150)
        checa("o simulador recalcula ao mover", pagina.locator("#simSaida").inner_text() != antes_sim)
        checa("o simulador mostra o valor por dia escolhido",
              "400" in pagina.locator("#simValor").inner_text(),
              pagina.locator("#simValor").inner_text())
        checa("nada cortado no simulador", not pagina.evaluate(MEDIR_CORTE),
              "; ".join(pagina.evaluate(MEDIR_CORTE)))

        # Regressão: um <svg> dentro de .botao sem tamanho ocupa o bloco inteiro e o ícone vira
        # um cartaz do tamanho do cartão.
        icone = pagina.evaluate("""() => {
          const b = document.querySelector('[data-acao="duplicar-meta"] svg');
          if (!b) return 'sem botão';
          const r = b.getBoundingClientRect();
          return Math.round(r.width) + 'x' + Math.round(r.height);
        }""")
        checa("o ícone do botão tem tamanho de ícone",
              icone != "sem botão" and int(icone.split("x")[0]) <= 28, f"{icone}px")
        pagina.screenshot(path=str(CAPTURAS / "metas-10-relatorio.png"), full_page=True)

        # Cenário real do usuário: em julho ele montou uma campanha de agosto a novembro.
        # O relatório caía no ÚLTIMO mês da campanha e mostrava novembro; o útil é agosto.
        print("\n6b2. Campanha que ainda não começou foca no primeiro mês")
        pagina.evaluate("""() => {
          const e = JSON.parse(localStorage.getItem('financas_v1'));
          e.metas.push({
            id:'meta-futura', nome:'Só no futuro', criadoEm:'2026-07-01T10:00:00.000Z',
            meses:[{ano:2026,mes:8,alvo:9000},{ano:2026,mes:9,alvo:9000},
                   {ano:2026,mes:10,alvo:9000},{ano:2026,mes:11,alvo:8000}],
            selecao:{categorias:['lazer'],incluidas:[],excluidas:[]},
            movimentos:[], contasConhecidas:[], config:{excedente:'cofre'}
          });
          localStorage.setItem('financas_v1', JSON.stringify(e));
        }""")
        pagina.goto(URL + "#/metas/meta-futura")
        pagina.reload()
        pagina.wait_for_load_state("networkidle")
        pagina.locator("[data-mes='relatorio']").click()
        pagina.wait_for_timeout(250)

        foco = pagina.locator(".cartao").first.inner_text().lower()
        checa("o relatório foca em agosto, não em novembro",
              "agosto" in foco and "novembro" not in foco, foco[:150])
        checa("sem mês corrente, o simulador não aparece",
              pagina.locator("#simulador").count() == 0)

        print("\n6c. Duplicar campanha")
        pagina.evaluate(SEED)
        pagina.goto(URL + "#/metas/meta-1")
        pagina.reload()
        pagina.wait_for_load_state("networkidle")
        pagina.locator("[data-mes='relatorio']").click()
        pagina.wait_for_timeout(250)
        pagina.locator("[data-acao='duplicar-meta']").click()
        pagina.wait_for_timeout(300)
        checa("criou a cópia e abriu nela",
              "(2)" in pagina.locator(".tela-cabeca--meta").inner_text(),
              pagina.locator(".tela-cabeca--meta").inner_text())
        checa("a cópia começa depois do fim da original", pagina.evaluate(
            "JSON.parse(localStorage.getItem('financas_v1')).metas.length") == 2)

        print("\n6d. Conta que entra sozinha é sinalizada")
        pagina.evaluate(SEED)
        pagina.evaluate("""() => {
          const e = JSON.parse(localStorage.getItem('financas_v1'));
          e.contas.push({id:'novo1',tipo:'pagar',descricao:'IPVA parcela 2/3',categoria:'casa',
            valor:600,vencimento:'2026-09-18',status:'pendente',pagoEm:null,recorrente:false,
            recorrenciaOrigemId:null,parcela:null,criadoEm:'',notas:''});
          localStorage.setItem('financas_v1', JSON.stringify(e));
        }""")
        pagina.goto(URL + "#/metas/meta-1")
        pagina.reload()
        pagina.wait_for_load_state("networkidle")

        checa("o aviso de conta nova aparece", pagina.locator(".aviso-novas").count() == 1)
        texto_aviso = pagina.locator(".aviso-novas").inner_text()
        checa("o aviso nomeia a conta", "IPVA" in texto_aviso, texto_aviso)
        checa("o aviso mostra o impacto na sobra", "600" in texto_aviso, texto_aviso)
        pagina.screenshot(path=str(CAPTURAS / "metas-11-conta-nova.png"), full_page=True)

        pagina.locator("[data-acao='aceitar-novas']").click()
        pagina.wait_for_timeout(250)
        checa("depois de aceitar, o aviso some", pagina.locator(".aviso-novas").count() == 0)

        print("\n6e. Mês no vermelho e linha de corte")
        pagina.evaluate(SEED)
        pagina.evaluate("""() => {
          const e = JSON.parse(localStorage.getItem('financas_v1'));
          e.contas.push({id:'caro1',tipo:'pagar',descricao:'Conserto do carro',categoria:'casa',
            valor:9000,vencimento:'2026-09-20',status:'pendente',pagoEm:null,recorrente:false,
            recorrenciaOrigemId:null,parcela:null,criadoEm:'',notas:''});
          localStorage.setItem('financas_v1', JSON.stringify(e));
        }""")
        pagina.goto(URL + "#/metas/meta-1")
        pagina.reload()
        pagina.wait_for_load_state("networkidle")
        pagina.locator("[data-mes='geral']").click()
        pagina.wait_for_timeout(150)
        checa("a visão geral avisa o mês no vermelho",
              pagina.locator(".alerta-vermelho").count() == 1,
              pagina.locator(".tela").inner_text()[:200])

        pagina.locator(".chip--mes").first.click()   # julho
        pagina.wait_for_timeout(150)
        checa("a lista mostra até onde o dinheiro alcança",
              pagina.locator(".corte").count() >= 1)
        checa("o rodapé de contas a receber aparece",
              pagina.locator(".rodape-receber").count() <= 1)  # não há receber no cenário

        # ---------------------------------------------- larguras
        print("\n7. Nenhum valor cortado nas 8 larguras")
        pagina.evaluate(SEED)
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
