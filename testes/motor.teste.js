/**
 * Testes do motor (datas.js + contas.js) — Node puro, sem navegador. Funções puras, sem
 * efeito colateral, então dá para varrer exaustivamente sem custo.
 *
 * Rodar: node testes/motor.teste.js
 */
'use strict';
var assert = require('assert');
var Datas = require('../app/js/datas.js');
var Contas = require('../app/js/contas.js');
var Filtros = require('../app/js/filtros.js');
var Analise = require('../app/js/analise.js');
var Categorias = require('../app/js/categorias.js');

var total = 0, falhas = [];

function teste(nome, fn) {
  total++;
  try {
    fn();
    process.stdout.write('  ✓ ' + nome + '\n');
  } catch (e) {
    falhas.push({ nome: nome, erro: e });
    process.stdout.write('  ✗ ' + nome + '  ->  ' + e.message + '\n');
  }
}

function secao(titulo) {
  process.stdout.write('\n' + titulo + '\n');
}

// ============================================================
secao('RN003 — semanas do mês (segunda a domingo, numerada por mês)');
// ============================================================

teste('RN003-1: mês cujo dia 1 cai numa quarta -> semana 1 = quarta a domingo (5 dias)', function () {
  // julho/2026: dia 1 é quarta-feira
  var semanas = Datas.semanasDoMes(2026, 7);
  assert.strictEqual(new Date(2026, 6, 1).getDay(), 3, 'pré-condição: 01/07/2026 é quarta-feira');
  assert.strictEqual(semanas[0].numero, 1);
  assert.strictEqual(semanas[0].inicio, '2026-07-01');
  assert.strictEqual(semanas[0].fim, '2026-07-05');
});

teste('RN003-2: mês de 30 dias terminando numa quinta -> última semana = segunda a quinta (4 dias)', function () {
  // abril/2026: dia 30 é quinta-feira (dia 1 é quarta)
  assert.strictEqual(new Date(2026, 3, 30).getDay(), 4, 'pré-condição: 30/04/2026 é quinta-feira');
  var semanas = Datas.semanasDoMes(2026, 4);
  var ultima = semanas[semanas.length - 1];
  assert.strictEqual(ultima.inicio, '2026-04-27'); // segunda
  assert.strictEqual(ultima.fim, '2026-04-30');    // quinta
  assert.strictEqual(new Date(2026, 3, 27).getDay(), 1, 'dia 27 deve ser segunda');
});

teste('RN003-3: mês cujo dia 1 é segunda-feira -> semana 1 já é cheia (7 dias)', function () {
  // junho/2026: dia 1 é segunda-feira
  assert.strictEqual(new Date(2026, 5, 1).getDay(), 1, 'pré-condição: 01/06/2026 é segunda-feira');
  var semanas = Datas.semanasDoMes(2026, 6);
  assert.strictEqual(semanas[0].inicio, '2026-06-01');
  assert.strictEqual(semanas[0].fim, '2026-06-07');
});

teste('RN003-4: mês cujo dia 1 é domingo -> semana 1 tem só 1 dia', function () {
  // março/2026: dia 1 é domingo
  assert.strictEqual(new Date(2026, 2, 1).getDay(), 0, 'pré-condição: 01/03/2026 é domingo');
  var semanas = Datas.semanasDoMes(2026, 3);
  assert.strictEqual(semanas[0].inicio, '2026-03-01');
  assert.strictEqual(semanas[0].fim, '2026-03-01');
  assert.strictEqual(semanas[1].inicio, '2026-03-02'); // segunda seguinte
});

teste('RN003-5: nenhuma semana cruza o limite do mês, nenhum dia sobra ou repete', function () {
  for (var ano = 2024; ano <= 2028; ano++) {
    for (var mes = 1; mes <= 12; mes++) {
      var semanas = Datas.semanasDoMes(ano, mes);
      var totalDias = Datas.diasDoMes(ano, mes);
      var diaEsperado = 1;
      for (var i = 0; i < semanas.length; i++) {
        var s = semanas[i];
        assert.strictEqual(s.inicio, Datas.formatarISO(ano, mes, diaEsperado),
          ano + '-' + mes + ' semana ' + s.numero + ' deveria começar em ' + diaEsperado);
        var diaInicio = Datas.parseISO(s.inicio).dia;
        var diaFim = Datas.parseISO(s.fim).dia;
        // toda semana (exceto a 1ª, que pode começar em qualquer dia) começa numa segunda
        if (i > 0) assert.strictEqual(new Date(ano, mes - 1, diaInicio).getDay(), 1);
        // toda semana (exceto a última) termina num domingo
        if (i < semanas.length - 1) assert.strictEqual(new Date(ano, mes - 1, diaFim).getDay(), 0);
        diaEsperado = diaFim + 1;
      }
      assert.strictEqual(diaEsperado, totalDias + 1, ano + '-' + mes + ': última semana deve terminar no último dia do mês');
    }
  }
});

teste('RN003-6: semanaDe() acha a semana certa para uma data qualquer', function () {
  var r = Datas.semanaDe('2026-07-15'); // julho/2026, dia 15
  assert.strictEqual(r.mes, 7);
  assert.ok(Datas.estaEntre('2026-07-15', r.inicio, r.fim));
});

// ============================================================
secao('RN001 — recorrência só avança quando marcada paga');
// ============================================================

teste('RN001-1: exemplo do usuário — água R$100, vence 10/07, paga em 10/07 -> próxima 10/08', function () {
  var agua = Contas.novaConta({
    tipo: 'pagar', descricao: 'Água', categoria: 'casa', valor: 100,
    vencimento: '2026-07-10', recorrente: true
  });
  agua.status = 'pago';
  agua.pagoEm = '2026-07-10';

  var proxima = Contas.gerarProximaRecorrencia(agua);
  assert.strictEqual(proxima.descricao, 'Água');
  assert.strictEqual(proxima.valor, 100);
  assert.strictEqual(proxima.vencimento, '2026-08-10');
  assert.strictEqual(proxima.status, 'pendente');
  assert.strictEqual(proxima.recorrente, true);
  assert.strictEqual(proxima.recorrenciaOrigemId, agua.id);
});

teste('RN001-2: vencimento dia 31 -> mês seguinte sem dia 31 ajusta pro último dia', function () {
  var conta = Contas.novaConta({
    tipo: 'pagar', descricao: 'Assinatura', valor: 50, vencimento: '2026-01-31', recorrente: true
  });
  conta.status = 'pago';
  var proxima = Contas.gerarProximaRecorrencia(conta);
  assert.strictEqual(proxima.vencimento, '2026-02-28'); // 2026 não é bissexto
});

teste('RN001-3: vencimento dia 31 em ano bissexto ajusta pro dia 29', function () {
  var conta = Contas.novaConta({
    tipo: 'pagar', descricao: 'Assinatura', valor: 50, vencimento: '2028-01-31', recorrente: true
  });
  var proxima = Contas.gerarProximaRecorrencia(conta);
  assert.strictEqual(proxima.vencimento, '2028-02-29'); // 2028 é bissexto
});

teste('RN001-4: conta NÃO recorrente não gera próxima, mesmo paga', function () {
  var conta = Contas.novaConta({ tipo: 'pagar', descricao: 'Mercado', valor: 200, vencimento: '2026-07-05' });
  conta.status = 'pago';
  var proxima = Contas.gerarProximaRecorrencia(conta);
  assert.strictEqual(proxima, null);
});

teste('RN001-5: gerarProximaRecorrencia é chamado apenas no fluxo de pagamento — não existe geração por tempo passando (verificação estrutural: a função não olha para "hoje")', function () {
  var fonte = Contas.gerarProximaRecorrencia.toString();
  assert.ok(fonte.indexOf('Datas.hoje') === -1, 'a função de recorrência não deve depender da data de hoje');
});

// ============================================================
secao('RN002 — parcelamento gera a série inteira de uma vez');
// ============================================================

teste('RN002-1: exemplo do usuário — TV 3x de R$100 a partir de 15/07', function () {
  var parcelas = Contas.gerarParcelas({
    tipo: 'pagar', descricao: 'TV', categoria: 'cartão', valor: 100, vencimento: '2026-07-15'
  }, 3);

  assert.strictEqual(parcelas.length, 3);
  assert.strictEqual(parcelas[0].vencimento, '2026-07-15');
  assert.strictEqual(parcelas[1].vencimento, '2026-08-15');
  assert.strictEqual(parcelas[2].vencimento, '2026-09-15');
  parcelas.forEach(function (p, i) {
    assert.strictEqual(p.valor, 100);
    assert.strictEqual(p.status, 'pendente');
    assert.strictEqual(p.parcela.atual, i + 1);
    assert.strictEqual(p.parcela.total, 3);
  });
  // mesmo grupoId em todas (para excluir a série inteira depois — RN005)
  var grupo = parcelas[0].parcela.grupoId;
  parcelas.forEach(function (p) { assert.strictEqual(p.parcela.grupoId, grupo); });
});

teste('RN002-2: compra à vista no cartão = parcelamento 1x, mesmo motor', function () {
  var parcelas = Contas.gerarParcelas({ tipo: 'pagar', descricao: 'Mercado cartão', valor: 80, vencimento: '2026-07-20' }, 1);
  assert.strictEqual(parcelas.length, 1);
  assert.strictEqual(parcelas[0].parcela.atual, 1);
  assert.strictEqual(parcelas[0].parcela.total, 1);
});

teste('RN002-3: parcelas atravessando virada de ano', function () {
  var parcelas = Contas.gerarParcelas({ tipo: 'pagar', descricao: 'Notebook', valor: 300, vencimento: '2026-11-20' }, 4);
  assert.strictEqual(parcelas[0].vencimento, '2026-11-20');
  assert.strictEqual(parcelas[1].vencimento, '2026-12-20');
  assert.strictEqual(parcelas[2].vencimento, '2027-01-20');
  assert.strictEqual(parcelas[3].vencimento, '2027-02-20');
});

// ============================================================
secao('RN004 — "atrasada" é sempre calculado, nunca gravado');
// ============================================================

teste('RN004-1: pendente com vencimento no passado = atrasada', function () {
  var conta = Contas.novaConta({ tipo: 'pagar', descricao: 'Luz', valor: 90, vencimento: '2026-01-01' });
  assert.strictEqual(Contas.estaAtrasada(conta, '2026-07-26'), true);
  assert.strictEqual(Contas.situacao(conta, '2026-07-26'), 'atrasada');
});

teste('RN004-2: paga com vencimento no passado NÃO é atrasada', function () {
  var conta = Contas.novaConta({ tipo: 'pagar', descricao: 'Luz', valor: 90, vencimento: '2026-01-01' });
  conta.status = 'pago';
  assert.strictEqual(Contas.estaAtrasada(conta, '2026-07-26'), false);
  assert.strictEqual(Contas.situacao(conta, '2026-07-26'), 'paga');
});

teste('RN004-3: pendente com vencimento hoje NÃO é atrasada ainda', function () {
  var conta = Contas.novaConta({ tipo: 'pagar', descricao: 'Água', valor: 100, vencimento: '2026-07-26' });
  assert.strictEqual(Contas.estaAtrasada(conta, '2026-07-26'), false);
  assert.strictEqual(Contas.situacao(conta, '2026-07-26'), 'pendente');
});

// ============================================================
secao('Motor de datas — utilidades gerais');
// ============================================================

teste('somarMeses: caso simples', function () {
  assert.strictEqual(Datas.somarMeses('2026-03-10', 1), '2026-04-10');
  assert.strictEqual(Datas.somarMeses('2026-12-10', 1), '2027-01-10');
});

teste('diasDoMes: fevereiro bissexto vs. não-bissexto', function () {
  assert.strictEqual(Datas.diasDoMes(2028, 2), 29);
  assert.strictEqual(Datas.diasDoMes(2026, 2), 28);
});

teste('semanaCalendarioDe: segunda a domingo real, independente de mês', function () {
  var r = Datas.semanaCalendarioDe('2026-07-15'); // quarta-feira
  assert.strictEqual(new Date(Datas.parseISO(r.inicio).ano, Datas.parseISO(r.inicio).mes - 1, Datas.parseISO(r.inicio).dia).getDay(), 1);
  assert.strictEqual(new Date(Datas.parseISO(r.fim).ano, Datas.parseISO(r.fim).mes - 1, Datas.parseISO(r.fim).dia).getDay(), 0);
});

// ============================================================
secao('Filtros — período, status, categoria');
// ============================================================

teste('mes-atual: intervalo cobre o mês inteiro de "hoje"', function () {
  var r = Filtros.periodoParaIntervalo({ tipo: 'mes-atual' }, '2026-07-15');
  assert.strictEqual(r.inicio, '2026-07-01');
  assert.strictEqual(r.fim, '2026-07-31');
});

teste('proximo-mes: a partir de dezembro vira janeiro do ano seguinte', function () {
  var r = Filtros.periodoParaIntervalo({ tipo: 'proximo-mes' }, '2026-12-10');
  assert.strictEqual(r.inicio, '2027-01-01');
  assert.strictEqual(r.fim, '2027-01-31');
});

teste('semana-atual: usa a semana-do-mês de "hoje" (não cruza limite de mês)', function () {
  var r = Filtros.periodoParaIntervalo({ tipo: 'semana-atual' }, '2026-07-15');
  var esperado = Datas.semanaDe('2026-07-15');
  assert.strictEqual(r.inicio, esperado.inicio);
  assert.strictEqual(r.fim, esperado.fim);
});

teste('aplicar: combina período + status + categoria + tipo', function () {
  var lista = [
    Contas.novaConta({ tipo: 'pagar', descricao: 'Água', categoria: 'casa', valor: 100, vencimento: '2026-07-10' }),
    Contas.novaConta({ tipo: 'pagar', descricao: 'Internet', categoria: 'casa', valor: 90, vencimento: '2026-08-10' }),
    Contas.novaConta({ tipo: 'receber', descricao: 'Freela', categoria: 'trabalho', valor: 500, vencimento: '2026-07-20' })
  ];
  var soPagarCasaJulho = Filtros.aplicar(lista, {
    periodo: { tipo: 'mes-especifico', ano: 2026, mes: 7 },
    status: 'todos', categoria: 'casa', tipo: 'pagar'
  }, '2026-07-01');
  assert.strictEqual(soPagarCasaJulho.length, 1);
  assert.strictEqual(soPagarCasaJulho[0].descricao, 'Água');
});

teste('filtro por status: cada valor RETORNA as contas certas (afirma presença, não ausência)', function () {
  // Regressão do bug do filtro "Pagas" (D004): a interface mandava 'pago' mas
  // Contas.situacao() devolve 'paga' — nunca casava e a aba vinha vazia. O teste antigo só
  // checava que a pendente NÃO aparecia, o que passa mesmo com a lista inteira vazia.
  var lista = [
    contaFixa('pagar', 'Paga1', 'casa', 100, '2026-07-05', 'pago'),
    contaFixa('pagar', 'Paga2', 'casa', 200, '2026-07-10', 'pago'),
    contaFixa('pagar', 'Atrasada', 'casa', 300, '2026-07-15', 'pendente'),
    contaFixa('pagar', 'Futura', 'casa', 400, '2026-07-30', 'pendente')
  ];
  var base = { periodo: { tipo: 'mes-especifico', ano: 2026, mes: 7 }, categoria: 'todas', tipo: 'pagar' };
  function nomes(status) {
    return Filtros.aplicar(lista, Object.assign({}, base, { status: status }), '2026-07-26')
      .map(function (c) { return c.descricao; }).sort();
  }

  assert.deepStrictEqual(nomes('todos'), ['Atrasada', 'Futura', 'Paga1', 'Paga2']);
  assert.deepStrictEqual(nomes('paga'), ['Paga1', 'Paga2'], 'filtro "paga" deve TRAZER as pagas');
  assert.deepStrictEqual(nomes('atrasada'), ['Atrasada']);
  assert.deepStrictEqual(nomes('pendente'), ['Futura']);
});

teste('filtro por status: os valores aceitos são exatamente os que situacao() produz', function () {
  // trava o contrato entre quem filtra e quem classifica — foi a divergência que causou D004
  var amostras = [
    contaFixa('pagar', 'A', 'casa', 10, '2026-07-05', 'pago'),
    contaFixa('pagar', 'B', 'casa', 10, '2026-07-05', 'pendente'),
    contaFixa('pagar', 'C', 'casa', 10, '2026-07-30', 'pendente')
  ];
  var produzidos = amostras.map(function (c) { return Contas.situacao(c, '2026-07-26'); });
  produzidos.forEach(function (s) {
    assert.ok(['paga', 'pendente', 'atrasada'].indexOf(s) !== -1,
      'situacao() devolveu "' + s + '", fora do conjunto esperado');
  });
  assert.ok(produzidos.indexOf('paga') !== -1, 'o valor para conta paga é "paga" (não "pago")');
});

teste('total: soma os valores da lista filtrada', function () {
  var lista = [{ valor: 100 }, { valor: 50.5 }, { valor: 20 }];
  assert.strictEqual(Filtros.total(lista), 170.5);
});

// ============================================================
secao('Análise — os números do dashboard');
// ============================================================

function contaFixa(tipo, desc, cat, valor, venc, status) {
  var c = Contas.novaConta({ tipo: tipo, descricao: desc, categoria: cat, valor: valor, vencimento: venc });
  if (status) c.status = status;
  return c;
}

var CENARIO = [
  contaFixa('pagar', 'Aluguel', 'casa', 1500, '2026-07-05', 'pago'),
  contaFixa('pagar', 'Água', 'casa', 100, '2026-07-10', 'pendente'),
  contaFixa('pagar', 'TV', 'cartão', 300, '2026-07-15', 'pendente'),
  contaFixa('pagar', 'Uber', 'transporte', 50, '2026-07-28', 'pendente'),
  contaFixa('receber', 'Freela', 'trabalho', 2000, '2026-07-20', 'pendente'),
  contaFixa('pagar', 'Aluguel', 'casa', 1500, '2026-06-05', 'pago')  // mês anterior
];

teste('resumoDoMes: totais, progresso e contagem de atrasadas', function () {
  var r = Analise.resumoDoMes(CENARIO, 2026, 7, '2026-07-26');
  assert.strictEqual(r.totalPagar, 1950);        // 1500+100+300+50
  assert.strictEqual(r.totalReceber, 2000);
  assert.strictEqual(r.totalPago, 1500);
  assert.strictEqual(r.totalFalta, 450);          // 100+300+50
  assert.strictEqual(r.saldo, 50);                // 2000-1950
  assert.strictEqual(r.qtdPagar, 4);
  assert.strictEqual(r.qtdPago, 1);
  // Água (10/07) e TV (15/07) já venceram em 26/07 e estão pendentes
  assert.strictEqual(r.qtdAtrasadas, 2);
  assert.strictEqual(r.totalAtrasado, 400);
  assert.ok(Math.abs(r.progresso - (1500 / 1950)) < 0.0001);
});

teste('resumoDoMes: mês sem conta nenhuma não quebra nem divide por zero', function () {
  var r = Analise.resumoDoMes(CENARIO, 2026, 12, '2026-07-26');
  assert.strictEqual(r.totalPagar, 0);
  assert.strictEqual(r.progresso, 0);
  assert.strictEqual(r.qtdPagar, 0);
});

teste('comparativoMesAnterior: julho (1950) vs junho (1500) = +30%', function () {
  var c = Analise.comparativoMesAnterior(CENARIO, 2026, 7, '2026-07-26');
  assert.strictEqual(c.anterior, 1500);
  assert.strictEqual(c.atual, 1950);
  assert.strictEqual(Math.round(c.variacao), 30);
});

teste('comparativoMesAnterior: mês anterior zerado devolve variacao null (não divide por zero)', function () {
  var c = Analise.comparativoMesAnterior(CENARIO, 2026, 6, '2026-07-26');
  assert.strictEqual(c.variacao, null);
});

teste('porCategoria: ordena do maior pro menor e soma 100%', function () {
  var cats = Analise.porCategoria(CENARIO, '2026-07-01', '2026-07-31', 'pagar');
  assert.strictEqual(cats[0].categoria, 'casa');
  assert.strictEqual(cats[0].valor, 1600);       // 1500+100
  assert.strictEqual(cats[1].categoria, 'cartão');
  assert.strictEqual(cats[2].categoria, 'transporte');
  var somaPct = cats.reduce(function (s, c) { return s + c.percentual; }, 0);
  assert.ok(Math.abs(somaPct - 100) < 0.0001);
  assert.ok(cats[0].cor, 'categoria deve vir com cor');
});

teste('porCategoria: período vazio devolve lista vazia, sem NaN', function () {
  var cats = Analise.porCategoria(CENARIO, '2026-12-01', '2026-12-31', 'pagar');
  assert.strictEqual(cats.length, 0);
});

teste('porSemana: distribui pelas semanas da RN003 e marca a semana atual', function () {
  var semanas = Analise.porSemana(CENARIO, 2026, 7, 'pagar', '2026-07-26');
  // julho/2026: dia 1 é quarta -> S1 = 01-05, S2 = 06-12, S3 = 13-19, S4 = 20-26, S5 = 27-31
  assert.strictEqual(semanas[0].total, 1500);   // Aluguel 05/07
  assert.strictEqual(semanas[1].total, 100);    // Água 10/07
  assert.strictEqual(semanas[2].total, 300);    // TV 15/07
  assert.strictEqual(semanas[3].total, 0);
  assert.strictEqual(semanas[4].total, 50);     // Uber 28/07
  assert.strictEqual(semanas[0].pago, 1500);
  var atuais = semanas.filter(function (s) { return s.ehSemanaAtual; });
  assert.strictEqual(atuais.length, 1, 'exatamente uma semana deve ser a atual');
  assert.strictEqual(atuais[0].numero, 4);      // 26/07 cai na S4 (20-26)
});

teste('proximosVencimentos: atrasadas primeiro, ordenado por urgência', function () {
  var prox = Analise.proximosVencimentos(CENARIO, '2026-07-26', 5, 'pagar');
  assert.strictEqual(prox[0].conta.descricao, 'Água');   // -16 dias
  assert.strictEqual(prox[0].dias, -16);
  assert.strictEqual(prox[1].conta.descricao, 'TV');     // -11 dias
  assert.strictEqual(prox[2].conta.descricao, 'Uber');   // +2 dias
  assert.strictEqual(prox[2].dias, 2);
});

teste('proximosVencimentos: com desdeISO, corta pendência de meses anteriores', function () {
  var lista = [
    contaFixa('pagar', 'Junho', 'outros', 500, '2026-06-10', 'pendente'),
    contaFixa('pagar', 'Julho', 'outros', 300, '2026-07-15', 'pendente')
  ];
  var semCorte = Analise.proximosVencimentos(lista, '2026-07-26', 10, 'pagar');
  assert.strictEqual(semCorte.length, 2);
  var comCorte = Analise.proximosVencimentos(lista, '2026-07-26', 10, 'pagar', '2026-07-01');
  assert.strictEqual(comCorte.length, 1);
  assert.strictEqual(comCorte[0].conta.descricao, 'Julho');
});

teste('proximosVencimentos: nunca inclui conta já paga', function () {
  var prox = Analise.proximosVencimentos(CENARIO, '2026-07-01', 10, 'pagar');
  var pagas = prox.filter(function (p) { return p.conta.status === 'pago'; });
  assert.strictEqual(pagas.length, 0);
});

teste('rotuloPrazo: cobre hoje, amanhã, futuro, ontem e passado', function () {
  assert.strictEqual(Analise.rotuloPrazo(0), 'vence hoje');
  assert.strictEqual(Analise.rotuloPrazo(1), 'vence amanhã');
  assert.strictEqual(Analise.rotuloPrazo(5), 'vence em 5 dias');
  assert.strictEqual(Analise.rotuloPrazo(-1), 'atrasada há 1 dia');
  assert.strictEqual(Analise.rotuloPrazo(-7), 'atrasada há 7 dias');
});

teste('Categorias: mesma categoria sempre recebe a mesma cor (determinístico)', function () {
  var a = Categorias.cor('academia');
  var b = Categorias.cor('Academia');   // normaliza caixa
  var c = Categorias.cor('academia');
  assert.strictEqual(a, b);
  assert.strictEqual(a, c);
  assert.ok(Categorias.PALETA.indexOf(a) !== -1, 'cor deve estar na paleta');
});

teste('Categorias: conhecidas têm cor e ícone próprios', function () {
  assert.strictEqual(Categorias.icone('cartão'), 'cartao');
  assert.strictEqual(Categorias.icone('casa'), 'casa');
  assert.strictEqual(Categorias.icone('inexistente-xyz'), 'tag');
});

// ============================================================
secao('RN006 — Meta por dia (mês)');
// ============================================================

teste('RN006-1: exemplo do usuário — deve 6.000 no começo do mês (30 dias) = 200/dia', function () {
  // junho/2026 tem 30 dias; hoje = 01/06 -> restam 30 dias (hoje conta)
  var lista = [contaFixa('pagar', 'Dívida', 'outros', 6000, '2026-06-30', 'pendente')];
  var m = Analise.metaPorDia(lista, 2026, 6, '2026-06-01');
  assert.strictEqual(m.dias, 30);
  assert.strictEqual(Math.round(m.meta), 200);
});

teste('RN006-2: exemplo do usuário — mesmos 6.000 faltando 20 dias = 300/dia', function () {
  var lista = [contaFixa('pagar', 'Dívida', 'outros', 6000, '2026-06-30', 'pendente')];
  var m = Analise.metaPorDia(lista, 2026, 6, '2026-06-11'); // 11..30 = 20 dias
  assert.strictEqual(m.dias, 20);
  assert.strictEqual(Math.round(m.meta), 300);
});

teste('RN006-3: exemplo do usuário — mesmos 6.000 faltando 10 dias = 600/dia', function () {
  var lista = [contaFixa('pagar', 'Dívida', 'outros', 6000, '2026-06-30', 'pendente')];
  var m = Analise.metaPorDia(lista, 2026, 6, '2026-06-21'); // 21..30 = 10 dias
  assert.strictEqual(m.dias, 10);
  assert.strictEqual(Math.round(m.meta), 600);
});

teste('RN006-4: pagar parte derruba a meta na hora', function () {
  var lista = [
    contaFixa('pagar', 'A', 'outros', 4000, '2026-06-30', 'pago'),
    contaFixa('pagar', 'B', 'outros', 2000, '2026-06-30', 'pendente')
  ];
  var m = Analise.metaPorDia(lista, 2026, 6, '2026-06-21');
  assert.strictEqual(m.falta, 2000);
  assert.strictEqual(Math.round(m.meta), 200);  // 2000/10
});

teste('RN006-5: último dia do mês não divide por zero (piso 1)', function () {
  var lista = [contaFixa('pagar', 'A', 'outros', 500, '2026-06-30', 'pendente')];
  var m = Analise.metaPorDia(lista, 2026, 6, '2026-06-30');
  assert.strictEqual(m.dias, 1);
  assert.strictEqual(m.meta, 500);
  assert.ok(isFinite(m.meta), 'meta deve ser finita');
});

teste('RN006-6: tudo pago -> meta zero, semáforo ok', function () {
  var lista = [contaFixa('pagar', 'A', 'outros', 500, '2026-06-10', 'pago')];
  var m = Analise.metaPorDia(lista, 2026, 6, '2026-06-21');
  assert.strictEqual(m.meta, 0);
  assert.strictEqual(m.semaforo, 'ok');
});

teste('RN006-7: mês sem conta nenhuma não gera NaN', function () {
  var m = Analise.metaPorDia([], 2026, 6, '2026-06-15');
  assert.strictEqual(m.meta, 0);
  assert.ok(!isNaN(m.meta) && !isNaN(m.ideal));
});

teste('RN006-8: semáforo sobe conforme a pressão aumenta', function () {
  var lista = [contaFixa('pagar', 'A', 'outros', 3000, '2026-06-30', 'pendente')];
  // ideal = 3000/30 = 100/dia
  assert.strictEqual(Analise.metaPorDia(lista, 2026, 6, '2026-06-01').semaforo, 'ok');       // 100/dia
  assert.strictEqual(Analise.metaPorDia(lista, 2026, 6, '2026-06-08').semaforo, 'atencao');  // ~130/dia
  assert.strictEqual(Analise.metaPorDia(lista, 2026, 6, '2026-06-21').semaforo, 'critico');  // 300/dia
});

// ============================================================
secao('RN007 — Ritmo da semana com arrasto em cascata');
// ============================================================

// Julho/2026: dia 1 é quarta. S1=01-05, S2=06-12, S3=13-19, S4=20-26, S5=27-31
function cenarioCascata() {
  return [
    contaFixa('pagar', 'S1', 'outros', 2100, '2026-07-03', 'pendente'),
    contaFixa('pagar', 'S2', 'outros', 1500, '2026-07-08', 'pendente'),
    contaFixa('pagar', 'S3', 'outros', 800, '2026-07-15', 'pendente'),
    contaFixa('pagar', 'S4', 'outros', 1200, '2026-07-22', 'pendente'),
    contaFixa('pagar', 'S5', 'outros', 900, '2026-07-29', 'pendente')
  ];
}

teste('RN007-1: exemplo do usuário — S1 devendo 2.100, 7 dias = 300/dia', function () {
  var r = Analise.ritmoDaSemana(cenarioCascata(), '2026-07-01');
  assert.strictEqual(r.semana.numero, 1);
  assert.strictEqual(r.venceNestaSemana, 2100);
  assert.strictEqual(r.arrastado, 0);
  assert.strictEqual(r.aCobrir, 2100);
  assert.strictEqual(r.dias, 5);              // 01..05 (S1 tem 5 dias em julho/2026)
  assert.strictEqual(Math.round(r.ritmo), 420);
});

teste('RN007-2: exemplo do usuário — S1 não paga arrasta pra S2 (2.100 + 2.100 = 4.200)', function () {
  var lista = [
    contaFixa('pagar', 'S1', 'outros', 2100, '2026-07-03', 'pendente'),
    contaFixa('pagar', 'S2', 'outros', 2100, '2026-07-08', 'pendente')
  ];
  var r = Analise.ritmoDaSemana(lista, '2026-07-06'); // segunda da S2, 7 dias restantes
  assert.strictEqual(r.semana.numero, 2);
  assert.strictEqual(r.venceNestaSemana, 2100);
  assert.strictEqual(r.arrastado, 2100);
  assert.strictEqual(r.aCobrir, 4200);
  assert.strictEqual(r.dias, 7);
  assert.strictEqual(Math.round(r.ritmo), 600);  // exatamente o número do usuário
});

teste('RN007-3: cascata completa S1->S5, cada semana acumula tudo que veio antes', function () {
  var lista = cenarioCascata();
  // início de cada semana (segunda, ou dia 1 na S1)
  var esperado = [
    { hoje: '2026-07-01', semana: 1, aCobrir: 2100, arrastado: 0 },
    { hoje: '2026-07-06', semana: 2, aCobrir: 3600, arrastado: 2100 },
    { hoje: '2026-07-13', semana: 3, aCobrir: 4400, arrastado: 3600 },
    { hoje: '2026-07-20', semana: 4, aCobrir: 5600, arrastado: 4400 },
    { hoje: '2026-07-27', semana: 5, aCobrir: 6500, arrastado: 5600 }
  ];
  esperado.forEach(function (e) {
    var r = Analise.ritmoDaSemana(lista, e.hoje);
    assert.strictEqual(r.semana.numero, e.semana, 'semana em ' + e.hoje);
    assert.strictEqual(r.aCobrir, e.aCobrir, 'a cobrir em ' + e.hoje);
    assert.strictEqual(r.arrastado, e.arrastado, 'arrastado em ' + e.hoje);
  });
});

teste('RN007-4: o que vence em semana FUTURA nunca entra no ritmo da semana atual', function () {
  var r = Analise.ritmoDaSemana(cenarioCascata(), '2026-07-13'); // S3
  // S3 cobre S1+S2+S3 = 2100+1500+800 = 4400; S4 (1200) e S5 (900) ficam de fora
  assert.strictEqual(r.aCobrir, 4400);
});

teste('RN007-5: pagar o arrastado zera a cascata', function () {
  var lista = [
    contaFixa('pagar', 'S1', 'outros', 2100, '2026-07-03', 'pago'),
    contaFixa('pagar', 'S2', 'outros', 2100, '2026-07-08', 'pendente')
  ];
  var r = Analise.ritmoDaSemana(lista, '2026-07-06');
  assert.strictEqual(r.arrastado, 0);
  assert.strictEqual(r.aCobrir, 2100);
  assert.strictEqual(Math.round(r.ritmo), 300);
});

teste('RN007-6: no meio da semana divide pelos dias que faltam, não por 7', function () {
  var lista = [contaFixa('pagar', 'X', 'outros', 1000, '2026-07-10', 'pendente')];
  var r = Analise.ritmoDaSemana(lista, '2026-07-10'); // sexta; S2 = 06-12 -> restam 10,11,12
  assert.strictEqual(r.dias, 3);
  assert.ok(Math.abs(r.ritmo - 1000 / 3) < 0.01);
});

teste('RN007-7: último dia da semana não divide por zero', function () {
  var lista = [contaFixa('pagar', 'X', 'outros', 700, '2026-07-08', 'pendente')];
  var r = Analise.ritmoDaSemana(lista, '2026-07-12'); // domingo, fim da S2
  assert.strictEqual(r.dias, 1);
  assert.strictEqual(r.ritmo, 700);
});

teste('RN007-8: conta de OUTRO mês nunca entra no ritmo da semana', function () {
  var lista = [
    contaFixa('pagar', 'Junho', 'outros', 5000, '2026-06-10', 'pendente'),
    contaFixa('pagar', 'Julho', 'outros', 1000, '2026-07-08', 'pendente')
  ];
  var r = Analise.ritmoDaSemana(lista, '2026-07-06');
  assert.strictEqual(r.aCobrir, 1000, 'pendência de junho não pode entrar');
});

// ============================================================
secao('Veio de antes — pendências de meses anteriores, separadas');
// ============================================================

teste('pendenteDeMesesAnteriores: soma só o que venceu antes do mês de referência', function () {
  var lista = [
    contaFixa('pagar', 'Água', 'casa', 118.40, '2026-06-10', 'pendente'),
    contaFixa('pagar', 'Cartão', 'cartão', 1081.60, '2026-06-15', 'pendente'),
    contaFixa('pagar', 'Antiga paga', 'outros', 999, '2026-05-10', 'pago'),
    contaFixa('pagar', 'Deste mês', 'outros', 500, '2026-07-10', 'pendente')
  ];
  var v = Analise.pendenteDeMesesAnteriores(lista, 2026, 7);
  assert.strictEqual(v.qtd, 2);
  assert.ok(Math.abs(v.total - 1200) < 0.001);
  assert.strictEqual(v.meses.length, 1);
  assert.strictEqual(v.meses[0].mes, 6);
});

teste('pendenteDeMesesAnteriores: sem pendência antiga devolve zero (bloco não aparece)', function () {
  var lista = [contaFixa('pagar', 'Deste mês', 'outros', 500, '2026-07-10', 'pendente')];
  var v = Analise.pendenteDeMesesAnteriores(lista, 2026, 7);
  assert.strictEqual(v.qtd, 0);
  assert.strictEqual(v.total, 0);
});

teste('"Veio de antes" NÃO entra na meta do mês (decisão do usuário: não misturar)', function () {
  var lista = [
    contaFixa('pagar', 'Junho', 'outros', 5000, '2026-06-10', 'pendente'),
    contaFixa('pagar', 'Julho', 'outros', 3000, '2026-07-30', 'pendente')
  ];
  var m = Analise.metaPorDia(lista, 2026, 7, '2026-07-21');
  assert.strictEqual(m.falta, 3000, 'a meta do mês só considera contas do próprio mês');
});

teste('semanasComResto: marca só as semanas já passadas que ficaram com pendência', function () {
  var lista = [
    contaFixa('pagar', 'S1', 'outros', 100, '2026-07-03', 'pendente'),  // passou, pendente
    contaFixa('pagar', 'S2', 'outros', 100, '2026-07-08', 'pago'),      // passou, paga
    contaFixa('pagar', 'S4', 'outros', 100, '2026-07-22', 'pendente')   // futura
  ];
  var s = Analise.semanasComResto(lista, 2026, 7, '2026-07-20');
  assert.strictEqual(s[0].deixouResto, true, 'S1 passou com pendência');
  assert.strictEqual(s[1].deixouResto, false, 'S2 passou mas foi paga');
  assert.strictEqual(s[3].deixouResto, false, 'S4 ainda não passou');
});

// ============================================================
secao('RN009 — Painel do período (total / pago / falta / meta)');
// ============================================================

function cenarioPainel() {
  return [
    contaFixa('pagar', 'Aluguel', 'casa', 1500, '2026-07-05', 'pago'),
    contaFixa('pagar', 'Água', 'casa', 100, '2026-07-10', 'pago'),
    contaFixa('pagar', 'TV', 'cartão', 300, '2026-07-15', 'pendente'),
    contaFixa('pagar', 'Uber', 'transporte', 50, '2026-07-28', 'pendente'),
    contaFixa('receber', 'Salário', 'trabalho', 4000, '2026-07-05', 'pago'),
    contaFixa('receber', 'Freela', 'trabalho', 800, '2026-07-30', 'pendente')
  ];
}

teste('RN009-1: resumo do período quebra total / pago / falta corretamente', function () {
  var r = Analise.resumoDoPeriodo(cenarioPainel(), '2026-07-01', '2026-07-31', 'pagar', '2026-07-20');
  assert.strictEqual(r.total, 1950);
  assert.strictEqual(r.pago, 1600);
  assert.strictEqual(r.falta, 350);
  assert.strictEqual(r.qtd, 4);
  assert.strictEqual(r.qtdPaga, 2);
  assert.ok(Math.abs(r.progresso - 1600 / 1950) < 0.0001);
});

teste('RN009-2: o painel NÃO é filtrado por status — total sempre inclui pagas e pendentes', function () {
  // resumoDoPeriodo não aceita status de propósito; se recebesse, o total sumiria ao filtrar
  var r = Analise.resumoDoPeriodo(cenarioPainel(), '2026-07-01', '2026-07-31', 'pagar', '2026-07-20');
  assert.strictEqual(r.total, r.pago + r.falta, 'total tem que ser pago + falta');
});

teste('RN009-3: meta/dia se adapta a um período de SEMANA', function () {
  var lista = [contaFixa('pagar', 'X', 'outros', 700, '2026-07-10', 'pendente')];
  var r = Analise.resumoDoPeriodo(lista, '2026-07-06', '2026-07-12', 'pagar', '2026-07-06');
  var m = Analise.metaDoPeriodo(r, '2026-07-06');
  assert.strictEqual(m.dias, 7);
  assert.strictEqual(Math.round(m.meta), 100);   // 700/7
});

teste('RN009-4: meta/dia se adapta a período PERSONALIZADO de 10 dias', function () {
  var lista = [contaFixa('pagar', 'X', 'outros', 1000, '2026-07-15', 'pendente')];
  var r = Analise.resumoDoPeriodo(lista, '2026-07-11', '2026-07-20', 'pagar', '2026-07-11');
  var m = Analise.metaDoPeriodo(r, '2026-07-11');
  assert.strictEqual(m.dias, 10);
  assert.strictEqual(m.meta, 100);
});

teste('RN009-5: período ENCERRADO não tem meta — devolve encerrado:true', function () {
  var lista = [contaFixa('pagar', 'Junho', 'outros', 500, '2026-06-10', 'pendente')];
  var r = Analise.resumoDoPeriodo(lista, '2026-06-01', '2026-06-30', 'pagar', '2026-07-20');
  var m = Analise.metaDoPeriodo(r, '2026-07-20');
  assert.strictEqual(m.encerrado, true);
  assert.strictEqual(m.meta, 0);
  assert.strictEqual(m.dias, 0);
  assert.strictEqual(r.falta, 500, 'o que ficou pendente continua sendo reportado');
  assert.strictEqual(m.semaforo, 'critico', 'encerrado com pendência é crítico');
});

teste('RN009-6: período encerrado e totalmente pago -> semáforo ok', function () {
  var lista = [contaFixa('pagar', 'Junho', 'outros', 500, '2026-06-10', 'pago')];
  var r = Analise.resumoDoPeriodo(lista, '2026-06-01', '2026-06-30', 'pagar', '2026-07-20');
  var m = Analise.metaDoPeriodo(r, '2026-07-20');
  assert.strictEqual(m.encerrado, true);
  assert.strictEqual(m.semaforo, 'ok');
});

teste('RN009-7: período FUTURO usa a duração inteira (ainda não começou)', function () {
  var lista = [contaFixa('pagar', 'Agosto', 'outros', 3100, '2026-08-15', 'pendente')];
  var r = Analise.resumoDoPeriodo(lista, '2026-08-01', '2026-08-31', 'pagar', '2026-07-20');
  var m = Analise.metaDoPeriodo(r, '2026-07-20');
  assert.strictEqual(m.aindaNaoComecou, true);
  assert.strictEqual(m.dias, 31);
  assert.strictEqual(Math.round(m.meta), 100);
});

teste('RN009-8: filtrar por CATEGORIA muda o painel (lista já vem filtrada)', function () {
  var soCasa = cenarioPainel().filter(function (c) { return c.categoria === 'casa'; });
  var r = Analise.resumoDoPeriodo(soCasa, '2026-07-01', '2026-07-31', 'pagar', '2026-07-20');
  assert.strictEqual(r.total, 1600);
  assert.strictEqual(r.falta, 0, 'as duas de casa estão pagas');
});

teste('RN009-9: variante "receber" — total previsto, já recebido, falta receber', function () {
  var r = Analise.resumoDoPeriodo(cenarioPainel(), '2026-07-01', '2026-07-31', 'receber', '2026-07-20');
  assert.strictEqual(r.total, 4800);
  assert.strictEqual(r.pago, 4000);
  assert.strictEqual(r.falta, 800);
});

teste('RN009-10: período sem conta nenhuma não gera NaN nem divisão por zero', function () {
  var r = Analise.resumoDoPeriodo([], '2026-07-01', '2026-07-31', 'pagar', '2026-07-20');
  var m = Analise.metaDoPeriodo(r, '2026-07-20');
  assert.strictEqual(r.total, 0);
  assert.strictEqual(r.progresso, 0);
  assert.strictEqual(m.meta, 0);
  assert.ok(!isNaN(m.meta) && !isNaN(m.ideal) && isFinite(m.meta));
});

teste('RN009-11: último dia do período não divide por zero', function () {
  var lista = [contaFixa('pagar', 'X', 'outros', 250, '2026-07-31', 'pendente')];
  var r = Analise.resumoDoPeriodo(lista, '2026-07-01', '2026-07-31', 'pagar', '2026-07-31');
  var m = Analise.metaDoPeriodo(r, '2026-07-31');
  assert.strictEqual(m.dias, 1);
  assert.strictEqual(m.meta, 250);
});

// ============================================================
// METAS — campanhas, caixinha, sobra e cofre (RN010 a RN019)
// ============================================================

var Metas = require('../app/js/metas.js');

function centavos(n) { return Number(n).toFixed(2); }

/** Meta com criadoEm fixo — o desempate de exclusividade (RN012) usa criadoEm. */
function metaFixa(nome, meses, categorias, criadoEm) {
  var m = Metas.novaMeta({ nome: nome, meses: meses, categorias: categorias });
  m.criadoEm = criadoEm || '2026-07-01T10:00:00.000Z';
  return m;
}

var MESES_CAMPANHA = [
  { ano: 2026, mes: 8, alvo: 9000 },
  { ano: 2026, mes: 9, alvo: 9000 },
  { ano: 2026, mes: 10, alvo: 9000 },
  { ano: 2026, mes: 11, alvo: 8000 }
];

/** Contas do exemplo do usuário: 6.000 em agosto, e set/out/nov com 6.000/6.600/4.400. */
function contasDaCampanha() {
  return [
    contaFixa('pagar', 'Energia', 'casa', 340, '2026-08-05', 'pendente'),
    contaFixa('pagar', 'Água', 'casa', 180, '2026-08-10', 'pendente'),
    contaFixa('pagar', 'Internet', 'casa', 130, '2026-08-10', 'pendente'),
    contaFixa('pagar', 'Celular', 'outros', 90, '2026-08-12', 'pendente'),
    contaFixa('pagar', 'Mercado', 'mercado', 900, '2026-08-15', 'pendente'),
    contaFixa('pagar', 'Aluguel', 'casa', 1800, '2026-08-20', 'pendente'),
    contaFixa('pagar', 'Seguro', 'outros', 460, '2026-08-25', 'pendente'),
    contaFixa('pagar', 'Fatura Nubank', 'cartão', 2100, '2026-08-28', 'pendente'),
    contaFixa('pagar', 'Contas de setembro', 'casa', 6000, '2026-09-10', 'pendente'),
    contaFixa('pagar', 'Contas de outubro', 'casa', 6600, '2026-10-10', 'pendente'),
    contaFixa('pagar', 'Contas de novembro', 'casa', 4400, '2026-11-10', 'pendente')
  ];
}

var CATS_CAMPANHA = ['casa', 'cartão', 'mercado', 'outros'];

secao('RN010 — a meta é uma campanha de N meses');

teste('RN010-1: campanha 9+9+9+8 soma 35.000 e contas somam 23.000', function () {
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  var r = Metas.resumoDaCampanha(meta, contasDaCampanha(), '2026-08-01');
  assert.strictEqual(r.totalAlvo, 35000);
  assert.strictEqual(r.totalContas, 23000);
  assert.strictEqual(r.sobraPrevistaTotal, 12000);
  assert.strictEqual(r.qtdMeses, 4);
});

teste('RN010-2: meses podem pular e cruzar o ano, e saem sempre ordenados', function () {
  var meta = metaFixa('Viagem', [
    { ano: 2027, mes: 2, alvo: 500 },
    { ano: 2026, mes: 11, alvo: 300 },
    { ano: 2027, mes: 1, alvo: 400 }   // dezembro pulado de propósito
  ], ['casa']);
  var ordenados = Metas.mesesOrdenados(meta);
  assert.deepStrictEqual(ordenados.map(function (m) { return m.ano + '-' + m.mes; }),
    ['2026-11', '2027-1', '2027-2']);
  assert.strictEqual(Metas.campanhaCruzaAno(meta), true);
  assert.strictEqual(Metas.temMes(meta, 2026, 12), false);
});

teste('RN010-3: divisor do assistente não perde centavo', function () {
  assert.deepStrictEqual(Metas.dividirIgual(36000, 4), [9000, 9000, 9000, 9000]);
  var tres = Metas.dividirIgual(10000, 3);
  assert.strictEqual(centavos(tres.reduce(function (s, v) { return s + v; }, 0)), '10000.00');
  assert.deepStrictEqual(tres, [3333.33, 3333.33, 3333.34]);
});

secao('RN011 — seleção por categoria é regra viva, não fotografia');

teste('RN011-1: conta nova numa categoria marcada entra sozinha', function () {
  var meta = metaFixa('Reserva', MESES_CAMPANHA, ['casa']);
  var contas = contasDaCampanha();
  assert.strictEqual(Metas.contasDaMeta(meta, contas, 2026, 8).length, 4); // as 4 de casa
  contas.push(contaFixa('pagar', 'IPTU', 'casa', 600, '2026-08-18', 'pendente'));
  assert.strictEqual(Metas.contasDaMeta(meta, contas, 2026, 8).length, 5);
});

teste('RN011-2: excluir uma conta específica tira só ela; incluir traz de fora da categoria', function () {
  var contas = contasDaCampanha();
  var meta = metaFixa('Reserva', MESES_CAMPANHA, ['casa']);
  meta.selecao.excluidas = [contas[0].id];          // Energia, que é 'casa'
  meta.selecao.incluidas = [contas[7].id];          // Nubank, que é 'cartão'
  var doMes = Metas.contasDaMeta(meta, contas, 2026, 8);
  var descricoes = doMes.map(function (c) { return c.descricao; });
  assert.ok(descricoes.indexOf('Energia') === -1, 'Energia deveria estar fora');
  assert.ok(descricoes.indexOf('Fatura Nubank') !== -1, 'Nubank deveria estar dentro');
});

teste('RN011-3: conta a receber nunca entra numa meta', function () {
  var meta = metaFixa('Reserva', MESES_CAMPANHA, ['trabalho']);
  var contas = [contaFixa('receber', 'Salário', 'trabalho', 4200, '2026-08-05', 'pendente')];
  assert.strictEqual(Metas.contasDaMeta(meta, contas, 2026, 8).length, 0);
});

secao('RN012 / F1 — uma conta pertence a no máximo uma meta');

teste('RN012-1: duas metas na mesma categoria não contam a mesma conta duas vezes', function () {
  var contas = contasDaCampanha();
  var antiga = metaFixa('Reserva', MESES_CAMPANHA, ['casa'], '2026-07-01T10:00:00.000Z');
  var nova = metaFixa('Viagem', MESES_CAMPANHA, ['casa'], '2026-07-20T10:00:00.000Z');
  var todas = [antiga, nova];

  var naAntiga = Metas.contasDaMeta(antiga, contas, 2026, 8, todas);
  var naNova = Metas.contasDaMeta(nova, contas, 2026, 8, todas);
  assert.strictEqual(naAntiga.length, 4, 'a mais antiga fica com as contas');
  assert.strictEqual(naNova.length, 0, 'a mais nova não repete nenhuma');
});

teste('RN012-2: quem já mexeu no dinheiro da conta ganha, mesmo sendo a mais nova', function () {
  var contas = contasDaCampanha();
  var antiga = metaFixa('Reserva', MESES_CAMPANHA, ['casa'], '2026-07-01T10:00:00.000Z');
  var nova = metaFixa('Viagem', MESES_CAMPANHA, ['casa'], '2026-07-20T10:00:00.000Z');
  nova.movimentos.push(Metas.novoMovimento({
    tipo: 'baixa', data: '2026-08-05', valor: 340, contaId: contas[0].id, conta: contas[0]
  }));
  var dono = Metas.donoDaConta([antiga, nova], contas[0]);
  assert.strictEqual(dono.id, nova.id);
});

teste('RN012-3: a tela sabe quais contas estão travadas e por quem', function () {
  var contas = contasDaCampanha();
  var antiga = metaFixa('Reserva', MESES_CAMPANHA, ['casa'], '2026-07-01T10:00:00.000Z');
  var nova = metaFixa('Viagem', MESES_CAMPANHA, ['casa'], '2026-07-20T10:00:00.000Z');
  var travadas = Metas.contasReservadasPorOutra(nova, contas, [antiga, nova]);
  assert.ok(travadas.length > 0);
  assert.strictEqual(travadas[0].dono.nome, 'Reserva');
});

secao('RN013 — as duas linhas: meta por dia (alvo) e piso por dia (não ficar devendo)');

teste('RN013-1: dia 1º de agosto -> juntar R$ 290,32/dia; piso R$ 193,55/dia', function () {
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  var r = Metas.resumoDoMes(meta, contasDaCampanha(), 2026, 8, '2026-08-01');
  assert.strictEqual(r.diasRestantes, 31);
  assert.strictEqual(centavos(r.metaPorDia), '290.32');
  assert.strictEqual(centavos(r.pisoPorDia), '193.55');
  assert.strictEqual(r.estado, 'corrente');
});

teste('RN013-2: a cascata desce quando se junta acima do ritmo (300 + 600 nos dias 1 e 2)', function () {
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  meta.movimentos = [
    Metas.novoMovimento({ tipo: 'aporte', data: '2026-08-01', valor: 300 }),
    Metas.novoMovimento({ tipo: 'aporte', data: '2026-08-02', valor: 600 })
  ];
  var dia3 = Metas.resumoDoMes(meta, contasDaCampanha(), 2026, 8, '2026-08-03');
  assert.strictEqual(dia3.juntado, 900);
  assert.strictEqual(dia3.diasRestantes, 29);
  assert.strictEqual(centavos(dia3.metaPorDia), '279.31');
});

teste('RN013-3: e sobe no dia seguinte se não lançar nada', function () {
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  meta.movimentos = [
    Metas.novoMovimento({ tipo: 'aporte', data: '2026-08-01', valor: 300 }),
    Metas.novoMovimento({ tipo: 'aporte', data: '2026-08-02', valor: 600 })
  ];
  var dia4 = Metas.resumoDoMes(meta, contasDaCampanha(), 2026, 8, '2026-08-04');
  assert.strictEqual(centavos(dia4.metaPorDia), '289.29');
  assert.ok(dia4.metaPorDia > 279.31, 'não lançar tem que apertar o dia seguinte');
});

teste('RN013-4: último dia do mês não divide por zero', function () {
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  var r = Metas.resumoDoMes(meta, contasDaCampanha(), 2026, 8, '2026-08-31');
  assert.strictEqual(r.diasRestantes, 1);
  assert.strictEqual(r.metaPorDia, 9000);
  assert.ok(isFinite(r.metaPorDia) && isFinite(r.pisoPorDia));
});

teste('RN013-5: o piso desconta o que já está em mãos', function () {
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  meta.movimentos = [Metas.novoMovimento({ tipo: 'aporte', data: '2026-08-01', valor: 4000 })];
  var r = Metas.resumoDaCampanha(meta, contasDaCampanha(), '2026-08-01');
  var ago = r.meses[0];
  assert.strictEqual(ago.descoberto, 2000, '6.000 de conta − 4.000 em mãos');
  assert.strictEqual(centavos(ago.pisoPorDia), '64.52'); // 2000/31
});

secao('RN014 — sobra, cofre e as três situações que o usuário descreveu');

teste('RN014-1: cenário base — cofre previsto R$ 12.000', function () {
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  var r = Metas.resumoDaCampanha(meta, contasDaCampanha(), '2026-08-01');
  assert.strictEqual(r.cofreHoje, 0);
  assert.strictEqual(r.cofrePrevisto, 12000);
  assert.deepStrictEqual(r.escada.map(function (l) { return l.acumulado; }),
    [3000, 6000, 8400, 12000]);
});

teste('RN014-2: juntando acima da meta (12.400 em agosto) — cofre vai a R$ 15.400', function () {
  var contas = contasDaCampanha();
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  // 12.400 juntados e as 8 contas de agosto pagas pela meta
  meta.movimentos = [Metas.novoMovimento({ tipo: 'aporte', data: '2026-08-01', valor: 12400 })];
  contas.slice(0, 8).forEach(function (c) {
    c.status = 'pago';
    c.pagoEm = '2026-08-20';
    meta.movimentos.push(Metas.novoMovimento({
      tipo: 'baixa', data: '2026-08-20', valor: c.valor, contaId: c.id, conta: c
    }));
  });

  var r = Metas.resumoDaCampanha(meta, contas, '2026-08-20');
  var ago = r.meses[0];
  assert.strictEqual(ago.juntado, 12400);
  assert.strictEqual(ago.excedente, 3400, 'passou 3.400 do alvo');
  assert.strictEqual(ago.faixa, 'verde');
  assert.strictEqual(r.saldo, 6400, '12.400 juntados − 6.000 pagos');
  assert.strictEqual(r.cofrePrevisto, 15400);
  assert.strictEqual(r.escada[0].acumulado, 6400);
});

teste('RN014-3: setembro continua pedindo 9.000 mesmo com agosto adiantado (excedente vai pro cofre)', function () {
  var contas = contasDaCampanha();
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  meta.movimentos = [Metas.novoMovimento({ tipo: 'aporte', data: '2026-08-01', valor: 12400 })];
  var r = Metas.resumoDaCampanha(meta, contas, '2026-08-20');
  assert.strictEqual(r.meses[1].alvo, 9000);
  assert.strictEqual(r.meses[1].faltaJuntar, 9000);
});

teste('RN014-4: juntando abaixo do piso (4.000) — cofre 0 e 2.000 arrastados pra setembro', function () {
  var contas = [
    contaFixa('pagar', 'Contas grandes de agosto', 'casa', 4000, '2026-08-10', 'pago'),
    contaFixa('pagar', 'Fatura Nubank', 'cartão', 2000, '2026-08-28', 'pendente'),
    contaFixa('pagar', 'Contas de setembro', 'casa', 6000, '2026-09-10', 'pendente'),
    contaFixa('pagar', 'Contas de outubro', 'casa', 6600, '2026-10-10', 'pendente'),
    contaFixa('pagar', 'Contas de novembro', 'casa', 4400, '2026-11-10', 'pendente')
  ];
  contas[0].pagoEm = '2026-08-10';
  var meta = metaFixa('Reserva', MESES_CAMPANHA, ['casa', 'cartão']);
  meta.movimentos = [
    Metas.novoMovimento({ tipo: 'aporte', data: '2026-08-05', valor: 4000 }),
    Metas.novoMovimento({ tipo: 'baixa', data: '2026-08-10', valor: 4000, contaId: contas[0].id, conta: contas[0] })
  ];

  var r = Metas.resumoDaCampanha(meta, contas, '2026-09-10'); // agosto já encerrou
  var ago = r.meses[0], set = r.meses[1];

  assert.strictEqual(ago.estado, 'encerrado');
  assert.strictEqual(ago.contribuicao, 0, 'juntou 4.000 e pagou 4.000 -> nada foi pro cofre');
  assert.strictEqual(ago.faixa, 'vermelho');
  assert.strictEqual(set.contas.qtdArrastada, 1, 'a Nubank de agosto foi colada em setembro');
  assert.strictEqual(set.contas.total, 8000, '6.000 de setembro + 2.000 arrastados');
  assert.strictEqual(set.sobraPrevista, 1000, 'a sobra de setembro encolheu de 3.000 pra 1.000');
  assert.strictEqual(r.cofrePrevisto, 7000);
});

teste('RN014-5: o cofre nunca é negativo, nem quando se paga mais do que se juntou', function () {
  var contas = [contaFixa('pagar', 'Conta', 'casa', 5000, '2026-08-10', 'pago')];
  contas[0].pagoEm = '2026-08-10';
  var meta = metaFixa('Reserva', [{ ano: 2026, mes: 8, alvo: 9000 }], ['casa']);
  meta.movimentos = [
    Metas.novoMovimento({ tipo: 'aporte', data: '2026-08-01', valor: 1000 }),
    Metas.novoMovimento({ tipo: 'baixa', data: '2026-08-10', valor: 5000, contaId: contas[0].id, conta: contas[0] })
  ];
  var r = Metas.resumoDaCampanha(meta, contas, '2026-08-15');
  assert.strictEqual(r.saldo, -4000, 'o saldo bruto pode ficar negativo (pagou de fora)');
  assert.strictEqual(r.cofreHoje, 0, 'mas o cofre não: dívida não é dinheiro guardado');
});

teste('RN014-6: mês futuro sem contas é marcado, e não vira "piso R$ 0,00" mentiroso', function () {
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  var r = Metas.resumoDaCampanha(meta, contasDaCampanha().slice(0, 8), '2026-08-01');
  assert.strictEqual(r.meses[1].semContas, true);
  assert.strictEqual(r.meses[1].estado, 'futuro');
  assert.strictEqual(r.meses[1].faixa, 'futuro');
});

secao('RN015 — ritmo real, projeção e dia da virada');

teste('RN015-1: juntando 400/dia, a projeção de agosto é R$ 12.400', function () {
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  meta.movimentos = [];
  for (var d = 1; d <= 10; d++) {
    meta.movimentos.push(Metas.novoMovimento({
      tipo: 'aporte', data: Datas.formatarISO(2026, 8, d), valor: 400
    }));
  }
  var r = Metas.resumoDoMes(meta, contasDaCampanha(), 2026, 8, '2026-08-10');
  assert.strictEqual(r.juntado, 4000);
  assert.strictEqual(r.diasCorridos, 10);
  assert.strictEqual(r.ritmo, 400);
  assert.strictEqual(r.projecao, 12400, '400/dia × 31 dias');
});

teste('RN015-2: dia da virada — quando o juntado passa a cobrir tudo que falta pagar', function () {
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  meta.movimentos = [];
  for (var d = 1; d <= 10; d++) {
    meta.movimentos.push(Metas.novoMovimento({
      tipo: 'aporte', data: Datas.formatarISO(2026, 8, d), valor: 400
    }));
  }
  var r = Metas.resumoDaCampanha(meta, contasDaCampanha(), '2026-08-10');
  var ago = r.meses[0];
  assert.strictEqual(ago.descoberto, 2000, '6.000 de conta − 4.000 em mãos');
  assert.strictEqual(ago.jaVirou, false);
  assert.strictEqual(ago.viradaISO, '2026-08-15', '2.000 ÷ 400 por dia = 5 dias');
});

teste('RN015-3: quem já cobriu as contas está virado, sem data pendente', function () {
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  meta.movimentos = [Metas.novoMovimento({ tipo: 'aporte', data: '2026-08-01', valor: 7000 })];
  var r = Metas.resumoDaCampanha(meta, contasDaCampanha(), '2026-08-02');
  assert.strictEqual(r.meses[0].jaVirou, true);
  assert.strictEqual(r.meses[0].viradaISO, null);
});

secao('RN016 — baixa cruzada: pagar a conta e debitar a caixinha são fatos separados');

teste('RN016-1: conta pendente e sem movimento está "aberta"', function () {
  var contas = contasDaCampanha();
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  assert.strictEqual(Metas.situacaoNaMeta(meta, contas[0]), 'aberta');
});

teste('RN016-2: paga em Contas a Pagar, sem abatimento -> "paga-fora"', function () {
  var contas = contasDaCampanha();
  contas[0].status = 'pago';
  contas[0].pagoEm = '2026-08-05';
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  assert.strictEqual(Metas.situacaoNaMeta(meta, contas[0]), 'paga-fora');
});

teste('RN016-3: paga E debitada da caixinha -> "abatida"', function () {
  var contas = contasDaCampanha();
  contas[0].status = 'pago';
  contas[0].pagoEm = '2026-08-05';
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  meta.movimentos = [Metas.novoMovimento({
    tipo: 'baixa', data: '2026-08-05', valor: 340, contaId: contas[0].id, conta: contas[0]
  })];
  assert.strictEqual(Metas.situacaoNaMeta(meta, contas[0]), 'abatida');
});

teste('RN016-4: debitada mas a conta voltou a pendente -> inconsistência sinalizada', function () {
  var contas = contasDaCampanha();
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  meta.movimentos = [Metas.novoMovimento({
    tipo: 'baixa', data: '2026-08-05', valor: 340, contaId: contas[0].id, conta: contas[0]
  })];
  assert.strictEqual(Metas.situacaoNaMeta(meta, contas[0]), 'abatida-sem-pagamento');
});

teste('RN016-5: a tela sabe quais contas esperam abatimento', function () {
  var contas = contasDaCampanha();
  contas[0].status = 'pago'; contas[0].pagoEm = '2026-08-05';
  contas[1].status = 'pago'; contas[1].pagoEm = '2026-08-10';
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  meta.movimentos = [Metas.novoMovimento({
    tipo: 'baixa', data: '2026-08-05', valor: 340, contaId: contas[0].id, conta: contas[0]
  })];
  var esperando = Metas.pendentesDeAbatimento(meta, contas, 2026, 8);
  assert.strictEqual(esperando.length, 1);
  assert.strictEqual(esperando[0].descricao, 'Água');
});

teste('RN016-6: abater NÃO muda o total pago das contas — muda o saldo da caixinha', function () {
  var contas = contasDaCampanha();
  contas[0].status = 'pago'; contas[0].pagoEm = '2026-08-05';
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  meta.movimentos = [Metas.novoMovimento({ tipo: 'aporte', data: '2026-08-01', valor: 1000 })];

  var antes = Metas.resumoDoMes(meta, contas, 2026, 8, '2026-08-15');
  assert.strictEqual(antes.contas.pago, 340, 'a conta já está paga');
  assert.strictEqual(Metas.saldoDaMeta(meta), 1000, 'mas a caixinha ainda tem tudo');

  meta.movimentos.push(Metas.novoMovimento({
    tipo: 'baixa', data: '2026-08-05', valor: 340, contaId: contas[0].id, conta: contas[0]
  }));
  var depois = Metas.resumoDoMes(meta, contas, 2026, 8, '2026-08-15');
  assert.strictEqual(depois.contas.pago, 340, 'o total pago não muda');
  assert.strictEqual(Metas.saldoDaMeta(meta), 660, 'quem muda é a caixinha');
});

teste('RN016-7: metaQueAbateu impede abater a mesma conta duas vezes', function () {
  var contas = contasDaCampanha();
  var a = metaFixa('Reserva', MESES_CAMPANHA, ['casa'], '2026-07-01T10:00:00.000Z');
  var b = metaFixa('Viagem', MESES_CAMPANHA, ['casa'], '2026-07-20T10:00:00.000Z');
  assert.strictEqual(Metas.metaQueAbateu([a, b], contas[0].id), null);
  a.movimentos = [Metas.novoMovimento({
    tipo: 'baixa', data: '2026-08-05', valor: 340, contaId: contas[0].id, conta: contas[0]
  })];
  assert.strictEqual(Metas.metaQueAbateu([a, b], contas[0].id).nome, 'Reserva');
});

secao('RN018 — desfazer o pagamento devolve o dinheiro à caixinha');

teste('RN018-1: sem o movimento, o saldo volta ao que era', function () {
  var contas = contasDaCampanha();
  contas[0].status = 'pago'; contas[0].pagoEm = '2026-08-05';
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  meta.movimentos = [
    Metas.novoMovimento({ tipo: 'aporte', data: '2026-08-01', valor: 1000 }),
    Metas.novoMovimento({ tipo: 'baixa', data: '2026-08-05', valor: 340, contaId: contas[0].id, conta: contas[0] })
  ];
  assert.strictEqual(Metas.saldoDaMeta(meta), 660);

  // é o que Store.removerMovimentosDaConta faz quando o pagamento é desmarcado
  meta.movimentos = meta.movimentos.filter(function (m) { return m.contaId !== contas[0].id; });
  contas[0].status = 'pendente'; contas[0].pagoEm = null;

  assert.strictEqual(Metas.saldoDaMeta(meta), 1000, 'o dinheiro voltou pra caixinha');
  assert.strictEqual(Metas.situacaoNaMeta(meta, contas[0]), 'aberta', 'e a conta voltou a aberta');
});

teste('RN018-2: se a baixa ficasse de pé, a meta cobraria duas vezes o mesmo dinheiro', function () {
  var contas = contasDaCampanha();
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  meta.movimentos = [
    Metas.novoMovimento({ tipo: 'aporte', data: '2026-08-01', valor: 1000 }),
    Metas.novoMovimento({ tipo: 'baixa', data: '2026-08-05', valor: 340, contaId: contas[0].id, conta: contas[0] })
  ];
  // conta desmarcada SEM devolver: o cenário que a RN018 existe para impedir
  var r = Metas.resumoDoMes(meta, contas, 2026, 8, '2026-08-15');
  assert.strictEqual(r.contas.falta, 6000, 'a conta voltou a ser cobrada por inteiro');
  assert.strictEqual(Metas.saldoDaMeta(meta), 660, 'mas o dinheiro dela continuava debitado');
  assert.strictEqual(Metas.situacaoNaMeta(meta, contas[0]), 'abatida-sem-pagamento',
    'por isso este estado é sinalizado na tela em vez de passar batido');
});

secao('RN017 / F3 — dinheiro movimentado não é desfeito por mudança de filtro');

teste('RN017-1: conta com baixa continua na meta mesmo mudando de categoria', function () {
  var contas = contasDaCampanha();
  var meta = metaFixa('Reserva', MESES_CAMPANHA, ['casa']);
  var aluguel = contas[5];
  meta.movimentos = [Metas.novoMovimento({
    tipo: 'baixa', data: '2026-08-20', valor: aluguel.valor, contaId: aluguel.id, conta: aluguel
  })];

  aluguel.categoria = 'lazer';  // 'lazer' NÃO está na seleção
  assert.strictEqual(Metas.contaEntra(meta, aluguel), true,
    'a conta tem dinheiro movimentado — não pode sair sozinha');
});

teste('RN017-2: e nem por exclusão manual, enquanto o movimento existir', function () {
  var contas = contasDaCampanha();
  var meta = metaFixa('Reserva', MESES_CAMPANHA, ['casa']);
  var aluguel = contas[5];
  meta.movimentos = [Metas.novoMovimento({
    tipo: 'baixa', data: '2026-08-20', valor: aluguel.valor, contaId: aluguel.id, conta: aluguel
  })];
  meta.selecao.excluidas = [aluguel.id];
  assert.strictEqual(Metas.contaEntra(meta, aluguel), true);
});

teste('RN017-3: sem movimento, a exclusão manual funciona normalmente', function () {
  var contas = contasDaCampanha();
  var meta = metaFixa('Reserva', MESES_CAMPANHA, ['casa']);
  meta.selecao.excluidas = [contas[5].id];
  assert.strictEqual(Metas.contaEntra(meta, contas[5]), false);
});

secao('RN019 / F2 — o extrato sobrevive à exclusão da conta');

teste('RN019-1: o movimento guarda a fotografia da conta', function () {
  var conta = contaFixa('pagar', 'Energia', 'casa', 340, '2026-08-05', 'pago');
  var mov = Metas.novoMovimento({ tipo: 'baixa', data: '2026-08-05', valor: 340, contaId: conta.id, conta: conta });
  assert.strictEqual(mov.foto.descricao, 'Energia');
  assert.strictEqual(mov.foto.valor, 340);
  assert.strictEqual(mov.foto.vencimento, '2026-08-05');
});

teste('RN019-2: apagada a conta, o extrato continua fechando', function () {
  var conta = contaFixa('pagar', 'Energia', 'casa', 340, '2026-08-05', 'pago');
  var meta = metaFixa('Reserva', [{ ano: 2026, mes: 8, alvo: 9000 }], ['casa']);
  meta.movimentos = [
    Metas.novoMovimento({ tipo: 'aporte', data: '2026-08-01', valor: 1000 }),
    Metas.novoMovimento({ tipo: 'baixa', data: '2026-08-05', valor: 340, contaId: conta.id, conta: conta })
  ];
  // a conta some do sistema; o extrato não pode sumir junto
  var r = Metas.resumoDaCampanha(meta, [], '2026-08-10');
  assert.strictEqual(r.saldo, 660);
  var linhas = Metas.extrato(meta);
  assert.strictEqual(linhas.length, 2);
  assert.strictEqual(linhas[1].movimento.foto.descricao, 'Energia');
  assert.strictEqual(linhas[1].acumulado, 660);
});

secao('D007.4 — extrato único: todo número de painel é conferível linha a linha');

teste('D007.4-1: aporte soma, retirada e baixa subtraem, e o acumulado fecha', function () {
  var meta = metaFixa('Reserva', [{ ano: 2026, mes: 8, alvo: 9000 }], ['casa']);
  meta.movimentos = [
    Metas.novoMovimento({ tipo: 'aporte', data: '2026-08-01', valor: 400 }),
    Metas.novoMovimento({ tipo: 'aporte', data: '2026-08-02', valor: 400 }),
    Metas.novoMovimento({ tipo: 'baixa', data: '2026-08-05', valor: 340 }),
    Metas.novoMovimento({ tipo: 'aporte', data: '2026-08-06', valor: 400 }),
    Metas.novoMovimento({ tipo: 'retirada', data: '2026-08-12', valor: 200 })
  ];
  var linhas = Metas.extrato(meta);
  assert.deepStrictEqual(linhas.map(function (l) { return l.acumulado; }), [400, 800, 460, 860, 660]);
  assert.strictEqual(Metas.saldoDaMeta(meta), 660);
  assert.strictEqual(linhas[linhas.length - 1].acumulado, Metas.saldoDaMeta(meta),
    'o fim do extrato TEM que ser o saldo — se divergir, algum painel está mentindo');
});

teste('D007.4-2: valor entra sempre positivo; quem dá a direção é o tipo', function () {
  var m = Metas.novoMovimento({ tipo: 'retirada', data: '2026-08-01', valor: -500 });
  assert.strictEqual(m.valor, 500);
  assert.strictEqual(Metas.efeito(m), -500);
});

secao('RN020 — conta que entra sozinha é sinalizada, não some no meio');

teste('RN020-1: meta ainda não fotografada não acusa o acervo inteiro como novidade', function () {
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  assert.strictEqual(Metas.contasNovas(meta, contasDaCampanha()).length, 0);
});

teste('RN020-2: depois da fotografia, conta nova na categoria marcada é acusada', function () {
  var contas = contasDaCampanha();
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  meta.contasConhecidas = Metas.idsDasContasDaMeta(meta, contas);
  meta.snapshotEm = '2026-08-01T10:00:00.000Z';
  assert.strictEqual(Metas.contasNovas(meta, contas).length, 0, 'nada mudou ainda');

  contas.push(contaFixa('pagar', 'IPVA 2/3', 'casa', 600, '2026-10-18', 'pendente'));
  var novas = Metas.contasNovas(meta, contas);
  assert.strictEqual(novas.length, 1);
  assert.strictEqual(novas[0].conta.descricao, 'IPVA 2/3');
  assert.strictEqual(novas[0].mes, 10);
});

teste('RN020-3: o impacto vem agrupado por mês, com o total que encolheu a sobra', function () {
  var contas = contasDaCampanha();
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  meta.contasConhecidas = Metas.idsDasContasDaMeta(meta, contas);
  meta.snapshotEm = '2026-08-01T10:00:00.000Z';

  contas.push(contaFixa('pagar', 'IPVA', 'casa', 600, '2026-10-18', 'pendente'));
  contas.push(contaFixa('pagar', 'Dentista', 'outros', 250, '2026-10-20', 'pendente'));
  var impacto = Metas.impactoDasContasNovas(meta, contas);

  assert.strictEqual(impacto.length, 1, 'as duas caem no mesmo mês');
  assert.strictEqual(impacto[0].mes, 10);
  assert.strictEqual(impacto[0].total, 850);

  // a sobra de outubro era 9.000 − 6.600 = 2.400; agora é 1.550
  var r = Metas.resumoDaCampanha(meta, contas, '2026-08-01');
  assert.strictEqual(r.meses[2].sobraPrevista, 1550);
});

secao('RN021 — mês no vermelho: as contas passam da caixinha');

teste('RN021-1: mês cujas contas superam o alvo aparece na lista de risco', function () {
  var contas = contasDaCampanha();
  contas.push(contaFixa('pagar', 'Conserto do carro', 'casa', 3000, '2026-10-20', 'pendente'));
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  var r = Metas.resumoDaCampanha(meta, contas, '2026-08-01');

  var risco = Metas.mesesEmRisco(r);
  assert.strictEqual(risco.length, 1);
  assert.strictEqual(risco[0].mes, 10);
  assert.strictEqual(risco[0].sobraPrevista, -600, '9.600 de conta contra caixinha de 9.000');
});

teste('RN021-2: mês sem contas lançadas NÃO conta como risco', function () {
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  var r = Metas.resumoDaCampanha(meta, contasDaCampanha().slice(0, 8), '2026-08-01');
  assert.strictEqual(Metas.mesesEmRisco(r).length, 0);
});

secao('RN022 — até onde o dinheiro em mãos alcança');

teste('RN022-1: paga por ordem de vencimento e marca onde o dinheiro acaba', function () {
  var contas = contasDaCampanha().slice(0, 8);   // 6.000 em agosto
  var alcance = Metas.ateOndeAlcanca(contas, 4000);

  assert.strictEqual(alcance.cobertas.length, 7, 'as 7 primeiras somam 3.900');
  assert.strictEqual(alcance.cortada.descricao, 'Fatura Nubank');
  assert.strictEqual(alcance.faltam, 2000, '2.100 − 100 que sobraram');
  assert.strictEqual(centavos(alcance.sobra), '100.00');
  assert.strictEqual(alcance.cobreTudo, false);
});

teste('RN022-2: com dinheiro para tudo, não há corte', function () {
  var alcance = Metas.ateOndeAlcanca(contasDaCampanha().slice(0, 8), 10000);
  assert.strictEqual(alcance.cobreTudo, true);
  assert.strictEqual(alcance.cortada, null);
  assert.strictEqual(alcance.sobra, 4000);
});

teste('RN022-3: sem dinheiro nenhum, a primeira já é a cortada', function () {
  var alcance = Metas.ateOndeAlcanca(contasDaCampanha().slice(0, 8), 0);
  assert.strictEqual(alcance.cobertas.length, 0);
  assert.strictEqual(alcance.cortada.descricao, 'Energia');
  assert.strictEqual(alcance.faltam, 340);
});

secao('RN023 — relatório: série do mês, sequência e simulador');

teste('RN023-1: a série acumula o real e desenha a linha ideal do plano', function () {
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  meta.movimentos = [
    Metas.novoMovimento({ tipo: 'aporte', data: '2026-08-01', valor: 400 }),
    Metas.novoMovimento({ tipo: 'aporte', data: '2026-08-03', valor: 600 })
  ];
  var serie = Metas.serieAcumulada(meta, 2026, 8);

  assert.strictEqual(serie.length, 31);
  assert.strictEqual(serie[0].real, 400);
  assert.strictEqual(serie[1].real, 400, 'dia sem lançamento mantém o acumulado');
  assert.strictEqual(serie[2].real, 1000);
  assert.strictEqual(serie[30].real, 1000);
  assert.strictEqual(centavos(serie[30].ideal), '9000.00', 'a linha ideal fecha no alvo');
  assert.strictEqual(centavos(serie[0].ideal), '290.32');
});

teste('RN023-2: sequência conta dias seguidos e ontem ainda vale', function () {
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  meta.movimentos = ['2026-08-08', '2026-08-09', '2026-08-10'].map(function (d) {
    return Metas.novoMovimento({ tipo: 'aporte', data: d, valor: 100 });
  });

  var hoje = Metas.sequenciaDeDias(meta, '2026-08-10');
  assert.strictEqual(hoje.dias, 3);
  assert.strictEqual(hoje.lancouHoje, true);

  var amanha = Metas.sequenciaDeDias(meta, '2026-08-11');
  assert.strictEqual(amanha.dias, 3, 'ainda não lançou hoje, mas lançou ontem');
  assert.strictEqual(amanha.lancouHoje, false);

  var depois = Metas.sequenciaDeDias(meta, '2026-08-12');
  assert.strictEqual(depois.dias, 0, 'um dia inteiro em branco quebra a sequência');
});

teste('RN023-3: simulador — 400/dia fecha agosto em 12.400 e leva o cofre a 15.400', function () {
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  var r = Metas.resumoDaCampanha(meta, contasDaCampanha(), '2026-08-01');
  assert.strictEqual(r.cofrePrevisto, 12000, 'linha de base');

  var s = Metas.simular(r, 400, '2026-08-01');
  assert.strictEqual(s.fechaCom, 12400, '400 × 31 dias');
  assert.strictEqual(s.acimaDoAlvo, 3400);
  assert.strictEqual(s.cofre, 15400, 'bate com o cenário real da RN014-2');
});

teste('RN023-4: simulador com pouco por dia derruba o cofre na mesma proporção', function () {
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA);
  var r = Metas.resumoDaCampanha(meta, contasDaCampanha(), '2026-08-01');
  var s = Metas.simular(r, 100, '2026-08-01');
  assert.strictEqual(s.fechaCom, 3100);
  assert.strictEqual(s.cofre, 12000 + (3100 - 9000));
  assert.ok(s.cofre < r.cofrePrevisto);
});

secao('RN024 — duplicar campanha');

teste('RN024-1: os meses deslocam para depois do fim, mantendo os buracos', function () {
  var meta = metaFixa('Reserva', MESES_CAMPANHA, CATS_CAMPANHA); // ago,set,out,nov/2026
  var novos = Metas.mesesParaDuplicar(meta);
  assert.deepStrictEqual(novos.map(function (m) { return m.ano + '-' + m.mes; }),
    ['2026-12', '2027-1', '2027-2', '2027-3']);
  assert.deepStrictEqual(novos.map(function (m) { return m.alvo; }), [9000, 9000, 9000, 8000]);
});

teste('RN024-2: campanha com mês pulado mantém o buraco na cópia', function () {
  var meta = metaFixa('Viagem', [
    { ano: 2026, mes: 11, alvo: 300 },
    { ano: 2027, mes: 1, alvo: 400 }     // dezembro pulado
  ], ['casa']);
  var novos = Metas.mesesParaDuplicar(meta);
  assert.deepStrictEqual(novos.map(function (m) { return m.ano + '-' + m.mes; }),
    ['2027-2', '2027-4']);
});

secao('Datas — funções novas usadas pelo motor de metas');

teste('DATAS-1: diasEntre conta na direção certa e somarDias atravessa o mês', function () {
  assert.strictEqual(Datas.diasEntre('2026-08-01', '2026-08-31'), 30);
  assert.strictEqual(Datas.diasEntre('2026-08-31', '2026-08-01'), -30);
  assert.strictEqual(Datas.somarDias('2026-08-30', 3), '2026-09-02');
  assert.strictEqual(Datas.somarDias('2026-03-01', -1), '2026-02-28');
});

// ============================================================
process.stdout.write('\n' + '='.repeat(60) + '\n');
if (falhas.length === 0) {
  process.stdout.write('TUDO PASSOU — ' + total + ' de ' + total + ' testes\n');
} else {
  process.stdout.write('FALHAS: ' + falhas.length + ' de ' + total + '\n');
  falhas.forEach(function (f) { process.stdout.write('  - ' + f.nome + ': ' + f.erro.message + '\n'); });
  process.exitCode = 1;
}
process.stdout.write('='.repeat(60) + '\n');
