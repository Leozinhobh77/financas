# SPEC — especificação técnica (o como)

> Mapa técnico de alto nível. Convenções de engenharia que o `PRD.md` não cobre.
> ⚠️ Regra de negócio que, se quebrar, causa prejuízo real **não mora só aqui em prosa — vive em
> `docs/REGRAS-DE-NEGOCIO.md` e tem teste** (ver seção Verificação).

## Stack e restrições não negociáveis

- **HTML/CSS/JS vanilla.** Sem framework, sem bundler, sem build step — abre com duplo clique
  ou serve estático (GitHub Pages). Mesma filosofia comprovada no projeto de referência
  (Pizza e Cia BH): simplicidade para uso pessoal de longo prazo, sem dependência apodrecer.
- **Sem servidor, sem backend.** Persistência em `localStorage`, com exportar/importar backup
  em `.json` (o usuário é responsável por guardar cópia externa, igual ao projeto de
  referência).
- **Mobile-first.** O uso real é no celular; desktop é o caso secundário, não o principal.
- **Sem dependência externa em runtime.** Nenhuma chamada de rede — o app funciona 100% offline
  depois de carregado.

## Arquitetura de arquivos

```
app/
├── index.html          shell da SPA + os 3 modais (conta, pagamento, confirmação)
├── css/
│   └── estilo.css       tokens (claro/escuro) + layout + componentes + cores de categoria
└── js/
    ├── datas.js          motor de datas: semana seg-dom, numeração de semana do mês
    ├── contas.js          modelo de conta + motor de recorrência + motor de parcelamento
    ├── categorias.js      cor + ícone por categoria (determinístico pelo nome)
    ├── filtros.js         período → intervalo; filtro combinado (período/status/categoria/tipo)
    ├── analise.js         ⭐ números do dashboard: resumo do mês, comparativo, por categoria,
    │                        por semana, próximos vencimentos, prazo em linguagem humana
    ├── armazenamento.js  Store: única porta de entrada pro localStorage
    ├── formatar.js        dinheiro (BRL), datas, texto
    ├── graficos.js        donut, barras por semana, anel de progresso — SVG puro, sem lib
    ├── render.js           funções de desenho de tela (sem lógica de negócio)
    ├── app.js              roteador por hash (#/dashboard, #/pagar, #/receber) + bootstrap
    └── icones.js           SVG inline (sem emoji na UI)
testes/
├── motor.teste.js        testes puros de datas/contas/filtros/analise/categorias (Node)
└── e2e/                   testes Playwright da interface completa
```

**Camadas, de dentro pra fora:** `datas`/`contas` (regra) → `filtros`/`analise` (derivação) →
`graficos`/`render` (desenho) → `app` (orquestração). Uma camada só depende das de dentro.
Nenhum número exibido é calculado dentro de `render.js` ou `app.js` — se aparece na tela, veio
de `analise.js` ou `filtros.js`, e por isso é testável em Node sem navegador.

## Modelo de dados (`localStorage` → chave `financas_v1`)

```js
{
  contas: [
    {
      id: "uuid",
      tipo: "pagar" | "receber",
      descricao: "Água",
      categoria: "casa",
      valor: 100.00,
      vencimento: "2026-07-10",       // ISO yyyy-mm-dd
      status: "pendente" | "pago",
      pagoEm: null | "2026-07-10",

      // recorrência (mutuamente exclusivo com parcelamento)
      recorrente: true | false,
      recorrenciaOrigemId: null | "uuid-da-ocorrencia-anterior",

      // parcelamento (mutuamente exclusivo com recorrência)
      parcela: null | { atual: 1, total: 3, grupoId: "uuid-da-serie" },

      criadoEm: "2026-07-01T12:00:00.000Z",
      notas: ""
    }
  ],
  categorias: ["casa", "cartão", "transporte", "saúde", "lazer", "outros", ...],
  config: { tema: "claro" | "escuro" | "sistema" }
}
```

**Regra de exclusividade:** uma conta nunca é `recorrente: true` **e** tem `parcela` ao mesmo
tempo — são dois motores diferentes (ver RN001–RN003 em `REGRAS-DE-NEGOCIO.md`).

## Convenções de engenharia

- **Módulo por arquivo**, padrão IIFE (`const Modulo = (() => { ... return {...}; })();`) —
  mesmo estilo do CRM de referência.
- **Dinheiro em número (float) com 2 casas, formatado só na borda** (`formatar.js`). Nunca
  concatenar string pra montar valor.
- **Datas sempre em ISO `yyyy-mm-dd` no modelo**; conversão pra `Date` só dentro de `datas.js`.
  Motivo: evitar bug de fuso horário deslocando o dia (`new Date("2026-07-10")` interpreta UTC;
  usar sempre construtor `new Date(ano, mes-1, dia)` local dentro do motor).
- **`Store` é a única porta pro `localStorage`.** Nenhum outro módulo lê/escreve direto —
  mesma regra do projeto de referência, pelo mesmo motivo (consistência, um ponto de auditoria).
- **Ícones:** SVG inline via `Icones.get('nome')`. **Proibido emoji na interface** (fora de
  texto informativo, se houver).
- **Comentários:** só quando o "porquê" não é óbvio. Não documentar o óbvio.

## Verificação (como testar)

- **Motor de datas e de contas** (`datas.js`, `contas.js`): testes puros em Node
  (`testes/motor.teste.js`), sem navegador — são funções sem efeito colateral, rápidas de
  testar exaustivamente (todos os 12 meses, anos bissextos, todo dia-da-semana inicial).
- **Interface completa:** Playwright (`testes/e2e/`), critério de aceite **zero erros de
  console**. Cobre: criar/editar/excluir conta, marcar pago → recorrência gera a próxima,
  cadastrar parcelado → série completa aparece, filtros de período/categoria/status, alternar
  tema, responsivo mobile.
- **Toda regra de negócio em `REGRAS-DE-NEGOCIO.md` tem teste** — sem exceção (tier T2+).

## Decisões técnicas relevantes

Ver `docs/DECISOES.md` para o histórico completo (data e motivo) de escolhas de arquitetura.
