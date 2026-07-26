/**
 * Ícones — SVG inline via Icones.get('nome'). Proibido emoji na interface (SPEC.md).
 * Traço único, currentColor, 24x24 de viewBox, consistentes em peso (stroke-width 1.8).
 */
(function (global) {
  'use strict';

  var TRACO = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';

  var ICONES = {
    dashboard: '<svg viewBox="0 0 24 24" ' + TRACO + '><rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5"/><rect x="13" y="3.5" width="7.5" height="4.5" rx="1.5"/><rect x="13" y="10.5" width="7.5" height="10" rx="1.5"/><rect x="3.5" y="13.5" width="7.5" height="7" rx="1.5"/></svg>',

    pagar: '<svg viewBox="0 0 24 24" ' + TRACO + '><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 20h16"/></svg>',

    receber: '<svg viewBox="0 0 24 24" ' + TRACO + '><path d="M12 21V9"/><path d="M17 14l-5-5-5 5"/><path d="M4 4h16"/></svg>',

    mais: '<svg viewBox="0 0 24 24" ' + TRACO + '><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',

    editar: '<svg viewBox="0 0 24 24" ' + TRACO + '><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M13.5 6.5l4 4"/></svg>',

    excluir: '<svg viewBox="0 0 24 24" ' + TRACO + '><path d="M5 7h14"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',

    check: '<svg viewBox="0 0 24 24" ' + TRACO + '><path d="M4 12.5l5 5 11-11"/></svg>',

    desfazer: '<svg viewBox="0 0 24 24" ' + TRACO + '><path d="M4 10h9a5 5 0 0 1 0 10h-2"/><path d="M8 5.5L4 10l4 4.5"/></svg>',

    filtro: '<svg viewBox="0 0 24 24" ' + TRACO + '><path d="M4 5h16"/><path d="M7 12h10"/><path d="M10.5 19h3"/></svg>',

    calendario: '<svg viewBox="0 0 24 24" ' + TRACO + '><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><line x1="3.5" y1="9.5" x2="20.5" y2="9.5"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></svg>',

    fechar: '<svg viewBox="0 0 24 24" ' + TRACO + '><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>',

    sol: '<svg viewBox="0 0 24 24" ' + TRACO + '><circle cx="12" cy="12" r="4.2"/><line x1="12" y1="2.5" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21.5" y2="12"/><line x1="5" y1="5" x2="6.8" y2="6.8"/><line x1="17.2" y1="17.2" x2="19" y2="19"/><line x1="5" y1="19" x2="6.8" y2="17.2"/><line x1="17.2" y1="6.8" x2="19" y2="5"/></svg>',

    lua: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 1 0 10.5 10.5z"/></svg>',

    setaEsquerda: '<svg viewBox="0 0 24 24" ' + TRACO + '><path d="M15 5l-7 7 7 7"/></svg>',

    setaDireita: '<svg viewBox="0 0 24 24" ' + TRACO + '><path d="M9 5l7 7-7 7"/></svg>',

    alerta: '<svg viewBox="0 0 24 24" ' + TRACO + '><path d="M12 3.5l9.5 16.5H2.5z"/><line x1="12" y1="9.5" x2="12" y2="14"/><circle cx="12" cy="17" r="0.4" fill="currentColor" stroke="none"/></svg>',

    engrenagem: '<svg viewBox="0 0 24 24" ' + TRACO + '><circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1h-.2a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.6v-.2a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z"/></svg>',

    download: '<svg viewBox="0 0 24 24" ' + TRACO + '><path d="M12 3v13"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/></svg>',

    upload: '<svg viewBox="0 0 24 24" ' + TRACO + '><path d="M12 21V8"/><path d="M7 13l5-5 5 5"/><path d="M4 20h16"/></svg>',

    cartao: '<svg viewBox="0 0 24 24" ' + TRACO + '><rect x="2.5" y="5.5" width="19" height="13" rx="2"/><line x1="2.5" y1="10" x2="21.5" y2="10"/><line x1="5.5" y1="14.5" x2="10" y2="14.5"/></svg>',

    repetir: '<svg viewBox="0 0 24 24" ' + TRACO + '><path d="M4 12a8 8 0 0 1 13.7-5.7L20 8.5"/><path d="M20 4.5v4h-4"/><path d="M20 12a8 8 0 0 1-13.7 5.7L4 15.5"/><path d="M4 19.5v-4h4"/></svg>',

    seta: '<svg viewBox="0 0 24 24" ' + TRACO + '><line x1="5" y1="12" x2="19" y2="12"/><path d="M13 6l6 6-6 6"/></svg>',

    tag: '<svg viewBox="0 0 24 24" ' + TRACO + '><path d="M3.5 12.5V6a2 2 0 0 1 2-2h6.5L20.5 12.5 12.5 20.5 3.5 12.5z"/><circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none"/></svg>',

    vazio: '<svg viewBox="0 0 24 24" ' + TRACO + '><rect x="4" y="4" width="16" height="16" rx="3"/><line x1="9" y1="12" x2="15" y2="12"/></svg>'
  };

  function get(nome) {
    return ICONES[nome] || ICONES.vazio;
  }

  var Icones = { get: get };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Icones;
  } else {
    global.Icones = Icones;
  }
})(typeof window !== 'undefined' ? window : globalThis);
