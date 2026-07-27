"""
Teste de layout: NENHUM valor em dinheiro pode ser cortado, em nenhuma largura de celular.

Regressão de um bug real: com 3 colunas no painel do período, "R$ 3.588,60" precisava de 94px
mas só sobravam 85 em telas de 412px+ (Android grande, iPhone Pro Max). O `overflow: hidden`
escondia o dígito em silêncio — o usuário via um número incompleto sem nenhum aviso.

Usa valores propositalmente ENORMES (milhões) para provar folga muito além do uso real.

Rodar: python testes/e2e/test_sem_corte.py
"""
import pathlib
from playwright.sync_api import sync_playwright

RAIZ = pathlib.Path(__file__).resolve().parent.parent.parent
url = (RAIZ / "app" / "index.html").as_uri()

# larguras reais de celulares em uso, das mais estreitas às mais largas
LARGURAS = [
    (320, "iPhone SE 1ª geração"),
    (360, "Android pequeno / Galaxy S"),
    (375, "iPhone SE / 8"),
    (390, "iPhone 12/13/14"),
    (393, "Pixel 7/8"),
    (412, "Android grande / Pixel XL"),
    (428, "iPhone 14 Pro Max"),
    (430, "iPhone 15 Pro Max"),
]

# valores gigantes de propósito: se aguenta milhão, aguenta a vida real do usuário
SEED = """
localStorage.setItem('financas_v1', JSON.stringify({
  contas: [
    {id:'g1',tipo:'pagar',descricao:'Financiamento',categoria:'casa',valor:1234567.89,vencimento:'2026-07-05',status:'pago',pagoEm:'2026-07-03',recorrente:false,recorrenciaOrigemId:null,parcela:null,criadoEm:'',notas:''},
    {id:'g2',tipo:'pagar',descricao:'Obra',categoria:'casa',valor:987654.32,vencimento:'2026-07-20',status:'pendente',pagoEm:null,recorrente:false,recorrenciaOrigemId:null,parcela:null,criadoEm:'',notas:''},
    {id:'g3',tipo:'receber',descricao:'Venda',categoria:'trabalho',valor:2345678.90,vencimento:'2026-07-10',status:'pendente',pagoEm:null,recorrente:false,recorrenciaOrigemId:null,parcela:null,criadoEm:'',notas:''}
  ],
  categorias: ['casa','trabalho'], config: { tema: 'sistema' }
}));
"""

MEDIR = """() => {
  const problemas = [];
  const alvos = [
    ['.pp-bloco-valor', 'valor do bloco'],
    ['.pp-bloco-rotulo', 'rótulo do bloco'],
    ['.pp-bloco-nota', 'nota do bloco'],
    ['.pp-principal-valor', 'valor principal'],
    ['.conta-valor', 'valor do card'],
    ['.resultado-filtro .num', 'total da lista']
  ];
  for (const [sel, nome] of alvos) {
    document.querySelectorAll(sel).forEach(el => {
      if (el.scrollWidth > el.clientWidth + 1) {
        problemas.push(nome + ' "' + el.innerText.trim() + '" precisa ' +
                       Math.round(el.scrollWidth) + 'px mas cabe ' + Math.round(el.clientWidth) + 'px');
      }
    });
  }
  const doc = document.documentElement;
  const overflowH = doc.scrollWidth - doc.clientWidth;
  return { problemas, overflowH };
}"""

erros = []

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    for largura, aparelho in LARGURAS:
        page = b.new_page(viewport={"width": largura, "height": 844})
        page.goto(url)
        page.evaluate(SEED)
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(400)

        for rota, nome_rota in [("pagar", "Contas a pagar"), ("receber", "Contas a receber")]:
            page.click(f'.tabbar [data-rota="{rota}"]')
            page.wait_for_timeout(400)
            r = page.evaluate(MEDIR)
            for prob in r["problemas"]:
                erros.append(f"{largura}px ({aparelho}) · {nome_rota}: {prob}")
            if r["overflowH"] > 1:
                erros.append(f"{largura}px ({aparelho}) · {nome_rota}: página rola na horizontal ({r['overflowH']}px)")

        # dashboard também
        page.click('.tabbar [data-rota="dashboard"]')
        page.wait_for_timeout(400)
        r = page.evaluate(MEDIR)
        for prob in r["problemas"]:
            erros.append(f"{largura}px ({aparelho}) · Dashboard: {prob}")

        page.close()
    b.close()

print("=" * 70)
if erros:
    print(f"VALORES CORTADOS ({len(erros)}):")
    for e in erros:
        print("  -", e)
    raise SystemExit(1)
else:
    print(f"NENHUM VALOR CORTADO — {len(LARGURAS)} larguras (320px a 430px), com valores na casa do milhão.")
print("=" * 70)
