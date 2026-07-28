# Regras de negócio — Backup, restauração e limpeza (RN025–RN029)

> Índice e mapa de testes em `docs/REGRAS-DE-NEGOCIO.md`. Aqui mora o texto das regras.
> Toda regra desta página tem teste em `testes/motor.teste.js` ou `testes/e2e/test_backup.py`.

## Por que estas regras existem

Backup é a única parte do app que pode **destruir tudo de uma vez**. Até o plano 0006,
`importarBackup` chamava `salvar()` direto: um arquivo antigo escolhido por engano apagava
meses de lançamento em silêncio, sem aviso e sem volta. As regras abaixo existem para que
nenhuma operação desta área seja irreversível.

---

## RN025 — Juntar só acrescenta

Ao importar no modo **juntar**, o app **acrescenta** o que falta e **nunca**:

- sobrescreve conta ou meta cujo `id` já existe (vence sempre o que está no app);
- remove qualquer conta, meta ou categoria;
- altera a `config` (tema, contador de alterações, histórico de backup).

Categorias viram a **união** das duas listas, sem duplicata.

**Por quê:** é a única definição de "juntar" que não consegue perder dado — e é fácil de
explicar em uma frase na tela. Quem quer o arquivo exato usa **substituir**, que avisa
quantas contas se perdem antes de agir.

**Consequência aceita:** a mesma conta lançada em dois aparelhos tem `id` diferente e vira
duas contas ao juntar. Preferível ao inverso (perder uma delas em silêncio).

> Testes: `RN025 —` (5 casos) em `motor.teste.js`; "Importar — juntar" em `test_backup.py`.

## RN026 — Toda operação destrutiva cria um ponto de restauração antes

Importar (nos dois modos), apagar tudo, limpar histórico e **restaurar** criam um ponto de
restauração **antes** de tocar nos dados. Restaurar também — voltar atrás precisa poder
voltar atrás.

Além disso, a primeira gravação de cada dia fotografa o estado **anterior**. É o que dá o
"ontem" e o "há 3 dias" da lista.

**Por quê:** o app não tem servidor nem lixeira. Sem ponto de restauração, o único desfazer
possível seria um arquivo que o usuário talvez não tenha.

> Testes: "Pontos de restauração" e "Apagar tudo" em `test_backup.py`.

## RN027 — Limpar histórico nunca remove conta usada por meta

A limpeza remove **apenas** conta com `status === 'pago'` e `vencimento` anterior ao corte —
e **pula** qualquer conta que apareça em `movimentos[].contaId` de alguma meta, ainda que
ela atenda aos dois critérios. A tela informa quantas foram preservadas e por quê.

**Por quê:** o extrato da meta aponta para a conta (D007.8). Apagar uma conta já abatida
deixaria o extrato exibindo um lançamento sem origem — o dinheiro continuaria certo no
cofre, mas o histórico passaria a mentir sobre de onde ele veio.

> Testes: `RN027` em `motor.teste.js`; "Limpar histórico" em `test_backup.py`.

## RN028 — No máximo 5 pontos, e dado real vence backup interno

A lista guarda os **5 mais recentes**; o mais antigo cai. Se o `localStorage` estourar a cota
ao salvar, **os pontos são descartados** e a gravação é repetida.

**Por quê:** ponto de restauração é rede de segurança, não dado. Perder a conta do usuário
para preservar a fotografia dela seria o avesso do propósito.

> Teste: `RN028` em `motor.teste.js`.

## RN029 — `config` é do aparelho, nunca do arquivo

Tema, contador de alterações (`versaoDados`) e histórico do último backup **não** vêm do
arquivo importado nem do ponto restaurado. São preferências e metadados deste navegador.

**Por quê:** restaurar um ponto de ontem não deveria trocar o tema nem rebobinar o contador —
o contador rebobinado faria a tela dizer "0 alterações desde o backup" logo depois de uma
mudança grande, exatamente quando o aviso mais importa.

> Testes: `RN025 — config é do aparelho` em `motor.teste.js`; "O tema do aparelho não veio do
> arquivo" em `test_backup.py`.

---

## Nota técnica — por que "Atualizar" só existe no computador

Um site não pode reescrever um arquivo que baixou: o download sai do alcance da página. A
exceção é a **File System Access API** (`showSaveFilePicker` + handle guardado em IndexedDB),
que **não existe no Android nem no iOS**.

Por isso `app/js/arquivo.js` sempre passa por `suportado()` e a tela tem dois cartões: com a
API, o botão **Atualizar**; sem ela, o aviso de "último backup há X dias · N alterações".
**Nunca um botão inerte** — botão que não funciona é pior que ausência de botão.
