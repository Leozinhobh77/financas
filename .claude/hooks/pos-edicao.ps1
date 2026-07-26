<#
  POS-EDICAO (PostToolUse) - valida logo apos cada escrita e devolve o erro.

  Nivel 3 da tabela do /harness learn: o retorno mais rapido que existe
  (milissegundos). O modelo se corrige sozinho antes de seguir em frente.

  Contrato Claude Code: exit 2 = manda stderr de volta pro modelo.
  exit 0 = silencio. Sucesso e silencioso, sempre.

  ASCII puro (armadura ps1-check).
#>
$ErrorActionPreference = 'Stop'

try { $bruto = [Console]::In.ReadToEnd() } catch { exit 0 }
try { $ev = $bruto | ConvertFrom-Json } catch { exit 0 }

$raiz = $env:CLAUDE_PROJECT_DIR
if (-not $raiz) { $raiz = (Get-Location).Path }

$alvo = ''
if ($ev.tool_input -and $ev.tool_input.file_path) { $alvo = [string]$ev.tool_input.file_path }
if (-not $alvo -or -not (Test-Path $alvo)) { exit 0 }

$ext = [IO.Path]::GetExtension($alvo).ToLower()
$nome = Split-Path $alvo -Leaf
$problemas = New-Object System.Collections.Generic.List[string]

function Escrever-Log {
    param([string]$Detalhe)
    try {
        $reg = [pscustomobject]@{
            data    = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')
            guarda  = 'pos-edicao'
            acao    = 'apontou'
            detalhe = $Detalhe
        } | ConvertTo-Json -Compress
        Add-Content -Path (Join-Path $raiz '.harness\log-guardas.jsonl') -Value $reg -Encoding UTF8
    } catch { }
}

# ---------- JSON valido ----------
if ($ext -eq '.json') {
    try { $null = Get-Content $alvo -Raw -Encoding UTF8 | ConvertFrom-Json }
    catch { $problemas.Add("$nome nao e JSON valido: $($_.Exception.Message)") }
}

# ---------- PowerShell: parser + ASCII ----------
if ($ext -eq '.ps1') {
    $errs = $null
    $null = [System.Management.Automation.Language.Parser]::ParseFile($alvo, [ref]$null, [ref]$errs)
    if ($errs -and $errs.Count -gt 0) {
        $primeiro = $errs[0]
        $problemas.Add("$nome tem $($errs.Count) erro(s) de sintaxe. Linha $($primeiro.Extent.StartLineNumber): $($primeiro.Message)")
    }
    $bytes = [IO.File]::ReadAllBytes($alvo)
    $naoAscii = @($bytes | Where-Object { $_ -gt 127 }).Count
    if ($naoAscii -gt 0) {
        $problemas.Add("$nome tem $naoAscii byte(s) nao-ASCII. Scripts .ps1 quebram com acento no console do Windows (cp1252). Mova o texto acentuado para um template .md em UTF-8.")
    }
}

# ---------- Markdown: orcamento de linhas ----------
if ($ext -eq '.md') {
    $orcamentos = @{
        'AGENTS.md' = 120; 'CLAUDE.md' = 40; 'ESTADO.md' = 40
        'GOVERNANCA.md' = 140; 'PRD.md' = 100; 'SPEC.md' = 150
    }
    if ($orcamentos.ContainsKey($nome)) {
        $n = @(Get-Content $alvo -Encoding UTF8).Count
        $teto = $orcamentos[$nome]
        if ($n -gt $teto) {
            $problemas.Add("$nome ficou com $n linhas (teto $teto). Nao corte informacao: mova o excedente para o documento de profundidade e deixe um ponteiro. Ver ORCAMENTOS.md.")
        }
    }
}

if ($problemas.Count -gt 0) {
    Escrever-Log (($problemas | Select-Object -First 1))
    [Console]::Error.WriteLine(($problemas -join "`n"))
    exit 2
}

exit 0
