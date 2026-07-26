/**
 * app.js — bootstrap, roteador por hash, estado de filtro e ligação de eventos.
 * Lógica de negócio mora em contas.js/filtros.js/datas.js; aqui só se orquestra.
 */
(function () {
  'use strict';

  var NAV_ITENS = [
    { rota: 'dashboard', icone: 'dashboard', rotulo: 'Início' },
    { rota: 'pagar', icone: 'pagar', rotulo: 'Pagar' },
    { rota: 'receber', icone: 'receber', rotulo: 'Receber' },
    { rota: 'config', icone: 'engrenagem', rotulo: 'Ajustes' }
  ];

  var estado = {
    rota: 'dashboard',
    filtro: {
      periodo: { tipo: 'mes-atual' },
      status: 'todos',
      categoria: 'todas'
    }
  };

  var elConteudo = document.getElementById('conteudo');
  var elNavDesktop = document.getElementById('navDesktop');
  var elTabbar = document.getElementById('tabbar');
  var elToast = document.getElementById('toast');

  // ---------------------------------------------------------------- utilidades de UI
  var toastTimer = null;
  function toast(msg) {
    elToast.textContent = msg;
    elToast.hidden = false;
    requestAnimationFrame(function () { elToast.classList.add('mostrar'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      elToast.classList.remove('mostrar');
      setTimeout(function () { elToast.hidden = true; }, 250);
    }, 2600);
  }

  function confirmar(titulo, texto, botoes) {
    // botoes: [{ rotulo, classe, valor }]
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
        btn.addEventListener('click', function () {
          fechar();
          resolve(b.valor);
        });
        elBotoes.appendChild(btn);
      });
      function fechar() {
        camada.hidden = true;
        fundo.removeEventListener('click', aoClicarFundo);
      }
      function aoClicarFundo() { fechar(); resolve(null); }
      fundo.addEventListener('click', aoClicarFundo);
      camada.hidden = false;
    });
  }

  // ---------------------------------------------------------------- navegação
  function irPara(rota) { location.hash = '#/' + rota; }

  function renderNav() {
    var htmlDesktop = NAV_ITENS.map(function (item) {
      return (
        '<button class="nav-item' + (estado.rota === item.rota ? ' ativo' : '') + '" data-rota="' + item.rota + '">' +
          Icones.get(item.icone) + '<span>' + item.rotulo + '</span>' +
        '</button>'
      );
    }).join('');
    elNavDesktop.innerHTML = htmlDesktop;

    var htmlTab = NAV_ITENS.map(function (item) {
      return (
        '<button class="tab-item' + (estado.rota === item.rota ? ' ativo' : '') + '" data-rota="' + item.rota + '">' +
          Icones.get(item.icone) + '<span>' + item.rotulo + '</span>' +
        '</button>'
      );
    }).join('');
    elTabbar.innerHTML = htmlTab;

    Array.prototype.forEach.call(document.querySelectorAll('[data-rota]'), function (el) {
      el.addEventListener('click', function () { irPara(el.getAttribute('data-rota')); });
    });
  }

  // ---------------------------------------------------------------- dashboard
  function telaDashboard() {
    var hojeISO = Datas.hoje();
    var todas = Store.listarContas();

    function totais(periodoTipo) {
      var intervalo = Filtros.periodoParaIntervalo({ tipo: periodoTipo }, hojeISO);
      var doPeriodo = todas.filter(function (c) { return Datas.estaEntre(c.vencimento, intervalo.inicio, intervalo.fim); });
      var pagar = Filtros.total(doPeriodo.filter(function (c) { return c.tipo === 'pagar'; }));
      var receber = Filtros.total(doPeriodo.filter(function (c) { return c.tipo === 'receber'; }));
      return { pagar: pagar, receber: receber, intervalo: intervalo };
    }

    var semana = totais('semana-atual');
    var mes = totais('mes-atual');
    var proxMes = totais('proximo-mes');

    var atencao = todas.filter(function (c) {
      var sit = Contas.situacao(c, hojeISO);
      return sit === 'atrasada' || c.vencimento === hojeISO;
    }).sort(function (a, b) { return Datas.compararISO(a.vencimento, b.vencimento); });

    var html =
      '<div class="tela">' +
        '<div class="tela-cabeca"><div><h1 class="tela-titulo">Início</h1>' +
        '<p class="tela-sub">' + Formatar.capitalizar(Formatar.dataComDiaSemana(hojeISO)) + '</p></div></div>' +

        '<div class="grade-cards">' +
          Render.cardPeriodo('Essa semana', Formatar.dataCurta(semana.intervalo.inicio) + ' – ' + Formatar.dataCurta(semana.intervalo.fim), semana.pagar, semana.receber, true) +
          Render.cardPeriodo('Este mês', Formatar.capitalizar(Datas.nomeMes(Datas.parseISO(hojeISO).mes)), mes.pagar, mes.receber, false) +
          Render.cardPeriodo('Próximo mês', Formatar.capitalizar(Datas.nomeMes(Datas.parseISO(proxMes.intervalo.inicio).mes)), proxMes.pagar, proxMes.receber, false) +
        '</div>' +

        (atencao.length
          ? '<div><h2 class="secao-titulo">Atenção — vence hoje ou já passou</h2>' + Render.listaFlat(atencao, hojeISO) + '</div>'
          : '') +
      '</div>';

    elConteudo.innerHTML = html;
  }

  // ---------------------------------------------------------------- pagar / receber (lista)
  function opcoesMes(qtdPassado, qtdFuturo) {
    var hojeP = Datas.parseISO(Datas.hoje());
    var opcoes = [];
    for (var i = -qtdPassado; i <= qtdFuturo; i++) {
      var iso = Datas.somarMeses(Datas.formatarISO(hojeP.ano, hojeP.mes, 1), i);
      var p = Datas.parseISO(iso);
      opcoes.push({ ano: p.ano, mes: p.mes, rotulo: Formatar.capitalizar(Datas.nomeMes(p.mes)) + ' de ' + p.ano });
    }
    return opcoes;
  }

  function renderFiltrosBar(tipo) {
    var f = estado.filtro;
    var categorias = Store.listarCategorias();

    var chipsStatus = ['todos', 'pendente', 'pago', 'atrasada'].map(function (s) {
      var rotulos = { todos: 'Todas', pendente: 'Pendentes', pago: 'Pagas', atrasada: 'Atrasadas' };
      return '<button type="button" class="chip' + (f.status === s ? ' ativo' : '') + '" data-filtro="status" data-valor="' + s + '">' + rotulos[s] + '</button>';
    }).join('');

    var opcoesCategoria = '<option value="todas">Todas as categorias</option>' +
      categorias.map(function (c) { return '<option value="' + Render.escapeHTML(c) + '"' + (f.categoria === c ? ' selected' : '') + '>' + Render.escapeHTML(Formatar.capitalizar(c)) + '</option>'; }).join('');

    var periodosPadrao = [
      { valor: 'semana-atual', rotulo: 'Semana atual' },
      { valor: 'mes-atual', rotulo: 'Este mês' },
      { valor: 'proximo-mes', rotulo: 'Próximo mês' },
      { valor: 'mes-especifico', rotulo: 'Escolher mês' },
      { valor: 'personalizado', rotulo: 'Período personalizado' }
    ];
    var opcoesPeriodo = periodosPadrao.map(function (p) {
      return '<option value="' + p.valor + '"' + (f.periodo.tipo === p.valor ? ' selected' : '') + '>' + p.rotulo + '</option>';
    }).join('');

    var extra = '';
    if (f.periodo.tipo === 'mes-especifico') {
      var opcoesMesLista = opcoesMes(12, 12).map(function (o) {
        var sel = (f.periodo.ano === o.ano && f.periodo.mes === o.mes) ? ' selected' : '';
        return '<option value="' + o.ano + '-' + o.mes + '"' + sel + '>' + o.rotulo + '</option>';
      }).join('');
      extra = '<div class="filtros-periodo-extra"><select class="filtro-select" id="fSelMes">' + opcoesMesLista + '</select></div>';
    } else if (f.periodo.tipo === 'personalizado') {
      extra =
        '<div class="filtros-periodo-extra">' +
          '<input type="date" id="fPersInicio" value="' + (f.periodo.inicio || Datas.hoje()) + '">' +
          '<span>até</span>' +
          '<input type="date" id="fPersFim" value="' + (f.periodo.fim || Datas.hoje()) + '">' +
        '</div>';
    }

    return (
      '<div class="filtros">' +
        '<select class="filtro-select" id="fSelPeriodo">' + opcoesPeriodo + '</select>' +
        extra +
        '<select class="filtro-select" id="fSelCategoria">' + opcoesCategoria + '</select>' +
        '<div class="chips">' + chipsStatus + '</div>' +
      '</div>'
    );
  }

  function telaLista(tipo) {
    var hojeISO = Datas.hoje();
    var todas = Store.listarContas().filter(function (c) { return c.tipo === tipo; });
    var filtradas = Filtros.aplicar(todas, { periodo: estado.filtro.periodo, status: estado.filtro.status, categoria: estado.filtro.categoria, tipo: tipo }, hojeISO)
      .sort(function (a, b) { return Datas.compararISO(a.vencimento, b.vencimento); });

    var totalFiltro = Filtros.total(filtradas);
    var tituloTela = tipo === 'pagar' ? 'Contas a pagar' : 'Contas a receber';

    var corpoLista;
    var periodoTipo = estado.filtro.periodo.tipo;
    if (periodoTipo === 'mes-atual' || periodoTipo === 'proximo-mes' || periodoTipo === 'mes-especifico') {
      var intervalo = Filtros.periodoParaIntervalo(estado.filtro.periodo, hojeISO);
      var refP = Datas.parseISO(intervalo.inicio);
      var semanasDoMes = Datas.semanasDoMes(refP.ano, refP.mes);
      var grupos = semanasDoMes.map(function (s) {
        return {
          numero: s.numero, inicio: s.inicio, fim: s.fim,
          itens: filtradas.filter(function (c) { return Datas.estaEntre(c.vencimento, s.inicio, s.fim); })
        };
      });
      corpoLista = Render.listaAgrupada(grupos, hojeISO, 'Nenhuma conta ' + tipo + ' neste período.');
    } else {
      corpoLista = Render.listaFlat(filtradas, hojeISO, 'Nenhuma conta ' + tipo + ' neste período.');
    }

    elConteudo.innerHTML =
      '<div class="tela">' +
        '<div class="tela-cabeca"><h1 class="tela-titulo">' + tituloTela + '</h1></div>' +
        renderFiltrosBar(tipo) +
        '<div class="total-filtro"><span class="rotulo">Total do filtro</span><span class="valor">' + Formatar.dinheiro(totalFiltro) + '</span></div>' +
        corpoLista +
      '</div>';

    ligarEventosFiltro(tipo);
  }

  function ligarEventosFiltro(tipo) {
    var selPeriodo = document.getElementById('fSelPeriodo');
    if (selPeriodo) {
      selPeriodo.addEventListener('change', function () {
        var valor = selPeriodo.value;
        if (valor === 'mes-especifico') {
          var hojeP = Datas.parseISO(Datas.hoje());
          estado.filtro.periodo = { tipo: valor, ano: hojeP.ano, mes: hojeP.mes };
        } else if (valor === 'personalizado') {
          estado.filtro.periodo = { tipo: valor, inicio: Datas.hoje(), fim: Datas.hoje() };
        } else {
          estado.filtro.periodo = { tipo: valor };
        }
        telaLista(tipo);
      });
    }
    var selMes = document.getElementById('fSelMes');
    if (selMes) {
      selMes.addEventListener('change', function () {
        var partes = selMes.value.split('-');
        estado.filtro.periodo = { tipo: 'mes-especifico', ano: parseInt(partes[0], 10), mes: parseInt(partes[1], 10) };
        telaLista(tipo);
      });
    }
    var persInicio = document.getElementById('fPersInicio');
    var persFim = document.getElementById('fPersFim');
    if (persInicio && persFim) {
      [persInicio, persFim].forEach(function (el) {
        el.addEventListener('change', function () {
          estado.filtro.periodo = { tipo: 'personalizado', inicio: persInicio.value, fim: persFim.value };
          telaLista(tipo);
        });
      });
    }
    var selCategoria = document.getElementById('fSelCategoria');
    if (selCategoria) {
      selCategoria.addEventListener('change', function () {
        estado.filtro.categoria = selCategoria.value;
        telaLista(tipo);
      });
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-filtro="status"]'), function (chip) {
      chip.addEventListener('click', function () {
        estado.filtro.status = chip.getAttribute('data-valor');
        telaLista(tipo);
      });
    });
  }

  /**
   * Ações sobre um item (marcar pago / editar / excluir) — delegação ÚNICA, anexada uma vez
   * em iniciar(). NUNCA reanexar isto a cada render: como #conteudo é recriado via innerHTML
   * a cada troca de tela, reanexar aqui empilharia um listener por render e cada clique
   * dispararia a ação múltiplas vezes — no caso de "marcar paga" numa conta recorrente,
   * isso geraria mais de uma próxima ocorrência por clique, violando a RN001.
   */
  function ligarEventosItensUmaVez() {
    elConteudo.addEventListener('click', function (ev) {
      var alvo = ev.target.closest('[data-acao]');
      if (!alvo) return;
      var acao = alvo.getAttribute('data-acao');
      var id = alvo.getAttribute('data-id');

      if (acao === 'alternar-pago') { alternarPago(id).then(function (mudou) { if (mudou) renderRota(); }); }
      else if (acao === 'editar') { abrirModalConta(id); }
      else if (acao === 'excluir') { excluirConta(id).then(function (mudou) { if (mudou) renderRota(); }); }
    });
  }

  function alternarPago(id) {
    var conta = Store.listarContas().filter(function (c) { return c.id === id; })[0];
    if (!conta) return Promise.resolve();

    if (conta.status === 'pendente') {
      Store.atualizarConta(id, { status: 'pago', pagoEm: Datas.hoje() });
      if (conta.recorrente) {
        // Guarda contra duplicar (RN001): se o usuário desmarcar e marcar paga de novo, a
        // próxima ocorrência já pode existir de uma vez anterior. Sem esta checagem,
        // "pago -> pendente -> pago" gera uma segunda ocorrência em agosto — achado pelo
        // teste E2E, não por revisão manual.
        var jaExisteProxima = Store.listarContas().some(function (c) { return c.recorrenciaOrigemId === id; });
        if (jaExisteProxima) {
          toast('Marcada como paga. A próxima ocorrência já existia.');
        } else {
          var proxima = Contas.gerarProximaRecorrencia(Object.assign({}, conta, { status: 'pago' }));
          Store.adicionarConta(proxima);
          toast('Pago! Próxima ocorrência criada para ' + Formatar.dataCurta(proxima.vencimento) + '.');
        }
      } else {
        toast('Marcada como paga.');
      }
    } else {
      Store.atualizarConta(id, { status: 'pendente', pagoEm: null });
      toast('Voltou para pendente.');
    }
    return Promise.resolve(true);
  }

  function excluirConta(id) {
    var conta = Store.listarContas().filter(function (c) { return c.id === id; })[0];
    if (!conta) return Promise.resolve(false);

    if (conta.parcela) {
      return confirmar(
        'Excluir parcela',
        '"' + conta.descricao + '" ' + Formatar.rotuloParcela(conta) + ' faz parte de uma compra parcelada. O que você quer excluir?',
        [
          { rotulo: 'Cancelar', classe: 'botao-fantasma', valor: null },
          { rotulo: 'Só esta parcela', classe: 'botao-fantasma', valor: 'uma' },
          { rotulo: 'A série inteira (' + conta.parcela.total + ')', classe: 'botao-perigo', valor: 'serie' }
        ]
      ).then(function (escolha) {
        if (escolha === 'uma') { Store.removerConta(id); toast('Parcela excluída.'); return true; }
        if (escolha === 'serie') { Store.removerGrupo(conta.parcela.grupoId); toast('Série inteira excluída.'); return true; }
        return false;
      });
    }

    return confirmar('Excluir conta', 'Excluir "' + conta.descricao + '"? Essa ação não pode ser desfeita.', [
      { rotulo: 'Cancelar', classe: 'botao-fantasma', valor: null },
      { rotulo: 'Excluir', classe: 'botao-perigo', valor: 'sim' }
    ]).then(function (escolha) {
      if (escolha === 'sim') { Store.removerConta(id); toast('Conta excluída.'); return true; }
      return false;
    });
  }

  // ---------------------------------------------------------------- modal de conta (criar/editar)
  var contaEmEdicaoId = null;

  function preencherSelectCategoria(categoriaAtual) {
    var sel = document.getElementById('fCategoria');
    var categorias = Store.listarCategorias();
    sel.innerHTML = categorias.map(function (c) {
      return '<option value="' + Render.escapeHTML(c) + '">' + Render.escapeHTML(Formatar.capitalizar(c)) + '</option>';
    }).join('') + '<option value="__nova__">+ Nova categoria...</option>';
    sel.value = categoriaAtual && categorias.indexOf(categoriaAtual) !== -1 ? categoriaAtual : categorias[0];
  }

  function selecionarSegmentado(container, valor) {
    Array.prototype.forEach.call(container.querySelectorAll('.seg-opcao'), function (btn) {
      btn.classList.toggle('ativo', btn.getAttribute('data-valor') === valor);
    });
  }

  function segmentadoAtivo(container) {
    var btn = container.querySelector('.seg-opcao.ativo');
    return btn ? btn.getAttribute('data-valor') : null;
  }

  function atualizarDicasModo() {
    var modo = segmentadoAtivo(document.getElementById('segModo'));
    document.getElementById('dicaRecorrente').hidden = modo !== 'recorrente';
    document.getElementById('campoParcelas').hidden = modo !== 'parcelada';
    document.getElementById('dicaParcelada').hidden = modo !== 'parcelada';
  }

  function abrirModalConta(id) {
    contaEmEdicaoId = id || null;
    var conta = id ? Store.listarContas().filter(function (c) { return c.id === id; })[0] : null;

    document.getElementById('modalContaTitulo').textContent = conta ? 'Editar conta' : 'Nova conta';
    document.getElementById('fContaId').value = conta ? conta.id : '';
    document.getElementById('fDescricao').value = conta ? conta.descricao : '';
    document.getElementById('fValor').value = conta ? conta.valor : '';
    document.getElementById('fVencimento').value = conta ? conta.vencimento : Datas.hoje();
    document.getElementById('fNotas').value = conta ? conta.notas : '';
    document.getElementById('campoNovaCategoria').hidden = true;
    document.getElementById('fNovaCategoria').value = '';

    var tipoInicial = conta ? conta.tipo : (estado.rota === 'receber' ? 'receber' : 'pagar');
    selecionarSegmentado(document.getElementById('segTipo'), tipoInicial);

    preencherSelectCategoria(conta ? conta.categoria : null);

    var modoInicial = conta && conta.parcela ? 'parcelada' : (conta && conta.recorrente ? 'recorrente' : 'avulsa');
    selecionarSegmentado(document.getElementById('segModo'), modoInicial);
    document.getElementById('fParcelas').value = conta && conta.parcela ? conta.parcela.total : 2;

    // editar uma conta já parcelada/recorrente não permite trocar o modo (evita inconsistência
    // de série) — trava a escolha e explica por quê.
    var segModoBtns = document.querySelectorAll('#segModo .seg-opcao');
    var travarModo = !!conta && (!!conta.parcela || !!conta.recorrente);
    Array.prototype.forEach.call(segModoBtns, function (b) { b.disabled = travarModo; });

    atualizarDicasModo();

    document.getElementById('camadaModal').hidden = false;
    document.getElementById('fDescricao').focus();
  }

  function fecharModalConta() {
    document.getElementById('camadaModal').hidden = true;
    contaEmEdicaoId = null;
  }

  function aoSubmeterFormConta(ev) {
    ev.preventDefault();

    var tipo = segmentadoAtivo(document.getElementById('segTipo'));
    var descricao = document.getElementById('fDescricao').value.trim();
    var valor = parseFloat(document.getElementById('fValor').value);
    var vencimento = document.getElementById('fVencimento').value;
    var notas = document.getElementById('fNotas').value.trim();
    var modo = segmentadoAtivo(document.getElementById('segModo'));

    var selCategoria = document.getElementById('fCategoria');
    var categoria = selCategoria.value;
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

    var dadosBase = { tipo: tipo, descricao: descricao, categoria: categoria, valor: valor, vencimento: vencimento, notas: notas };

    if (contaEmEdicaoId) {
      // edição não recria série/recorrência (travado na UI) — só atualiza os campos simples.
      Store.atualizarConta(contaEmEdicaoId, dadosBase);
      toast('Conta atualizada.');
    } else if (modo === 'parcelada') {
      var totalParcelas = Math.max(1, parseInt(document.getElementById('fParcelas').value, 10) || 1);
      var parcelas = Contas.gerarParcelas(dadosBase, totalParcelas);
      Store.adicionarContas(parcelas);
      toast(totalParcelas > 1 ? totalParcelas + ' parcelas criadas.' : 'Conta criada.');
    } else {
      var conta = Contas.novaConta(Object.assign({}, dadosBase, { recorrente: modo === 'recorrente' }));
      Store.adicionarConta(conta);
      toast('Conta criada.');
    }

    fecharModalConta();
    renderRota();
  }

  // ---------------------------------------------------------------- config
  function telaConfig() {
    var categorias = Store.listarCategorias();
    var config = Store.getConfig();

    elConteudo.innerHTML =
      '<div class="tela">' +
        '<div class="tela-cabeca"><h1 class="tela-titulo">Ajustes</h1></div>' +

        '<div class="bloco-config">' +
          '<h3>Categorias</h3>' +
          '<p class="descricao-bloco">Usadas para organizar e filtrar as contas.</p>' +
          '<div class="lista-categorias" id="listaCategorias">' + categorias.map(Render.categoriaPill).join('') + '</div>' +
          '<form class="form-inline" id="formNovaCategoria">' +
            '<input type="text" id="fCategoriaConfig" placeholder="Nova categoria">' +
            '<button type="submit" class="botao botao-principal">Adicionar</button>' +
          '</form>' +
        '</div>' +

        '<div class="bloco-config">' +
          '<h3>Tema</h3>' +
          '<div class="segmentado" id="segTema" role="radiogroup" aria-label="Tema">' +
            '<button type="button" class="seg-opcao" data-valor="claro">Claro</button>' +
            '<button type="button" class="seg-opcao" data-valor="escuro">Escuro</button>' +
            '<button type="button" class="seg-opcao" data-valor="sistema">Sistema</button>' +
          '</div>' +
        '</div>' +

        '<div class="bloco-config">' +
          '<h3>Backup dos dados</h3>' +
          '<p class="descricao-bloco">Os dados ficam só neste navegador. Exporte de vez em quando para não perder nada.</p>' +
          '<div class="linha-acoes-config">' +
            '<button type="button" class="botao botao-fantasma" id="btnExportar">' + Icones.get('download') + ' Exportar backup</button>' +
            '<button type="button" class="botao botao-fantasma" id="btnImportar">' + Icones.get('upload') + ' Importar backup</button>' +
            '<input type="file" id="fArquivoBackup" accept="application/json" hidden>' +
          '</div>' +
        '</div>' +
      '</div>';

    selecionarSegmentado(document.getElementById('segTema'), config.tema === 'claro' ? 'claro' : (config.tema === 'escuro' ? 'escuro' : 'sistema'));

    document.getElementById('formNovaCategoria').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var input = document.getElementById('fCategoriaConfig');
      var nome = input.value.trim();
      if (!nome) return;
      Store.adicionarCategoria(nome);
      input.value = '';
      telaConfig();
    });

    document.getElementById('listaCategorias').addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-acao="remover-categoria"]');
      if (!btn) return;
      toast('Categorias em uso não são removidas automaticamente do histórico.');
    });

    document.getElementById('segTema').addEventListener('click', function (ev) {
      var btn = ev.target.closest('.seg-opcao');
      if (!btn) return;
      var valor = btn.getAttribute('data-valor');
      Store.setTema(valor);
      selecionarSegmentado(document.getElementById('segTema'), valor);
      aplicarTema();
    });

    document.getElementById('btnExportar').addEventListener('click', function () {
      var conteudo = Store.exportarBackup();
      var blob = new Blob([conteudo], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'financas-backup-' + Datas.hoje() + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Backup exportado.');
    });

    document.getElementById('btnImportar').addEventListener('click', function () {
      document.getElementById('fArquivoBackup').click();
    });
    document.getElementById('fArquivoBackup').addEventListener('change', function (ev) {
      var arquivo = ev.target.files[0];
      if (!arquivo) return;
      var leitor = new FileReader();
      leitor.onload = function () {
        try {
          Store.importarBackup(leitor.result);
          toast('Backup importado.');
          renderRota();
        } catch (e) {
          toast('Arquivo inválido: ' + e.message);
        }
      };
      leitor.readAsText(arquivo);
      ev.target.value = '';
    });
  }

  // ---------------------------------------------------------------- tema
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

  // ---------------------------------------------------------------- roteador
  function renderRota() {
    var hash = location.hash.replace('#/', '') || 'dashboard';
    if (['dashboard', 'pagar', 'receber', 'config'].indexOf(hash) === -1) hash = 'dashboard';
    estado.rota = hash;
    renderNav();

    if (hash === 'dashboard') telaDashboard();
    else if (hash === 'pagar') telaLista('pagar');
    else if (hash === 'receber') telaLista('receber');
    else if (hash === 'config') telaConfig();

    window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------- bootstrap
  function iniciar() {
    aplicarTema();
    ligarEventosItensUmaVez();
    renderRota();
    window.addEventListener('hashchange', renderRota);

    document.getElementById('btnTema').addEventListener('click', function () {
      var atual = Store.getConfig().tema;
      var proximo = atual === 'claro' ? 'escuro' : (atual === 'escuro' ? 'sistema' : 'claro');
      Store.setTema(proximo);
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
    document.getElementById('formConta').addEventListener('submit', aoSubmeterFormConta);

    document.getElementById('segTipo').addEventListener('click', function (ev) {
      var btn = ev.target.closest('.seg-opcao');
      if (btn) selecionarSegmentado(document.getElementById('segTipo'), btn.getAttribute('data-valor'));
    });
    document.getElementById('segModo').addEventListener('click', function (ev) {
      var btn = ev.target.closest('.seg-opcao');
      if (!btn || btn.disabled) return;
      selecionarSegmentado(document.getElementById('segModo'), btn.getAttribute('data-valor'));
      atualizarDicasModo();
    });
    document.getElementById('fCategoria').addEventListener('change', function () {
      document.getElementById('campoNovaCategoria').hidden = this.value !== '__nova__';
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Escape') return;
      if (!document.getElementById('camadaModal').hidden) fecharModalConta();
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      if (Store.getConfig().tema === 'sistema') sincronizarIconeTema();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
