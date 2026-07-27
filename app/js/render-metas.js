/**
 * Render das METAS. Separado de render.js porque o módulo é grande e tem vocabulário próprio
 * (caixinha / contas / sobra / cofre) — misturar tornaria os dois difíceis de ler.
 *
 * Reaproveita as classes `.pp` do painel do período, que já passaram pelo teste de valor
 * cortado nas 8 larguras (ver testes/e2e/test_sem_corte.py e D005). Painel novo não reinventa
 * tipografia de dinheiro: herda a que já foi provada.
 */
(function (global) {
  'use strict';

  var esc = global.Render.esc;

  function classeFaixa(faixa) {
    if (faixa === 'verde') return 'sem-ok';
    if (faixa === 'amarelo') return 'sem-atencao';
    if (faixa === 'vermelho') return 'sem-critico';
    return 'sem-futuro';
  }

  function rotuloEstado(estado) {
    if (estado === 'encerrado') return 'encerrado';
    if (estado === 'corrente') return 'em curso';
    return 'a chegar';
  }

  function nomeMesCurto(ano, mes, comAno) {
    return Metas.rotuloMes(ano, mes, comAno);
  }

  // ============================================================
  // LISTA DE CAMPANHAS
  // ============================================================

  function periodoDaCampanha(meta) {
    var meses = Metas.mesesOrdenados(meta);
    if (!meses.length) return 'sem meses';
    var comAno = Metas.campanhaCruzaAno(meta);
    var a = meses[0], b = meses[meses.length - 1];
    var faixa = meses.length === 1
      ? nomeMesCurto(a.ano, a.mes, true)
      : nomeMesCurto(a.ano, a.mes, comAno) + '–' + nomeMesCurto(b.ano, b.mes, comAno);
    return faixa + ' · ' + meses.length + (meses.length === 1 ? ' mês' : ' meses');
  }

  function cardMeta(meta, resumo) {
    var pct = Math.max(0, Math.min(1, resumo.totalAlvo > 0 ? (resumo.cofreHoje / Math.max(1, resumo.cofrePrevisto)) : 0));
    var corrente = resumo.mesCorrente;

    var situacao;
    if (resumo.encerrada) {
      situacao = '<span class="mt-situacao">campanha encerrada</span>';
    } else if (!corrente) {
      situacao = '<span class="mt-situacao">ainda não começou</span>';
    } else if (corrente.metaPorDia > 0) {
      situacao = '<span class="mt-situacao ' + classeFaixa(corrente.faixa) + '">' +
        Icones.get('raio') + 'faltam ' + Formatar.dinheiro(corrente.metaPorDia) + ' hoje</span>';
    } else {
      situacao = '<span class="mt-situacao sem-ok">' + Icones.get('check') +
        nomeMesCurto(corrente.ano, corrente.mes, false) + ' batido</span>';
    }

    return (
      '<article class="mt" data-acao="abrir-meta" data-id="' + meta.id + '" tabindex="0" role="button">' +
        '<div class="mt-cabeca">' +
          '<span class="mt-nome">' + Icones.get('alvo') + esc(meta.nome) + '</span>' +
          '<span class="mt-periodo">' + esc(periodoDaCampanha(meta)) + '</span>' +
        '</div>' +
        Graficos.barraProgresso(pct) +
        '<div class="mt-rodape">' +
          '<span class="mt-cofre">cofre <strong>' + Formatar.dinheiro(resumo.cofreHoje) + '</strong>' +
            ' <em>de ' + Formatar.dinheiro(resumo.cofrePrevisto) + '</em></span>' +
          situacao +
        '</div>' +
      '</article>'
    );
  }

  function listaDeMetas(pares) {
    if (!pares.length) {
      return (
        '<div class="vazio">' + Icones.get('alvo') +
          '<p class="vazio-titulo">Nenhuma meta ainda</p>' +
          '<p class="vazio-dica">Uma meta junta dinheiro num período e mostra o que <strong>sobra</strong> ' +
            'depois de pagar as contas. Toque em <strong>Nova meta</strong> para criar a primeira.</p>' +
        '</div>'
      );
    }
    return '<div class="mt-lista">' + pares.map(function (p) {
      return cardMeta(p.meta, p.resumo);
    }).join('') + '</div>';
  }

  // ============================================================
  // VISÃO GERAL DA CAMPANHA
  // ============================================================

  /**
   * O herói da campanha. O número grande é o COFRE PREVISTO — é ele o propósito da meta.
   * Logo abaixo, o que já está em mãos, porque previsão sem realizado é só otimismo.
   */
  function heroiCofre(resumo) {
    var temRealizado = resumo.cofreHoje > 0 || resumo.totalJuntado > 0;
    var fracao = resumo.cofrePrevisto > 0
      ? Math.max(0, Math.min(1, resumo.cofreHoje / resumo.cofrePrevisto)) : 0;

    var ultimo = resumo.meses[resumo.meses.length - 1];
    var quando = ultimo
      ? 'ao fim de ' + Datas.nomeMes(ultimo.mes) + (Metas.campanhaCruzaAno(resumo.meta) ? ' de ' + ultimo.ano : '')
      : '';

    return (
      '<section class="pp pp--cofre">' +
        '<div class="pp-cabeca">' +
          '<span class="pp-escopo">' + Icones.get('cofre') + 'Cofre previsto</span>' +
          '<span class="pp-qtd">' + resumo.qtdMeses + (resumo.qtdMeses === 1 ? ' mês' : ' meses') + '</span>' +
        '</div>' +

        '<div class="pp-principal">' +
          '<span class="pp-principal-valor' + (resumo.cofrePrevisto >= 0 ? ' v-positivo' : '') + '">' +
            Formatar.dinheiro(resumo.cofrePrevisto) + '</span>' +
          '<span class="pp-principal-rotulo">' + esc(quando) + '</span>' +
        '</div>' +

        (temRealizado
          ? Graficos.barraProgresso(fracao) +
            '<div class="pp-progresso-nota">' +
              '<span>' + Formatar.dinheiro(resumo.cofreHoje) + ' já em mãos</span>' +
              '<span>' + Math.round(fracao * 100) + '% do previsto</span>' +
            '</div>'
          : '') +

        '<div class="pp-blocos">' +
          '<div class="pp-bloco">' +
            '<span class="pp-bloco-rotulo">Vou juntar</span>' +
            '<span class="pp-bloco-valor">' + Formatar.dinheiro(resumo.totalAlvo) + '</span>' +
            '<span class="pp-bloco-nota">' + resumo.qtdMeses + ' caixinha(s)</span>' +
          '</div>' +
          '<div class="pp-bloco">' +
            '<span class="pp-bloco-rotulo">Vou pagar</span>' +
            '<span class="pp-bloco-valor">' + Formatar.dinheiro(resumo.totalContas) + '</span>' +
            '<span class="pp-bloco-nota">' +
              (resumo.emAberto > 0 ? Formatar.dinheiro(resumo.emAberto) + ' em aberto' : 'tudo resolvido') +
            '</span>' +
          '</div>' +
        '</div>' +
      '</section>'
    );
  }

  /**
   * A ESCADA DO COFRE — o coração da visão geral. Em quatro linhas o usuário lê de onde vem
   * cada real do cofre, e quando um mês rende menos, o motivo está logo embaixo.
   *
   * Cada degrau tem duas linhas de propósito: em cima o mês e o acumulado (os dois números
   * que se lê de relance), embaixo a conta que gerou o degrau (que pode quebrar linha sem
   * cortar nada).
   */
  function escadaDoCofre(resumo) {
    var comAno = Metas.campanhaCruzaAno(resumo.meta);

    var degraus = resumo.escada.map(function (l) {
      var delta = l.contribuicaoPrevista;
      var classeDelta = delta > 0 ? 'v-positivo' : (delta < 0 ? 'v-negativo' : '');
      var sinalDelta = delta > 0 ? '+' : '';

      var formula = l.semContas
        ? '<span class="esc-parte">caixinha ' + Formatar.dinheiro(l.alvo) + '</span>' +
          '<span class="esc-op">·</span>' +
          '<span class="esc-parte esc-parte--fraca">ainda sem contas lançadas</span>'
        : '<span class="esc-parte">caixinha ' + Formatar.dinheiro(l.alvo) + '</span>' +
          '<span class="esc-op">−</span>' +
          '<span class="esc-parte">contas ' + Formatar.dinheiro(l.contas) + '</span>';

      var arrasto = l.qtdArrastada > 0
        ? '<div class="esc-nota esc-nota--alerta">' + Icones.get('alerta') +
            'inclui ' + Formatar.dinheiro(l.arrastado) + ' que sobrou do mês anterior</div>'
        : '';

      var divergencia = (l.estado === 'encerrado' && Math.abs(l.diferenca) >= 0.01)
        ? '<div class="esc-nota ' + (l.diferenca >= 0 ? 'esc-nota--ok' : 'esc-nota--ruim') + '">' +
            (l.diferenca >= 0 ? 'fechou ' + Formatar.dinheiro(l.diferenca) + ' acima do previsto'
                              : 'fechou ' + Formatar.dinheiro(Math.abs(l.diferenca)) + ' abaixo do previsto') +
          '</div>'
        : '';

      return (
        '<li class="esc esc--' + l.estado + '">' +
          '<div class="esc-topo">' +
            '<span class="esc-mes">' + esc(nomeMesCurto(l.ano, l.mes, comAno)) + '</span>' +
            '<span class="esc-selo ' + classeFaixa(l.faixa) + '">' + rotuloEstado(l.estado) + '</span>' +
            '<span class="esc-acum">' + Formatar.dinheiro(l.acumulado) + '</span>' +
          '</div>' +
          '<div class="esc-baixo">' +
            formula +
            '<span class="esc-delta ' + classeDelta + '">' + sinalDelta + Formatar.dinheiro(delta) + '</span>' +
          '</div>' +
          arrasto + divergencia +
        '</li>'
      );
    }).join('');

    return (
      '<section class="cartao">' +
        '<div class="secao-cabeca"><h2 class="secao-titulo">Como o cofre enche</h2></div>' +
        '<ol class="esc-lista">' + degraus + '</ol>' +
        '<p class="esc-legenda">' + Icones.get('cofre') +
          'A coluna da direita é o cofre acumulado ao fim de cada mês.</p>' +
      '</section>'
    );
  }

  /**
   * Gráfico do cofre enchendo: uma barra por mês, altura = cofre acumulado ao fim dele.
   * A parte cheia é o que já aconteceu; a esmaecida é o previsto. Mesma técnica em divs de
   * `barrasSemana` — nada de SVG, porque aqui a barra é retangular e o CSS resolve melhor.
   */
  function graficoCofre(resumo) {
    var comAno = Metas.campanhaCruzaAno(resumo.meta);
    var maior = resumo.escada.reduce(function (m, l) { return Math.max(m, l.acumulado); }, 0);
    if (maior <= 0) return '';

    var realizadoAcum = 0;
    var barras = resumo.escada.map(function (l) {
      if (l.temRealizado) realizadoAcum += l.realizado;
      var altura = Math.max(0, (l.acumulado / maior) * 100);
      var fracaoReal = l.acumulado > 0 ? Math.max(0, Math.min(1, realizadoAcum / l.acumulado)) : 0;

      var titulo = nomeMesCurto(l.ano, l.mes, true) + ': cofre ' + Formatar.dinheiro(l.acumulado) +
        (l.temRealizado ? ' · ' + Formatar.dinheiro(realizadoAcum) + ' realizado' : ' · previsto');

      return (
        '<div class="barra' + (l.estado === 'corrente' ? ' barra--atual' : '') + '" title="' + esc(titulo) + '">' +
          '<div class="barra-valor">' + Formatar.dinheiro(l.acumulado).replace('R$ ', '') + '</div>' +
          '<div class="barra-trilho">' +
            '<div class="barra-preenchida" style="height:' + altura.toFixed(1) + '%">' +
              '<div class="barra-paga" style="height:' + (fracaoReal * 100).toFixed(1) + '%"></div>' +
            '</div>' +
          '</div>' +
          '<div class="barra-rotulo">' + esc(nomeMesCurto(l.ano, l.mes, comAno)) + '</div>' +
          '<div class="barra-marca-linha">' +
            (l.estado === 'corrente' ? '<span class="barra-marca barra-marca--atual">▲</span>' : '') +
          '</div>' +
        '</div>'
      );
    }).join('');

    return (
      '<section class="cartao">' +
        '<div class="secao-cabeca"><h2 class="secao-titulo">O cofre mês a mês</h2></div>' +
        '<div class="barras">' + barras + '</div>' +
        '<p class="esc-legenda"><span class="leg-amostra leg-amostra--cheia"></span>realizado' +
          '<span class="leg-amostra leg-amostra--vazia"></span>previsto</p>' +
      '</section>'
    );
  }

  /** Chips de navegação: [Geral] ago set out nov. Abre sozinho no mês corrente. */
  function seletorMeses(resumo, ativo) {
    var comAno = Metas.campanhaCruzaAno(resumo.meta);
    var chips = resumo.meses.map(function (r) {
      var chave = r.ano + '-' + r.mes;
      return '<button type="button" class="chip chip--mes' + (ativo === chave ? ' ativo' : '') +
             ' ' + classeFaixa(r.faixa) + '" data-mes="' + chave + '">' +
             esc(nomeMesCurto(r.ano, r.mes, comAno)) +
             (r.estado === 'corrente' ? '<span class="chip-ponto" aria-label="mês atual"></span>' : '') +
             '</button>';
    }).join('');

    return (
      '<div class="chips chips--meses">' +
        '<button type="button" class="chip' + (ativo === 'geral' ? ' ativo' : '') + '" data-mes="geral">Geral</button>' +
        chips +
      '</div>'
    );
  }

  // ============================================================
  // PAINEL DE UM MÊS
  // ============================================================

  function blocoLargo(classeExtra, rotulo, valorHTML, nota) {
    return (
      '<div class="pp-bloco pp-bloco--largo' + (classeExtra ? ' ' + classeExtra : '') + '">' +
        '<span class="pp-bloco-rotulo">' + rotulo + '</span>' +
        '<span class="pp-bloco-linha">' + valorHTML +
          '<span class="pp-bloco-nota">' + esc(nota) + '</span>' +
        '</span>' +
      '</div>'
    );
  }

  function bloco(rotulo, valorHTML, nota) {
    return (
      '<div class="pp-bloco">' +
        '<span class="pp-bloco-rotulo">' + rotulo + '</span>' +
        valorHTML +
        '<span class="pp-bloco-nota">' + esc(nota) + '</span>' +
      '</div>'
    );
  }

  /**
   * O painel de um mês da campanha. O número grande é a SOBRA — o propósito — e não o quanto
   * falta juntar: quem monta uma meta de 9.000 para pagar 6.000 quer olhar os 3.000.
   */
  function painelDoMes(r, meta) {
    var comAno = true;
    var titulo = Formatar.capitalizar(Datas.nomeMes(r.mes)) + ' de ' + r.ano;
    var dias = r.diasRestantes + (r.diasRestantes === 1 ? ' dia restante' : ' dias restantes');

    // Destaque: o que exige ação hoje. Encerrado não tem "hoje", então mostra o que ficou.
    var destaque;
    if (r.estado === 'encerrado') {
      destaque = blocoLargo(
        r.contas.falta > 0 ? 'pp-bloco--meta sem-critico' : 'pp-bloco--meta sem-ok',
        Icones.get('calendario') + 'Ficou em aberto',
        '<span class="pp-bloco-valor' + (r.contas.falta > 0 ? '' : ' v-positivo') + '">' +
          Formatar.dinheiro(r.contas.falta) + '</span>',
        'mês encerrado'
      );
    } else if (r.faltaJuntar <= 0 && r.alvo > 0) {
      destaque = blocoLargo(
        'pp-bloco--meta sem-ok',
        Icones.get('check') + 'Caixinha batida',
        '<span class="pp-bloco-valor v-positivo">' + Formatar.dinheiro(r.excedente) + '</span>',
        r.excedente > 0 ? 'de excedente, vai pro cofre' : 'no alvo'
      );
    } else {
      destaque = blocoLargo(
        'pp-bloco--meta ' + classeFaixa(r.faixa === 'futuro' ? 'verde' : r.faixa),
        Icones.get('raio') + 'Juntar hoje',
        '<span class="pp-bloco-valor">' + Formatar.dinheiro(r.metaPorDia) + '</span>',
        dias
      );
    }

    // O piso: o mínimo para não ficar devendo. Só aparece quando existe descoberto — em mês
    // sem contas lançadas ele seria "R$ 0,00", que é mentira, não boa notícia (D007.9).
    var piso = '';
    if (r.estado !== 'encerrado' && r.descoberto > 0) {
      // Rótulo curto de propósito: "Mínimo pra não ficar devendo" não cabe em 320px e a frase
      // inteira empurrava a página para o lado. O sentido foi para a nota, que tem mais espaço.
      piso = blocoLargo(
        'pp-bloco--piso',
        Icones.get('alerta') + 'Mínimo do dia',
        '<span class="pp-bloco-valor">' + Formatar.dinheiro(r.pisoPorDia) + '</span>',
        'pra não ficar devendo'
      );
    }

    var notaSobra = r.semContas
      ? 'ainda sem contas lançadas'
      : (r.sobraPrevista >= 0 ? 'é isso que fica no cofre' : 'as contas passam da caixinha');

    var ritmo = '';
    if (r.estado === 'corrente' && r.ritmo > 0) {
      var acima = r.projecao - r.alvo;
      ritmo = '<p class="mes-ritmo ' + (acima >= 0 ? 'sem-ok' : 'sem-atencao') + '">' +
        Icones.get(acima >= 0 ? 'subir' : 'descer') +
        '<span class="ms-texto">' +
          'Seu ritmo: <strong>' + Formatar.dinheiro(r.ritmo) + '/dia</strong>. ' +
          'Nesse passo o mês fecha com <strong>' + Formatar.dinheiro(r.projecao) + '</strong>' +
          (Math.abs(acima) >= 0.01
            ? ' — ' + Formatar.dinheiro(Math.abs(acima)) + (acima >= 0 ? ' acima' : ' abaixo') + ' da caixinha.'
            : '.') +
        '</span>' +
        '</p>';
    }

    var virada = '';
    if (r.estado !== 'encerrado' && !r.semContas) {
      if (r.jaVirou) {
        virada = '<p class="mes-virada sem-ok">' + Icones.get('sol_nascente') +
          '<span class="ms-texto">Suas contas deste mês já estão <strong>garantidas</strong> ' +
          'pelo que você tem em mãos.</span></p>';
      } else if (r.viradaISO) {
        virada = '<p class="mes-virada">' + Icones.get('sol_nascente') +
          '<span class="ms-texto">No seu ritmo, a partir de <strong>' +
          Formatar.dataCurta(r.viradaISO) + '</strong> as contas do mês ficam garantidas.</span></p>';
      }
    }

    var cobertura = r.semContas ? '' : (
      '<div class="mes-cobertura ' + (r.descoberto > 0 ? 'sem-critico' : 'sem-ok') + '">' +
        '<div class="mc-linha"><span>Em mãos agora</span><span class="num">' +
          Formatar.dinheiro(r.saldo) + '</span></div>' +
        '<div class="mc-linha"><span>Ainda devo</span><span class="num">' +
          Formatar.dinheiro(r.contas.falta) + '</span></div>' +
        '<div class="mc-linha mc-linha--forte"><span>' +
          (r.descoberto > 0 ? Icones.get('alerta') + 'Falta pra cobrir' : Icones.get('check') + 'Coberto, sobrando') +
        '</span><span class="num">' +
          Formatar.dinheiro(r.descoberto > 0 ? r.descoberto : (r.saldo - r.contas.falta)) +
        '</span></div>' +
      '</div>'
    );

    return (
      '<section class="pp pp--mes">' +
        '<div class="pp-cabeca">' +
          '<span class="pp-escopo">' + esc(titulo) + '</span>' +
          '<span class="pp-qtd">' + r.contas.qtd + (r.contas.qtd === 1 ? ' conta' : ' contas') + '</span>' +
        '</div>' +

        '<div class="pp-principal">' +
          '<span class="pp-principal-rotulo">Sobra de ' + esc(Datas.nomeMes(r.mes)) + '</span>' +
          '<span class="pp-principal-valor' + (r.sobraPrevista >= 0 ? ' v-positivo' : ' v-negativo') + '">' +
            Formatar.dinheiro(r.sobraPrevista) + '</span>' +
          '<span class="pp-principal-nota">' + esc(notaSobra) + '</span>' +
        '</div>' +

        (r.alvo > 0
          ? Graficos.barraProgresso(Math.min(1, r.progresso)) +
            '<div class="pp-progresso-nota">' +
              '<span>' + Formatar.dinheiro(r.juntado) + ' de ' + Formatar.dinheiro(r.alvo) + '</span>' +
              '<span>' + Math.round(r.progresso * 100) + '% da caixinha</span>' +
            '</div>'
          : '') +

        '<div class="pp-blocos">' +
          destaque + piso +
          bloco('Caixinha', '<span class="pp-bloco-valor">' + Formatar.dinheiro(r.alvo) + '</span>',
                r.faltaJuntar > 0 ? 'faltam ' + Formatar.dinheiro(r.faltaJuntar) : 'alvo alcançado') +
          bloco('Já juntei', '<span class="pp-bloco-valor v-positivo">' + Formatar.dinheiro(r.juntado) + '</span>',
                r.retirado > 0 ? Formatar.dinheiro(r.retirado) + ' retirado' : 'no mês') +
          bloco('Contas', '<span class="pp-bloco-valor">' + Formatar.dinheiro(r.contas.total) + '</span>',
                r.contas.qtdArrastada > 0
                  ? r.contas.qtdArrastada + ' veio de antes'
                  : (r.contas.qtdAtrasada > 0 ? r.contas.qtdAtrasada + ' atrasada(s)' : 'do mês')) +
          bloco('Já paguei', '<span class="pp-bloco-valor v-positivo">' + Formatar.dinheiro(r.contas.pago) + '</span>',
                r.contas.qtdPaga + ' conta(s)') +
        '</div>' +

        cobertura + ritmo + virada +
      '</section>'
    );
  }

  global.RenderMetas = {
    painelDoMes: painelDoMes,
    listaDeMetas: listaDeMetas,
    cardMeta: cardMeta,
    heroiCofre: heroiCofre,
    escadaDoCofre: escadaDoCofre,
    graficoCofre: graficoCofre,
    seletorMeses: seletorMeses,
    periodoDaCampanha: periodoDaCampanha,
    classeFaixa: classeFaixa,
    nomeMesCurto: nomeMesCurto
  };
})(typeof window !== 'undefined' ? window : globalThis);
