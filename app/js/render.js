/**
 * Render — transforma dado em HTML. Sem logica de negocio, sem acesso ao Store. Recebe dado
 * ja calculado por analise.js/filtros.js e devolve string; o app.js insere no DOM e liga os
 * eventos por delegacao, usando os atributos data-* daqui.
 */
(function (global) {
  'use strict';

  var Formatar = global.Formatar, Icones = global.Icones, Contas = global.Contas,
      Categorias = global.Categorias, Analise = global.Analise, Datas = global.Datas,
      Graficos = global.Graficos;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** Situacao visual de uma conta, incluindo o caso "vence hoje" (nem pendente comum, nem atrasada). */
  function situacaoVisual(conta, hojeISO) {
    if (conta.status === 'pago') return 'paga';
    if (Contas.estaAtrasada(conta, hojeISO)) return 'atrasada';
    if (conta.vencimento === hojeISO) return 'hoje';
    return 'pendente';
  }

  /**
   * Card de conta. Mostra, alem do basico: cor e icone da categoria, prazo em linguagem
   * humana ("vence em 3 dias" / "atrasada ha 5 dias") e, quando paga, A DATA DO PAGAMENTO.
   */
  function cardConta(conta, hojeISO) {
    var sit = situacaoVisual(conta, hojeISO);
    var cor = Categorias.cor(conta.categoria);
    var dias = Analise.diasAte(conta.vencimento, hojeISO);

    var iconeMarca = sit === 'paga' ? 'check' : (sit === 'atrasada' ? 'alerta' : 'calendario');
    var rotuloBotao = sit === 'paga' ? 'Desmarcar pagamento' : 'Marcar como paga';

    var selos = '';
    if (conta.parcela) {
      selos += '<span class="selo">' + esc(Formatar.rotuloParcela(conta)) + '</span>';
    }
    if (conta.recorrente) {
      selos += '<span class="selo selo--recorrente" title="Recorrente">' + Icones.get('repetir') + 'todo mês</span>';
    }

    // linha de meta: categoria + (data paga | prazo)
    var metaDireita;
    if (sit === 'paga') {
      metaDireita = '<span class="conta-pago-em">' + Icones.get('check') +
                    'Pago em ' + esc(Formatar.dataCurta(conta.pagoEm || conta.vencimento)) + '</span>';
    } else {
      var classePrazo = sit === 'atrasada' ? ' atrasada' : (sit === 'hoje' ? ' hoje' : '');
      metaDireita = '<span class="conta-prazo' + classePrazo + '">' +
                    esc(Formatar.dataCurta(conta.vencimento)) + ' · ' + esc(Analise.rotuloPrazo(dias)) +
                    '</span>';
    }

    return (
      '<article class="conta conta--' + sit + '" style="--cat:var(--cat-' + cor + ')" data-id="' + conta.id + '">' +
        '<button class="conta-marca ' + sit + '" data-acao="alternar-pago" data-id="' + conta.id + '"' +
          ' aria-label="' + rotuloBotao + '">' + Icones.get(iconeMarca) + '</button>' +
        '<div class="conta-corpo">' +
          '<div class="conta-titulo">' +
            '<span class="conta-desc">' + esc(conta.descricao) + '</span>' + selos +
          '</div>' +
          '<div class="conta-meta">' +
            '<span class="conta-cat">' + Icones.get(Categorias.icone(conta.categoria)) + esc(conta.categoria) + '</span>' +
            '<span class="conta-sep">·</span>' + metaDireita +
          '</div>' +
        '</div>' +
        '<div class="conta-direita">' +
          '<span class="conta-valor">' + Formatar.dinheiro(conta.valor) + '</span>' +
          '<div class="conta-acoes">' +
            '<button class="icon-btn" data-acao="editar" data-id="' + conta.id + '" aria-label="Editar">' + Icones.get('editar') + '</button>' +
            '<button class="icon-btn" data-acao="excluir" data-id="' + conta.id + '" aria-label="Excluir">' + Icones.get('excluir') + '</button>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function vazio(titulo, dica) {
    return (
      '<div class="vazio">' + Icones.get('vazio') +
        '<span class="vazio-titulo">' + esc(titulo) + '</span>' +
        (dica ? '<span class="vazio-dica">' + esc(dica) + '</span>' : '') +
      '</div>'
    );
  }

  function lista(contasLista, hojeISO, msgVazio, dicaVazio) {
    if (!contasLista.length) return vazio(msgVazio || 'Nada por aqui', dicaVazio);
    return '<div class="lista">' + contasLista.map(function (c) { return cardConta(c, hojeISO); }).join('') + '</div>';
  }

  /** Lista agrupada pelas semanas do mes (RN003), com total por semana. */
  function listaPorSemana(grupos, hojeISO, msgVazio, dicaVazio) {
    var comItens = grupos.filter(function (g) { return g.itens.length > 0; });
    if (!comItens.length) return vazio(msgVazio || 'Nada por aqui', dicaVazio);

    return comItens.map(function (g) {
      var total = g.itens.reduce(function (s, c) { return s + c.valor; }, 0);
      return (
        '<div class="grupo">' +
          '<div class="grupo-cabeca">' +
            '<span class="grupo-nome' + (g.ehSemanaAtual ? ' atual' : '') + '">' +
              'Semana ' + g.numero + ' · ' + Formatar.dataCurta(g.inicio) + '–' + Formatar.dataCurta(g.fim) +
              (g.ehSemanaAtual ? ' · agora' : '') +
            '</span>' +
            '<span class="grupo-valor">' + Formatar.dinheiro(total) + '</span>' +
          '</div>' +
          lista(g.itens, hojeISO) +
        '</div>'
      );
    }).join('');
  }

  /** Lista compacta de proximos vencimentos, com o dia em destaque. */
  function proximosVencimentos(itens, hojeISO) {
    if (!itens.length) {
      return vazio('Nada pendente', 'Todas as contas deste período estão pagas.');
    }
    return '<div class="prox">' + itens.map(function (item) {
      var c = item.conta;
      var sit = situacaoVisual(c, hojeISO);
      var classe = sit === 'atrasada' ? ' atrasada' : (sit === 'hoje' ? ' hoje' : '');
      var p = Datas.parseISO(c.vencimento);
      var mesCurto = Datas.nomeMes(p.mes).slice(0, 3);

      return (
        '<button class="prox-item" data-acao="editar" data-id="' + c.id + '">' +
          '<span class="prox-dia' + classe + '">' +
            '<span class="prox-dia-num">' + p.dia + '</span>' +
            '<span class="prox-dia-mes">' + esc(mesCurto) + '</span>' +
          '</span>' +
          '<span class="prox-corpo">' +
            '<span class="prox-desc">' + esc(c.descricao) + '</span>' +
            '<span class="prox-prazo' + classe + '">' + esc(Analise.rotuloPrazo(item.dias)) + '</span>' +
          '</span>' +
          '<span class="prox-valor">' + Formatar.dinheiro(c.valor) + '</span>' +
        '</button>'
      );
    }).join('') + '</div>';
  }

  /** Card-herói do dashboard: o número que responde "quanto ainda devo este mês" + meta diária. */
  function heroi(resumo, comparativo, nomeMes, meta) {
    // Estado vazio: sem conta nenhuma no mês, um "R$ 0,00" gigante não informa nada — vira
    // um convite pra começar. É a primeira tela que o usuário vê no primeiro uso.
    if (resumo.qtdPagar === 0 && resumo.totalReceber === 0) {
      return (
        '<section class="heroi heroi--vazio">' +
          '<div class="heroi-rotulo">' + esc(nomeMes) + '</div>' +
          '<div class="heroi-vazio-titulo">Nenhuma conta ainda</div>' +
          '<p class="heroi-vazio-texto">Toque no botão + para lançar sua primeira conta a pagar ou a receber.</p>' +
        '</section>'
      );
    }

    var chip = '';
    if (comparativo.variacao !== null) {
      var subiu = comparativo.variacao > 0;
      var icone = subiu ? 'tendenciaSobe' : 'tendenciaDesce';
      var sinal = subiu ? '+' : '';
      chip = '<span class="heroi-chip" title="Comparado ao mês anterior">' + Icones.get(icone) +
             sinal + comparativo.variacao.toFixed(0) + '% vs. mês anterior</span>';
    }

    var pctPago = Math.round(resumo.progresso * 100);

    return (
      '<section class="heroi">' +
        '<div class="heroi-topo">' +
          '<div>' +
            '<div class="heroi-rotulo">Falta pagar em ' + esc(nomeMes) + '</div>' +
            '<div class="heroi-valor">' + Formatar.dinheiro(resumo.totalFalta) + '</div>' +
            '<div class="heroi-detalhe">de ' + Formatar.dinheiro(resumo.totalPagar) + ' no mês' +
              (resumo.qtdPagar > 0 ? ' · ' + resumo.qtdPago + ' de ' + resumo.qtdPagar + ' contas pagas' : '') +
            '</div>' +
          '</div>' +
          chip +
        '</div>' +
        (resumo.totalPagar > 0 ? Graficos.barraProgresso(resumo.progresso) : '') +
        (resumo.totalPagar > 0 ? '<div class="heroi-rodape"><span>' + pctPago + '% pago</span>' +
          '<span>' + Formatar.dinheiro(resumo.totalPago) + ' de ' + Formatar.dinheiro(resumo.totalPagar) + '</span></div>' : '') +
        (meta ? faixaMeta(meta, nomeMes) : '') +
      '</section>'
    );
  }

  /** Faixa "Meta por dia" dentro do card-herói. */
  function faixaMeta(meta, nomeMes) {
    if (meta.falta <= 0) {
      return (
        '<div class="heroi-meta heroi-meta--ok">' +
          '<span class="heroi-meta-rotulo">' + Icones.get('check') + 'Mês fechado</span>' +
          '<span class="heroi-meta-valor">tudo pago</span>' +
        '</div>'
      );
    }
    return (
      '<div class="heroi-meta sem-' + meta.semaforo + '">' +
        '<span class="heroi-meta-rotulo">' + Icones.get('raio') + 'Meta por dia</span>' +
        '<span class="heroi-meta-bloco">' +
          '<span class="heroi-meta-valor">' + Formatar.dinheiro(meta.meta) + '</span>' +
          '<span class="heroi-meta-sub">' + meta.dias + (meta.dias === 1 ? ' dia restante' : ' dias restantes') + '</span>' +
        '</span>' +
      '</div>'
    );
  }

  /** Card "Ritmo desta semana", com o detalhamento que explica de onde vem o número. */
  function cardRitmoSemana(r) {
    if (r.aCobrir <= 0) {
      return (
        '<div class="ritmo ritmo--ok">' +
          '<div class="ritmo-cabeca">' +
            '<span class="ritmo-rotulo">' + Icones.get('check') + 'Ritmo desta semana</span>' +
          '</div>' +
          '<div class="ritmo-valor">Semana em dia</div>' +
          '<p class="ritmo-sub">Nada pendente até domingo.</p>' +
        '</div>'
      );
    }

    var linhaArrastado = r.arrastado > 0
      ? '<div class="ritmo-linha ritmo-linha--alerta">' +
          '<span>arrastado de antes' + (r.qtdArrastadas ? ' (' + r.qtdArrastadas + ')' : '') + '</span>' +
          '<span class="num">' + Formatar.dinheiro(r.arrastado) + '</span>' +
        '</div>'
      : '';

    return (
      '<div class="ritmo sem-' + r.semaforo + '">' +
        '<div class="ritmo-cabeca">' +
          '<span class="ritmo-rotulo">' + Icones.get('raio') + 'Ritmo desta semana</span>' +
          '<span class="ritmo-selo">semana ' + r.semana.numero + '</span>' +
        '</div>' +
        '<div class="ritmo-valor">' + Formatar.dinheiro(r.ritmo) + ' <small>/ dia</small></div>' +
        '<p class="ritmo-sub">para zerar até ' + Formatar.dataCurta(r.semana.fim) +
          ' · ' + r.dias + (r.dias === 1 ? ' dia' : ' dias') + '</p>' +
        '<div class="ritmo-detalhe">' +
          '<div class="ritmo-linha"><span>vence nesta semana</span>' +
            '<span class="num">' + Formatar.dinheiro(r.venceNestaSemana) + '</span></div>' +
          linhaArrastado +
          '<div class="ritmo-linha ritmo-linha--total"><span>a cobrir</span>' +
            '<span class="num">' + Formatar.dinheiro(r.aCobrir) + '</span></div>' +
        '</div>' +
      '</div>'
    );
  }

  /** Bloco "Veio de antes" — pendência de meses anteriores, separada do mês atual. */
  function blocoVeioDeAntes(v) {
    if (v.qtd === 0) return '';

    var meses = v.meses.map(function (m) {
      return Formatar.capitalizar(Datas.nomeMes(m.mes));
    }).join(', ');

    var linhas = v.contas.slice(0, 4).map(function (c) {
      return (
        '<button class="antes-linha" data-acao="editar" data-id="' + c.id + '">' +
          '<span class="antes-desc">' + esc(c.descricao) + '</span>' +
          '<span class="antes-data">' + Formatar.dataCurta(c.vencimento) + '</span>' +
          '<span class="antes-valor num">' + Formatar.dinheiro(c.valor) + '</span>' +
        '</button>'
      );
    }).join('');

    var resto = v.qtd > 4
      ? '<p class="antes-resto">+ ' + (v.qtd - 4) + ' conta(s)</p>'
      : '';

    return (
      '<section class="antes">' +
        '<div class="antes-cabeca">' +
          '<span class="antes-rotulo">' + Icones.get('alerta') + 'Veio de antes</span>' +
          '<span class="antes-total num">' + Formatar.dinheiro(v.total) + '</span>' +
        '</div>' +
        '<p class="antes-sub">' + v.qtd + (v.qtd === 1 ? ' conta de ' : ' contas de ') + esc(meses) +
          ' que ainda não foi' + (v.qtd === 1 ? '' : 'ram') + ' paga' + (v.qtd === 1 ? '' : 's') +
          '. Não entra na meta deste mês.</p>' +
        '<div class="antes-lista">' + linhas + resto + '</div>' +
      '</section>'
    );
  }

  function miniCard(rotulo, icone, valor, nota, modificador) {
    return (
      '<div class="mini' + (modificador ? ' mini--' + modificador : '') + '">' +
        '<span class="mini-rotulo">' + Icones.get(icone) + esc(rotulo) + '</span>' +
        '<span class="mini-valor">' + valor + '</span>' +
        (nota ? '<span class="mini-nota">' + esc(nota) + '</span>' : '') +
      '</div>'
    );
  }

  function catPill(nome) {
    return (
      '<span class="cat-pill">' +
        '<span class="cat-pill-cor" style="background:var(--cat-' + Categorias.cor(nome) + ')"></span>' +
        esc(nome) +
      '</span>'
    );
  }

  global.Render = {
    esc: esc,
    situacaoVisual: situacaoVisual,
    cardConta: cardConta,
    vazio: vazio,
    lista: lista,
    listaPorSemana: listaPorSemana,
    proximosVencimentos: proximosVencimentos,
    heroi: heroi,
    faixaMeta: faixaMeta,
    cardRitmoSemana: cardRitmoSemana,
    blocoVeioDeAntes: blocoVeioDeAntes,
    miniCard: miniCard,
    catPill: catPill
  };
})(typeof window !== 'undefined' ? window : globalThis);
