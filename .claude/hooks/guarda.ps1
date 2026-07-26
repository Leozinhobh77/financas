<#
  GUARDA (PreToolUse) - bloqueia acao proibida ANTES de acontecer.

  Nivel 2 da tabela do /harness learn. Le os padroes de .harness/guardas.json
  para que novas guardas entrem por DADO, nunca editando este script.

  Contrato Claude Code: stdin = JSON do evento. exit 2 = bloqueia e manda
  o texto de stderr para o modelo. exit 0 = libera.

  ASCII puro (armadura ps1-check).
#>
$ErrorActionPreference = 'Stop'

try { $bruto = [Console]::In.ReadToEnd() } catch { exit 0 }
if ([string]::IsNullOrWhiteSpace($bruto)) { exit 0 }

try { $ev = $bruto | ConvertFrom-Json } catch { exit 0 }

$raiz = $env:CLAUDE_PROJECT_DIR
if (-not $raiz) { $raiz = (Get-Location).Path }

$ferramenta = [string]$ev.tool_name
$alvo = ''
if ($ev.tool_input) {
    if ($ev.tool_input.file_path)   { $alvo = [string]$ev.tool_input.file_path }
    elseif ($ev.tool_input.notebook_path) { $alvo = [string]$ev.tool_input.notebook_path }
}
$comando = ''
if ($ev.tool_input -and $ev.tool_input.command) { $comando = [string]$ev.tool_input.command }

# ---------- carrega as guardas ----------
$cfg = Join-Path $raiz '.harness\guardas.json'
if (-not (Test-Path $cfg)) { exit 0 }
try { $g = Get-Content $cfg -Raw -Encoding UTF8 | ConvertFrom-Json } catch { exit 0 }

function Escrever-Log {
    param([string]$Guarda, [string]$Acao, [string]$Detalhe)
    try {
        $dir = Join-Path $raiz '.harness'
        if (-not (Test-Path $dir)) { return }
        $reg = [pscustomobject]@{
            data    = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')
            guarda  = $Guarda
            acao    = $Acao
            detalhe = $Detalhe
        } | ConvertTo-Json -Compress
        Add-Content -Path (Join-Path $dir 'log-guardas.jsonl') -Value $reg -Encoding UTF8
    } catch { }
}

$bloqueios = New-Object System.Collections.Generic.List[string]

# ---------- 1. arquivos protegidos ----------
if ($alvo -and $ferramenta -match '^(Write|Edit|NotebookEdit)$' -and $g.arquivos_protegidos) {
    $rel = $alvo
    if ($alvo.StartsWith($raiz, [StringComparison]::OrdinalIgnoreCase)) {
        $rel = $alvo.Substring($raiz.Length).TrimStart('\', '/')
    }
    $relBarra = $rel.Replace('\', '/')
    foreach ($regra in $g.arquivos_protegidos) {
        if ($relBarra -like $regra.padrao) {
            $bloqueios.Add("BLOQUEADO: '$relBarra' e arquivo protegido. Motivo: $($regra.motivo)")
            Escrever-Log $regra.nome 'bloqueou' $relBarra
        }
    }
}

# ---------- 2. comandos proibidos ----------
if ($comando -and $ferramenta -eq 'Bash' -and $g.comandos_proibidos) {
    foreach ($regra in $g.comandos_proibidos) {
        if ($comando -match $regra.padrao) {
            $bloqueios.Add("BLOQUEADO: comando proibido neste projeto. Motivo: $($regra.motivo)")
            Escrever-Log $regra.nome 'bloqueou' $comando
        }
    }
}

if ($bloqueios.Count -gt 0) {
    [Console]::Error.WriteLine(($bloqueios -join "`n"))
    [Console]::Error.WriteLine('')
    [Console]::Error.WriteLine('Se esta guarda estiver errada, use /harness learn para corrigi-la.')
    exit 2
}

exit 0
