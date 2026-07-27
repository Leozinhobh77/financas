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
process.stdout.write('\n' + '='.repeat(60) + '\n');
if (falhas.length === 0) {
  process.stdout.write('TUDO PASSOU — ' + total + ' de ' + total + ' testes\n');
} else {
  process.stdout.write('FALHAS: ' + falhas.length + ' de ' + total + '\n');
  falhas.forEach(function (f) { process.stdout.write('  - ' + f.nome + ': ' + f.erro.message + '\n'); });
  process.exitCode = 1;
}
process.stdout.write('='.repeat(60) + '\n');
