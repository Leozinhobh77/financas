# AGENTS.md — Finanças

> **Documento canônico.** Qualquer IA (Claude Code, Cursor, Copilot, Gemini, Codex) que abrir
> esta pasta deve ler este arquivo **primeiro e por inteiro**. É curto de propósito — a
> profundidade vive nos links da seção 6. **Não copie conteúdo de lá para cá: fonte única, sempre.**

## 1. O que é este projeto

Controle pessoal de **contas a pagar e a receber** — site estático (HTML/CSS/JS puro, sem
servidor), uso solo no celular. Duas regras carregam o produto: **recorrência sob demanda**
(a próxima ocorrência só nasce quando a atual é marcada paga) e **parcelamento de cartão**
(a série inteira nasce de uma vez, porque a dívida já foi assumida). Ver `docs/PRD.md` e
`docs/REGRAS-DE-NEGOCIO.md`.

## 2. Comandos essenciais

```
# Abrir o app (sem servidor, funciona por file://)
duplo clique em app/index.html

# Rodar os testes do motor (datas + recorrência + parcelamento) — Node puro, sem browser
node testes/motor.teste.js

# Rodar os testes de interface (Playwright)
python testes/e2e/test_app_financas.py   # fluxos e regras de negócio
python testes/e2e/test_metas.py          # metas: campanha, cofre, lançamento, 8 larguras
python testes/e2e/test_sem_corte.py      # layout: nenhum valor cortado em 8 larguras
python testes/e2e/test_backup.py         # backup: importar, restaurar, apagar, limpar
python testes/e2e/test_instalavel.py     # manifesto, service worker, abrir sem internet
python testes/e2e/test_autosave.py       # gravação automática no arquivo vinculado
```

> `test_instalavel.py` é o único que roda por `http://` (sobe servidor local): service worker
> não existe em `file://`. Ele também prova que, por `file://`, o app segue sem erro nenhum.

## 3. Regras de ouro (não negociáveis)

> Cada regra aqui existe por causa de um erro real. Regra sem procedência é abatida pelo
> `/harness doctor` — não adicione nenhuma sem saber que erro ela previne.

1. **Investigue antes de agir.** Leia o código real relevante e diga o que encontrou antes de
   propor ou implementar. Nunca trabalhe às cegas.
2. **Nada sem plano aprovado + autorização.** Trabalho não trivial só começa com um plano em
   `Planos/` (ver `Planos/MANUAL.md`) e o usuário dizendo sim. Dúvida se é trivial? Trate como
   não trivial.
3. **Fale português** com o usuário.
4. **Checkpoint antes, commit depois.** Working tree limpo antes de mudança arriscada; commit ao
   terminar (convenção em `docs/GOVERNANCA.md` §4).
5. **Ao fim de toda tarefa: dê baixa no plano** — checkboxes, status, progresso, changelog,
   `Planos/INDICE.md`. Arquive em `Planos/Concluídos/` se encerrou.
6. **Efeito flywheel.** Errou por instrução ausente ou ambígua neste harness? **Corrija o
   documento na mesma tarefa** e registre em `docs/DECISOES.md`. Melhor ainda: rode
   `/harness learn "<o erro>"` para virar guarda mecânica.
7. **Toda regra de `docs/REGRAS-DE-NEGOCIO.md` precisa de teste.** Sem exceção — é dinheiro.
   Prosa sem teste é dívida, não documentação (tier T2+).

## 4. Como este projeto pensa (as 4 portas)

Detalhadas em `docs/GOVERNANCA.md`:

```
0. AO ENTRAR        → AGENTS.md → GOVERNANCA → PRD/SPEC → REGRAS-DE-NEGOCIO → ESTADO.md
1. PORTA DE ENTRADA → investigar o sistema real + plano aprovado + autorização
2. DURANTE          → seguir o plano, mudanças pequenas e reversíveis, dar baixa ao avançar
3. PORTA DE SAÍDA   → testar (motor + e2e) + sincronizar docs + dar baixa + commit
```

## 5. Tabela de permissões

| Nível | Significa | Exemplos |
|---|---|---|
| 🟢 **Sempre pode** | Sem pedir | Ler código, investigar, rodar testes, ler docs e planos |
| 🟡 **Perguntar antes** | Precisa de OK explícito | Implementar algo novo, mudar escopo, nova dependência |
| 🔴 **Nunca** | Proibido, sem exceção | `git push`/publicar dado real do usuário · `git reset --hard` sem checkpoint · mudar regra de recorrência/parcelamento sem atualizar `REGRAS-DE-NEGOCIO.md` e o teste junto |

Versão completa em `docs/GOVERNANCA.md` §2. As linhas 🔴 de comando são impostas por hook — ver
`.claude/hooks/guarda.ps1`.

## 6. Mapa de documentos (a profundidade vive aqui)

| Documento | Quando ler |
|---|---|
| `ESTADO.md` | **Sempre, ao entrar** — onde o projeto está agora. É gerado; não edite. |
| `docs/GOVERNANCA.md` | Sempre — fluxo completo, permissões, rollback, convenção de commit. |
| `docs/PRD.md` | Antes de decidir o **o quê**/**por quê** de uma funcionalidade. |
| `docs/SPEC.md` | Antes de mexer em código — arquitetura, stack, modelo de dados. |
| `docs/REGRAS-DE-NEGOCIO.md` | Índice das 29 regras e o teste de cada uma. Aponta para o texto. |
| `docs/regras/contas.md` | **Antes de tocar em recorrência, parcelamento ou datas** (RN001–RN009). |
| `docs/regras/metas.md` | **Antes de tocar em metas** (RN010–RN024). |
| `docs/regras/backup.md` | **Antes de tocar em backup, importar ou apagar dado** (RN025–RN029). |
| `docs/METAS.md` | O módulo de metas em linguagem comum — caixinha, sobra, cofre, extrato. |
| `docs/DECISOES.md` | Para entender **por que** algo é assim (memória sob demanda). |
| `Planos/MANUAL.md` + `MODELO-DE-PLANO.md` | Antes de criar/atualizar um plano. |
| `Planos/INDICE.md` | Para ver o que já está em andamento antes de começar algo novo. |
| `CLAUDE.md` | Camada específica do Claude Code (não repete o que já está aqui). |

## 7. Fora de escopo hoje

Multiusuário, login, nuvem, sincronização entre dispositivos, integração bancária, app nativo.
Ver `docs/PRD.md` para a lista completa e o motivo.

---

<!--
  Harness gerado por /harness · tier T2+ · v1.1.2
  Orçamento deste arquivo: 120 linhas. Estourou? Migre para docs/SPEC.md e deixe um ponteiro.
  /harness doctor confere. /harness learn "<erro>" adiciona guarda com procedência.
-->
