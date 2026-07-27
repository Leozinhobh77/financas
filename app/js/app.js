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
    { rota: 'config', icone: 'engrenagem', rotulo: 'Ajustes' }
  ];

  var estado = {
    rota: 'dashboard',
    filtro: { periodo: { tipo: 'mes-atual' }, status: 'todos', categoria: 'todas', busca: '', ordem: 'vencimento' }
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

  function confirmar(titulo, texto, botoes) {
    return new Promise(function (resolve) {
      var camada = document.getElementById('camadaConfirm');
      var fundo = document.getElementById('confirmFundo');
      document.getElementById('confirmTitulo').textContent = titulo;
      document.getElementById('confirmTexto').textContent = texto;
      var elBotoes = document.getElementById('confirmBotoes');
      elBotoes.innerHTML = '';
      botoes.forEach(function (b) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'botao ' + (b.classe || 'botao-fantasma');
        btn.textContent = b.rotulo;
        btn.addEventListener('click', function () { fechar(); resolve(b.valor); });
        elBotoes.appendChild(btn);
      });
      function fechar() { camada.hidden = true; fundo.removeEventListener('click', aoFundo); }
      function aoFundo() { fechar(); resolve(null); }
      fundo.addEventListener('click', aoFundo);
      camada.hidden = false;
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

    var rotulosStatus = { todos: 'Todas', pendente: 'Pendentes', atrasada: 'Atrasadas', pago: 'Pagas' };
    var chips = ['todos', 'pendente', 'atrasada', 'pago'].map(function (s) {
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
      atrasada: contarCom('atrasada'), pago: contarCom('pago')
    };

    var filtradas = ordenar(
      Filtros.aplicar(doTipo, { periodo: f.periodo, status: f.status, categoria: f.categoria, tipo: tipo }, hoje),
      f.ordem, hoje
    );

    var total = Filtros.total(filtradas);
    var titulo = tipo === 'pagar' ? 'Contas a pagar' : 'Contas a receber';
    var rotuloTotal = f.status === 'pago' ? 'Total já pago' : 'Total do filtro';

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
        barraFiltros(tipo, contagens) +
        '<div class="resumo-filtro">' +
          '<div><div class="rotulo">' + rotuloTotal + '</div>' +
            '<div class="qtd">' + filtradas.length + (filtradas.length === 1 ? ' conta' : ' contas') + '</div></div>' +
          '<span class="valor">' + Formatar.dinheiro(total) + '</span>' +
        '</div>' +
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
      toast('Voltou para pendente.');
      renderRota();
      return;
    }
    abrirModalPagamento(conta);
  }

  /** Marcar como paga escolhendo a data (padrão hoje) — pedido explícito do usuário. */
  function abrirModalPagamento(conta) {
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

      if (conta.recorrente) {
        var jaExiste = Store.listarContas().some(function (c) { return c.recorrenciaOrigemId === conta.id; });
        if (jaExiste) {
          toast('Paga em ' + Formatar.dataCurta(data) + '. A próxima já existia.');
        } else {
          var prox = Contas.gerarProximaRecorrencia(Object.assign({}, conta, { status: 'pago' }));
          Store.adicionarConta(prox);
          toast('Paga! Próxima em ' + Formatar.dataCurta(prox.vencimento) + '.');
        }
      } else {
        toast('Paga em ' + Formatar.dataCurta(data) + '.');
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

    return confirmar('Excluir conta', 'Excluir "' + conta.descricao + '"? Essa ação não pode ser desfeita.', [
      { rotulo: 'Cancelar', classe: 'botao-fantasma', valor: null },
      { rotulo: 'Excluir', classe: 'botao-perigo', valor: 'sim' }
    ]).then(function (e) {
      if (e === 'sim') { Store.removerConta(id); toast('Conta excluída.'); return true; }
      return false;
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
      Store.atualizarConta(editandoId, dados);
      toast('Conta atualizada.');
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
          '<p class="bloco-desc">Os dados ficam só neste navegador. Exporte de vez em quando para não perder nada.</p>' +
          '<div class="linha-acoes">' +
            '<button type="button" class="botao botao-fantasma" id="btnExportar">' + Icones.get('download') + ' Exportar</button>' +
            '<button type="button" class="botao botao-fantasma" id="btnImportar">' + Icones.get('upload') + ' Importar</button>' +
            '<input type="file" id="fArquivoBackup" accept="application/json" hidden>' +
          '</div>' +
        '</div>' +
      '</div>';

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

    document.getElementById('btnExportar').addEventListener('click', function () {
      var blob = new Blob([Store.exportarBackup()], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'financas-backup-' + Datas.hoje() + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Backup exportado.');
    });

    document.getElementById('btnImportar').addEventListener('click', function () {
      document.getElementById('fArquivoBackup').click();
    });
    document.getElementById('fArquivoBackup').addEventListener('change', function (ev) {
      var arq = ev.target.files[0];
      if (!arq) return;
      var leitor = new FileReader();
      leitor.onload = function () {
        try { Store.importarBackup(leitor.result); toast('Backup importado.'); renderRota(); }
        catch (e) { toast('Arquivo inválido: ' + e.message); }
      };
      leitor.readAsText(arq);
      ev.target.value = '';
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
    if (['dashboard', 'pagar', 'receber', 'config'].indexOf(hash) === -1) hash = 'dashboard';
    estado.rota = hash;
    renderNav();

    if (hash === 'dashboard') telaDashboard();
    else if (hash === 'pagar') telaLista('pagar');
    else if (hash === 'receber') telaLista('receber');
    else telaConfig();

    window.scrollTo(0, 0);
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
    document.getElementById('btnNovaConta').addEventListener('click', function () { abrirModalConta(null); });

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
      else if (!document.getElementById('camadaPagar').hidden) document.getElementById('camadaPagar').hidden = true;
      else if (!document.getElementById('camadaConfirm').hidden) document.getElementById('camadaConfirm').hidden = true;
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      if (Store.getConfig().tema === 'sistema') sincronizarIconeTema();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
