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

  // ============================================================
  // CONTAS DENTRO DA META (baixa cruzada)
  // ============================================================

  /**
   * O card de conta dentro da meta é o mesmo de Contas a Pagar, com uma linha a mais: o que
   * aconteceu com o DINHEIRO. Pagar e abater da caixinha são fatos diferentes (RN016), então
   * a conta paga fora da meta não pode aparecer igual à que já foi debitada — o card avisa e
   * já traz o botão que resolve. Aviso que só avisa e não deixa agir vira ruído.
   */
  function cardContaDaMeta(conta, meta, hojeISO, ehArrastada) {
    var sit = Metas.situacaoNaMeta(meta, conta);
    var visual = global.Render.situacaoVisual(conta, hojeISO);
    var cor = Categorias.cor(conta.categoria);

    var selos = '';
    if (ehArrastada) {
      selos += '<span class="selo selo--arrastada" title="Ficou em aberto num mês anterior">' +
               Icones.get('alerta') + 'veio de antes</span>';
    }
    if (conta.parcela) selos += '<span class="selo">' + esc(Formatar.rotuloParcela(conta)) + '</span>';
    if (conta.recorrente) {
      selos += '<span class="selo selo--recorrente" title="Recorrente">' + Icones.get('repetir') + 'todo mês</span>';
    }

    var direita;
    if (sit === 'abatida') {
      direita = '<span class="conta-pago-em">' + Icones.get('check') + 'Abatido em ' +
                esc(Formatar.dataCurta(conta.pagoEm || conta.vencimento)) + '</span>';
    } else if (sit === 'paga-fora') {
      direita = '<span class="conta-pago-em">' + Icones.get('check') + 'Pago em ' +
                esc(Formatar.dataCurta(conta.pagoEm || conta.vencimento)) + '</span>';
    } else {
      var classePrazo = visual === 'atrasada' ? ' atrasada' : (visual === 'hoje' ? ' hoje' : '');
      direita = '<span class="conta-prazo' + classePrazo + '">' +
                esc(Formatar.dataCurta(conta.vencimento)) + ' · ' +
                esc(Analise.rotuloPrazo(Analise.diasAte(conta.vencimento, hojeISO))) + '</span>';
    }

    // A faixa de aviso: só aparece quando o dinheiro e a conta estão fora de sincronia.
    var aviso = '';
    if (sit === 'paga-fora') {
      aviso =
        '<div class="conta-aviso conta-aviso--abater">' +
          '<span>' + Icones.get('alerta') +
            'Paga em Contas a Pagar — <strong>ainda não abatida</strong> da caixinha</span>' +
          '<button type="button" class="botao botao-mini" data-acao="meta-abater" data-id="' + conta.id + '">' +
            'Abater da meta</button>' +
        '</div>';
    } else if (sit === 'abatida-sem-pagamento') {
      aviso =
        '<div class="conta-aviso conta-aviso--erro">' +
          '<span>' + Icones.get('alerta') +
            'Debitada da caixinha, mas a conta está <strong>pendente</strong></span>' +
          '<button type="button" class="botao botao-mini" data-acao="meta-desabater" data-id="' + conta.id + '">' +
            'Devolver à caixinha</button>' +
        '</div>';
    } else if (sit === 'abatida') {
      aviso =
        '<div class="conta-aviso conta-aviso--ok">' +
          '<span>' + Icones.get('check') + 'Saiu da caixinha</span>' +
          '<button type="button" class="botao botao-mini botao-mini--fantasma"' +
            ' data-acao="meta-desabater" data-id="' + conta.id + '">Desfazer</button>' +
        '</div>';
    }

    var marcaClasse = sit === 'abatida' ? 'paga' : (sit === 'paga-fora' ? 'paga-fora' : visual);
    var iconeMarca = (sit === 'abatida' || sit === 'paga-fora') ? 'check'
                   : (visual === 'atrasada' ? 'alerta' : 'calendario');

    return (
      '<article class="conta conta--meta conta--' + visual + '" style="--cat:var(--cat-' + cor + ')"' +
        ' data-id="' + conta.id + '">' +
        '<button class="conta-marca ' + marcaClasse + '" data-acao="meta-pagar" data-id="' + conta.id + '"' +
          ' aria-label="' + (sit === 'aberta' ? 'Pagar pela meta' : 'Já paga') + '">' +
          Icones.get(iconeMarca) + '</button>' +
        '<div class="conta-corpo">' +
          '<div class="conta-titulo">' +
            '<span class="conta-desc">' + esc(conta.descricao) + '</span>' + selos +
          '</div>' +
          '<div class="conta-meta">' +
            '<span class="conta-cat">' + Icones.get(Categorias.icone(conta.categoria)) +
              esc(conta.categoria) + '</span>' +
            '<span class="conta-sep">·</span>' + direita +
          '</div>' +
        '</div>' +
        '<div class="conta-direita">' +
          '<span class="conta-valor">' + Formatar.dinheiro(conta.valor) + '</span>' +
        '</div>' +
        aviso +
      '</article>'
    );
  }

  function listaContasDaMeta(r, meta, hojeISO) {
    if (!r.contas.todas.length) {
      return (
        '<section class="cartao">' +
          '<div class="secao-cabeca"><h2 class="secao-titulo">Contas desta meta</h2></div>' +
          '<p class="grafico-vazio">Nenhuma conta lançada neste mês ainda. Elas entram sozinhas ' +
            'conforme forem criadas nas categorias que você marcou.</p>' +
        '</section>'
      );
    }

    var arrastadas = {};
    r.contas.arrastadas.forEach(function (c) { arrastadas[c.id] = true; });

    var aAbater = r.contas.todas.filter(function (c) {
      return Metas.situacaoNaMeta(meta, c) === 'paga-fora';
    });
    var chamada = aAbater.length
      ? '<p class="esc-nota esc-nota--alerta">' + Icones.get('alerta') + aAbater.length +
        (aAbater.length === 1 ? ' conta paga fora da meta espera abatimento' :
                                ' contas pagas fora da meta esperam abatimento') + '</p>'
      : '';

    return (
      '<section class="cartao">' +
        '<div class="secao-cabeca">' +
          '<h2 class="secao-titulo">Contas desta meta</h2>' +
          '<span class="pp-qtd">' + Formatar.dinheiro(r.contas.total) + '</span>' +
        '</div>' +
        chamada +
        '<div class="lista">' +
          r.contas.todas.map(function (c) {
            return cardContaDaMeta(c, meta, hojeISO, !!arrastadas[c.id]);
          }).join('') +
        '</div>' +
      '</section>'
    );
  }

  // ============================================================
  // EXTRATO
  // ============================================================

  var ROTULO_MOV = { aporte: 'Aporte', retirada: 'Retirada', baixa: 'Pagamento' };
  var ICONE_MOV = { aporte: 'subir', retirada: 'descer', baixa: 'check' };

  /**
   * O extrato é a prova. Qualquer número de painel tem que dar para conferir aqui, linha a
   * linha, com o saldo correndo ao lado — é isso que faz um app de dinheiro merecer confiança.
   */
  function extratoDoMes(meta, ano, mes) {
    var linhas = Metas.extrato(meta).filter(function (l) {
      var p = Datas.parseISO(l.movimento.data);
      return p.ano === ano && p.mes === mes;
    });

    if (!linhas.length) {
      return (
        '<section class="cartao">' +
          '<div class="secao-cabeca"><h2 class="secao-titulo">Extrato do mês</h2></div>' +
          '<p class="grafico-vazio">Nenhum lançamento neste mês ainda.</p>' +
        '</section>'
      );
    }

    var itens = linhas.slice().reverse().map(function (l) {
      var m = l.movimento;
      var nome = ROTULO_MOV[m.tipo] || m.tipo;
      var detalhe = m.foto ? m.foto.descricao : (m.nota || '');
      var positivo = l.efeito > 0;

      // Baixa não se apaga solta: ela é o par de um pagamento, e some pelo card da conta.
      var acao = m.tipo === 'baixa' ? ''
        : '<button class="icon-btn" data-acao="excluir-movimento" data-id="' + m.id + '"' +
          ' aria-label="Excluir lançamento">' + Icones.get('excluir') + '</button>';

      return (
        '<article class="mov mov--' + m.tipo + '">' +
          '<span class="mov-marca">' + Icones.get(ICONE_MOV[m.tipo] || 'tag') + '</span>' +
          '<div class="mov-corpo">' +
            '<span class="mov-desc">' + esc(nome) + (detalhe ? ' · ' + esc(detalhe) : '') + '</span>' +
            '<span class="mov-data">' + esc(Formatar.dataCurta(m.data)) + ' · ' +
              esc(Datas.nomeDiaSemana(m.data)) + '</span>' +
          '</div>' +
          '<div class="mov-direita">' +
            '<span class="mov-valor ' + (positivo ? 'v-positivo' : 'v-negativo') + '">' +
              (positivo ? '+' : '−') + Formatar.dinheiro(Math.abs(l.efeito)).replace('R$ ', 'R$ ') +
            '</span>' +
            '<span class="mov-saldo">saldo ' + Formatar.dinheiro(l.acumulado) + '</span>' +
          '</div>' +
          acao +
        '</article>'
      );
    }).join('');

    var ultimo = linhas[linhas.length - 1];
    return (
      '<section class="cartao">' +
        '<div class="secao-cabeca">' +
          '<h2 class="secao-titulo">Extrato do mês</h2>' +
          '<span class="pp-qtd">' + linhas.length +
            (linhas.length === 1 ? ' lançamento' : ' lançamentos') + '</span>' +
        '</div>' +
        '<div class="mov-lista">' + itens + '</div>' +
        '<p class="esc-legenda">Saldo da campanha ao fim deste mês: <strong class="num">' +
          Formatar.dinheiro(ultimo.acumulado) + '</strong></p>' +
      '</section>'
    );
  }

  global.RenderMetas = {
    cardContaDaMeta: cardContaDaMeta,
    listaContasDaMeta: listaContasDaMeta,
    extratoDoMes: extratoDoMes,
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
