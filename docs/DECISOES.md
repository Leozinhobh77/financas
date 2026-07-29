# DECISÕES — memória sob demanda

> Estilo ADR, enxuto. Cada entrada: **o quê**, **por quê**, **quando**. Nunca edite uma decisão
> antiga para "corrigi-la" — adicione uma nova que a supersede e referencie o número.
>
> Esta é a **memória portável** do projeto: qualquer IA, lendo só isto, entende decisões que não
> são óbvias olhando o código.

## Índice

> ⚠️ **Mantenha esta tabela em dia.** Ela existe para a IA achar a decisão certa sem carregar o
> arquivo inteiro. Passou de **15 decisões**? `/harness doctor` vai mandar quebrar em
> `docs/decisoes/D0NN-slug.md` — e ele está certo.

| # | Decisão | Data | Status |
|---|---|---|---|
| D011 | App instalado retém a permissão do arquivo do Drive entre sessões (hipótese confirmada) | 2026-07-29 | Ativa |
| D010 | Push é do usuário; exceção exige autorização explícita — e a guarda só cobre Bash | 2026-07-28 | Ativa |
| D009 | Backup: "Atualizar" só no PC, e nenhuma operação destrutiva sem volta | 2026-07-28 | Ativa |
| D008 | Regras de negócio quebradas por assunto em `docs/regras/` | 2026-07-27 | Ativa |
| D007 | Metas: modelo de dados e as 10 travas da auditoria (D007.1 a D007.10) | 2026-07-27 | Ativa |
| D006 | "Investigue antes de agir" (AGENTS.md §3 nº 1) é regra de fundação — não se abate | 2026-07-27 | Ativa |
| D005 | Painel: no máximo 2 colunas no celular, sem `overflow:hidden` em valor | 2026-07-27 | Ativa |
| D004 | Filtro de status usa os valores de `situacao()` (`paga`, não `pago`) | 2026-07-27 | Ativa |
| D003 | `guarda.ps1` normaliza caminho e força UTF-8 (evita falso positivo em push de outro repo) | 2026-07-26 | Ativa |
| D002 | Guarda contra duplicar recorrência ao desmarcar/remarcar paga | 2026-07-26 | Ativa |
| D001 | Stack: HTML/CSS/JS vanilla, sem servidor, `localStorage` | 2026-07-26 | Ativa |

## Como adicionar

Próximo número sequencial, **no topo** da lista (mais nova primeiro).

```
### D0NN — Título curto (AAAA-MM-DD)
**Decisão:** ...
**Motivo:** ...
**Procedência:** que erro/pergunta real motivou isto  (obrigatório — Lei 1)
**Alternativas consideradas:** ... (opcional)
**Relacionado:** Plano NNNN / D0MM (opcional)
```

Registre aqui: decisões de produto/arquitetura relevantes, e **toda vez que a regra do flywheel
for acionada** (`docs/GOVERNANCA.md` §6).

---

_(as decisões entram abaixo, mais nova primeiro)_

### D011 — App instalado retém a permissão do arquivo do Drive entre sessões (2026-07-29)
**Decisão/achado:** confirmado — instalar o Finanças na tela de início resolve o problema do
botão "reconectar" que reaparecia toda vez que o Android descartava a aba. Pelo app instalado,
a permissão de escrita no arquivo vinculado (File System Access API) **sobrevive** entre
sessões, mesmo com o app fechado por completo e reaberto horas depois.
**Motivo de registrar:** era hipótese declarada no plano 0007, não promessa — a documentação do
Chrome indicava isso, mas só valeria se funcionasse no aparelho real do usuário. Confirmado.
**Procedência — não foi só relato do usuário, foi checado de forma independente.** O usuário
apertou "Atualizar" pelo app instalado, fechou, e apertou de novo na madrugada de 29/07 (~00:38)
sem precisar reconectar. Isso foi confirmado lendo o `modifiedTime` do `financas.json` na pasta
"Arquivos Claude/App de Finanças" do Google Drive via `mcp__claude_ai_Google_Drive`
(`2026-07-29T03:38:07Z` UTC = ~00:38 no horário local) — batendo exatamente com o que o usuário
lembrava, e vindo de uma fonte fora do controle da conversa.
**Efeito colateral notado, sem instalar nada de propósito:** a primeira tentativa de instalação
não completava — Chrome tinha um registro de uma tentativa anterior malsucedida. Resolvido
limpando os dados do site em Chrome → Configurações → Configurações do site → (o site) →
Excluir dados. Vale como primeiro passo se o sintoma "instalando... e o ícone nunca aparece"
se repetir no futuro, antes de suspeitar de bug no app.
**Relacionado:** Plano 0007 (Concluído), D009 (o vínculo com o arquivo em si).

### D010 — Push é do usuário; exceção exige autorização explícita — e a guarda só cobre Bash (2026-07-28)
**Decisão:** `git push` continua sendo do usuário. A IA só publica mediante **autorização
explícita, dita naquele momento** — não vale autorização herdada de uma conversa anterior nem
"ele deixou da última vez". Antes de publicar, é obrigatório **mostrar o que vai ao ar**
(`git diff --stat origin/main..main` + varredura por dado sensível) e só então executar.
**Motivo:** `financas` é repositório **público**. Push ali não é salvar, é publicar na internet,
e publicar não tem desfazer. Em 2026-07-28 o usuário autorizou explicitamente uma exceção para
subir os 3 commits do plano 0007 (logo, plano, manifesto+service worker); a conferência prévia
mostrou só código, docs e ícones — nenhum dado financeiro.

**⚠️ D010.1 — a guarda tem um buraco: ela só olha a ferramenta Bash.** `guarda.ps1` testa
`$ferramenta -eq 'Bash'`, então um `git push` disparado pela ferramenta **PowerShell passa
direto**, sem bloqueio nenhum. Foi por aí que o push autorizado saiu — de forma transparente e
anunciada, mas o fato é que a proteção não é hermética. **Quem confiar nela como se fosse
absoluta está enganado.**

**⚠️ D010.2 — `AGENTS.md` §5 e o hook discordam.** A tabela diz `git push` = 🔴 "Proibido, **sem
exceção**"; o motivo dentro de `.harness/guardas.json` diz "Publicar exige **decisão explícita
do usuário**". São regras diferentes: uma é absoluta, a outra é condicional. Enquanto isso não
for reconciliado, qualquer IA que leia só um dos dois vai agir diferente da que leu o outro.
**Pendente de decisão do usuário** — ver Pendências do plano 0007.
**Relacionado:** Plano 0007, `AGENTS.md` §5, `.harness/guardas.json`, D003.

### D009 — Backup: "Atualizar" só no PC, e nenhuma operação destrutiva sem volta (2026-07-28)

**Decisão:** quatro escolhas ligadas, todas no bloco Backup dos Ajustes.

**D009.1 — O "Atualizar" existe, mas só onde a plataforma deixa.** Reescrever sempre o mesmo
arquivo exige a **File System Access API** (`showSaveFilePicker` + `FileSystemFileHandle`
guardado em IndexedDB, porque handle não vira JSON). Ela **não existe no Android nem no iOS**.
Então `app/js/arquivo.js` sempre passa por `suportado()` e a tela tem dois cartões: com a API,
o botão **Atualizar**; sem ela, o aviso "último backup há X dias · N alterações desde então".
**Nunca um botão inerte** — botão que não funciona ensina o usuário a desconfiar da tela.

**D009.2 — O contador vale mais que a comparação de conteúdo.** `config.versaoDados` sobe +1
a cada `salvar()`; o backup grava o valor da época. A diferença é o "N alterações desde
então", exato e de graça. As alternativas eram carimbar `atualizadoEm` em cada conta (muda o
modelo de dados) ou comparar assinatura (só diz "mudou/não mudou", não quantas).

**D009.3 — Juntar só acrescenta (RN025).** É a única definição de "juntar" incapaz de perder
dado. O custo aceito é duplicar conta lançada em dois aparelhos — ids diferentes, mesma conta.
Preferível ao inverso, que perderia uma delas em silêncio.

**D009.4 — Ponto de restauração é rede, não dado (RN028).** Máximo 5, em chave separada do
`localStorage`, e **descartados primeiro** se a cota estourar. Ficam fora do estado principal
de propósito: dentro dele, entrariam no arquivo exportado e o backup engordaria de forma
recursiva a cada exportação.

**Motivo:** o pedido original foi só "não quero acumular arquivo". Investigando, apareceu algo
mais grave ao lado: `importarBackup` chamava `salvar()` direto — importar um arquivo antigo
por engano apagava tudo, sem aviso e sem volta. O plano tratou os dois.

**Procedência:** pedido do usuário em 28/07/2026 (*"toda hora eu tenho que ficar exportando,
exportando, e vai juntando um monte de arquivo"* + *"uma de apagar todos os dados"*). O
buraco do importar foi achado lendo `armazenamento.js` durante a investigação, não pelo
pedido.

**Alternativas consideradas:** nome de arquivo fixo em vez de handle — rejeitada, o Chrome
renomeia para `financas (1).json` e o problema volta; backup automático agendado — impossível
sem service worker, o app precisa estar aberto.

**Relacionado:** Plano 0006, RN025–RN029, `docs/regras/backup.md`.

### D008 — Regras de negócio quebradas por assunto, com índice único (2026-07-27)
**Decisão:** `docs/REGRAS-DE-NEGOCIO.md` passa a ser **só o índice** (a tabela de cobertura, com
o teste de cada regra). O texto das regras mora em `docs/regras/contas.md` (RN001–RN009) e
`docs/regras/metas.md` (RN010–RN024). Regra nova entra no arquivo do assunto **e** ganha
obrigatoriamente a linha no índice — é ela que o `/harness doctor` usa para cobrar teste.
**Motivo:** o arquivo tinha chegado a 587 linhas (teto do orçamento: 250). Mais importante que o
número: quem ia mexer em recorrência carregava 587 linhas das quais ~290 eram sobre metas, e
vice-versa. A leitura é sob demanda, então o custo é real no momento em que mais atrapalha.
**Alternativas consideradas:** (a) tirar os blocos de "Exemplos" cujos números já estão nos
testes — cortaria ~170 linhas, não bastaria sozinho, e sacrificaria justamente a parte que faz o
documento ser legível por gente; (b) as duas coisas juntas. Escolhida a quebra pura: nenhuma
informação foi perdida, só mudou de lugar (regra do ponteiro, `ORCAMENTOS.md`).
**Ressalva honesta:** os dois arquivos filhos ficaram com 263 e 296 linhas — acima de 250. A
tabela de orçamentos da skill não tem linha para `docs/regras/*`, então o `doctor` não os
fiscaliza. A quebra resolve o problema real (leitura sob demanda mais enxuta) **e** faz o número
parar de acusar; as duas coisas são verdade. O buraco na tabela é candidato a `/harness evolve`,
não justificativa para encolher documentação.
**Procedência:** `/harness doctor` de 27/07/2026, item `[Inchaco] docs\REGRAS-DE-NEGOCIO.md tem
587 linhas (teto 250)`. Opção apresentada ao usuário com as três alternativas; ele autorizou a A.
**Relacionado:** `ORCAMENTOS.md` (Lei 3), D007, `docs/METAS.md`.

### D007 — Metas: modelo de dados e as 10 travas da auditoria (2026-07-27)

**Contexto.** O módulo de Metas foi desenhado em três rodadas de conversa e passou por uma
**auditoria completa antes de qualquer linha de código**, que encontrou 16 furos — 3 deles
capazes de corromper saldo em silêncio. As decisões abaixo são a resposta a cada um. Estão
agrupadas numa entrada só porque são **uma deliberação sobre um subsistema**; o índice de
DECISOES.md estoura em 15 entradas (regra do próprio projeto). O manual em linguagem comum
está em `docs/METAS.md`; as regras formais, em `docs/regras/metas.md` (RN010–RN024).

**Premissa que orienta todas elas:** a caixinha **paga** as contas — não são dois bolsos — e a
**sobra é o propósito**, não um resto.

| # | Decisão | Motivo / furo que fecha |
|---|---|---|
| **D007.1** | Uma conta pertence a **no máximo uma meta**. Desempate: quem já mexeu no dinheiro dela; depois a meta mais antiga. | **F1.** Duas campanhas marcando `casa` contavam o mesmo aluguel duas vezes. Pago numa, a outra seguia cobrando: os dois cofres mentiam e nada denunciava. → RN012 |
| **D007.2** | Todo movimento guarda uma **fotografia** da conta (descrição, valor, vencimento, categoria da época). | **F2.** Excluir a conta deixava a baixa órfã; editar o valor de 340 para 400 deixava a baixa mentindo em 60 reais. → RN019 |
| **D007.3** | **Invariante:** dinheiro que já se moveu **nunca** é desfeito por mudança de filtro. Conta com movimento fica na meta, mesmo mudando de categoria ou sendo excluída à mão. | **F3.** A seleção é uma regra viva; trocar a categoria do aluguel levava junto uma baixa de R$ 1.800 já realizada, e o cofre mudava sozinho. → RN017 |
| **D007.4** | **Um extrato único** (`movimentos`: aporte / retirada / baixa) em vez de três listas paralelas. Valor sempre positivo; o tipo dá a direção. | **F5.** A retirada do cofre aparecia na tela mas não existia no modelo. Três listas para o mesmo dinheiro é como saldo desanda. O teste `D007.4-1` exige que o fim do extrato **seja** o saldo. |
| **D007.5** | Excedente do mês vai **pro cofre** (padrão). Abater do mês seguinte é opção desligada. | Descontar o excedente comeria justamente o dinheiro que custou esforço guardar — o app puniria quem foi bem. A opção existe para quem tem dívida-alvo fixa. |
| **D007.6** | O **cofre nunca é negativo**. O que faltou vira **conta em aberto**, arrastada para o primeiro mês ainda aberto. | Cofre é dinheiro guardado; dívida é outra coisa. Um número só esconderia as duas informações. → RN014 |
| **D007.7** | Lançamento com data **fora** dos meses da meta é bloqueado — e o erro vira **oferta de estender** a campanha até aquele mês. | **F4.** Aceitar em silêncio faria o dinheiro sumir da conta sem explicação. |
| **D007.8** | Excluir uma meta **não encosta em nenhuma conta**. A confirmação diz isso com todas as letras. | **F10.** A meta **lê** as contas; nunca as possui. Contas são a fonte da verdade. |
| **D007.9** | Mês futuro sem contas mostra "ainda sem contas lançadas" — **nunca** "mínimo R$ 0,00". | **F6.** R$ 0,00 pareceria boa notícia sendo apenas ausência de dado. |
| **D007.10** | Pagar dentro da meta sem saldo **avisa** e oferece "paguei com dinheiro de fora". | **F7.** Deixaria a caixinha negativa em silêncio. Separa "a conta foi paga" de "saiu da minha caixinha". |

**Furos menores fechados junto:** F8 parcelamento que ultrapassa o fim da meta é sinalizado ·
F9 recorrência paga dentro da meta avisa que a próxima entrou no mês seguinte · F11 escada de
12 meses colapsa · F12 rótulo com ano quando a campanha cruza o ano · F13 editar alvo de mês
encerrado confirma antes · F14 tabbar de 5 abas testada nas 8 larguras · F15 alvo R$ 0 aceito ·
F16 backup antigo sem `metas` migra e tem teste.

**Achados durante a implementação** (não estavam na auditoria, apareceram no teste):
- `.campo input { width:100% }` (0,1,1) vencia `.mes-alvo` (0,1,0): o campo de valor cobria a
  caixa de marcar o mês e **engolia o toque**. Virou teste com `elementFromPoint`.
- O "+" flutuante abria **"Nova conta"** dentro de uma meta — ação errada para a tela.
- `.pp-bloco-nota` herdava `white-space: nowrap` do painel do período, onde as notas são
  curtas; com valor em dinheiro dentro, estourava a coluna.
- Texto em item de flex sem `min-width: 0` empurrava a **página inteira** para o lado em 320px.

**Relacionado:** Plano 0005, `docs/METAS.md`, RN010–RN019, D005 (tipografia de dinheiro
reaproveitada).

### D006 — "Investigue antes de agir" é regra de fundação, não candidata a abate (2026-07-27)
**Decisão:** a regra nº 1 de `AGENTS.md` §3 fica, permanentemente. Não é candidata a abate por
falta de procedência de incidente, e o `/harness doctor` não deve mais listá-la como tal.
**Motivo:** o usuário a classifica como **uma das mais importantes do harness** — é ela que
impede a IA de trabalhar por suposição sobre um código que ela não leu. Num app onde o dado é
dinheiro e o motor de recorrência/parcelamento tem casos de borda densos (RN001–RN009),
implementar às cegas não produz um erro visível na hora: produz um número errado que só aparece
no extrato, semanas depois. É o mesmo perfil de risco que a RN005 protege.
**Procedência:** avaliada explicitamente no `/harness doctor` de 27/07/2026, que a apontou como
candidata a abate por não ter incidente registrado. O usuário confirmou que a IA nunca
implementou sem investigar **e** decidiu mantê-la mesmo assim. Esta decisão É a procedência: a
regra existe por escolha deliberada de quem toca o projeto, não por inércia de template.
**Por que zero incidentes não a enfraquece:** ela pertence à mesma classe do `.gitignore` — o
sucesso dela é ninguém precisar dela. A Lei 4 já reserva essa proteção a guardas cujo dano é
irreversível; aqui vale pelo mesmo motivo (dinheiro errado não se desfaz depois de pago).
**Relacionado:** `CONSTITUICAO.md` Lei 1 e Lei 4, D005 (bug silencioso, sem erro na tela).

### D005 — Painel: no máximo 2 colunas no celular, e valor nunca com `overflow: hidden` (2026-07-27)
**Decisão:** os blocos do painel do período usam **no máximo 2 colunas em qualquer celular**
(1 abaixo de 340px, 3 só a partir de 620px). O bloco de destaque — meta por dia, ou "ficou
pendente", ou "atrasado" no `receber` — ocupa **largura cheia** no celular, com valor à esquerda
e nota à direita. `.pp-bloco-valor` **não tem `overflow: hidden`**; usa
`font-size: clamp(.78rem, 3.1vw, 1.08rem)` para encolher em tela estreita em vez de esconder.
**Motivo:** com 3 colunas, `R$ 3.588,60` precisa de 94px e sobravam **85px** em telas de 412px+
(Android grande, iPhone Pro Max). O `overflow: hidden` cortava o dígito **em silêncio** — sem
erro, sem aviso, só um número errado na tela. Ironicamente os aparelhos **menores** funcionavam,
porque caíam num breakpoint de 2 colunas: o bug só aparecia nas telas maiores.
**Por que a meta ganha a largura cheia:** é o número de ação (total e já pago são consulta), é o
único com semáforo — em largura cheia a cor vira faixa de status legível de longe — e assim o
valor e a nota cabem lado a lado em vez de empilhados apertados.
**Procedência:** relatado pelo usuário ("não consigo ver o valor total, os números são maiores
que o próprio card"). Medido antes de qualquer alteração em 7 larguras reais: corte confirmado
em 412px, 428px e 430px; OK de 360px a 393px.
**Guarda mecânica criada:** `testes/e2e/test_sem_corte.py` mede `scrollWidth > clientWidth` em
**8 larguras (320–430px)**, nas três telas, usando valores na casa do **milhão** de propósito.
É esse teste que define o piso da fonte fluida — ele falhou a 360px com `R$ 1.234.567,89` e o
piso foi calibrado até passar.
**Relacionado:** RN009 (o painel), Plano 0004.

### D004 — Filtro de status usa os valores que `situacao()` produz (2026-07-27)
**Decisão:** os chips de filtro de status em `app/js/app.js` passam a usar `'paga'` (não
`'pago'`), alinhados com o que `Contas.situacao()` devolve. Também os contadores dos chips e
o rótulo "Total já pago".
**Motivo:** havia uma divergência de uma letra entre quem filtra e quem classifica — a
interface mandava `'pago'`, `situacao()` devolve `'paga'`, e `Filtros.aplicar` compara os dois
diretamente. Resultado: a aba "Pagas" vinha **sempre vazia**, mesmo com contas pagas, e o chip
aparecia sem contador. Os outros três status funcionavam porque as palavras coincidiam.
**Por que corrigir na interface e não em `situacao()`:** `situacao()` é usada em todo o app
(cor do card, ícone, texto "Pago em", classe CSS). Mudar o valor lá mexeria em vários pontos e
criaria risco novo; mudar no chip toca um lugar só.
**Procedência:** reportado pelo usuário usando o app no celular. Reproduzido antes de qualquer
alteração: com 2 contas pagas, o filtro retornava 0. Confirmado que `Filtros.aplicar` com
`status: 'paga'` retornava as 2 corretamente — o filtro nunca esteve quebrado, só era chamado
com a palavra errada.
**Falha de teste que permitiu o bug passar:** o teste E2E existente afirmava apenas que a conta
pendente **não** aparecia no filtro "Pagas" — uma asserção de ausência, que passa mesmo com a
lista inteira vazia. Substituído por asserção de **presença** (a conta paga tem que aparecer,
o contador tem que existir), mais dois testes de motor travando o contrato entre `situacao()`
e o filtro. A correção foi validada reintroduzindo o bug de propósito: o teste novo falha.
**Relacionado:** RN004 (situação derivada, nunca gravada).

### D003 — `guarda.ps1` normaliza caminho e força UTF-8 no stdin (2026-07-26)
**Decisão:** o hook `.claude/hooks/guarda.ps1` agora (1) resolve o diretório efetivo de um
comando `Bash` antes de aplicar `comandos_proibidos` — se o comando começa com `cd <fora do
projeto> && ...`, a checagem é pulada, pois o comando não mexe neste repositório; (2) força
`[Console]::InputEncoding = UTF8` antes de ler o evento do stdin, evitando que caminhos com
acento (ex.: a própria pasta do usuário, `Usuário`) cheguem corrompidos.
**Motivo:** a guarda `sem-push` bloqueou, por engano, um `git push` **legítimo e já
autorizado** no repositório `harness` (completamente sem relação com Finanças), só porque o
texto do comando continha "git push" — mesmo com um `cd` explícito levando pra outra pasta.
**Procedência:** achado ao vivo, fora deste projeto, ao publicar uma atualização do harness a
partir de uma sessão cujo projeto ativo era este. Depurado com log de diagnóstico temporário
(duas correções por suposição erraram antes de achar a causa real: formato do `cd` do Bash
deste ambiente e formato híbrido do próprio `$env:CLAUDE_PROJECT_DIR`). Documentado como P006
na memória da skill `/harness` — ver `~/.claude/skills/harness/memoria/PADROES.md`.
**Relacionado:** `~/.claude/skills/harness` v1.2.1 (o fix nasceu lá, no template; propagado
manualmente aqui porque este projeto já existia antes do fix).

### D002 — Guarda contra duplicar recorrência ao desmarcar/remarcar paga (2026-07-26)
**Decisão:** `alternarPago` (`app/js/app.js`) checa, antes de gerar a próxima ocorrência de uma
conta recorrente, se já existe uma conta com `recorrenciaOrigemId` apontando para a que acabou
de ser paga. Se existir, não gera outra — só avisa que a próxima já existia.
**Motivo:** sem a checagem, o fluxo "marcar paga → desmarcar → marcar paga de novo" gerava
**duas** ocorrências no mês seguinte, violando a RN001 (recorrência nunca duplica).
**Procedência:** achado pelo teste E2E Playwright (`testes/e2e/test_app_financas.py`), não por
revisão manual — o cenário replica o que RN001 já previa como caso de borda em
`docs/REGRAS-DE-NEGOCIO.md`, mas a defesa ainda não existia na primeira versão do código.
**Relacionado:** Plano 0001, RN001.

### D001 — Stack: HTML/CSS/JS vanilla, sem servidor, `localStorage` (2026-07-26)
**Decisão:** site estático puro (sem framework, sem build, sem backend), dados no
`localStorage` do navegador, com exportar/importar backup em `.json`. Design próprio (paleta
"ledger" em petróleo/verde/âmbar/vermelho), tipografia do sistema (sem webfont — mantém o app
100% offline depois de carregado). Navegação: tabbar fixa no rodapé no celular (4 destinos +
botão flutuante de adicionar), nav no topo no desktop.
**Motivo:** mesma filosofia comprovada no projeto de referência (Pizza e Cia BH) — simplicidade
para uso pessoal de longo prazo, sem dependência apodrecer, sem custo de hospedagem com backend.
Uso é majoritariamente no celular (pedido explícito do usuário), daí a tabbar em vez de um menu
lateral tipo gaveta (que é o padrão usado no manual do harness, mas errado aqui: apps de uso
diário e frequente favorecem navegação inferior de alcance do polegar, não um menu que precisa
abrir).
**Relacionado:** Plano 0001, `docs/SPEC.md`.
