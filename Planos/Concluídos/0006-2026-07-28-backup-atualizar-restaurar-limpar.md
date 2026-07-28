---
id: 0006
titulo: Backup — atualizar arquivo, pontos de restauração, importar sem perder, apagar com freio
status: ✔️ Concluído
prioridade: Alta
criado_em: 2026-07-28
atualizado_em: 2026-07-28
autor: Claude Code (a pedido do usuário)
relacionados: [0001]
---

# 0006 — Backup: atualizar, restaurar, importar sem perder, apagar com freio

## Contexto

Hoje o bloco **Backup** dos Ajustes só faz duas coisas, e as duas incomodam:

1. **Exportar gera um arquivo novo toda vez** (`financas-backup-AAAA-MM-DD.json`). O usuário
   exporta com frequência "por via das dúvidas" e a pasta de Downloads vira um monte de arquivo
   quase igual. Palavras dele: *"toda hora eu tenho que ficar exportando, exportando, e vai
   juntando um monte de arquivo"*.
2. **Importar apaga tudo, em silêncio.** `Store.importarBackup` chama `salvar(dado)` direto —
   sem aviso, sem comparação, sem volta. Importar um backup antigo por engano destrói tudo que
   veio depois. Isso é um buraco real, não uma melhoria estética.

E não existe nenhuma forma de **zerar** os dados (pedido explícito) nem de **voltar atrás**.

### O fato técnico que desenha a solução

Um site **não pode reescrever um arquivo que ele baixou** — o download sai do alcance da
página. A exceção é a **File System Access API** (`showSaveFilePicker` + `FileSystemFileHandle`
guardado em IndexedDB): com ela dá para pedir permissão **uma vez** e depois reescrever
**aquele mesmo arquivo** com um clique.

**Ela só existe no desktop** (Chrome/Edge). No Android e no iOS não existe. Como o uso real é
no celular (`AGENTS.md` §1), o "atualizar" resolve o problema **só no PC** — no celular a
resposta tem que ser outra: parar de exigir que o usuário lembre de exportar.

## Objetivo

Depois de pronto:

- No PC, existe um botão **Atualizar** que reescreve sempre o mesmo arquivo, sem duplicata.
- No celular, o app **avisa quando vale a pena** exportar (dias desde o último backup +
  quantas alterações houve), em vez de o usuário exportar no escuro.
- Existem **pontos de restauração** dentro do app — toda operação destrutiva é reversível.
- **Importar pergunta** antes: juntar ou substituir, com os números na mão.
- Existe **apagar tudo**, com trava de digitação, e uma **limpeza de histórico** mais fina.

## Escopo

**Dentro:**
- `app/js/backup.js` — lógica pura de mesclagem, diagnóstico e poda (testável em Node).
- `app/js/arquivo.js` — File System Access API + persistência do handle em IndexedDB.
- `armazenamento.js` — pontos de restauração, contador de alterações, metadados do backup,
  apagar tudo, limpar histórico.
- Reconstrução do bloco **Backup** em `telaConfig` + nova **Zona de risco**.
- `confirmar()` ganha confirmação por digitação (opcional).
- Regras novas (RN025–RN029) com teste, em `docs/regras/backup.md`.

**Fora (por agora):**
- Sincronização com nuvem, conta de usuário, backup automático para Drive — fora de escopo
  do produto (`AGENTS.md` §7). O "atualizar" apontando para uma pasta do Drive **no PC** dá o
  efeito prático sem trazer nuvem para dentro do app.
- Backup automático agendado — sem service worker, não há como rodar com o app fechado.

## Decisões e premissas

- **`juntar` só acrescenta.** Conta com `id` já existente **não** é sobrescrita: vence o que
  está no app. É a única definição que nunca perde dado, e é fácil de explicar ao usuário.
- **Pontos de restauração ficam em chave separada** do `localStorage`
  (`financas_v1_snapshots`). Se ficassem no estado principal, entrariam no arquivo exportado e
  o backup cresceria de forma recursiva.
- **Máximo de 5 pontos.** Suficiente para desfazer erro humano; barato o bastante para não
  competir com os dados reais pela cota do `localStorage`.
- **Contador de alterações** (`config.versaoDados`, +1 a cada `salvar`) em vez de comparar
  conteúdo. É exato, é barato, e não exige carimbo de tempo em cada conta.
- **Limpar histórico nunca remove conta ligada a movimento de meta** — apagar uma conta que
  uma meta abateu deixaria o extrato da meta apontando para o nada (D007.8).
- Se o `localStorage` estourar a cota ao salvar, **os pontos de restauração são descartados
  primeiro** e a gravação é repetida. Dado real vence backup interno, sempre.

## Porta de Entrada (Definition of Ready)

- [x] Investiguei o sistema real — li `armazenamento.js` inteiro, `telaConfig` (app.js
      1330–1416), o markup do `camadaConfirm` (index.html 198–205) e a ordem dos `<script>`.
- [x] Não conflita com `docs/PRD.md` / `docs/SPEC.md` — continua vanilla, offline, sem
      dependência; a File System Access API é nativa do navegador.
- [x] Plano revisado com o usuário e **aprovado** (escolheu a alternativa 1 em 28/07/2026).
- [x] Autorização explícita para começar.
- [x] Working tree limpo antes de começar (`dc9aeed`).

## Etapas

> Progresso: 22 de 22 tarefas (100%)

### Fase 1 — Motor (lógica pura, testável)
- [x] `app/js/backup.js` com `mesclar`, `diagnosticar`, `podarPagas`, `limitar`, `resumoDoArquivo`
- [x] `mesclar` nunca sobrescreve id existente nem apaga nada
- [x] `podarPagas` ignora conta ligada a movimento de meta
- [x] Testes no `motor.teste.js` cobrindo RN025–RN029

### Fase 2 — Armazenamento
- [x] `config.versaoDados` incrementado a cada `salvar`
- [x] `config.ultimoBackup` gravado ao exportar/atualizar
- [x] Pontos de restauração: `criarPonto`, `listarPontos`, `restaurarPonto`
- [x] Ponto automático uma vez por dia (chave leve `financas_v1_ultimo_snap`)
- [x] `apagarTudo` e `limparPagasAntesDe`
- [x] Cota estourada → descarta pontos e regrava

### Fase 3 — Arquivo (File System Access)
- [x] `app/js/arquivo.js` — `suportado()`, `escolher()`, `atualizar()`, `esquecer()`
- [x] Handle guardado em IndexedDB (não serializa em JSON)
- [x] Permissão reconsultada a cada uso, dentro do gesto do clique

### Fase 4 — Telas
- [x] Cartão do arquivo vinculado (PC) com nome, data e contagem
- [x] Cartão de aviso (celular) com dias + alterações desde o último backup
- [x] Lista de pontos de restauração
- [x] Importar: diálogo juntar × substituir com os números
- [x] Zona de risco: apagar tudo (digitar `APAGAR`) + limpar histórico
- [x] `confirmar()` com confirmação por digitação

### Fase 5 — Portas
- [x] `docs/regras/backup.md` + índice em `REGRAS-DE-NEGOCIO.md`
- [x] `docs/SPEC.md` e `docs/DECISOES.md` sincronizados

## Critérios de aceite (Definition of Done)

**(a) Produto**
- [x] Exportar duas vezes seguidas no PC com arquivo vinculado **não** cria duplicata.
- [x] Importar mostra os números antes e oferece juntar × substituir.
- [x] Juntar não reduz a contagem de contas em nenhum caso.
- [x] Apagar tudo exige digitar `APAGAR` e deixa um ponto de restauração.
- [x] Limpar histórico preserva conta usada por meta.
- [x] Nenhuma tela corta valor ou estica a página em 320px.

**(b) Processo**
- [x] Testado (motor + e2e).
- [x] Documentação sincronizada (`SPEC.md`, `REGRAS-DE-NEGOCIO.md`, `regras/backup.md`, `DECISOES.md`).
- [x] Baixa dada neste plano e no `Planos/INDICE.md`.
- [x] Arquivo movido para `Planos/Concluídos/`.
- [x] Commit seguindo `docs/GOVERNANCA.md` §4.

## Riscos e mitigações

- **Risco:** File System Access não existe no celular → botão morto na tela principal de uso.
  → **Mitigação:** feature-detect; no celular o cartão vira o aviso de "faz X dias", que é
  útil por si só. Nenhum botão inerte.
- **Risco:** pontos de restauração estouram a cota do `localStorage`.
  → **Mitigação:** máximo 5 + descarte automático no `QuotaExceededError`, com nova tentativa.
- **Risco:** juntar duplicar contas por id diferente e conteúdo igual.
  → **Mitigação:** aceito e documentado — `juntar` é por `id`, e ids são únicos por origem.
  Substituir continua disponível para quem quer o arquivo exato.
- **Risco:** o teste E2E roda em `file://`, onde a API pode não existir.
  → **Mitigação:** os testes cobrem o caminho de fallback e a lógica pura; o caminho do
  handle é verificado manualmente no PC.

## Verificação

```
node testes/motor.teste.js          # RN025–RN029 + os 129 anteriores
python testes/e2e/test_backup.py    # painel, importar, apagar, restaurar, 8 larguras
python testes/e2e/test_app_financas.py
python testes/e2e/test_metas.py
python testes/e2e/test_sem_corte.py
```

## Registro de progresso

- 2026-07-28 — Plano criado já **Aprovado** (o usuário aprovou o esboço antes do arquivo existir).
- 2026-07-28 — Fases 1–5 concluídas. 144 testes de motor verdes, 4 suítes E2E verdes
  (`test_backup.py` novo, 45 verificações).
- 2026-07-28 — Achado colateral pelo teste novo: `.form-inline input` sem `min-width: 0`
  empurrava o botão "Adicionar" das Categorias para fora da tela em 320px, esticando a
  **página inteira**. Bug antigo — nenhum teste visitava `#/config`. Corrigido junto.
- 2026-07-28 — Achados por captura de tela, não por teste: (a) `diasDesde` contava horas
  corridas e chamava de "hoje" um ponto de ontem às 19h — passou a comparar dias de
  calendário; (b) o botão ao lado do texto esmagava o cartão até uma palavra por linha —
  `flex: 1 1 11rem` faz o botão descer antes disso; (c) o botão travado do "apagar tudo"
  parecia clicável — ganhou estilo de desabilitado.

## Pendências / próximos passos

- Nenhuma. O "Atualizar" só aparece no PC — é limitação do navegador no celular, não pendência.
