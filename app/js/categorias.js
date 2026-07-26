/**
 * Categorias — cor e icone de cada categoria, consistentes no app inteiro (card, donut,
 * legenda, filtro). Categoria desconhecida recebe cor deterministica pelo nome: a mesma
 * categoria sempre cai na mesma cor, sem precisar salvar nada no armazenamento.
 */
(function (global) {
  'use strict';

  // 10 hues distinguiveis, escolhidas pra funcionar nos dois temas (o CSS ajusta luminosidade
  // via variavel --cat-<n>). Ordem importa: e a sequencia de fallback.
  var PALETA = ['ameixa', 'oceano', 'musgo', 'ocre', 'tijolo', 'lavanda', 'petroleo', 'areia', 'vinho', 'sálvia'];

  var CONHECIDAS = {
    'casa':        { cor: 'musgo',    icone: 'casa' },
    'cartão':      { cor: 'ameixa',   icone: 'cartao' },
    'cartao':      { cor: 'ameixa',   icone: 'cartao' },
    'mercado':     { cor: 'ocre',     icone: 'mercado' },
    'transporte':  { cor: 'oceano',   icone: 'transporte' },
    'saúde':       { cor: 'tijolo',   icone: 'saude' },
    'saude':       { cor: 'tijolo',   icone: 'saude' },
    'lazer':       { cor: 'lavanda',  icone: 'lazer' },
    'educação':    { cor: 'petroleo', icone: 'educacao' },
    'educacao':    { cor: 'petroleo', icone: 'educacao' },
    'trabalho':    { cor: 'petroleo', icone: 'trabalho' },
    'salário':     { cor: 'musgo',    icone: 'trabalho' },
    'salario':     { cor: 'musgo',    icone: 'trabalho' },
    'assinatura':  { cor: 'lavanda',  icone: 'repetir' },
    'pet':         { cor: 'areia',    icone: 'pet' },
    'outros':      { cor: 'sálvia',   icone: 'tag' }
  };

  /** Soma dos codigos do nome -> indice estavel na paleta. Mesmo nome, mesma cor, sempre. */
  function corDeterministica(nome) {
    var soma = 0;
    for (var i = 0; i < nome.length; i++) soma += nome.charCodeAt(i);
    return PALETA[soma % PALETA.length];
  }

  function normalizar(nome) {
    return (nome || 'outros').trim().toLowerCase();
  }

  function cor(nome) {
    var n = normalizar(nome);
    return CONHECIDAS[n] ? CONHECIDAS[n].cor : corDeterministica(n);
  }

  function icone(nome) {
    var n = normalizar(nome);
    return CONHECIDAS[n] ? CONHECIDAS[n].icone : 'tag';
  }

  var Categorias = {
    PALETA: PALETA,
    cor: cor,
    icone: icone,
    normalizar: normalizar
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Categorias;
  } else {
    global.Categorias = Categorias;
  }
})(typeof window !== 'undefined' ? window : globalThis);
