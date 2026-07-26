# MANUAL DA PASTA `Planos/`

> Fonte da verdade sobre como planejar e executar trabalho neste projeto. Qualquer IA que for
> implementar algo **deve** ler este manual antes.
>
> É a aplicação, **dentro de cada plano**, do fluxo maior de `docs/GOVERNANCA.md` (as 4 portas).
> Se divergirem, `GOVERNANCA.md` vence — e este manual deve ser corrigido (flywheel).

## 1. Para que serve

Guardar os **planos**: cada iniciativa vira um documento com **fases → tarefas → checklist**,
com contexto, critérios de aceite e registro de progresso. Planos são **documentos vivos**:
nascem antes de implementar e são atualizados **durante e depois**.

## 2. Arquivos

| Arquivo | Papel |
|---|---|
| `MANUAL.md` | Este manual. |
| `MODELO-DE-PLANO.md` | Estrutura + modelo para copiar. |
| `INDICE.md` | Registro de todos os planos com status e progresso. Sempre em dia. |
| `NNNN-AAAA-MM-DD-slug.md` | Planos **ativos** (um por iniciativa). |
| `Concluídos/` | Planos entregues ou cancelados. Histórico preservado. |

## 3. Quando criar um plano

Qualquer trabalho não trivial: funcionalidade nova, mudança de arquitetura, migração,
refatoração grande. Correção pequena (1–2 linhas, typo) **não** precisa.
Regra prática: se você usaria o modo de planejamento antes de codar, crie um plano.

## 4. Nomear e salvar

- **`NNNN-AAAA-MM-DD-slug.md`**
  - `NNNN` = identidade curta e **estável**, sequencial (`0001`, `0002`…). **Nunca reuse nem
    mude**, mesmo após arquivar. O próximo é sempre o maior já usado + 1.
  - `AAAA-MM-DD` = data de **criação**.
  - `slug` = minúsculas com hífens.
- Maior número = mais novo. No `INDICE.md`, o mais novo fica **sempre no topo**.
- **Um plano por arquivo.**
- **Nunca apague** um plano. Encerrou? Mude o status e **mova para `Concluídos/`**.

## 5. Ciclo de vida

| Status | Significado |
|---|---|
| `📝 Rascunho` | Em elaboração, não aprovado. |
| `✅ Aprovado` | Usuário validou; pronto para executar. |
| `🚧 Em andamento` | Execução começou. |
| `✔️ Concluído` | Tudo entregue e verificado. |
| `⏸️ Pausado` | Parado (explique no changelog). |
| `❌ Cancelado` | Abandonado (explique no changelog). |

Tarefas: `- [ ]` pendente · `- [x]` concluída. Nuance ao lado: `🚧 em andamento` ou
`⛔ bloqueado (motivo)`.

### 5.1 Arquivamento
1. **Mova o `.md`** para `Concluídos/` (mesmo nome, mesmo `NNNN`).
2. No `INDICE.md`, mova a **linha** para a seção Concluídos (link passa a apontar para `Concluídos/`).
3. Nunca apague nem mude o `NNNN`.

## 6. 🔑 REGRA DE OURO — dar baixa

**Implementou parte de um plano? Atualize o plano na mesma tarefa.** "Dar baixa" = fazer TUDO:

1. **Marcar as checkboxes** entregues (`- [ ]` → `- [x]`).
2. **Atualizar o status** e `atualizado_em` no frontmatter.
3. **Recalcular o progresso** ("8 de 20 tarefas · 40%").
4. **Registrar no changelog** do plano: data + o que foi feito.
5. **Atualizar o `INDICE.md`**.
6. Se concluiu: mover para `Concluídos/` e a linha para a seção Concluídos.

> O hook `porta-saida.ps1` verifica isto ao fim do turno. Se você alterou código e não deu
> baixa, ele **não deixa encerrar**. Não é implicância — é a Porta 3 virando lei.

Mudou o escopo de uma tarefa? **Edite a tarefa** e registre no changelog. Não apague em silêncio.

## 7. Boas práticas

- **Tarefas verificáveis**: dá para dizer "feito/não feito"?
- **Porta de Entrada (DoR)** marcada antes da Fase 1 — inclusive "investiguei o sistema real".
- **Critérios de aceite** em dois blocos: **(a) produto** e **(b) processo**.
- **Decisões pendentes**: se depende do usuário, marque em aberto. Não assuma.
- **Riscos e verificação**: o que pode dar errado e como testar.
- Conciso e escaneável, completo o bastante para executar sem adivinhar.

## 8. Fluxo resumido

- [ ] Ler este manual e o `MODELO-DE-PLANO.md`.
- [ ] Criar `NNNN-AAAA-MM-DD-slug.md` a partir do modelo.
- [ ] Registrar no topo dos **Ativos** do `INDICE.md` (status `Rascunho`).
- [ ] Refinar com o usuário até aprovar (→ `Aprovado`).
- [ ] Confirmar a **DoR** antes de tocar na Fase 1.
- [ ] Executar; a cada entrega, **dar baixa** (seção 6).
- [ ] Confirmar a **DoD (a+b)** antes de concluir.
- [ ] Status → `Concluído`, 100%, changelog e índice em dia, arquivo em `Concluídos/`.
