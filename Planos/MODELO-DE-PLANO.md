# MODELO DE PLANO — estrutura e esboço para copiar

Regras de nomeação, status e baixa estão no `MANUAL.md`. O fluxo por trás da **Porta de
Entrada** e do **Definition of Done** está em `docs/GOVERNANCA.md` (as 4 portas) — este modelo
só aplica esse fluxo a cada plano.

**Nome:** `NNNN-AAAA-MM-DD-slug.md`. O `NNNN` do frontmatter (`id`) bate com o do nome.

## Seção por seção

1. **Frontmatter** — YAML: `id`, `titulo`, `status`, `prioridade`, `criado_em`, `atualizado_em`, `autor`, `relacionados`.
2. **Contexto** — por que este trabalho existe, o que motivou.
3. **Objetivo** — quando estiver pronto, o que passa a ser verdade.
4. **Escopo** — o que está **dentro** e o que está **fora** (evita inchar).
5. **Decisões e premissas** — já tomadas + **pendentes** (dependem do usuário).
6. **Porta de Entrada (DoR)** — confirma que dá para **começar** com segurança.
7. **Etapas (fases)** — cada fase com **tarefas em checklist**. É o coração.
8. **Critérios de aceite (DoD)** — **(a) produto** e **(b) processo**.
9. **Riscos e mitigações** — o que pode dar errado e o plano B.
10. **Verificação** — como testar.
11. **Registro de progresso** — linhas datadas. Atualizado a cada baixa.
12. **Pendências** — o que ficou em aberto.

> Progresso: escreva sempre "X de Y tarefas (Z%)" no topo das etapas **e** no `INDICE.md`.

---

## Esboço para copiar

```markdown
---
id: NNNN
titulo: <título curto e claro>
status: 📝 Rascunho        # Rascunho | Aprovado | Em andamento | Concluído | Pausado | Cancelado
prioridade: Média          # Alta | Média | Baixa
criado_em: AAAA-MM-DD
atualizado_em: AAAA-MM-DD
autor: <quem criou>
relacionados: []
---

# NNNN — <Título do plano>

## Contexto
<Por que este trabalho existe. Que problema resolve.>

## Objetivo
<Quando estiver pronto, o que passa a ser verdade. 1–3 frases.>

## Escopo
**Dentro:** <o que será feito>
**Fora (por agora):** <o que explicitamente NÃO será feito>

## Decisões e premissas
- <decisão já tomada>
- ⏳ **Decisão pendente:** <o que depende do usuário>

## Porta de Entrada (Definition of Ready)
- [ ] Investiguei o sistema/código real (não estou assumindo pelo nome do arquivo).
- [ ] Não conflita com `docs/PRD.md` / `docs/SPEC.md`.
- [ ] Plano revisado com o usuário e **aprovado** antes de iniciar a Fase 1.
- [ ] Autorização explícita para começar a implementar.
- [ ] Se for mudança arriscada: working tree limpo (checkpoint) antes de começar.

## Etapas
> Progresso: 0 de N tarefas (0%)

### Fase 1 — <nome da fase>
- [ ] <tarefa verificável>
- [ ] <tarefa verificável>

### Fase 2 — <nome da fase>
- [ ] <tarefa verificável>

## Critérios de aceite (Definition of Done)
**(a) Produto**
- [ ] <condição objetiva de pronto>

**(b) Processo**
- [ ] Testado/verificado (ver seção Verificação).
- [ ] Documentação afetada sincronizada (liste quais).
- [ ] Baixa dada neste plano e no `Planos/INDICE.md`.
- [ ] Se concluído: arquivo movido para `Planos/Concluídos/`.
- [ ] Commit(s) feito(s) seguindo `docs/GOVERNANCA.md` §4.

## Riscos e mitigações
- **Risco:** <...> → **Mitigação:** <...>

## Verificação
<Como testar: teste automatizado, teste manual, etc.>

## Registro de progresso
- AAAA-MM-DD — Plano criado (Rascunho).

## Pendências / próximos passos
- <o que ficou em aberto>
```
