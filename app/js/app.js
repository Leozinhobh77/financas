/**
 * app.js — bootstrap, roteador por hash, estado de filtro e ligacao de eventos.
 * Logica de negocio mora em contas.js/filtros.js/datas.js/analise.js; aqui so se orquestra.
 */
(function () {
  'use strict';

  var NAV = [
    { rota: 'dashboard', icone: 'dashboard', rotulo: 'Início' },
    { rota: 'pagar', icone: 'pagar', rotulo: 'Pagar' },
    { rota: 'receber', icone: 'receber', rotulo: 'Receber' },
    { rota: 'metas', icone: 'alvo', rotulo: 'Metas' },
    { rota: 'config', icone: 'engrenagem', rotulo: 'Ajustes' }
  ];

  var estado = {
    rota: 'dashboard',
    filtro: { periodo: { tipo: 'mes-atual' }, status: 'todos', categoria: 'todas', busca: '', ordem: 'vencimento' },
    metaAberta: null,
    mesAtivo: null   // null = ainda não escolhido; a tela abre sozinha no mês corrente
  };

  var elConteudo, elNavDesktop, elTabbar, elToast;

  // ---------------------------------------------------------------- UI utilitária
  var toastTimer = null;
  function toast(msg) {
    elToast.textContent = msg;
    elToast.hidden = false;
    requestAnimationFrame(function () { elToast.classList.add('mostrar'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      elToast.classList.remove('mostrar');
      setTimeout(function () { elToast.hidden = true; }, 250);
    }, 2800);
  }

  /**
   * `opcoes.exigirTexto` liga a trava de digitacao: o botao marcado com `travado` so
   * habilita quando o usuario digita exatamente aquela palavra. Existe porque apagar tudo
   * nao tem volta pelo caminho normal — clique errado nao pode bastar.
   */
  function confirmar(titulo, texto, botoes, opcoes) {
    var opc = opcoes || {};
    return new Promise(function (resolve) {
      var camada = document.getElementById('camadaConfirm');
      var fundo = document.getElementById('confirmFundo');
      var entrada = document.getElementById('confirmEntrada');
      document.getElementById('confirmTitulo').textContent = titulo;
      document.getElementById('confirmTexto').textContent = texto;

      var elBotoes = document.getElementById('confirmBotoes');
      elBotoes.innerHTML = '';
      var travados = [];
      botoes.forEach(function (b) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'botao ' + (b.classe || 'botao-fantasma');
        btn.textContent = b.rotulo;
        if (b.travado && opc.exigirTexto) { btn.disabled = true; travados.push(btn); }
        btn.addEventListener('click', function () { if (!btn.disabled) { fechar(); resolve(b.valor); } });
        elBotoes.appendChild(btn);
      });

      entrada.value = '';
      entrada.hidden = !opc.exigirTexto;
      if (opc.exigirTexto) {
        entrada.placeholder = 'Digite ' + opc.exigirTexto;
        entrada.addEventListener('input', aoDigitar);
      }
      function aoDigitar() {
        var bate = entrada.value.trim().toUpperCase() === opc.exigirTexto.toUpperCase();
        travados.forEach(function (b) { b.disabled = !bate; });
      }

      function fechar() {
        camada.hidden = true;
        entrada.hidden = true;
        entrada.removeEventListener('input', aoDigitar);
        fundo.removeEventListener('click', aoFundo);
      }
      function aoFundo() { fechar(); resolve(null); }
      fundo.addEventListener('click', aoFundo);
      camada.hidden = false;
      if (opc.exigirTexto) entrada.focus();
    });
  }

  function irPara(rota) { location.hash = '#/' + rota; }

  function renderNav() {
    function itens(classe) {
      return NAV.map(function (i) {
        return '<button class="' + classe + (estado.rota === i.rota ? ' ativo' : '') + '" data-rota="' + i.rota + '">' +
               Icones.get(i.icone) + '<span>' + i.rotulo + '</span></button>';
      }).join('');
    }
    elNavDesktop.innerHTML = itens('nav-item');
    elTabbar.innerHTML = itens('tab-item');
  }

  // ---------------------------------------------------------------- DASHBOARD
  function telaDashboard() {
    var hoje = Datas.hoje();
    var p = Datas.parseISO(hoje);
    var todas = Store.listarContas();

    var resumo = Analise.resumoDoMes(todas, p.ano, p.mes, hoje);
    var comparativo = Analise.comparativoMesAnterior(todas, p.ano, p.mes, hoje);
    var semanas = Analise.semanasComResto(todas, p.ano, p.mes, hoje);
    var categorias = Analise.porCategoria(todas, resumo.inicio, resumo.fim, 'pagar');
    // corta o que veio de meses anteriores: essas têm bloco próprio ("Veio de antes")
    var proximos = Analise.proximosVencimentos(todas, hoje, 5, 'pagar', resumo.inicio);
    var meta = Analise.metaPorDia(todas, p.ano, p.mes, hoje);
    var ritmo = Analise.ritmoDaSemana(todas, hoje);
    var veioDeAntes = Analise.pendenteDeMesesAnteriores(todas, p.ano, p.mes);

    // semana atual
    var semAtual = Datas.semanaDe(hoje);
    var daSemana = todas.filter(function (c) {
      return c.tipo === 'pagar' && Datas.estaEntre(c.vencimento, semAtual.inicio, semAtual.fim);
    });
    var totalSemana = Analise.somar(daSemana.filter(function (c) { return c.status === 'pendente'; }));

    // próximo mês
    var isoProx = Datas.somarMeses(Datas.formatarISO(p.ano, p.mes, 1), 1);
    var pProx = Datas.parseISO(isoProx);
    var resumoProx = Analise.resumoDoMes(todas, pProx.ano, pProx.mes, hoje);

    var nomeMes = Formatar.capitalizar(Datas.nomeMes(p.mes));

    var alerta = resumo.qtdAtrasadas > 0
      ? Render.miniCard('Atrasadas', 'alerta', Formatar.dinheiro(resumo.totalAtrasado),
          resumo.qtdAtrasadas + (resumo.qtdAtrasadas === 1 ? ' conta vencida' : ' contas vencidas'), 'alerta')
      : Render.miniCard('Em dia', 'check', 'Tudo certo', 'Nenhuma conta atrasada', 'ok');

    var html =
      '<div class="tela">' +
        '<div class="tela-cabeca"><div>' +
          '<h1 class="tela-titulo">Início</h1>' +
          '<p class="tela-sub">' + Formatar.capitalizar(Formatar.dataComDiaSemana(hoje)) + '</p>' +
        '</div></div>' +

        Render.heroi(resumo, comparativo, nomeMes, meta) +

        Render.blocoVeioDeAntes(veioDeAntes) +

        '<div class="mini-grade">' +
          alerta +
          Render.miniCard('Esta semana', 'calendario', Formatar.dinheiro(totalSemana),
            Formatar.dataCurta(semAtual.inicio) + '–' + Formatar.dataCurta(semAtual.fim) + ' · semana ' + semAtual.numero) +
          Render.miniCard('A receber no mês', 'receber', Formatar.dinheiro(resumo.totalReceber),
            resumo.saldo >= 0 ? 'Saldo previsto ' + Formatar.dinheiro(resumo.saldo) : 'Faltam ' + Formatar.dinheiro(Math.abs(resumo.saldo))) +
          Render.miniCard('Próximo mês', 'seta', Formatar.dinheiro(resumoProx.totalPagar),
            Formatar.capitalizar(Datas.nomeMes(pProx.mes)) + ' · ' + resumoProx.qtdPagar + ' conta(s)') +
        '</div>' +

        '<section class="secao">' +
          '<div class="secao-cabeca"><span class="secao-titulo">Por semana · ' + nomeMes + '</span>' +
            '<span class="grupo-valor">' + Formatar.dinheiro(resumo.totalPagar) + '</span></div>' +
          '<div class="painel">' + Graficos.barrasSemana(semanas) + '</div>' +
          Render.cardRitmoSemana(ritmo) +
        '</section>' +

        '<section class="secao">' +
          '<div class="secao-cabeca"><span class="secao-titulo">Onde vai o dinheiro</span></div>' +
          '<div class="painel' + (categorias.length ? ' painel-lado-a-lado' : '') + '">' +
            (categorias.length
              ? Graficos.donutCategorias(categorias, Formatar.dinheiro(resumo.totalPagar)) +
                '<div class="flex1">' + Graficos.legendaCategorias(categorias.slice(0, 6)) + '</div>'
              : '<p class="grafico-vazio">Nenhuma conta a pagar em ' + Render.esc(nomeMes) + '.</p>') +
          '</div>' +
        '</section>' +

        '<section class="secao">' +
          '<div class="secao-cabeca"><span class="secao-titulo">Próximos vencimentos</span>' +
            '<button class="secao-link" data-rota="pagar">Ver todas</button></div>' +
          '<div class="painel">' + Render.proximosVencimentos(proximos, hoje) + '</div>' +
        '</section>' +

        '<section class="secao">' +
          '<div class="secao-cabeca"><span class="secao-titulo">Progresso do mês</span></div>' +
          '<div class="painel painel-lado-a-lado">' +
            Graficos.anelProgresso(resumo.progresso, Math.round(resumo.progresso * 100) + '%', 'pago') +
            '<div class="flex1">' +
              '<p style="font-size:.9rem;color:var(--ink-2);line-height:1.55">' +
                (resumo.qtdPagar === 0
                  ? 'Nenhuma conta cadastrada em ' + nomeMes + '.'
                  : '<strong>' + resumo.qtdPago + ' de ' + resumo.qtdPagar + '</strong> contas já pagas. ' +
                    (resumo.totalFalta > 0
                      ? 'Faltam <strong>' + Formatar.dinheiro(resumo.totalFalta) + '</strong>.'
                      : 'Mês fechado, tudo pago.')) +
              '</p>' +
            '</div>' +
          '</div>' +
        '</section>' +
      '</div>';

    elConteudo.innerHTML = html;
  }

  // ---------------------------------------------------------------- LISTAS
  function opcoesMes(passado, futuro) {
    var p = Datas.parseISO(Datas.hoje());
    var out = [];
    for (var i = -passado; i <= futuro; i++) {
      var iso = Datas.somarMeses(Datas.formatarISO(p.ano, p.mes, 1), i);
      var d = Datas.parseISO(iso);
      out.push({ ano: d.ano, mes: d.mes, rotulo: Formatar.capitalizar(Datas.nomeMes(d.mes)) + ' de ' + d.ano });
    }
    return out;
  }

  function barraFiltros(tipo, contagens) {
    var f = estado.filtro;
    var categorias = Store.listarCategorias();

    var periodos = [
      { v: 'semana-atual', r: 'Semana atual' },
      { v: 'mes-atual', r: 'Este mês' },
      { v: 'proximo-mes', r: 'Próximo mês' },
      { v: 'mes-especifico', r: 'Escolher mês' },
      { v: 'personalizado', r: 'Período personalizado' }
    ];
    var optPeriodo = periodos.map(function (p) {
      return '<option value="' + p.v + '"' + (f.periodo.tipo === p.v ? ' selected' : '') + '>' + p.r + '</option>';
    }).join('');

    var extra = '';
    if (f.periodo.tipo === 'mes-especifico') {
      extra = '<select class="select" id="fSelMes">' + opcoesMes(12, 12).map(function (o) {
        var sel = (f.periodo.ano === o.ano && f.periodo.mes === o.mes) ? ' selected' : '';
        return '<option value="' + o.ano + '-' + o.mes + '"' + sel + '>' + o.rotulo + '</option>';
      }).join('') + '</select>';
    } else if (f.periodo.tipo === 'personalizado') {
      extra = '<input type="date" class="select" id="fPersInicio" value="' + (f.periodo.inicio || Datas.hoje()) + '">' +
              '<span style="color:var(--ink-3);font-size:.85rem">até</span>' +
              '<input type="date" class="select" id="fPersFim" value="' + (f.periodo.fim || Datas.hoje()) + '">';
    }

    var optCat = '<option value="todas">Todas as categorias</option>' + categorias.map(function (c) {
      return '<option value="' + Render.esc(c) + '"' + (f.categoria === c ? ' selected' : '') + '>' +
             Render.esc(Formatar.capitalizar(c)) + '</option>';
    }).join('');

    // ATENCAO: os valores aqui sao os que Contas.situacao() devolve ('paga', nao 'pago').
    // Usar 'pago' fazia o filtro nunca casar e a aba "Pagas" vir sempre vazia. Ver D004.
    var rotulosStatus = { todos: 'Todas', pendente: 'Pendentes', atrasada: 'Atrasadas', paga: 'Pagas' };
    var chips = ['todos', 'pendente', 'atrasada', 'paga'].map(function (s) {
      var n = contagens[s];
      return '<button type="button" class="chip' + (f.status === s ? ' ativo' : '') + '" data-filtro="status" data-valor="' + s + '">' +
             rotulosStatus[s] + (n ? '<span class="chip-contador">' + n + '</span>' : '') + '</button>';
    }).join('');

    var optOrdem = [
      { v: 'vencimento', r: 'Por vencimento' },
      { v: 'valor-desc', r: 'Maior valor' },
      { v: 'valor-asc', r: 'Menor valor' },
      { v: 'descricao', r: 'Ordem alfabética' }
    ].map(function (o) {
      return '<option value="' + o.v + '"' + (f.ordem === o.v ? ' selected' : '') + '>' + o.r + '</option>';
    }).join('');

    return (
      '<div class="filtros">' +
        '<div class="filtros-linha">' +
          '<label class="campo-busca">' + Icones.get('busca') +
            '<input type="search" id="fBusca" placeholder="Buscar conta..." value="' + Render.esc(f.busca) + '" aria-label="Buscar conta">' +
          '</label>' +
        '</div>' +
        '<div class="filtros-linha">' +
          '<select class="select" id="fSelPeriodo">' + optPeriodo + '</select>' + extra +
          '<select class="select" id="fSelCategoria">' + optCat + '</select>' +
          '<select class="select" id="fSelOrdem">' + optOrdem + '</select>' +
        '</div>' +
        '<div class="chips">' + chips + '</div>' +
      '</div>'
    );
  }

  function ordenar(listaContas, ordem, hojeISO) {
    var copia = listaContas.slice();
    if (ordem === 'valor-desc') return copia.sort(function (a, b) { return b.valor - a.valor; });
    if (ordem === 'valor-asc') return copia.sort(function (a, b) { return a.valor - b.valor; });
    if (ordem === 'descricao') return copia.sort(function (a, b) { return a.descricao.localeCompare(b.descricao, 'pt-BR'); });
    return copia.sort(function (a, b) { return Datas.compararISO(a.vencimento, b.vencimento); });
  }

  /** Como o período se chama no rótulo "Total ___" ("do mês", "da semana", "do período"). */
  function nomeDoPeriodo(periodo) {
    if (periodo.tipo === 'semana-atual') return 'da semana';
    if (periodo.tipo === 'personalizado') return 'do período';
    return 'do mês';
  }

  /** Nome legível do período filtrado, para o cabeçalho do painel. */
  function rotuloDoPeriodo(periodo, intervalo) {
    var p = Datas.parseISO(intervalo.inicio);
    var mesAno = Formatar.capitalizar(Datas.nomeMes(p.mes)) + ' de ' + p.ano;

    switch (periodo.tipo) {
      case 'semana-atual': {
        var s = Datas.semanaDe(Datas.hoje());
        return 'Semana ' + s.numero + ' · ' + Formatar.dataCurta(intervalo.inicio) +
               '–' + Formatar.dataCurta(intervalo.fim);
      }
      case 'personalizado':
        return Formatar.dataCurta(intervalo.inicio) + ' a ' + Formatar.dataCurta(intervalo.fim);
      default:
        return mesAno;
    }
  }

  function telaLista(tipo) {
    var hoje = Datas.hoje();
    var f = estado.filtro;
    var doTipo = Store.listarContas().filter(function (c) { return c.tipo === tipo; });

    // busca aplica antes das contagens de status, pra os números dos chips baterem com a lista
    var busca = f.busca.trim().toLowerCase();
    if (busca) {
      doTipo = doTipo.filter(function (c) {
        return c.descricao.toLowerCase().indexOf(busca) !== -1 ||
               (c.categoria || '').toLowerCase().indexOf(busca) !== -1;
      });
    }

    function contarCom(status) {
      return Filtros.aplicar(doTipo, { periodo: f.periodo, status: status, categoria: f.categoria, tipo: tipo }, hoje).length;
    }
    var contagens = {
      todos: contarCom('todos'), pendente: contarCom('pendente'),
      atrasada: contarCom('atrasada'), paga: contarCom('paga')
    };

    var filtradas = ordenar(
      Filtros.aplicar(doTipo, { periodo: f.periodo, status: f.status, categoria: f.categoria, tipo: tipo }, hoje),
      f.ordem, hoje
    );

    var total = Filtros.total(filtradas);
    var titulo = tipo === 'pagar' ? 'Contas a pagar' : 'Contas a receber';

    // ---- painel do período (RN009) ----
    // Usa a lista com período + categoria + busca aplicados, mas SEM o filtro de status: é o
    // painel que mostra a quebra pago/falta, então filtrá-lo por status seria redundante e
    // faria o total sumir ao clicar em "Pagas" — exatamente o problema que ele resolve.
    var intervalo = Filtros.periodoParaIntervalo(f.periodo, hoje);
    var paraPainel = Filtros.aplicar(doTipo,
      { periodo: f.periodo, status: 'todos', categoria: f.categoria, tipo: tipo }, hoje);
    var resumoP = Analise.resumoDoPeriodo(paraPainel, intervalo.inicio, intervalo.fim, tipo, hoje);
    var metaP = Analise.metaDoPeriodo(resumoP, hoje);

    var escopo = rotuloDoPeriodo(f.periodo, intervalo);
    if (f.categoria !== 'todas') escopo = Formatar.capitalizar(f.categoria) + ' · ' + escopo;
    if (busca) escopo = '"' + f.busca.trim() + '" · ' + escopo;

    var temFiltroNaLista = (f.status !== 'todos') || (f.categoria !== 'todas') || !!busca;

    var corpo;
    var tipoPeriodo = f.periodo.tipo;
    if (['mes-atual', 'proximo-mes', 'mes-especifico'].indexOf(tipoPeriodo) !== -1) {
      var iv = Filtros.periodoParaIntervalo(f.periodo, hoje);
      var ref = Datas.parseISO(iv.inicio);
      var grupos = Datas.semanasDoMes(ref.ano, ref.mes).map(function (s) {
        return {
          numero: s.numero, inicio: s.inicio, fim: s.fim,
          ehSemanaAtual: Datas.estaEntre(hoje, s.inicio, s.fim),
          itens: filtradas.filter(function (c) { return Datas.estaEntre(c.vencimento, s.inicio, s.fim); })
        };
      });
      corpo = Render.listaPorSemana(grupos, hoje, 'Nenhuma conta neste filtro',
        busca ? 'Tente outra busca ou limpe os filtros.' : 'Toque no + para adicionar.');
    } else {
      corpo = Render.lista(filtradas, hoje, 'Nenhuma conta neste filtro',
        busca ? 'Tente outra busca ou limpe os filtros.' : 'Toque no + para adicionar.');
    }

    elConteudo.innerHTML =
      '<div class="tela">' +
        '<div class="tela-cabeca"><h1 class="tela-titulo">' + titulo + '</h1></div>' +
        Render.painelPeriodo(resumoP, metaP, escopo, tipo, nomeDoPeriodo(f.periodo)) +
        barraFiltros(tipo, contagens) +
        Render.linhaResultado(filtradas.length, total, temFiltroNaLista) +
        corpo +
      '</div>';

    ligarFiltros(tipo);
  }

  function ligarFiltros(tipo) {
    function re() { telaLista(tipo); }

    var selP = document.getElementById('fSelPeriodo');
    if (selP) selP.addEventListener('change', function () {
      var v = selP.value;
      if (v === 'mes-especifico') {
        var p = Datas.parseISO(Datas.hoje());
        estado.filtro.periodo = { tipo: v, ano: p.ano, mes: p.mes };
      } else if (v === 'personalizado') {
        estado.filtro.periodo = { tipo: v, inicio: Datas.hoje(), fim: Datas.hoje() };
      } else {
        estado.filtro.periodo = { tipo: v };
      }
      re();
    });

    var selM = document.getElementById('fSelMes');
    if (selM) selM.addEventListener('change', function () {
      var pa = selM.value.split('-');
      estado.filtro.periodo = { tipo: 'mes-especifico', ano: parseInt(pa[0], 10), mes: parseInt(pa[1], 10) };
      re();
    });

    var ini = document.getElementById('fPersInicio'), fim = document.getElementById('fPersFim');
    if (ini && fim) [ini, fim].forEach(function (el) {
      el.addEventListener('change', function () {
        estado.filtro.periodo = { tipo: 'personalizado', inicio: ini.value, fim: fim.value };
        re();
      });
    });

    var selC = document.getElementById('fSelCategoria');
    if (selC) selC.addEventListener('change', function () { estado.filtro.categoria = selC.value; re(); });

    var selO = document.getElementById('fSelOrdem');
    if (selO) selO.addEventListener('change', function () { estado.filtro.ordem = selO.value; re(); });

    var busca = document.getElementById('fBusca');
    if (busca) {
      var timer = null;
      busca.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          estado.filtro.busca = busca.value;
          re();
          var novo = document.getElementById('fBusca');
          if (novo) { novo.focus(); novo.setSelectionRange(novo.value.length, novo.value.length); }
        }, 260);
      });
    }

    Array.prototype.forEach.call(document.querySelectorAll('[data-filtro="status"]'), function (chip) {
      chip.addEventListener('click', function () { estado.filtro.status = chip.getAttribute('data-valor'); re(); });
    });
  }

  // ---------------------------------------------------------------- METAS
  function resumoDaMeta(meta) {
    return Metas.resumoDaCampanha(meta, Store.listarContas(), Datas.hoje(), Store.listarMetas());
  }

  function telaMetas() {
    estado.metaAberta = null;
    var contas = Store.listarContas();
    var todas = Store.listarMetas();
    var hoje = Datas.hoje();

    var pares = todas.map(function (m) {
      return { meta: m, resumo: Metas.resumoDaCampanha(m, contas, hoje, todas) };
    }).sort(function (a, b) {
      // as que estão correndo agora primeiro; depois as futuras; encerradas por último
      function peso(p) { return p.resumo.encerrada ? 2 : (p.resumo.mesCorrente ? 0 : 1); }
      return peso(a) - peso(b) || String(b.meta.criadoEm).localeCompare(String(a.meta.criadoEm));
    });

    elConteudo.innerHTML =
      '<div class="tela">' +
        '<div class="tela-cabeca">' +
          '<div>' +
            '<h1 class="tela-titulo">Metas</h1>' +
            '<p class="tela-sub">Junte dinheiro, pague as contas, veja o que sobra.</p>' +
          '</div>' +
          '<button class="botao botao-principal botao-compacto" data-acao="nova-meta">' +
            Icones.get('mais') + 'Nova meta</button>' +
        '</div>' +
        RenderMetas.listaDeMetas(pares) +
      '</div>';
  }

  function telaMeta(id) {
    var meta = Store.obterMeta(id);
    if (!meta) { irPara('metas'); return; }

    estado.metaAberta = id;
    var r = resumoDaMeta(meta);

    // O seletor abre sozinho no mês corrente — é onde a ação está. Só cai em "geral" quando a
    // campanha não tem mês corrente (ainda não começou ou já acabou).
    if (estado.mesAtivo === null) {
      estado.mesAtivo = r.mesCorrente ? (r.mesCorrente.ano + '-' + r.mesCorrente.mes) : 'geral';
    }

    var hoje = Datas.hoje();
    var impacto = Metas.impactoDasContasNovas(meta, Store.listarContas(), Store.listarMetas());
    var aviso = RenderMetas.avisoContasNovas(impacto, r, Metas.campanhaCruzaAno(meta));

    var corpo;
    if (estado.mesAtivo === 'geral') {
      corpo = RenderMetas.heroiCofre(r) + resumoDeRiscos(r) +
              RenderMetas.escadaDoCofre(r) + RenderMetas.graficoCofre(r);
    } else if (estado.mesAtivo === 'relatorio') {
      corpo = RenderMetas.telaRelatorio(meta, r, hoje);
    } else {
      var mes = r.meses.filter(function (m) { return m.ano + '-' + m.mes === estado.mesAtivo; })[0];
      if (!mes) { estado.mesAtivo = 'geral'; telaMeta(id); return; }

      // "Até onde o dinheiro alcança" e o rodapé do que entra no mês — contexto, não cálculo.
      var alcance = Metas.ateOndeAlcanca(mes.contas.pendentes, mes.saldo);
      var iv = Metas.intervaloDoMes(mes.ano, mes.mes);
      var receber = Store.listarContas().filter(function (c) {
        return c.tipo === 'receber' && Datas.estaEntre(c.vencimento, iv.inicio, iv.fim);
      });

      corpo = RenderMetas.alertaVermelho(mes) +
        RenderMetas.painelDoMes(mes, meta) +
        RenderMetas.rodapeReceber(
          receber.reduce(function (s, c) { return s + c.valor; }, 0), receber.length, mes.mes) +
        '<div class="meta-acoes">' +
          '<button class="botao botao-principal" data-acao="novo-aporte" data-id="' + meta.id + '">' +
            Icones.get('subir') + 'Adicionar dinheiro</button>' +
          '<button class="botao botao-fantasma" data-acao="nova-retirada" data-id="' + meta.id + '">' +
            Icones.get('descer') + 'Retirar</button>' +
        '</div>' +
        RenderMetas.listaContasDaMeta(mes, meta, hoje, alcance) +
        RenderMetas.extratoDoMes(meta, mes.ano, mes.mes);
    }

    elConteudo.innerHTML =
      '<div class="tela">' +
        '<div class="tela-cabeca tela-cabeca--meta">' +
          '<button class="icon-btn icon-btn--voltar" data-acao="voltar-metas" aria-label="Voltar para as metas">' +
            Icones.get('seta') + '</button>' +
          '<div class="tc-meio">' +
            '<h1 class="tela-titulo">' + Render.esc(meta.nome) + '</h1>' +
            '<p class="tela-sub">' + Render.esc(RenderMetas.periodoDaCampanha(meta)) + '</p>' +
          '</div>' +
          '<button class="icon-btn" data-acao="editar-meta" data-id="' + meta.id + '" aria-label="Editar meta">' +
            Icones.get('editar') + '</button>' +
          '<button class="icon-btn" data-acao="excluir-meta" data-id="' + meta.id + '" aria-label="Excluir meta">' +
            Icones.get('excluir') + '</button>' +
        '</div>' +
        RenderMetas.seletorMeses(r, estado.mesAtivo) +
        aviso +
        corpo +
      '</div>';

    if (estado.mesAtivo === 'relatorio') ligarSimulador(r);
  }

  /** Na visão geral, um resumo dos meses que fechariam no vermelho — antes de abrir cada um. */
  function resumoDeRiscos(r) {
    var risco = Metas.mesesEmRisco(r);
    if (!risco.length) return '';
    var comAno = Metas.campanhaCruzaAno(r.meta);
    var nomes = risco.map(function (m) {
      return RenderMetas.nomeMesCurto(m.ano, m.mes, comAno);
    }).join(', ');
    var total = risco.reduce(function (s, m) { return s + Math.abs(m.sobraPrevista); }, 0);

    return (
      '<div class="alerta-vermelho">' + Icones.get('alerta') +
        '<span class="ms-texto">' +
          (risco.length === 1 ? '<strong>' + Render.esc(nomes) + '</strong> fecharia no vermelho'
                              : '<strong>' + Render.esc(nomes) + '</strong> fechariam no vermelho') +
          ': as contas passam da caixinha em <strong>' + Formatar.dinheiro(total) + '</strong>.' +
        '</span>' +
      '</div>'
    );
  }

  /** O simulador recalcula na hora, sem re-render da tela — o arraste tem que ser fluido. */
  function ligarSimulador(resumo) {
    var range = document.getElementById('simRange');
    if (!range) return;
    var saida = document.getElementById('simSaida');
    var valor = document.getElementById('simValor');

    function atualizar() {
      var porDia = Number(range.value);
      valor.textContent = Formatar.dinheiro(porDia) + '/dia';
      saida.innerHTML = RenderMetas.resultadoSimulacao(
        Metas.simular(resumo, porDia, Datas.hoje()), resumo);
    }
    range.addEventListener('input', atualizar);
    atualizar();
  }

  // ---- contas que entram sozinhas na meta (RN011 → RN020) ----
  function fotografarContas(metaId) {
    var meta = Store.obterMeta(metaId);
    if (!meta) return;
    Store.atualizarMeta(metaId, {
      contasConhecidas: Metas.idsDasContasDaMeta(meta, Store.listarContas(), Store.listarMetas()),
      snapshotEm: new Date().toISOString()
    });
  }

  function aceitarContasNovas(metaId) {
    fotografarContas(metaId);
    toast('Anotado. As contas novas seguem na meta.');
    renderRota();
  }

  /** Tira da meta só as contas que ACABARAM de entrar — o resto da seleção continua igual. */
  function tirarContasNovas(metaId) {
    var meta = Store.obterMeta(metaId);
    if (!meta) return;
    var novas = Metas.contasNovas(meta, Store.listarContas(), Store.listarMetas());
    if (!novas.length) return;

    var excluidas = (meta.selecao.excluidas || []).slice();
    var comMovimento = 0;
    novas.forEach(function (n) {
      // RN017: conta com dinheiro movimentado não sai por filtro — sairia sem devolver nada.
      if (Metas.temMovimentoDaConta(meta, n.conta.id)) { comMovimento++; return; }
      if (excluidas.indexOf(n.conta.id) === -1) excluidas.push(n.conta.id);
    });

    Store.atualizarMeta(metaId, { selecao: Object.assign({}, meta.selecao, { excluidas: excluidas }) });
    fotografarContas(metaId);
    toast(comMovimento > 0
      ? (novas.length - comMovimento) + ' tiradas. ' + comMovimento +
        ' já tinham dinheiro movimentado e ficaram.'
      : novas.length + (novas.length === 1 ? ' conta tirada da meta.' : ' contas tiradas da meta.'));
    renderRota();
  }

  function duplicarMeta(metaId) {
    var meta = Store.obterMeta(metaId);
    if (!meta) return;
    var meses = Metas.mesesParaDuplicar(meta);
    if (!meses.length) return;

    var nova = Metas.novaMeta({
      nome: meta.nome + ' (2)',
      meses: meses,
      categorias: (meta.selecao.categorias || []).slice()
    });
    Store.adicionarMeta(nova);
    fotografarContas(nova.id);
    toast('Campanha criada. Confira os valores e o nome.');
    estado.mesAtivo = null;
    irPara('metas/' + nova.id);
  }

  // ---- assistente de criação/edição da meta ----
  var editandoMetaId = null;

  function opcoesDeMesParaMeta() {
    var p = Datas.parseISO(Datas.hoje());
    var out = [];
    for (var i = 0; i < 18; i++) {
      var iso = Datas.somarMeses(Datas.formatarISO(p.ano, p.mes, 1), i);
      var d = Datas.parseISO(iso);
      out.push({ ano: d.ano, mes: d.mes });
    }
    return out;
  }

  function montarMesesDoAssistente(meta) {
    var escolhidos = {};
    (meta ? meta.meses : []).forEach(function (m) { escolhidos[m.ano + '-' + m.mes] = m.alvo; });

    // Mês já passado que faça parte da meta não aparece na lista dos 18 seguintes — mas não
    // pode sumir na edição, senão salvar apagaria o histórico dele.
    var opcoes = opcoesDeMesParaMeta();
    var chaves = {};
    opcoes.forEach(function (o) { chaves[o.ano + '-' + o.mes] = true; });
    (meta ? meta.meses : []).forEach(function (m) {
      if (!chaves[m.ano + '-' + m.mes]) opcoes.push({ ano: m.ano, mes: m.mes });
    });
    opcoes.sort(function (a, b) { return Metas.chaveMes(a.ano, a.mes) - Metas.chaveMes(b.ano, b.mes); });

    document.getElementById('mMeses').innerHTML = opcoes.map(function (o) {
      var chave = o.ano + '-' + o.mes;
      var marcado = Object.prototype.hasOwnProperty.call(escolhidos, chave);
      return (
        '<div class="mes-linha' + (marcado ? ' marcado' : '') + '" data-chave="' + chave + '">' +
          '<label class="mes-check">' +
            '<input type="checkbox" data-ano="' + o.ano + '" data-mes="' + o.mes + '"' + (marcado ? ' checked' : '') + '>' +
            '<span>' + Formatar.capitalizar(Datas.nomeMes(o.mes)) + ' <em>' + o.ano + '</em></span>' +
          '</label>' +
          '<input type="number" class="mes-alvo" min="0" step="0.01" inputmode="decimal" placeholder="0,00"' +
            ' value="' + (marcado ? escolhidos[chave] : '') + '"' + (marcado ? '' : ' disabled') + '>' +
        '</div>'
      );
    }).join('');
  }

  function montarCategoriasDoAssistente(meta) {
    var marcadas = meta ? (meta.selecao.categorias || []) : [];
    document.getElementById('mCats').innerHTML = Store.listarCategorias().map(function (c) {
      var on = marcadas.indexOf(c) !== -1;
      return '<button type="button" class="chip chip--cat' + (on ? ' ativo' : '') + '" data-cat="' + Render.esc(c) + '">' +
             Icones.get(Categorias.icone(c)) + Render.esc(Formatar.capitalizar(c)) + '</button>';
    }).join('');
  }

  function lerMesesDoAssistente() {
    var out = [];
    Array.prototype.forEach.call(document.querySelectorAll('#mMeses .mes-linha'), function (linha) {
      var chk = linha.querySelector('input[type=checkbox]');
      if (!chk.checked) return;
      out.push({
        ano: Number(chk.getAttribute('data-ano')),
        mes: Number(chk.getAttribute('data-mes')),
        alvo: Number(linha.querySelector('.mes-alvo').value) || 0
      });
    });
    return out;
  }

  function lerCategoriasDoAssistente() {
    return Array.prototype.map.call(
      document.querySelectorAll('#mCats .chip.ativo'),
      function (b) { return b.getAttribute('data-cat'); }
    );
  }

  function atualizarPreviaDaMeta() {
    var meses = lerMesesDoAssistente();
    var total = meses.reduce(function (s, m) { return s + m.alvo; }, 0);
    var contas = Store.listarContas();
    var cats = lerCategoriasDoAssistente();

    // prévia das contas: mesma regra da meta real, só que sem meta gravada ainda
    var fantasma = { id: '__previa__', criadoEm: '9999', selecao: { categorias: cats, incluidas: [], excluidas: [] }, movimentos: [] };
    var totalContas = meses.reduce(function (s, m) {
      return s + Metas.contasDaMeta(fantasma, contas, m.ano, m.mes)
        .reduce(function (a, c) { return a + c.valor; }, 0);
    }, 0);

    var sobra = total - totalContas;
    document.getElementById('mPrevia').innerHTML = meses.length === 0
      ? '<p class="dica">Marque pelo menos um mês para ver a prévia.</p>'
      : (
        '<div class="prev-linha"><span>' + meses.length + (meses.length === 1 ? ' mês' : ' meses') +
          ' · vou juntar</span><span class="num">' + Formatar.dinheiro(total) + '</span></div>' +
        '<div class="prev-linha"><span>contas que entram</span><span class="num">' +
          Formatar.dinheiro(totalContas) + '</span></div>' +
        '<div class="prev-linha prev-linha--forte"><span>sobra prevista</span>' +
          '<span class="num ' + (sobra >= 0 ? 'v-positivo' : 'v-negativo') + '">' +
          Formatar.dinheiro(sobra) + '</span></div>'
      );
  }

  function abrirModalMeta(id) {
    editandoMetaId = id || null;
    var meta = id ? Store.obterMeta(id) : null;

    document.getElementById('metaTitulo').textContent = meta ? 'Editar meta' : 'Nova meta';
    document.getElementById('mNome').value = meta ? meta.nome : '';
    document.getElementById('mTotal').value = '';

    montarMesesDoAssistente(meta);
    montarCategoriasDoAssistente(meta);
    atualizarPreviaDaMeta();

    document.getElementById('camadaMeta').hidden = false;
    document.getElementById('mNome').focus();
  }

  function fecharModalMeta() {
    document.getElementById('camadaMeta').hidden = true;
    editandoMetaId = null;
  }

  function salvarMeta(ev) {
    ev.preventDefault();
    var nome = document.getElementById('mNome').value.trim();
    var meses = lerMesesDoAssistente();
    var cats = lerCategoriasDoAssistente();

    if (!nome) { toast('Dê um nome para a meta.'); return; }
    if (!meses.length) { toast('Marque pelo menos um mês.'); return; }

    if (editandoMetaId) {
      Store.atualizarMeta(editandoMetaId, {
        nome: nome,
        meses: meses.sort(function (a, b) { return Metas.chaveMes(a.ano, a.mes) - Metas.chaveMes(b.ano, b.mes); }),
        selecao: Object.assign({}, Store.obterMeta(editandoMetaId).selecao, { categorias: cats })
      });
      toast('Meta atualizada.');
      fecharModalMeta();
      renderRota();
      return;
    }

    var nova = Metas.novaMeta({ nome: nome, meses: meses, categorias: cats });
    Store.adicionarMeta(nova);
    // Fotografa na criação: sem isso, a meta acusaria o acervo inteiro como "conta nova".
    fotografarContas(nova.id);
    toast('Meta criada.');
    fecharModalMeta();
    estado.mesAtivo = null;
    irPara('metas/' + nova.id);
  }

  function excluirMeta(id) {
    var meta = Store.obterMeta(id);
    if (!meta) return;
    // D007.8 — a meta só LÊ as contas. Apagar a meta não pode encostar em nenhuma delas.
    confirmar('Excluir meta',
      'Isto apaga a meta "' + meta.nome + '" e o extrato dela (' +
      (meta.movimentos || []).length + ' lançamento(s)). As suas contas a pagar NÃO são afetadas.',
      [
        { rotulo: 'Cancelar', classe: 'botao-fantasma', valor: null },
        { rotulo: 'Excluir a meta', classe: 'botao-perigo', valor: 'sim' }
      ]).then(function (resp) {
        if (resp !== 'sim') return;
        Store.removerMeta(id);
        toast('Meta excluída. Suas contas continuam intactas.');
        irPara('metas');
      });
  }

  // ---- lançar dinheiro (aporte / retirada) ----
  var aporteContexto = { metaId: null, tipo: 'aporte' };

  function ultimoValorLancado(meta) {
    var aportes = (meta.movimentos || []).filter(function (m) { return m.tipo === 'aporte'; });
    return aportes.length ? aportes[aportes.length - 1].valor : 0;
  }

  function dentroDosMesesDaMeta(meta, iso) {
    var p = Datas.parseISO(iso);
    return Metas.temMes(meta, p.ano, p.mes);
  }

  function abrirModalAporte(metaId, tipo) {
    var meta = Store.obterMeta(metaId);
    if (!meta) return;
    aporteContexto = { metaId: metaId, tipo: tipo === 'retirada' ? 'retirada' : 'aporte' };
    var ehRetirada = aporteContexto.tipo === 'retirada';

    document.getElementById('aporteTitulo').textContent =
      ehRetirada ? 'Retirar da caixinha' : 'Adicionar dinheiro na meta';
    document.getElementById('aporteDica').textContent = ehRetirada
      ? 'A retirada fica registrada no extrato — depois você sabe por que o cofre encolheu.'
      : 'Cada lançamento entra no extrato e alivia a meta de amanhã.';

    // data padrão: hoje se hoje faz parte da meta; senão o 1º dia do mês aberto mais próximo
    var hoje = Datas.hoje();
    var padrao = hoje;
    if (!dentroDosMesesDaMeta(meta, hoje)) {
      var meses = Metas.mesesOrdenados(meta);
      var alvo = meses.filter(function (m) {
        return Metas.estadoDoMes(m.ano, m.mes, hoje) !== 'encerrado';
      })[0] || meses[meses.length - 1];
      if (alvo) padrao = Datas.formatarISO(alvo.ano, alvo.mes, 1);
    }
    document.getElementById('aData').value = padrao;
    document.getElementById('aValor').value = '';
    document.getElementById('aNota').value = '';

    var ultimo = ultimoValorLancado(meta);
    var atalhos = [50, 100, 200].map(function (v) {
      return '<button type="button" class="chip" data-valor="' + v + '">+' + v + '</button>';
    });
    if (ultimo > 0 && [50, 100, 200].indexOf(ultimo) === -1) {
      atalhos.push('<button type="button" class="chip" data-valor="' + ultimo + '">repetir ' +
        Formatar.dinheiro(ultimo) + '</button>');
    }
    document.getElementById('aAtalhos').innerHTML = ehRetirada ? '' : atalhos.join('');

    document.getElementById('camadaAporte').hidden = false;
    document.getElementById('aValor').focus();
  }

  function fecharModalAporte() { document.getElementById('camadaAporte').hidden = true; }

  function salvarAporte(ev) {
    ev.preventDefault();
    var meta = Store.obterMeta(aporteContexto.metaId);
    if (!meta) return;

    var data = document.getElementById('aData').value || Datas.hoje();
    var valor = Number(document.getElementById('aValor').value);
    var nota = document.getElementById('aNota').value.trim();

    if (!valor || valor <= 0) { toast('Informe um valor maior que zero.'); return; }

    // D007.7 — lançamento fora dos meses da meta some da conta. Em vez de aceitar em silêncio,
    // o erro vira oferta: estender a campanha até aquele mês.
    if (!dentroDosMesesDaMeta(meta, data)) {
      var p = Datas.parseISO(data);
      var nomeMes = Formatar.capitalizar(Datas.nomeMes(p.mes)) + ' de ' + p.ano;
      confirmar('Data fora da meta',
        nomeMes + ' não faz parte de "' + meta.nome + '". Quer estender a meta até lá?',
        [
          { rotulo: 'Cancelar', classe: 'botao-fantasma', valor: null },
          { rotulo: 'Estender até ' + nomeMes, classe: 'botao-principal', valor: 'estender' }
        ]).then(function (resp) {
          if (resp !== 'estender') return;
          var meses = Metas.mesesOrdenados(meta);
          var alvoPadrao = meses.length ? meses[meses.length - 1].alvo : 0;
          Store.atualizarMeta(meta.id, {
            meses: meses.concat([{ ano: p.ano, mes: p.mes, alvo: alvoPadrao }])
              .sort(function (a, b) { return Metas.chaveMes(a.ano, a.mes) - Metas.chaveMes(b.ano, b.mes); })
          });
          gravarLancamento(meta.id, data, valor, nota);
        });
      return;
    }

    gravarLancamento(meta.id, data, valor, nota);
  }

  function gravarLancamento(metaId, data, valor, nota) {
    var mov = Metas.novoMovimento({ tipo: aporteContexto.tipo, data: data, valor: valor, nota: nota });
    Store.adicionarMovimento(metaId, mov);

    var meta = Store.obterMeta(metaId);
    var p = Datas.parseISO(data);
    var r = Metas.resumoDoMes(meta, Store.listarContas(), p.ano, p.mes, Datas.hoje(), {
      outrasMetas: Store.listarMetas(), saldoDisponivel: Metas.saldoDaMeta(meta)
    });

    if (aporteContexto.tipo === 'retirada') {
      toast('Retirada de ' + Formatar.dinheiro(valor) + ' registrada.');
    } else if (r.faltaJuntar <= 0) {
      toast('Caixinha de ' + Datas.nomeMes(p.mes) + ' batida! O excedente vai pro cofre.');
    } else {
      toast('Lançado! Agora faltam ' + Formatar.dinheiro(r.metaPorDia) + ' por dia.');
    }

    fecharModalAporte();
    estado.mesAtivo = p.ano + '-' + p.mes;
    renderRota();
  }

  // ---- baixa cruzada: a conta e a caixinha são fatos separados (RN016) ----

  /**
   * Pagar POR DENTRO da meta: dá baixa na conta e debita a caixinha, num toque só.
   * Três desvios antes disso:
   *  - conta já paga fora da meta → alerta anti-baixa-dupla (D007.10), com o abatimento na mão
   *  - caixinha não cobre o valor → pergunta se o dinheiro veio de fora
   *  - conta já abatida → não faz nada (o card já oferece "Desfazer")
   */
  function pagarNaMeta(metaId, contaId) {
    var meta = Store.obterMeta(metaId);
    var conta = Store.listarContas().filter(function (c) { return c.id === contaId; })[0];
    if (!meta || !conta) return;

    var sit = Metas.situacaoNaMeta(meta, conta);
    if (sit === 'abatida') { toast('Esta conta já foi paga e abatida da caixinha.'); return; }
    if (sit === 'abatida-sem-pagamento') { abrirModalPagamento(conta, null); return; }

    if (sit === 'paga-fora') {
      confirmar('Esta conta já foi paga',
        '"' + conta.descricao + '" foi paga em ' +
        Formatar.dataCurta(conta.pagoEm || conta.vencimento) + ', em Contas a Pagar. ' +
        'Quer abater os ' + Formatar.dinheiro(conta.valor) + ' da caixinha agora?',
        [
          { rotulo: 'Não, só marcar', classe: 'botao-fantasma', valor: null },
          { rotulo: 'Sim, abater da meta', classe: 'botao-principal', valor: 'abater' }
        ]).then(function (resp) {
          if (resp === 'abater') abaterDaMeta(metaId, contaId);
        });
      return;
    }

    var saldo = Metas.saldoDaMeta(meta);
    if (saldo < conta.valor) {
      confirmar('A caixinha não cobre',
        'Você tem ' + Formatar.dinheiro(saldo) + ' na caixinha e a conta é de ' +
        Formatar.dinheiro(conta.valor) + '. Abater deixaria a caixinha em ' +
        Formatar.dinheiro(saldo - conta.valor) + '. O dinheiro veio de fora da meta?',
        [
          { rotulo: 'Cancelar', classe: 'botao-fantasma', valor: null },
          { rotulo: 'Paguei com dinheiro de fora', classe: 'botao-fantasma', valor: 'fora' },
          { rotulo: 'Abater mesmo assim', classe: 'botao-principal', valor: 'abater' }
        ]).then(function (resp) {
          if (resp === 'fora') abrirModalPagamento(conta, null);
          else if (resp === 'abater') abrirModalPagamento(conta, { metaId: metaId });
        });
      return;
    }

    abrirModalPagamento(conta, { metaId: metaId });
  }

  /** Registra que o dinheiro desta conta saiu da caixinha (a conta já estava paga). */
  function abaterDaMeta(metaId, contaId) {
    var conta = Store.listarContas().filter(function (c) { return c.id === contaId; })[0];
    if (!conta) return;

    var dona = Metas.metaQueAbateu(Store.listarMetas(), contaId);
    if (dona) { toast('Já abatida em "' + dona.nome + '".'); return; }

    Store.adicionarMovimento(metaId, Metas.novoMovimento({
      tipo: 'baixa',
      data: conta.pagoEm || Datas.hoje(),
      valor: conta.valor,
      contaId: conta.id,
      conta: conta
    }));
    toast(Formatar.dinheiro(conta.valor) + ' abatidos da caixinha.');
    renderRota();
  }

  /** Devolve o valor à caixinha, desfazendo o débito. A conta continua paga. */
  function desabaterDaMeta(metaId, contaId) {
    var meta = Store.obterMeta(metaId);
    var mov = meta && Metas.movimentoDaConta(meta, contaId);
    if (!mov) return;
    Store.removerMovimentosDaConta(metaId, contaId);
    toast(Formatar.dinheiro(mov.valor) + ' devolvidos à caixinha. A conta continua paga.');
    renderRota();
  }

  function excluirMovimento(metaId, movimentoId) {
    var meta = Store.obterMeta(metaId);
    if (!meta) return;
    var mov = (meta.movimentos || []).filter(function (m) { return m.id === movimentoId; })[0];
    if (!mov) return;
    confirmar('Excluir lançamento',
      Formatar.dinheiro(mov.valor) + ' de ' + Formatar.dataCurta(mov.data) +
      ' vai sair do extrato e o saldo da meta muda.',
      [
        { rotulo: 'Cancelar', classe: 'botao-fantasma', valor: null },
        { rotulo: 'Excluir', classe: 'botao-perigo', valor: 'sim' }
      ]).then(function (resp) {
        if (resp !== 'sim') return;
        Store.removerMovimento(metaId, movimentoId);
        toast('Lançamento excluído.');
        renderRota();
      });
  }

  /**
   * RN018 — desmarcar o pagamento devolve o dinheiro à caixinha, em TODAS as metas. Sem isto,
   * a conta voltaria a pendente com o débito de pé: a meta cobraria de novo um dinheiro que
   * já tinha saído, e o saldo passaria a mentir sem nada na tela denunciar.
   */
  function devolverBaixasDaConta(contaId) {
    var devolvido = 0;
    Store.listarMetas().forEach(function (m) {
      var mov = Metas.movimentoDaConta(m, contaId);
      if (!mov) return;
      devolvido += mov.valor;
      Store.removerMovimentosDaConta(m.id, contaId);
    });
    return devolvido;
  }

  // ---------------------------------------------------------------- AÇÕES
  /**
   * Delegação ÚNICA, anexada uma vez em iniciar(). NUNCA reanexar a cada render: #conteudo é
   * recriado via innerHTML a cada troca de tela, e reanexar empilharia um listener por render
   * — cada clique dispararia a ação várias vezes. Em "marcar paga" numa conta recorrente isso
   * geraria mais de uma próxima ocorrência por clique, violando a RN001.
   */
  function ligarAcoesUmaVez() {
    elConteudo.addEventListener('click', function (ev) {
      var alvo = ev.target.closest('[data-acao], [data-rota]');
      if (!alvo) return;

      var rota = alvo.getAttribute('data-rota');
      if (rota) { irPara(rota); return; }

      var acao = alvo.getAttribute('data-acao');
      var id = alvo.getAttribute('data-id');
      if (acao === 'alternar-pago') alternarPago(id);
      else if (acao === 'editar') abrirModalConta(id);
      else if (acao === 'excluir') excluirConta(id).then(function (m) { if (m) renderRota(); });
      else if (acao === 'nova-meta') abrirModalMeta(null);
      else if (acao === 'abrir-meta') { estado.mesAtivo = null; irPara('metas/' + id); }
      else if (acao === 'voltar-metas') { estado.mesAtivo = null; irPara('metas'); }
      else if (acao === 'editar-meta') abrirModalMeta(id);
      else if (acao === 'excluir-meta') excluirMeta(id);
      else if (acao === 'novo-aporte') abrirModalAporte(id, 'aporte');
      else if (acao === 'nova-retirada') abrirModalAporte(id, 'retirada');
      else if (acao === 'meta-pagar') pagarNaMeta(estado.metaAberta, id);
      else if (acao === 'meta-abater') abaterDaMeta(estado.metaAberta, id);
      else if (acao === 'meta-desabater') desabaterDaMeta(estado.metaAberta, id);
      else if (acao === 'excluir-movimento') excluirMovimento(estado.metaAberta, id);
      else if (acao === 'aceitar-novas') aceitarContasNovas(estado.metaAberta);
      else if (acao === 'tirar-novas') tirarContasNovas(estado.metaAberta);
      else if (acao === 'duplicar-meta') duplicarMeta(id);
    });

    // Chips de mês dentro de uma meta
    elConteudo.addEventListener('click', function (ev) {
      var chip = ev.target.closest('[data-mes]');
      if (!chip || !estado.metaAberta) return;
      estado.mesAtivo = chip.getAttribute('data-mes');
      telaMeta(estado.metaAberta);
      sincronizarFab();
    });

    // Card de meta também abre pelo teclado (é um role="button")
    elConteudo.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      var card = ev.target.closest('[data-acao="abrir-meta"]');
      if (!card) return;
      ev.preventDefault();
      estado.mesAtivo = null;
      irPara('metas/' + card.getAttribute('data-id'));
    });

    document.addEventListener('click', function (ev) {
      var alvo = ev.target.closest('.tabbar [data-rota], .topo-nav [data-rota]');
      if (alvo) irPara(alvo.getAttribute('data-rota'));
    });
  }

  function alternarPago(id) {
    var conta = Store.listarContas().filter(function (c) { return c.id === id; })[0];
    if (!conta) return;

    if (conta.status === 'pago') {
      Store.atualizarConta(id, { status: 'pendente', pagoEm: null });
      // RN018 — o débito na caixinha morre junto com o pagamento que o originou.
      var devolvido = devolverBaixasDaConta(id);
      toast(devolvido > 0
        ? 'Voltou para pendente. ' + Formatar.dinheiro(devolvido) + ' devolvidos à caixinha.'
        : 'Voltou para pendente.');
      renderRota();
      return;
    }
    abrirModalPagamento(conta);
  }

  /**
   * Marcar como paga escolhendo a data (padrão hoje) — pedido explícito do usuário.
   * `contextoMeta` (opcional) faz o pagamento debitar a caixinha no mesmo gesto: é o que
   * diferencia "paguei por dentro da meta" de "paguei em Contas a Pagar" (RN016).
   */
  function abrirModalPagamento(conta, contextoMeta) {
    var camada = document.getElementById('camadaPagar');
    document.getElementById('pagarDescricao').textContent = conta.descricao;
    document.getElementById('pagarValor').textContent = Formatar.dinheiro(conta.valor);
    var input = document.getElementById('fPagoEm');
    input.value = Datas.hoje();

    var aviso = document.getElementById('pagarAvisoRecorrente');
    aviso.hidden = !conta.recorrente;
    if (conta.recorrente) {
      aviso.innerHTML = 'Ao confirmar, a próxima ocorrência será criada para <strong>' +
        Formatar.dataCurta(Datas.somarMeses(conta.vencimento, 1)) + '</strong>.';
    }

    function fechar() {
      camada.hidden = true;
      btnOk.removeEventListener('click', confirmarPagamento);
      btnCancelar.removeEventListener('click', fechar);
      fundo.removeEventListener('click', fechar);
    }
    function confirmarPagamento() {
      var data = input.value || Datas.hoje();
      Store.atualizarConta(conta.id, { status: 'pago', pagoEm: data });

      // Pagou POR DENTRO da meta: a caixinha é debitada no mesmo gesto (RN016).
      var abateu = false;
      if (contextoMeta && contextoMeta.metaId && !Metas.metaQueAbateu(Store.listarMetas(), conta.id)) {
        Store.adicionarMovimento(contextoMeta.metaId, Metas.novoMovimento({
          tipo: 'baixa', data: data, valor: conta.valor, contaId: conta.id, conta: conta
        }));
        abateu = true;
      }

      var sufixo = abateu ? ' ' + Formatar.dinheiro(conta.valor) + ' saíram da caixinha.' : '';

      if (conta.recorrente) {
        var jaExiste = Store.listarContas().some(function (c) { return c.recorrenciaOrigemId === conta.id; });
        if (jaExiste) {
          toast('Paga em ' + Formatar.dataCurta(data) + '. A próxima já existia.' + sufixo);
        } else {
          var prox = Contas.gerarProximaRecorrencia(Object.assign({}, conta, { status: 'pago' }));
          Store.adicionarConta(prox);
          toast('Paga! Próxima em ' + Formatar.dataCurta(prox.vencimento) + '.' + sufixo);
        }
      } else {
        toast('Paga em ' + Formatar.dataCurta(data) + '.' + sufixo);
      }
      fechar();
      renderRota();
    }

    var btnOk = document.getElementById('pagarConfirmar');
    var btnCancelar = document.getElementById('pagarCancelar');
    var fundo = document.getElementById('pagarFundo');
    btnOk.addEventListener('click', confirmarPagamento);
    btnCancelar.addEventListener('click', fechar);
    fundo.addEventListener('click', fechar);
    camada.hidden = false;
    input.focus();
  }

  function excluirConta(id) {
    var conta = Store.listarContas().filter(function (c) { return c.id === id; })[0];
    if (!conta) return Promise.resolve(false);

    if (conta.parcela) {
      return confirmar('Excluir parcela',
        '"' + conta.descricao + '" ' + Formatar.rotuloParcela(conta) + ' faz parte de uma compra parcelada. O que você quer excluir?',
        [
          { rotulo: 'Cancelar', classe: 'botao-fantasma', valor: null },
          { rotulo: 'Só esta parcela', classe: 'botao-fantasma', valor: 'uma' },
          { rotulo: 'A série inteira (' + conta.parcela.total + ')', classe: 'botao-perigo', valor: 'serie' }
        ]
      ).then(function (e) {
        if (e === 'uma') { Store.removerConta(id); toast('Parcela excluída.'); return true; }
        if (e === 'serie') { Store.removerGrupo(conta.parcela.grupoId); toast('Série inteira excluída.'); return true; }
        return false;
      });
    }

    // Se a conta já foi abatida de alguma caixinha, excluir mexe em dinheiro — o aviso tem
    // que dizer isso ANTES, e o valor volta pra meta depois (D007.2).
    var dona = Metas.metaQueAbateu(Store.listarMetas(), id);
    var extra = dona
      ? ' Ela já foi abatida da meta "' + dona.nome + '": os ' + Formatar.dinheiro(conta.valor) +
        ' voltam para a caixinha.'
      : '';

    return confirmar('Excluir conta',
      'Excluir "' + conta.descricao + '"? Essa ação não pode ser desfeita.' + extra, [
        { rotulo: 'Cancelar', classe: 'botao-fantasma', valor: null },
        { rotulo: 'Excluir', classe: 'botao-perigo', valor: 'sim' }
      ]).then(function (e) {
        if (e !== 'sim') return false;
        var devolvido = devolverBaixasDaConta(id);
        Store.removerConta(id);
        toast(devolvido > 0
          ? 'Conta excluída. ' + Formatar.dinheiro(devolvido) + ' devolvidos à caixinha.'
          : 'Conta excluída.');
        return true;
      });
  }

  // ---------------------------------------------------------------- MODAL DE CONTA
  var editandoId = null;

  function preencherCategorias(atual) {
    var sel = document.getElementById('fCategoria');
    var cats = Store.listarCategorias();
    sel.innerHTML = cats.map(function (c) {
      return '<option value="' + Render.esc(c) + '">' + Render.esc(Formatar.capitalizar(c)) + '</option>';
    }).join('') + '<option value="__nova__">+ Nova categoria...</option>';
    sel.value = (atual && cats.indexOf(atual) !== -1) ? atual : cats[0];
  }

  function selSeg(container, valor) {
    Array.prototype.forEach.call(container.querySelectorAll('.seg-opcao'), function (b) {
      b.classList.toggle('ativo', b.getAttribute('data-valor') === valor);
    });
  }
  function segAtivo(container) {
    var b = container.querySelector('.seg-opcao.ativo');
    return b ? b.getAttribute('data-valor') : null;
  }

  function atualizarDicas() {
    var modo = segAtivo(document.getElementById('segModo'));
    document.getElementById('dicaRecorrente').hidden = modo !== 'recorrente';
    document.getElementById('campoParcelas').hidden = modo !== 'parcelada';
    document.getElementById('dicaParcelada').hidden = modo !== 'parcelada';
  }

  function abrirModalConta(id) {
    editandoId = id || null;
    var c = id ? Store.listarContas().filter(function (x) { return x.id === id; })[0] : null;

    document.getElementById('modalContaTitulo').textContent = c ? 'Editar conta' : 'Nova conta';
    document.getElementById('fDescricao').value = c ? c.descricao : '';
    document.getElementById('fValor').value = c ? c.valor : '';
    document.getElementById('fVencimento').value = c ? c.vencimento : Datas.hoje();
    document.getElementById('fNotas').value = c ? c.notas : '';
    document.getElementById('campoNovaCategoria').hidden = true;
    document.getElementById('fNovaCategoria').value = '';

    selSeg(document.getElementById('segTipo'), c ? c.tipo : (estado.rota === 'receber' ? 'receber' : 'pagar'));
    preencherCategorias(c ? c.categoria : null);

    var modo = c && c.parcela ? 'parcelada' : (c && c.recorrente ? 'recorrente' : 'avulsa');
    selSeg(document.getElementById('segModo'), modo);
    document.getElementById('fParcelas').value = (c && c.parcela) ? c.parcela.total : 2;

    // editar conta já parcelada/recorrente não deixa trocar o modo (evitaria série inconsistente)
    var travar = !!c && (!!c.parcela || !!c.recorrente);
    Array.prototype.forEach.call(document.querySelectorAll('#segModo .seg-opcao'), function (b) { b.disabled = travar; });

    atualizarDicas();
    document.getElementById('camadaModal').hidden = false;
    document.getElementById('fDescricao').focus();
  }

  function fecharModalConta() {
    document.getElementById('camadaModal').hidden = true;
    editandoId = null;
  }

  function salvarConta(ev) {
    ev.preventDefault();
    var tipo = segAtivo(document.getElementById('segTipo'));
    var descricao = document.getElementById('fDescricao').value.trim();
    var valor = parseFloat(document.getElementById('fValor').value);
    var vencimento = document.getElementById('fVencimento').value;
    var notas = document.getElementById('fNotas').value.trim();
    var modo = segAtivo(document.getElementById('segModo'));

    var sel = document.getElementById('fCategoria');
    var categoria = sel.value;
    if (categoria === '__nova__') {
      var nova = document.getElementById('fNovaCategoria').value.trim();
      if (!nova) { toast('Digite o nome da nova categoria.'); return; }
      Store.adicionarCategoria(nova);
      categoria = nova.toLowerCase();
    }

    if (!descricao || !valor || valor <= 0 || !vencimento) {
      toast('Preencha descrição, valor e vencimento.');
      return;
    }

    var dados = { tipo: tipo, descricao: descricao, categoria: categoria, valor: valor, vencimento: vencimento, notas: notas };

    if (editandoId) {
      // Mudar o valor de uma conta já abatida deixaria a baixa mentindo a diferença (F2/D007.2).
      // O extrato acompanha, e o toast diz o que mudou no dinheiro — nada em silêncio.
      var antes = Store.listarContas().filter(function (c) { return c.id === editandoId; })[0];
      var dona = Metas.metaQueAbateu(Store.listarMetas(), editandoId);
      var ajustou = 0;
      if (dona && antes && Number(dados.valor) !== antes.valor) {
        var movAntigo = Metas.movimentoDaConta(dona, editandoId);   // ler ANTES de remover
        ajustou = Number(dados.valor) - antes.valor;
        Store.removerMovimentosDaConta(dona.id, editandoId);
        Store.adicionarMovimento(dona.id, Metas.novoMovimento({
          tipo: 'baixa',
          data: (movAntigo && movAntigo.data) || antes.pagoEm || Datas.hoje(),
          valor: Number(dados.valor),
          contaId: editandoId,
          conta: Object.assign({}, antes, dados)
        }));
      }
      Store.atualizarConta(editandoId, dados);
      toast(ajustou !== 0
        ? 'Conta atualizada. A baixa na meta "' + dona.nome + '" acompanhou.'
        : 'Conta atualizada.');
    } else if (modo === 'parcelada') {
      var n = Math.max(1, parseInt(document.getElementById('fParcelas').value, 10) || 1);
      Store.adicionarContas(Contas.gerarParcelas(dados, n));
      toast(n > 1 ? n + ' parcelas criadas.' : 'Conta criada.');
    } else {
      Store.adicionarConta(Contas.novaConta(Object.assign({}, dados, { recorrente: modo === 'recorrente' })));
      toast('Conta criada.');
    }

    fecharModalConta();
    renderRota();
  }

  // ---------------------------------------------------------------- CONFIG
  function telaConfig() {
    var cats = Store.listarCategorias();
    var cfg = Store.getConfig();
    var todas = Store.listarContas();

    elConteudo.innerHTML =
      '<div class="tela">' +
        '<div class="tela-cabeca"><h1 class="tela-titulo">Ajustes</h1></div>' +

        '<div class="bloco">' +
          '<h3>Resumo</h3>' +
          '<p class="bloco-desc">' + todas.length + ' lançamento(s) guardado(s) neste navegador.</p>' +
        '</div>' +

        '<div class="bloco">' +
          '<h3>Categorias</h3>' +
          '<p class="bloco-desc">Cada categoria tem uma cor própria, usada nos cards e no gráfico.</p>' +
          '<div class="categorias-lista">' + cats.map(Render.catPill).join('') + '</div>' +
          '<form class="form-inline" id="formNovaCategoria">' +
            '<input class="select" type="text" id="fCategoriaConfig" placeholder="Nova categoria">' +
            '<button type="submit" class="botao botao-principal">Adicionar</button>' +
          '</form>' +
        '</div>' +

        '<div class="bloco">' +
          '<h3>Tema</h3>' +
          '<div class="segmentado" id="segTema" role="radiogroup" aria-label="Tema">' +
            '<button type="button" class="seg-opcao" data-valor="claro">Claro</button>' +
            '<button type="button" class="seg-opcao" data-valor="escuro">Escuro</button>' +
            '<button type="button" class="seg-opcao" data-valor="sistema">Sistema</button>' +
          '</div>' +
        '</div>' +

        '<div class="bloco">' +
          '<h3>Backup</h3>' +
          '<p class="bloco-desc">Os dados ficam só neste navegador. Uma cópia fora dele é o que salva você se perder o aparelho.</p>' +
          '<div id="cartaoBackup"></div>' +
          '<div class="linha-acoes">' +
            '<button type="button" class="botao botao-fantasma" id="btnExportar">' + Icones.get('download') + ' Exportar cópia</button>' +
            '<button type="button" class="botao botao-fantasma" id="btnImportar">' + Icones.get('upload') + ' Importar</button>' +
            '<input type="file" id="fArquivoBackup" accept="application/json" hidden>' +
          '</div>' +
        '</div>' +

        '<div class="bloco">' +
          '<h3>Pontos de restauração</h3>' +
          '<p class="bloco-desc">Fotografias automáticas guardadas dentro do app. Servem para voltar atrás de um engano — não substituem o backup em arquivo.</p>' +
          '<div id="listaPontos"></div>' +
        '</div>' +

        '<div class="bloco bloco--risco">' +
          '<h3>' + Icones.get('alerta') + ' Zona de risco</h3>' +
          '<p class="bloco-desc">Tudo aqui deixa um ponto de restauração antes de agir.</p>' +
          '<div class="risco-linha">' +
            '<div class="ms-texto">' +
              '<strong>Limpar histórico antigo</strong>' +
              '<span class="risco-nota">Apaga contas já pagas e antigas. Nunca apaga conta usada por uma meta.</span>' +
            '</div>' +
            '<div class="risco-acao">' +
              '<select class="select" id="selCorteLimpeza">' +
                '<option value="6">mais de 6 meses</option>' +
                '<option value="12" selected>mais de 1 ano</option>' +
                '<option value="24">mais de 2 anos</option>' +
              '</select>' +
              '<button type="button" class="botao botao-fantasma" id="btnLimparAntigas">Limpar</button>' +
            '</div>' +
          '</div>' +
          '<div class="risco-linha">' +
            '<div class="ms-texto">' +
              '<strong>Apagar todos os dados</strong>' +
              '<span class="risco-nota">Zera contas, metas e categorias criadas por você.</span>' +
            '</div>' +
            '<div class="risco-acao">' +
              '<button type="button" class="botao botao-perigo" id="btnApagarTudo">Apagar tudo</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    desenharCartaoBackup();
    desenharPontos();

    selSeg(document.getElementById('segTema'), cfg.tema === 'claro' ? 'claro' : (cfg.tema === 'escuro' ? 'escuro' : 'sistema'));

    document.getElementById('formNovaCategoria').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var input = document.getElementById('fCategoriaConfig');
      if (!input.value.trim()) return;
      Store.adicionarCategoria(input.value.trim());
      telaConfig();
    });

    document.getElementById('segTema').addEventListener('click', function (ev) {
      var b = ev.target.closest('.seg-opcao');
      if (!b) return;
      Store.setTema(b.getAttribute('data-valor'));
      selSeg(document.getElementById('segTema'), b.getAttribute('data-valor'));
      aplicarTema();
    });

    document.getElementById('btnExportar').addEventListener('click', baixarCopia);
    document.getElementById('btnImportar').addEventListener('click', function () {
      document.getElementById('fArquivoBackup').click();
    });
    document.getElementById('fArquivoBackup').addEventListener('change', function (ev) {
      var arq = ev.target.files[0];
      if (!arq) return;
      var leitor = new FileReader();
      leitor.onload = function () { perguntarComoImportar(leitor.result); };
      leitor.readAsText(arq);
      ev.target.value = '';
    });

    document.getElementById('btnApagarTudo').addEventListener('click', apagarTudoComFreio);
    document.getElementById('btnLimparAntigas').addEventListener('click', function () {
      limparAntigas(Number(document.getElementById('selCorteLimpeza').value));
    });
  }

  // ---------------------------------------------------------------- BACKUP: cartão
  /**
   * Dois cartões diferentes de proposito. No PC, a File System Access API existe e o
   * usuario ganha o "Atualizar" — mesmo arquivo, sem duplicata. No celular ela nao existe,
   * e insistir num botao inerte seria pior que nao ter: la o cartao vira aviso, dizendo
   * ha quantos dias o backup esta velho e quantas alteracoes aconteceram desde entao.
   */
  function desenharCartaoBackup() {
    var alvo = document.getElementById('cartaoBackup');
    if (!alvo) return;
    var st = Store.statusBackup();

    if (!Arquivo.suportado()) { alvo.innerHTML = cartaoAviso(st); return; }

    /**
     * Entre o pedido assincrono e a resposta, o usuario pode ter trocado de tela — e ai o
     * `alvo` que capturamos ja saiu do documento. Escrever nele nao quebra nada, mas procurar
     * os botoes depois devolve null e estoura. Achado pelo teste do plano 0008.
     */
    function aindaNaTela() { return alvo === document.getElementById('cartaoBackup'); }

    Arquivo.vinculado().then(function (h) {
      if (!aindaNaTela()) return;
      if (!h) {
        alvo.innerHTML =
          '<div class="bk-cartao">' +
            '<div class="ms-texto"><strong>Nenhum arquivo vinculado</strong>' +
            '<span class="bk-nota">Escolha um arquivo uma vez e depois ele se atualiza sozinho — sem virar um monte de cópia.</span></div>' +
            '<div class="bk-acoes"><button type="button" class="botao botao-principal" id="btnVincular">Escolher arquivo</button></div>' +
          '</div>';
        alvo.querySelector('#btnVincular').addEventListener('click', vincularArquivo);
        return;
      }
      // O estado real vem da permissao, nao de um palpite: so e "sincronizado" se o navegador
      // confirmar que da para escrever agora E nao houver gravacao esperando.
      Arquivo.permissaoConcedida(h).then(function (podeEscrever) {
        if (!aindaNaTela()) return;
        var ok = podeEscrever && !pendente;
        alvo.innerHTML =
          '<div class="bk-cartao bk-cartao--ativo">' +
            '<div class="ms-texto">' +
              '<strong>' + Icones.get('download') + ' ' + h.name + '</strong>' +
              '<span class="bk-sinal ' + (ok ? 'bk-sinal--ok' : 'bk-sinal--pendente') + '">' +
                '<span class="bk-bolinha"></span>' +
                (ok ? 'Sincronizado automaticamente' : 'Pendente — toque para reconectar') +
              '</span>' +
              '<span class="bk-nota">' + textoDoUltimo(st) + '</span>' +
            '</div>' +
            '<div class="bk-acoes">' +
              '<button type="button" class="botao botao-principal" id="btnAtualizarArquivo">' + Icones.get('repetir') + ' Atualizar</button>' +
              '<button type="button" class="botao botao-fantasma botao-mini" id="btnTrocarArquivo">Trocar</button>' +
            '</div>' +
          '</div>';
        // querySelector no proprio cartao, nao getElementById no documento: o cartao e a
        // fonte da verdade do que acabou de ser desenhado.
        alvo.querySelector('#btnAtualizarArquivo').addEventListener('click', atualizarArquivo);
        alvo.querySelector('#btnTrocarArquivo').addEventListener('click', vincularArquivo);
        // O aviso laranja e clicavel de proposito: e um clique de verdade, entao PODE pedir
        // permissao — diferente do auto-save, que so verifica.
        if (!ok) {
          alvo.querySelector('.bk-sinal--pendente').addEventListener('click', atualizarArquivo);
        }
      });
    });
  }

  function cartaoAviso(st) {
    if (!st.ultimo) {
      return '<div class="bk-cartao bk-cartao--alerta">' +
        '<div class="ms-texto"><strong>Você ainda não fez backup</strong>' +
        '<span class="bk-nota">Se este navegador limpar os dados, não há de onde voltar.</span></div></div>';
    }
    var dias = diasDesde(st.ultimo.em);
    var urgente = dias >= 7 || st.alteracoes >= 10;
    var quando = dias === 0 ? 'hoje' : (dias === 1 ? 'ontem' : 'há ' + dias + ' dias');
    var mudou = st.alteracoes === 0
      ? 'Nada mudou desde então.'
      : st.alteracoes + (st.alteracoes === 1 ? ' alteração' : ' alterações') + ' desde então.';
    return '<div class="bk-cartao' + (urgente ? ' bk-cartao--alerta' : '') + '">' +
      '<div class="ms-texto"><strong>Último backup ' + quando + '</strong>' +
      '<span class="bk-nota">' + mudou + '</span></div></div>';
  }

  function textoDoUltimo(st) {
    if (!st.ultimo) return 'Ainda não atualizado. Toque em Atualizar para gravar agora.';
    var dias = diasDesde(st.ultimo.em);
    var quando = dias === 0 ? 'hoje, ' + horaDe(st.ultimo.em) : (dias === 1 ? 'ontem' : 'há ' + dias + ' dias');
    var mudou = st.alteracoes === 0 ? 'em dia' : st.alteracoes + ' alteração(ões) depois';
    return 'atualizado ' + quando + ' · ' + st.ultimo.contas + ' contas · ' + mudou;
  }

  /**
   * Diferenca em dias de CALENDARIO, nao em horas corridas. Ontem as 19h e "ontem" mesmo
   * quando faltam 12 horas para completar 24 — contar por hora fazia a tela dizer "hoje"
   * para um ponto do dia anterior.
   */
  function diasDesde(iso) {
    var d = new Date(iso);
    var a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var agora = new Date();
    var b = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    return Math.max(0, Math.round((b - a) / 86400000));
  }
  function horaDe(iso) {
    var d = new Date(iso), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function baixarCopia() {
    var blob = new Blob([Store.exportarBackup()], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'financas-backup-' + Datas.hoje() + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    Store.registrarBackup('download');
    toast('Cópia exportada.');
    desenharCartaoBackup();
  }

  function vincularArquivo() {
    Arquivo.escolher('financas.json').then(function () {
      return Arquivo.atualizar(Store.exportarBackup());
    }).then(function (nome) {
      if (nome) { Store.registrarBackup('arquivo'); toast('Arquivo vinculado e gravado.'); }
      desenharCartaoBackup();
    }).catch(function () { /* o usuário fechou o seletor — nada a fazer */ });
  }

  function atualizarArquivo() {
    Arquivo.atualizar(Store.exportarBackup()).then(function (nome) {
      if (!nome) { toast('Permissão negada — escolha o arquivo de novo.'); return; }
      Store.registrarBackup('arquivo');
      // Gravou tudo agora: nao ha mais nada pendente, e o timer do auto-save perdeu a razao
      // de existir. Sem isto o cartao continuava laranja depois de uma gravacao bem-sucedida.
      pendente = false;
      if (timerAuto) { clearTimeout(timerAuto); timerAuto = null; }
      toast('Backup atualizado em ' + nome + '.');
      desenharCartaoBackup();
    }).catch(function (e) { toast('Não deu para gravar: ' + e.message); });
  }

  // ------------------------------------------------ BACKUP: gravação automática (plano 0008)
  /**
   * O auto-save. Regras que fazem ele existir sem incomodar:
   *
   * 1. NUNCA pede permissao — so `atualizarSePuder`, que grava se ja puder e devolve null se
   *    nao. Pedir exige o gesto do usuario (ver `arquivo.js`), entao aqui seria inutil.
   * 2. NUNCA avisa quando da certo. Um toast a cada 2 segundos seria o mesmo incomodo que o
   *    usuario pediu para tirar, so que disfarcado. A bolinha no cartao ja conta o estado.
   * 3. Falhar nao para o app: pendente vira aviso na tela e nova tentativa quando ele voltar.
   */
  var ESPERA_AUTO = 2000;
  var timerAuto = null;
  var pendente = false;

  function agendarGravacaoAutomatica() {
    pendente = true;
    sincronizarCartaoBackup();
    if (timerAuto) clearTimeout(timerAuto);
    timerAuto = setTimeout(gravarAutomaticamente, ESPERA_AUTO);
  }

  function gravarAutomaticamente() {
    if (timerAuto) { clearTimeout(timerAuto); timerAuto = null; }
    if (!Arquivo.suportado()) return Promise.resolve(false);
    return Arquivo.atualizarSePuder(Store.exportarBackup()).then(function (nome) {
      if (nome) {
        Store.registrarBackup('arquivo-auto');
        pendente = false;
      }
      sincronizarCartaoBackup();
      return !!nome;
    }, function () {
      sincronizarCartaoBackup();
      return false;
    });
  }

  /**
   * Sair do app e o momento mais perigoso no celular: o Android pode matar a aba a qualquer
   * instante depois disso. Entao aqui NAO se espera o debounce — grava agora.
   *
   * `visibilitychange` e nao `beforeunload`: no Android o segundo frequentemente nem dispara.
   */
  function ligarGravacaoAutomatica() {
    Store.aoAlterar(agendarGravacaoAutomatica);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        if (pendente) gravarAutomaticamente();
      } else {
        // Voltou pro app: a permissao pode ter caido enquanto ele estava fora, ou pode ter
        // ficado gravacao pendente. Tenta de novo, calado.
        if (pendente) gravarAutomaticamente();
        else sincronizarCartaoBackup();
      }
    });
  }

  /** Redesenha o cartão só se a tela de Ajustes estiver aberta — senão é trabalho à toa. */
  function sincronizarCartaoBackup() {
    if (document.getElementById('cartaoBackup')) desenharCartaoBackup();
  }

  // ---------------------------------------------------------------- BACKUP: importar
  function perguntarComoImportar(texto) {
    var dado;
    try { dado = JSON.parse(texto); } catch (e) { toast('Arquivo inválido: não é JSON.'); return; }
    if (!Backup.valido(dado)) { toast('Arquivo inválido: não parece um backup do Finanças.'); return; }

    var d = Backup.diagnosticar(Store.estadoAtual(), dado);
    var linhas = [
      'No arquivo: ' + d.contasNoArquivo + ' contas · ' + d.metasNoArquivo + ' metas.',
      'Você tem agora: ' + d.contasNoApp + ' contas · ' + d.metasNoApp + ' metas.',
      '',
      'Juntar acrescenta ' + d.contasNovas + ' conta(s) e ' + d.metasNovas + ' meta(s) que faltam. Nada é apagado.',
      'Substituir apaga tudo e usa só o arquivo' + (d.perdidasSeSubstituir ? ' — você perde ' + d.perdidasSeSubstituir + ' conta(s).' : '.')
    ].join('\n');

    confirmar('Como importar?', linhas, [
      { rotulo: 'Juntar', valor: 'juntar', classe: 'botao-principal' },
      { rotulo: 'Substituir', valor: 'substituir', classe: 'botao-perigo' },
      { rotulo: 'Cancelar', valor: null }
    ]).then(function (modo) {
      if (!modo) return;
      try {
        var r = Store.importarBackup(texto, modo);
        toast(modo === 'juntar' ? 'Juntado — agora são ' + r.contas + ' contas.' : 'Substituído — ' + r.contas + ' contas.');
        renderRota();
      } catch (e) { toast('Falhou: ' + e.message); }
    });
  }

  // ---------------------------------------------------------------- BACKUP: pontos
  function desenharPontos() {
    var alvo = document.getElementById('listaPontos');
    if (!alvo) return;
    var pontos = Store.listarPontos();
    if (!pontos.length) {
      alvo.innerHTML = '<p class="vazio-nota">Nenhum ponto ainda. O primeiro nasce sozinho amanhã, ou agora se você importar/apagar algo.</p>';
      return;
    }
    alvo.innerHTML = pontos.map(function (p) {
      var dias = diasDesde(p.em);
      var quando = dias === 0 ? 'hoje, ' + horaDe(p.em) : (dias === 1 ? 'ontem, ' + horaDe(p.em) : 'há ' + dias + ' dias');
      return '<div class="ponto-linha">' +
        '<div class="ms-texto"><strong>' + quando + '</strong>' +
        '<span class="ponto-nota">' + p.contas + ' contas · ' + p.metas + ' metas · ' + p.motivo + '</span></div>' +
        '<button type="button" class="botao botao-fantasma botao-mini" data-ponto="' + p.id + '">Restaurar</button>' +
      '</div>';
    }).join('');

    alvo.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-ponto]');
      if (!b) return;
      confirmar('Restaurar este ponto?',
        'Os dados de agora são guardados num ponto novo antes — dá para voltar.',
        [{ rotulo: 'Restaurar', valor: true, classe: 'botao-principal' }, { rotulo: 'Cancelar', valor: null }]
      ).then(function (ok) {
        if (!ok) return;
        if (Store.restaurarPonto(b.getAttribute('data-ponto'))) { toast('Restaurado.'); renderRota(); }
        else toast('Este ponto não existe mais.');
      });
    });
  }

  // ---------------------------------------------------------------- ZONA DE RISCO
  function apagarTudoComFreio() {
    var e = Store.estadoAtual();
    confirmar('Apagar todos os dados?',
      'Isso apaga ' + (e.contas || []).length + ' conta(s) e ' + (e.metas || []).length + ' meta(s).\n' +
      'Um ponto de restauração é criado antes — dá para voltar por aqui mesmo.\n' +
      'Digite APAGAR para confirmar.',
      [{ rotulo: 'Apagar tudo', valor: true, classe: 'botao-perigo', travado: true },
       { rotulo: 'Cancelar', valor: null }],
      { exigirTexto: 'APAGAR' }
    ).then(function (ok) {
      if (!ok) return;
      Store.apagarTudo();
      toast('Tudo apagado. Dá para voltar em Pontos de restauração.');
      renderRota();
    });
  }

  function limparAntigas(meses) {
    var corte = Datas.somarDias(Datas.hoje(), -Math.round(meses * 30.44));
    var estado = Store.estadoAtual();
    var previa = Backup.podarPagas(estado, corte);

    if (!previa.removidas) {
      toast('Nada a limpar' + (previa.preservadas ? ' — as antigas estão em uso por metas.' : '.'));
      return;
    }
    var extra = previa.preservadas
      ? '\n' + previa.preservadas + (previa.preservadas === 1 ? ' fica' : ' ficam') +
        ' de fora porque uma meta já abateu.' : '';

    confirmar('Limpar histórico?',
      'Isso apaga ' + previa.removidas + ' conta(s) já paga(s), vencida(s) antes de ' +
      Formatar.dataLonga(corte) + '.' + extra,
      [{ rotulo: 'Limpar', valor: true, classe: 'botao-perigo' }, { rotulo: 'Cancelar', valor: null }]
    ).then(function (ok) {
      if (!ok) return;
      var r = Store.limparPagasAntesDe(corte);
      toast(r.removidas + ' conta(s) removida(s).');
      renderRota();
    });
  }

  // ---------------------------------------------------------------- TEMA
  function aplicarTema() {
    var tema = Store.getConfig().tema;
    var root = document.documentElement;
    if (tema === 'claro') root.setAttribute('data-theme', 'light');
    else if (tema === 'escuro') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    sincronizarIconeTema();
  }
  function sincronizarIconeTema() {
    var escuro = document.documentElement.getAttribute('data-theme') === 'dark' ||
      (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.getElementById('btnTema').innerHTML = Icones.get(escuro ? 'lua' : 'sol');
  }

  // ---------------------------------------------------------------- ROTEADOR
  function renderRota() {
    var hash = location.hash.replace('#/', '') || 'dashboard';
    var partes = hash.split('/');
    var base = partes[0];
    if (['dashboard', 'pagar', 'receber', 'metas', 'config'].indexOf(base) === -1) base = 'dashboard';
    estado.rota = base;
    renderNav();

    if (base === 'dashboard') telaDashboard();
    else if (base === 'pagar') telaLista('pagar');
    else if (base === 'receber') telaLista('receber');
    else if (base === 'metas') { if (partes[1]) telaMeta(partes[1]); else telaMetas(); }
    else telaConfig();

    sincronizarFab();
    window.scrollTo(0, 0);
  }

  /**
   * O "+" muda de significado conforme a tela: em Metas ele cria meta (na lista) ou lança
   * dinheiro (dentro de uma). Botão que faz a coisa errada no contexto é pior que botão nenhum.
   */
  function sincronizarFab() {
    var fab = document.getElementById('btnNovaConta');
    if (!fab) return;
    // Dentro de uma meta o "+" abria "nova conta" — a ação errada para a tela em que se está.
    // Vale inclusive na visão Geral: ali o lançamento cai no mês corrente da campanha.
    var emMeta = estado.rota === 'metas' && !!estado.metaAberta;
    var naListaDeMetas = estado.rota === 'metas' && !estado.metaAberta;

    fab.setAttribute('aria-label',
      emMeta ? 'Adicionar dinheiro na meta' : (naListaDeMetas ? 'Nova meta' : 'Nova conta'));
    fab.innerHTML = Icones.get(emMeta ? 'subir' : 'mais');
  }

  function iniciar() {
    elConteudo = document.getElementById('conteudo');
    elNavDesktop = document.getElementById('navDesktop');
    elTabbar = document.getElementById('tabbar');
    elToast = document.getElementById('toast');

    aplicarTema();
    ligarAcoesUmaVez();
    renderRota();
    window.addEventListener('hashchange', renderRota);

    document.getElementById('btnTema').addEventListener('click', function () {
      var atual = Store.getConfig().tema;
      Store.setTema(atual === 'claro' ? 'escuro' : (atual === 'escuro' ? 'sistema' : 'claro'));
      aplicarTema();
    });
    document.getElementById('btnConfig').innerHTML = Icones.get('engrenagem');
    document.getElementById('btnConfig').addEventListener('click', function () { irPara('config'); });

    document.getElementById('btnNovaConta').innerHTML = Icones.get('mais');
    document.getElementById('btnNovaConta').addEventListener('click', function () {
      if (estado.rota === 'metas' && estado.metaAberta) {
        abrirModalAporte(estado.metaAberta, 'aporte');
      } else if (estado.rota === 'metas' && !estado.metaAberta) {
        abrirModalMeta(null);
      } else {
        abrirModalConta(null);
      }
    });

    // ---- assistente da meta ----
    document.getElementById('fecharModalMeta').innerHTML = Icones.get('fechar');
    document.getElementById('fecharModalMeta').addEventListener('click', fecharModalMeta);
    document.getElementById('cancelarModalMeta').addEventListener('click', fecharModalMeta);
    document.getElementById('metaFundo').addEventListener('click', fecharModalMeta);
    document.getElementById('formMeta').addEventListener('submit', salvarMeta);

    document.getElementById('mMeses').addEventListener('change', function (ev) {
      var chk = ev.target.closest('input[type=checkbox]');
      if (!chk) return;
      var linha = chk.closest('.mes-linha');
      var alvo = linha.querySelector('.mes-alvo');
      alvo.disabled = !chk.checked;
      linha.classList.toggle('marcado', chk.checked);
      if (!chk.checked) alvo.value = '';
      atualizarPreviaDaMeta();
    });
    document.getElementById('mMeses').addEventListener('input', function (ev) {
      if (ev.target.closest('.mes-alvo')) atualizarPreviaDaMeta();
    });

    document.getElementById('mCats').addEventListener('click', function (ev) {
      var chip = ev.target.closest('.chip--cat');
      if (!chip) return;
      chip.classList.toggle('ativo');
      atualizarPreviaDaMeta();
    });

    // "Dividir igual": digita o total e ele distribui pelos meses marcados, sem perder centavo
    document.getElementById('mDividir').addEventListener('click', function () {
      var total = Number(document.getElementById('mTotal').value);
      var linhas = Array.prototype.filter.call(
        document.querySelectorAll('#mMeses .mes-linha'),
        function (l) { return l.querySelector('input[type=checkbox]').checked; });
      if (!total || total <= 0) { toast('Digite o total que você quer juntar.'); return; }
      if (!linhas.length) { toast('Marque os meses primeiro.'); return; }
      var partes = Metas.dividirIgual(total, linhas.length);
      linhas.forEach(function (l, i) { l.querySelector('.mes-alvo').value = partes[i]; });
      atualizarPreviaDaMeta();
      toast(Formatar.dinheiro(total) + ' divididos em ' + linhas.length + ' meses.');
    });

    // ---- lançar dinheiro ----
    document.getElementById('fecharModalAporte').innerHTML = Icones.get('fechar');
    document.getElementById('fecharModalAporte').addEventListener('click', fecharModalAporte);
    document.getElementById('cancelarModalAporte').addEventListener('click', fecharModalAporte);
    document.getElementById('aporteFundo').addEventListener('click', fecharModalAporte);
    document.getElementById('formAporte').addEventListener('submit', salvarAporte);
    document.getElementById('aAtalhos').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-valor]');
      if (!b) return;
      var campo = document.getElementById('aValor');
      campo.value = (Number(campo.value) || 0) + Number(b.getAttribute('data-valor'));
      campo.focus();
    });

    document.getElementById('fecharModalConta').innerHTML = Icones.get('fechar');
    document.getElementById('fecharModalConta').addEventListener('click', fecharModalConta);
    document.getElementById('cancelarModalConta').addEventListener('click', fecharModalConta);
    document.getElementById('modalFundo').addEventListener('click', fecharModalConta);
    document.getElementById('formConta').addEventListener('submit', salvarConta);

    document.getElementById('segTipo').addEventListener('click', function (ev) {
      var b = ev.target.closest('.seg-opcao');
      if (b) selSeg(document.getElementById('segTipo'), b.getAttribute('data-valor'));
    });
    document.getElementById('segModo').addEventListener('click', function (ev) {
      var b = ev.target.closest('.seg-opcao');
      if (!b || b.disabled) return;
      selSeg(document.getElementById('segModo'), b.getAttribute('data-valor'));
      atualizarDicas();
    });
    document.getElementById('fCategoria').addEventListener('change', function () {
      document.getElementById('campoNovaCategoria').hidden = this.value !== '__nova__';
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Escape') return;
      if (!document.getElementById('camadaModal').hidden) fecharModalConta();
      else if (!document.getElementById('camadaMeta').hidden) fecharModalMeta();
      else if (!document.getElementById('camadaAporte').hidden) fecharModalAporte();
      else if (!document.getElementById('camadaPagar').hidden) document.getElementById('camadaPagar').hidden = true;
      else if (!document.getElementById('camadaConfirm').hidden) document.getElementById('camadaConfirm').hidden = true;
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      if (Store.getConfig().tema === 'sistema') sincronizarIconeTema();
    });
  }

  /**
   * Service worker — e ele que permite instalar na tela de inicio e abrir sem internet.
   *
   * A guarda de protocolo NAO e preciosismo: por `file://` a API existe mas o registro
   * rejeita, e TODOS os testes e2e deste projeto rodam por `file://`. Sem a guarda, o
   * critério de aceite "zero erros de console" cai e a suite inteira quebra junto.
   *
   * Falhar aqui nao e fatal: o app funciona exatamente igual, so nao abre offline. Por isso
   * avisa e segue, em vez de estourar.
   */
  function registrarServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    navigator.serviceWorker.register('sw.js').catch(function (e) {
      console.warn('Service worker não registrado — o app funciona igual, só não abre offline.', e);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
  registrarServiceWorker();
  ligarGravacaoAutomatica();
})();
