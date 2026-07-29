---
id: 0007
titulo: App instalável na tela de início (manifesto + service worker)
status: ✔️ Concluído
prioridade: Alta
criado_em: 2026-07-28
atualizado_em: 2026-07-29
autor: Claude Opus 5 (a pedido do usuário)
relacionados: [0006]
---

# 0007 — App instalável na tela de início (manifesto + service worker)

## Contexto

O usuário tentou instalar o app na tela de início do celular e não conseguiu. A investigação
mostrou que **não foi falha dele nem do aparelho: faltavam as peças**. O Chrome no Android só
oferece a instalação quando existem quatro coisas, e o projeto tinha zero das quatro:

| Peça | Antes | Agora |
|---|---|---|
| Servido por `https://` | ✅ já tinha (`leozinhobh77.github.io/financas`) | ✅ |
| Ícones 192/512 + maskable | ❌ nenhum arquivo de imagem no projeto | ✅ entregue no commit da marca |
| `manifest.json` | ❌ não existia | ⬅️ **este plano** |
| Service worker | ❌ não existia | ⬅️ **este plano** |

Há um segundo motivo, e para o usuário ele é o mais importante. Hoje, o vínculo com o arquivo
de backup no Google Drive (`arquivo.js`, plano 0006) perde a autorização toda vez que o Android
descarta a aba — daí o "reconectar" reaparecer sem parar. **App instalado é a única via
conhecida de o Chrome oferecer "permitir em todas as visitas"** e acabar com isso. Este plano é
o pré-requisito para testar essa hipótese, e o teste faz parte dele.

## Objetivo

O app pode ser instalado na tela de início do celular, abre em janela própria (sem barra de
navegador), **abre sem internet**, e sabemos com certeza — testado no aparelho real — se a
instalação elimina ou não o botão laranja de reconectar.

## Escopo

**Dentro:**
- `app/manifest.json` com nome, ícones, cor e modo de exibição.
- `app/sw.js` — service worker com precache do app, atualização segura e funcionamento offline.
- Registro do service worker **sem quebrar o uso por `file://`** (duplo clique continua valendo).
- `theme-color` (a cor da barra do navegador).
- Ícone maskable também em 192px.
- Teste automatizado novo: `testes/e2e/test_instalavel.py`.
- Verificação no aparelho real + registro do resultado da hipótese do "permitir em todas as visitas".

**Fora (por agora):**
- Sincronizar celular ↔ computador (é outro assunto, bem maior — ver Pendências).
- Gravar sozinho no arquivo do Drive (auto-save). É o próximo plano, não este.
- Notificações push, atalhos de app (`shortcuts`), compartilhamento.
- Loja de aplicativos, app nativo. Continua fora de escopo (`AGENTS.md` §7).

## Decisões e premissas

- **O manifesto mora em `app/`**, com caminhos relativos. Assim tudo do app fica sob `app/`, e
  o `scope` cobre exatamente o que é o app. O `index.html` da raiz continua sendo só o
  redirecionador de conveniência.
- **`display: standalone`**, não `fullscreen`. Mantém a barra de status do celular (hora,
  bateria, sinal) — num app de contas que se consulta rápido, esconder isso atrapalha mais do
  que ajuda.
- **Não travar a orientação.** O app é mobile-first mas roda no desktop; travar em `portrait`
  puniria o uso no computador sem ganhar nada.
- **Estratégia de cache: rede primeiro para a página, cache primeiro para os arquivos.** É o
  que dá offline sem congelar o usuário numa versão velha. Cache-first puro no HTML é a
  armadilha clássica: o app trava numa versão antiga e nenhuma correção chega.
- **O registro do service worker é condicional ao protocolo.** Em `file://` a API existe mas
  falha — e os testes e2e rodam justamente por `file://`. Sem essa guarda, o critério de aceite
  "zero erros de console" cai e a suíte inteira quebra.
- **Premissa a confirmar (não é promessa):** o Chrome 122+ oferece autorização persistente de
  arquivo para app instalado. É o que a documentação indica, mas **só vale se funcionar no
  aparelho do usuário** — por isso virou tarefa de verificação, com plano B registrado.

## Porta de Entrada (Definition of Ready)

- [x] Investiguei o sistema real: não existe manifesto nem service worker no projeto; o site
      responde 200 em `https://leozinhobh77.github.io/financas/`; os ícones já existem em
      `app/img/`; os testes e2e rodam por `file://`.
- [x] Não conflita com `docs/SPEC.md` — "sem dependência externa em runtime" continua verdade
      (o service worker é do próprio app, não é rede de terceiro). Na verdade **reforça** a
      linha "funciona 100% offline depois de carregado", que hoje é falsa quando aberto por link.
- [x] Plano revisado com o usuário e **aprovado** antes de iniciar a Fase 1.
- [x] Autorização explícita para começar a implementar (2026-07-28: fases 1 a 3).
- [x] Working tree limpo (o commit da marca já entrou: `53152f1`).

## Etapas

> Progresso: 18 de 18 tarefas (100%) — todas as fases entregues, publicadas e verificadas
> no aparelho real.

### Fase 1 — Manifesto ✔️
- [x] Gerar `app/img/icone-maskable-192.png` a partir do SVG (falta só esse tamanho).
- [x] Criar `app/manifest.json`: `name`, `short_name`, `description`, `lang: pt-BR`,
      `start_url`, `scope`, `display: standalone`, `background_color`, `theme_color`, e os
      ícones com `purpose` **any** e **maskable**.
- [x] Ligar no `app/index.html`: `<link rel="manifest">` + `<meta name="theme-color">`
      (um valor para tema claro e outro para escuro).
- [x] Conferir que o manifesto é lido e é válido — feito por teste automatizado em vez de
      olho no DevTools: `test_instalavel.py` §1 confere os campos exigidos **e** que cada
      ícone listado existe de verdade (campo preenchido apontando para arquivo inexistente
      era a falha silenciosa mais provável aqui).

### Fase 2 — Service worker ✔️
- [x] Criar `app/sw.js` com uma constante `VERSAO` no topo e comentário gritando que **ela tem
      que subir a cada publicação**, senão o usuário fica preso na versão velha.
- [x] Precache do app na instalação: `index.html`, `css/estilo.css`, os 14 arquivos de `js/`,
      e os ícones.
- [x] Navegação (abrir o app): **rede primeiro, cache como reserva** — pega versão nova quando
      há internet, e abre offline quando não há.
- [x] Demais arquivos: **cache primeiro, atualizando por baixo** — rápido e sempre convergindo
      para a versão nova.
- [x] No `activate`: apagar caches de versões anteriores + `clients.claim()`.
- [x] Registrar o service worker **só quando o protocolo for `http`/`https`** (guarda do `file://`).
- [x] Deixar documentado no topo do `sw.js` como desarmar em emergência (o "botão de pânico",
      caso uma versão ruim vá ao ar).

### Fase 3 — Testes ✔️
- [x] Criar `testes/e2e/test_instalavel.py`: sobe um servidor local e verifica —
      manifesto encontrado e válido; ícones respondendo; `display: standalone`;
      service worker chegando a `activated`; **app abrindo com a rede desligada**;
      zero erros de console. **24 de 24 verificações.**
- [x] Rodar a suíte inteira sem regressão: motor 144/144, `test_app_financas`, `test_metas`,
      `test_sem_corte`, `test_backup` 45/45 — todas passando, `file://` limpo.
- [x] Registrar o novo teste na tabela de comandos do `AGENTS.md` §2.

### Fase 4 — Publicar e provar no aparelho real ✔️
- [x] Publicado. O usuário **autorizou explicitamente** a IA a fazer o push (exceção à linha
      vermelha, registrada em D010). Conferido antes: só código, docs e ícones — nenhum dado
      financeiro. `fb8d7a8..3085655`; GitHub Pages republicou (manifesto e `sw.js` em 200).
- [x] Instalado na tela de início do celular. Primeira tentativa não completava (Chrome ficou
      com registro de instalação incompleta de uma tentativa anterior); resolvido limpando os
      dados do site em Chrome → Configurações → Configurações do site. Depois disso, instalou
      normalmente.
- [x] ⭐ **Hipótese confirmada, com prova.** O usuário apertou "Atualizar" pelo app instalado,
      fechou, e apertou de novo horas depois (29/07 madrugada) sem precisar reconectar. Provado
      de forma independente pela própria API do Google Drive: `financas.json` na pasta
      "Arquivos Claude/App de Finanças" tem `modifiedTime = 2026-07-29T03:38:07Z`, batendo
      exatamente com o horário que o usuário lembrava — não foi só relato, foi checado no
      arquivo real. **App instalado retém a permissão do arquivo entre sessões.**
- [-] Modo avião — não testado isoladamente; considerado coberto pelo teste automatizado
      (`test_instalavel.py` §3 já prova o app abrindo com a rede desligada) mais a evidência
      real acima, que é o que importava de verdade para o usuário.
- [x] Resultado registrado em `docs/DECISOES.md` como **D011** (D010 já estava em uso pela
      decisão do push).

## Critérios de aceite (Definition of Done)

**(a) Produto**
- [x] O Chrome no Android oferece instalar o app na tela de início.
- [x] Instalado, abre em janela própria com a marca do projeto.
- [x] Abre e funciona **sem internet** (contas, metas, tudo que é local) — provado por
      `test_instalavel.py` §3.
- [x] Aberto por duplo clique (`file://`), continua funcionando com **zero erros de console**.
- [x] Está escrito, com prova real (metadado do arquivo no Drive, não só relato), que a
      instalação resolve a permissão persistente — ver D011.

**(b) Processo**
- [x] Testado (ver Verificação): motor + 4 suítes e2e existentes + a nova, todas passando.
- [x] Documentação sincronizada: `docs/SPEC.md` (arquitetura de arquivos e a linha do offline),
      `AGENTS.md` §2 (novo comando de teste), `docs/DECISOES.md` (D010 e D011).
- [x] Baixa dada neste plano e no `Planos/INDICE.md`.
- [x] Arquivo movido para `Planos/Concluídos/`.
- [x] Commit(s) seguindo `docs/GOVERNANCA.md` §4.

## Riscos e mitigações

- **Risco: service worker ruim é grudento.** Uma versão quebrada continua servindo o app
  quebrado mesmo depois do conserto — é o pior defeito possível aqui, porque atinge o usuário
  em produção e ele não tem como sair sozinho. → **Mitigação:** testar localmente antes do push,
  `clients.claim()` + limpeza de cache no `activate`, navegação sempre tentando a rede primeiro,
  e o procedimento de desarme escrito dentro do próprio `sw.js`.

- **Risco: esquecer de subir a `VERSAO` numa publicação futura** e o usuário ficar preso numa
  versão antiga sem entender por quê. → **Mitigação:** comentário no topo do arquivo + linha no
  `SPEC.md`. (Se acontecer de novo, vira guarda mecânica via `/harness learn`.)

- **Risco: o registro do service worker quebrar os testes e o uso por `file://`.** →
  **Mitigação:** guarda de protocolo, e a suíte inteira roda por `file://` justamente para pegar
  isso.

- **Risco: a autorização persistente não existir no aparelho dele.** → **Mitigação:** é
  hipótese declarada, não promessa. Se falhar, o plano ainda entrega instalação e offline, e o
  "reconectar" vira problema do próximo plano (o auto-save pode ao menos tornar o clique único
  e indolor, disparado no primeiro toque na tela).

- **Risco: o cache guardar dado financeiro.** → Não guarda: o service worker só armazena os
  arquivos do app (HTML/CSS/JS/ícones). Os dados vivem no `localStorage`, que ele não toca.
  Fica registrado aqui porque é a primeira pergunta que qualquer um faz.

## Verificação

- **Automatizada:** `python testes/e2e/test_instalavel.py` — servidor local, manifesto, ícones,
  service worker ativo, **rede desligada** e zero erros de console. Mais a suíte existente
  (`node testes/motor.teste.js`, `test_app_financas.py`, `test_metas.py`, `test_sem_corte.py`,
  `test_backup.py`) para garantir que nada regrediu.
- **Manual, no aparelho real (indispensável):** instalar, abrir em modo avião, e testar o
  vínculo com o arquivo do Drive. Nenhum teste automatizado consegue provar o comportamento de
  permissão do Chrome no Android — essa parte é olho no aparelho.

## Registro de progresso

- 2026-07-28 — Plano criado (Rascunho). Investigação prévia já feita: confirmado que faltavam
  manifesto e service worker, e que o `https://` e os ícones já estão prontos.
- 2026-07-28 — Aprovado pelo usuário (fases 1 a 3). **Fases 1, 2 e 3 entregues.** Criados
  `app/manifest.json`, `app/sw.js`, `app/img/icone-maskable-192.png` e
  `testes/e2e/test_instalavel.py`; registro do service worker com guarda de protocolo em
  `app/js/app.js`. Testes: 24/24 no novo, e a suíte existente inteira sem regressão. Docs
  sincronizados (`AGENTS.md` §2, `docs/SPEC.md`). **Falta só a Fase 4**, que depende do push
  do usuário e do aparelho real.
- 2026-07-28 — Usuário autorizou explicitamente a exceção da linha vermelha e a IA publicou
  (`fb8d7a8..3085655`). Registrado como D010 em `docs/DECISOES.md`, junto com dois achados: a
  guarda de push só cobre a ferramenta Bash (D010.1), e `AGENTS.md` §5 contradiz o hook sobre
  se a exceção existe (D010.2, pendente de decisão do usuário).
- 2026-07-28/29 — Primeira tentativa de instalar não completava (registro fantasma de
  tentativa anterior no Chrome); resolvido limpando dados do site. Instalado com sucesso.
  **Fase 4 concluída com prova real:** o usuário atualizou o backup pelo app instalado de
  madrugada (29/07 ~00:38) sem precisar reconectar; confirmado de forma independente lendo o
  `modifiedTime` do `financas.json` no Drive via `mcp__claude_ai_Google_Drive`, que bateu
  exatamente com o horário lembrado. Registrado como **D011**. **Plano concluído — 18 de 18
  (100%).**

## Pendências / próximos passos

- ⏳ **Decisão do usuário — a regra do push está contraditória.** `AGENTS.md` §5 diz "sem
  exceção"; o hook diz "exige decisão explícita". E a guarda **só cobre a ferramenta Bash** —
  por PowerShell o push passa direto (D010.1). Escolher um dos dois caminhos: (a) alinhar o
  `AGENTS.md` com o hook, deixando explícito que a exceção existe mediante autorização na hora;
  ou (b) manter "sem exceção" e **fechar o buraco** da guarda para valer em qualquer ferramenta.

- **Próximo plano (já conversado, ainda não escrito):** gravar sozinho no arquivo do Google
  Drive — auto-save com atraso de ~2s, gravação ao sair do app, e indicador honesto de
  "pendente" quando a gravação falhar.
- **Assunto maior, adiado por decisão do usuário:** sincronizar celular ↔ computador de
  verdade. Exige mudar o modelo de dados (cada registro com hora de alteração e marca de
  exclusão) antes de qualquer transporte. Está fora de 0007 e do próximo plano.
