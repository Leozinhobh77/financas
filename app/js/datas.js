/**
 * Motor de datas. Funções puras, sem efeito colateral — testadas exaustivamente em
 * testes/motor.teste.js (Node, sem navegador). Mesmo arquivo roda no browser (via <script>)
 * e no Node (via require) — ver o rodapé UMD. Fonte única, nunca duplicar esta lógica.
 *
 * Datas no modelo de dados são sempre string ISO "AAAA-MM-DD". Conversão pra Date só aqui
 * dentro, e sempre com o construtor local (new Date(ano, mes-1, dia)) — nunca
 * new Date("AAAA-MM-DD"), que o JS interpreta como UTC e pode deslocar o dia exibido
 * dependendo do fuso do usuário.
 */
(function (global) {
  'use strict';

  var NOMES_MES = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  var NOMES_DIA_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  function doisDigitos(n) { return n < 10 ? '0' + n : '' + n; }

  function formatarISO(ano, mes, dia) {
    return ano + '-' + doisDigitos(mes) + '-' + doisDigitos(dia);
  }

  function parseISO(iso) {
    var partes = iso.split('-');
    return { ano: parseInt(partes[0], 10), mes: parseInt(partes[1], 10), dia: parseInt(partes[2], 10) };
  }

  function paraDate(iso) {
    var p = parseISO(iso);
    return new Date(p.ano, p.mes - 1, p.dia);
  }

  function diasDoMes(ano, mes) {
    // dia 0 do mês seguinte = último dia do mês atual
    return new Date(ano, mes, 0).getDate();
  }

  function hoje() {
    var d = new Date();
    return formatarISO(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  function nomeMes(mes) { return NOMES_MES[mes - 1]; }
  function nomeDiaSemana(iso) { return NOMES_DIA_SEMANA[paraDate(iso).getDay()]; }

  function compararISO(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  /**
   * Soma N meses a uma data ISO. Se o dia não existir no mês de destino (ex.: 31 num mês de
   * 30 dias, ou 29/30/31 em fevereiro), ajusta para o ÚLTIMO dia daquele mês — regra usada
   * tanto pela recorrência (RN001) quanto pelo parcelamento (RN002).
   */
  function somarMeses(iso, n) {
    var p = parseISO(iso);
    var totalMeses = (p.mes - 1) + n;
    var anoDestino = p.ano + Math.floor(totalMeses / 12);
    var mesDestino = (totalMeses % 12 + 12) % 12 + 1;
    var ultimoDia = diasDoMes(anoDestino, mesDestino);
    var diaDestino = Math.min(p.dia, ultimoDia);
    return formatarISO(anoDestino, mesDestino, diaDestino);
  }

  /**
   * RN003 — Semanas do mês: segunda a domingo, nunca cruzando o limite do mês.
   * Semana 1 = dia 1 até o primeiro domingo (pode ter menos de 7 dias).
   * Última semana = última segunda até o último dia do mês (pode ter menos de 7 dias).
   * As do meio são blocos cheios de 7 dias.
   *
   * Retorna [{ numero, inicio: 'AAAA-MM-DD', fim: 'AAAA-MM-DD' }, ...]
   */
  function semanasDoMes(ano, mes) {
    var totalDias = diasDoMes(ano, mes);
    var pesoDia1 = new Date(ano, mes - 1, 1).getDay(); // 0=domingo .. 6=sábado
    var offsetAteDomingo = (7 - pesoDia1) % 7; // 0 se dia1 já é domingo
    var fimSemana1 = 1 + offsetAteDomingo;

    var semanas = [];
    var inicio = 1;
    var fim = Math.min(fimSemana1, totalDias);
    var numero = 1;

    while (inicio <= totalDias) {
      semanas.push({
        numero: numero,
        inicio: formatarISO(ano, mes, inicio),
        fim: formatarISO(ano, mes, fim)
      });
      inicio = fim + 1;
      fim = Math.min(inicio + 6, totalDias);
      numero++;
    }
    return semanas;
  }

  /** Em que semana (numerada dentro do próprio mês) uma data ISO cai. */
  function semanaDe(iso) {
    var p = parseISO(iso);
    var semanas = semanasDoMes(p.ano, p.mes);
    for (var i = 0; i < semanas.length; i++) {
      if (compararISO(semanas[i].inicio, iso) <= 0 && compararISO(iso, semanas[i].fim) <= 0) {
        return { ano: p.ano, mes: p.mes, numero: semanas[i].numero, inicio: semanas[i].inicio, fim: semanas[i].fim };
      }
    }
    // inalcançável com um iso válido do próprio mês — devolve a última semana por segurança
    var ultima = semanas[semanas.length - 1];
    return { ano: p.ano, mes: p.mes, numero: ultima.numero, inicio: ultima.inicio, fim: ultima.fim };
  }

  /** Início (segunda) e fim (domingo) da semana-calendário real que contém a data — usada só
   *  para "esta semana" quando ela precisa ser comparada como intervalo contínuo real, e não
   *  reflete a numeração por mês (que nunca cruza o limite do mês, ver RN003). */
  function semanaCalendarioDe(iso) {
    var d = paraDate(iso);
    var peso = d.getDay(); // 0=domingo
    var deltaSegunda = peso === 0 ? -6 : 1 - peso;
    var segunda = new Date(d.getFullYear(), d.getMonth(), d.getDate() + deltaSegunda);
    var domingo = new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() + 6);
    return {
      inicio: formatarISO(segunda.getFullYear(), segunda.getMonth() + 1, segunda.getDate()),
      fim: formatarISO(domingo.getFullYear(), domingo.getMonth() + 1, domingo.getDate())
    };
  }

  function estaEntre(iso, inicioISO, fimISO) {
    return compararISO(inicioISO, iso) <= 0 && compararISO(iso, fimISO) <= 0;
  }

  /**
   * Dias de `aISO` até `bISO`. Negativo se `b` já passou. Fonte única desta conta — quem
   * precisar de "quantos dias faltam" chama daqui, nunca reimplementa (analise.js delega).
   */
  function diasEntre(aISO, bISO) {
    return Math.round((paraDate(bISO) - paraDate(aISO)) / 86400000);
  }

  /** Soma N dias a uma data ISO (N pode ser negativo). Sem armadilha de fuso: só construtor local. */
  function somarDias(iso, n) {
    var p = parseISO(iso);
    var d = new Date(p.ano, p.mes - 1, p.dia + n);
    return formatarISO(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  var Datas = {
    hoje: hoje,
    formatarISO: formatarISO,
    parseISO: parseISO,
    paraDate: paraDate,
    diasDoMes: diasDoMes,
    nomeMes: nomeMes,
    nomeDiaSemana: nomeDiaSemana,
    compararISO: compararISO,
    somarMeses: somarMeses,
    semanasDoMes: semanasDoMes,
    semanaDe: semanaDe,
    semanaCalendarioDe: semanaCalendarioDe,
    estaEntre: estaEntre,
    diasEntre: diasEntre,
    somarDias: somarDias
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Datas;
  } else {
    global.Datas = Datas;
  }
})(typeof window !== 'undefined' ? window : globalThis);
