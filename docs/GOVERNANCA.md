# GOVERNANÇA — o fluxo obrigatório de trabalho

> Detalha as regras resumidas em `AGENTS.md` §3–5. Leia antes de implementar qualquer coisa não
> trivial. Se algo aqui contradisser o `AGENTS.md`, **o `AGENTS.md` vence** (é o canônico) — e
> este arquivo deve ser corrigido (regra do flywheel, §6).

## 1. As 4 portas, em detalhe

### Porta 0 — Ao entrar (uma vez por sessão)
- [ ] Li `AGENTS.md` inteiro.
- [ ] Li `ESTADO.md` (onde estamos agora).
- [ ] Sei onde ficam `docs/PRD.md`, `docs/SPEC.md`, `docs/DECISOES.md`.
- [ ] Consultei `Planos/INDICE.md`.

### Porta 1 — Antes de sugerir ou implementar (Definition of Ready)
Nunca pule esta porta, mesmo em pedido que pareça simples.
- [ ] **Investiguei o sistema real** — li os arquivos relevantes. Não estou assumindo pelo nome
      do arquivo nem por memória de conversa antiga.
- [ ] Confirmei que o pedido não conflita com `PRD.md`/`SPEC.md`.
- [ ] Se é não trivial: existe **plano** em `Planos/` cobrindo isso, e ele está **Aprovado**.
- [ ] Tenho **autorização explícita** para começar. (Aprovar o plano conta; para mudança
      trivial, uma frase de confirmação basta.)
- [ ] Se é arriscado (mexe em dados, muitos arquivos, difícil reverter): working tree limpo.

Sem tudo marcado, **pare e pergunte**. Não implemente "para adiantar".

### Porta 2 — Durante
- [ ] Sigo o plano. Escopo mudou? **Edito o plano e registro no changelog dele** — não decido
      diferente em silêncio.
- [ ] Prefiro mudanças pequenas e reversíveis a uma reescrita grande.
- [ ] Dou baixa **conforme** entrego, não só no final.

### Porta 3 — Antes de concluir (Definition of Done)
- [ ] Testei/verifiquei de verdade — ver `docs/SPEC.md` para o método deste projeto.
- [ ] **Sincronizei a documentação** afetada.
- [ ] Dei baixa completa no plano e no `Planos/INDICE.md`.
- [ ] Se terminou: movi para `Planos/Concluídos/`.
- [ ] Fiz o **commit** (convenção na §4).

> O hook `porta-saida.ps1` impõe esta porta mecanicamente: com plano em andamento e código
> alterado sem baixa, o turno não fecha. Isso é de propósito.

## 2. Tabela de permissões (completa)

| Nível | Regra | Exemplos neste projeto |
|---|---|---|
| 🟢 **Sempre pode** | Somente leitura ou reversível trivial | Ler qualquer arquivo; buscar no código; rodar testes; `git status`/`log`/`diff` |
| 🟡 **Perguntar antes** | Muda sistema, escopo ou dados | Implementar funcionalidade; mudar arquitetura; nova dependência; mexer em dados; mudar o próprio harness |
| 🔴 **Nunca** | Irreversível ou proibido | `git push`/publicar dado real do usuário sem autorização · `git reset --hard` sem checkpoint · mudar recorrência/parcelamento sem atualizar `REGRAS-DE-NEGOCIO.md` e o teste correspondente |

As linhas 🔴 são impostas por `.claude/hooks/guarda.ps1`, lendo `.harness/guardas.json`.
**Regra e guarda andam juntas** — se você adicionar uma linha 🔴 aqui sem a guarda
correspondente, ela é só um pedido educado.

## 3. Rollback — receitas em linguagem simples

- **"Ver o que mudou na última entrega":** `git log --oneline`, depois `git show <hash>`.
- **"Desfazer mantendo o histórico":** `git revert <hash>`.
- **"Voltar a um commit anterior descartando o que veio depois"** (⚠️ 🟡 destrutivo):
  `git reset --hard <hash>`.
- **Checkpoint:** `git status` limpo (ou commitar o pendente) antes de começar algo arriscado.
{{ROLLBACK_DADOS}}

## 4. Convenção de commit

`tipo: descrição curta em português` · tipos: `feat` `fix` `docs` `chore` `refactor` `data`.
Corpo em português, livre. **1 commit por tarefa/entrega** — não um commit gigante juntando
tudo. Nunca `--no-verify`.

## 5. DoR / DoD nos planos

Todo plano em `Planos/` traz sua própria Porta de Entrada (DoR) e Critérios de Aceite (DoD) —
ver `Planos/MODELO-DE-PLANO.md`. São as Portas 1 e 3 aplicadas àquele plano.

## 6. Regra do flywheel

Se uma IA errar **porque este harness estava ausente, ambíguo ou desatualizado**: corrigir o
documento **faz parte da tarefa**, não é item opcional para depois. Registre em
`docs/DECISOES.md`.

**Melhor ainda:** rode `/harness learn "<o erro>"`. Ele pergunta primeiro *"dá para impedir
mecanicamente?"* — e guarda mecânica vale mais que parágrafo, porque funciona mesmo quando o
modelo está distraído.

## 7. Anti-inchaço

`AGENTS.md` ≤ 120 linhas. Cresceu? O conteúdo migra para um documento de profundidade e o
`AGENTS.md` fica só com o ponteiro. **Nunca duplique parágrafo entre documentos** — sempre link
para a fonte única. `/harness doctor` mede e reprova.
