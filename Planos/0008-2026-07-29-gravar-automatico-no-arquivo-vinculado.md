---
id: 0008
titulo: Gravar automático no arquivo vinculado (auto-save + indicador honesto)
status: 📝 Rascunho
prioridade: Alta
criado_em: 2026-07-29
atualizado_em: 2026-07-29
autor: Claude Opus 5 (a pedido do usuário)
relacionados: [0006, 0007]
---

# 0008 — Gravar automático no arquivo vinculado (auto-save + indicador honesto)

## Contexto

O plano 0006 deu ao app o botão "Atualizar" (reescreve sempre o mesmo arquivo vinculado, via
File System Access API). O plano 0007 provou, com dado real do Drive (D011), que **instalado na
tela de início, a permissão de escrita sobrevive entre sessões** — antes disso, o app pedia
"reconectar" toda vez que o Android descartava a aba.

Com a permissão persistente resolvida, falta a última peça do pedido original do usuário: **não
precisar apertar Atualizar depois de cada coisa que ele faz**. Ele descreveu um app que já usa
com esse comportamento — grava sozinho, mostra um indicador (laranja "precisa reconectar" / verde
"sincronizado"), e só pede um toque quando a permissão de fato caiu.

**Por que isso é seguro agora e não era antes:** com um único aparelho escrevendo (celular),
não existe conflito nem fusão — o mais recente sempre é a verdade. Gravar automático em cima de
sincronização entre dois aparelhos seria perigoso (edição em um apagaria silenciosamente a do
outro); gravar automático com **um só** aparelho escrevendo é só eliminar um clique repetitivo.

## Objetivo

Depois de qualquer alteração no app (criar/editar/pagar conta, mexer em meta, etc.), o arquivo
vinculado no Drive é atualizado sozinho, em poucos segundos, sem o usuário precisar tocar em
nada — e ele sempre sabe, olhando a tela, se está tudo sincronizado ou se precisa de um toque.

## Escopo

**Dentro:**
- Gravação automática ~2s depois de qualquer mudança salva (debounce — várias mudanças seguidas
  viram uma gravação só).
- Gravação também ao sair do app (troca de aplicativo, tela apaga, minimizar) — é o momento que
  mais importa no celular, porque o Android pode matar a aba a qualquer momento depois disso.
- Indicador de estado no cartão de Backup (Ajustes): **sincronizado** (verde) / **pendente,
  toque para reconectar** (laranja) / sem vínculo (como já existe hoje).
- A gravação automática **nunca** tenta pedir permissão sozinha (o navegador exige clique do
  usuário para isso — só verifica se a permissão *já* está concedida). Se não estiver, mostra
  laranja e espera o toque; não tenta, não falha silenciosamente sem avisar.
- Reconferir e tentar de novo quando o usuário volta pro app (a tela liga, ele troca de volta
  pro app).
- Testes: unitário para o mecanismo de "avisar quando algo mudou" (Node) + e2e simulando os
  três estados do indicador (sem vínculo / sincronizado / pendente).

**Fora (por agora):**
- Sincronizar dois aparelhos entre si (fusão por registro, hora de alteração, marca de exclusão)
  — é outra frente, maior, que muda o modelo de dados. Continua adiada por decisão do usuário.
- Gravação em segundo plano de verdade (app fechado) — não existe API de navegador pra isso
  além do que já temos; a gravação só acontece com o app aberto ou saindo dele agora.
- Mudar o botão "Atualizar" manual ou o "Exportar cópia" — continuam existindo, como reforço.

## Decisões e premissas

- **O ponto de entrada é `Store.salvar` (armazenamento.js:48), e só ele.** Todo o app já passa
  por ali — é por isso que dá pra plugar o auto-save num lugar só, sem tocar nos módulos que
  chamam `Store.adicionarConta`, `Store.atualizarMeta`, etc. Confirmado lendo o arquivo: não
  existe segunda porta pro localStorage.
- **`armazenamento.js` ganha um jeito de avisar "algo mudou"**, mas continua sem saber nada de
  arquivo, Drive ou DOM — mantém a camada pura, testável em Node, como o resto do projeto.
  Quem escuta o aviso e decide gravar no arquivo é o `app.js` (orquestração), igual a tudo mais.
- **Nunca pedir permissão fora de um clique real do usuário.** `requestPermission()` do
  navegador só funciona dentro de um gesto (documentado em `arquivo.js:53`); tentar fora disso
  falha silenciosamente ou é ignorado pelo navegador. Por isso o auto-save só **verifica**
  (`queryPermission`, sem pedir) — se não tiver permissão, mostra o laranja e espera o toque,
  que aí sim é um clique de verdade.
- **Nenhum aviso (toast) a cada gravação automática bem-sucedida.** Era exatamente a reclamação
  original — "não quero apertar nada". Toast a cada 2 segundos seria o mesmo incômodo disfarçado.
  O indicador visual (verde/laranja) já basta.
- **`registrarBackup` ganha um novo valor de `destino`: `'arquivo-auto'`**, pra diferenciar do
  clique manual no histórico. Conferido: `destino` hoje só é exibido como texto, nunca comparado
  em nenhum lugar do código — adicionar um valor novo não quebra nada existente.
- ⏳ **Decisão pendente:** manter também a cópia diária carimbada no Drive
  (`financas-2026-07-29.json`), sugerida lá no início da conversa como rede de segurança — se o
  auto-save gravar um erro, ele sobe pro arquivo principal na hora; a cópia diária seria o único
  jeito de voltar pra uma versão de ontem sem depender só dos pontos de restauração locais
  (que não sobrevivem a trocar de aparelho ou limpar o navegador). Ver Pendências.

## Porta de Entrada (Definition of Ready)

- [x] Investiguei o sistema real: `Store.salvar` é o único ponto de gravação; não existe hoje
      nenhum listener de ciclo de vida (`visibilitychange`/`pagehide`) no projeto; `destino` do
      backup não é comparado em lugar nenhum, só exibido; `Arquivo` hoje só tem
      `garantirPermissao` (que pede, não só verifica) — falta a versão "só verifica".
- [x] Não conflita com `docs/PRD.md`/`docs/SPEC.md` — continua um único aparelho escrevendo,
      sem servidor, sem sincronização entre dispositivos (isso continua fora de escopo).
- [ ] Plano revisado com o usuário e **aprovado** antes de iniciar a Fase 1.
- [ ] Autorização explícita para começar a implementar.
- [x] Working tree limpo (plano 0007 e D011 já commitados).

## Etapas

> Progresso: 0 de 16 tarefas (0%)

### Fase 1 — O aviso de mudança (camada pura)
- [ ] `armazenamento.js`: adicionar `Store.aoAlterar(fn)` — registra um ouvinte chamado ao fim
      de `salvar()`, depois do `versaoDados` já ter subido.
- [ ] Teste em Node (novo shim mínimo de `localStorage` em memória, só pra este teste): o
      ouvinte dispara exatamente uma vez por `salvar()`, recebe o estado atualizado.

### Fase 2 — Verificar permissão sem pedir
- [ ] `arquivo.js`: adicionar `Arquivo.permissaoConcedida(h)` — só `queryPermission`, nunca
      `requestPermission`. Não pede nada, só responde `true`/`false`.

### Fase 3 — O motor do auto-save
- [ ] `app.js`: no bootstrap, `Store.aoAlterar(agendarGravacaoAutomatica)`.
- [ ] `agendarGravacaoAutomatica`: debounce de 2s (reseta o timer a cada chamada nova).
- [ ] `gravarAutomaticamente()`: pega o vínculo; sem vínculo, não faz nada; com vínculo, checa
      `permissaoConcedida`; se sim, grava e chama `Store.registrarBackup('arquivo-auto')`
      silenciosamente; se não, só atualiza o indicador para "pendente".
- [ ] `document.addEventListener('visibilitychange', ...)`: ao ficar `hidden`, **descarta o
      timer do debounce e grava na hora** (é o momento em que o Android pode matar a aba).
- [ ] Ao voltar a ficar `visible`: reconferir permissão e, se havia gravação pendente, tentar de
      novo — silenciosamente se der certo.

### Fase 4 — Indicador honesto na tela
- [ ] `desenharCartaoBackup()`: acrescentar um terceiro estado visual junto ao já existente
      ("sem vínculo" / card ativo) — bolinha verde "sincronizado automaticamente" ou bolinha
      laranja "toque para reconectar", sem remover o botão "Atualizar" manual (continua servindo
      pra forçar agora, por exemplo antes de fechar o app faltando pouco pro debounce completar).
- [ ] Tocar no estado laranja dispara o mesmo fluxo do botão "Atualizar" hoje (é clique real,
      então pode pedir permissão de verdade).

### Fase 5 — Testes e verificação
- [ ] `testes/e2e/test_autosave.py`: **stub** de `window.Arquivo` (a API real não existe em
      `file://` nem no Chromium headless — mesma limitação já documentada em `test_backup.py`)
      simulando os três estados (sem vínculo / permissão concedida / permissão negada) e
      confirmando que o cartão mostra o texto e a cor certos em cada um; confirma que o debounce
      não grava a cada tecla, só depois de ~2s parado; confirma zero erros de console.
- [ ] Rodar a suíte inteira sem regressão (motor + 5 e2e existentes).
- [ ] Registrar o novo teste em `AGENTS.md` §2.
- [ ] **Verificação no aparelho real** (só isso prova de verdade, como em 0007): mexer no app
      instalado, esperar uns segundos sem tocar em nada, e conferir no Drive que o arquivo
      mudou sozinho — mesma técnica usada para provar D011 (`modifiedTime` do arquivo).

## Critérios de aceite (Definition of Done)

**(a) Produto**
- [ ] Qualquer alteração salva no app reflete no arquivo do Drive em poucos segundos, sem toque.
- [ ] Sair do app (trocar de aplicativo) grava na hora, não espera o debounce.
- [ ] A tela sempre mostra, com honestidade, se está sincronizado ou pendente — nunca finge que
      gravou quando não gravou.
- [ ] Sem vínculo nenhum, o comportamento de hoje continua igual (nada quebra).
- [ ] Nenhum toast a cada gravação automática bem-sucedida.

**(b) Processo**
- [ ] Testado: motor + 5 suítes e2e existentes + a nova, todas passando.
- [ ] Verificado no aparelho real com prova (metadado do arquivo no Drive), não só relato.
- [ ] Documentação sincronizada: `docs/SPEC.md`, `AGENTS.md` §2, `docs/DECISOES.md` (nova
      decisão, se houver algo não óbvio a registrar).
- [ ] Baixa dada neste plano e no `Planos/INDICE.md`.
- [ ] Arquivo movido para `Planos/Concluídos/`.
- [ ] Commit(s) seguindo `docs/GOVERNANCA.md` §4 (local; push continua decisão do usuário).

## Riscos e mitigações

- **Risco: gravar em cima de um erro sem o usuário perceber.** Diferente do botão manual (que
  você aperta sabendo o que está fazendo), o auto-save roda sozinho — se o app tiver um estado
  ruim, ele sobe pro Drive sem ninguém olhar antes. → **Mitigação parcial:** os pontos de
  restauração locais continuam existindo (plano 0006) e não são tocados por isto. **Mitigação
  maior, mas opcional:** a cópia diária carimbada — ver decisão pendente acima.
- **Risco: debounce nunca disparar se o app for fechado à força bem no meio dele.** →
  **Mitigação:** o gatilho de `visibilitychange` para `hidden` cobre o caso comum (trocar de
  app, apagar tela); é o que a documentação de ciclo de vida de página recomenda como o ponto
  mais confiável em mobile — mais confiável que `beforeunload`, que no Android frequentemente
  nem dispara.
- **Risco: tentar pedir permissão fora de um clique e o navegador ignorar sem erro nenhum.** →
  **Mitigação:** por desenho, o auto-save nunca chama `requestPermission` — só `queryPermission`.
  Pedir de verdade só acontece no toque do usuário no indicador laranja ou no botão Atualizar.
- **Risco: `armazenamento.js` deixar de ser puro e ganhar dependência de DOM/Arquivo.** →
  **Mitigação:** `Store.aoAlterar` só guarda e chama funções — quem registra e o que a função
  faz é problema de quem chama (`app.js`). O módulo continua testável em Node sem navegador.

## Verificação

- **Automatizada:** `node testes/motor.teste.js` (com o teste novo do `aoAlterar`) +
  `testes/e2e/test_autosave.py` (novo, com stub do Arquivo) + as 4 suítes e2e existentes.
- **Manual, no aparelho real (indispensável, mesma técnica de D011):** mexer em uma conta,
  esperar, checar `modifiedTime` do `financas.json` no Drive sem apertar nada manualmente.

## Registro de progresso

- 2026-07-29 — Plano criado (Rascunho), a partir da decisão do usuário de seguir para o
  auto-save depois de fechado o plano 0007. Investigação prévia feita: ponto único de gravação
  confirmado, ausência de listeners de ciclo de vida confirmada, `destino` livre para novo valor.

## Pendências / próximos passos

- ⏳ **Decisão do usuário:** incluir neste plano a cópia diária carimbada no Drive
  (`financas-AAAA-MM-DD.json`) como rede de segurança contra o auto-save subir um erro sem
  aviso? Pequeno de implementar (reaproveita `Store.exportarBackup`), mas é escopo a mais —
  prefiro perguntar a assumir.
- Depois deste plano, o pedido original do usuário (grava sozinho, sabe que está sincronizado)
  fica **completo** para um aparelho só. Sincronizar dois aparelhos continua como frente maior,
  separada e adiada (ver plano 0007 e conversa inicial).
