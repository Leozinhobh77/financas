<#
  PORTA DE SAIDA (Stop) - recusa encerrar o turno com plano sem baixa.

  Nivel 4 da tabela do /harness learn. E a Porta 3 da governanca virando lei:
  se houve trabalho e o plano nao foi atualizado, o turno nao fecha.

  Contrato Claude Code: exit 2 = nao deixa terminar, stderr volta pro modelo.

  CONSERVADOR DE PROPOSITO. Um Stop hook que dispara a toa e insuportavel e
  o usuario desliga o harness inteiro. So bloqueia com evidencia clara.

  ASCII puro (armadura ps1-check).
#>
$ErrorActionPreference = 'Stop'

try { $bruto = [Console]::In.ReadToEnd() } catch { exit 0 }
try { $ev = $bruto | ConvertFrom-Json } catch { $ev = $null }

# Trava anti-loop: se ja fomos nos que seguramos, nao segure de novo.
if ($ev -and $ev.stop_hook_active -eq $true) { exit 0 }

$raiz = $env:CLAUDE_PROJECT_DIR
if (-not $raiz) { $raiz = (Get-Location).Path }

$dirPlanos = Join-Path $raiz 'Planos'
if (-not (Test-Path $dirPlanos)) { exit 0 }

$ativos = @(Get-ChildItem $dirPlanos -Filter '*.md' -File -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match '^\d{4}-' })
if ($ativos.Count -eq 0) { exit 0 }

# Plano em andamento?
$emAndamento = @()
foreach ($p in $ativos) {
    $txt = Get-Content $p.FullName -Raw -Encoding UTF8
    if ($txt -match '(?m)^status:\s*(.+)$') {
        $st = ($Matches[1] -split '#')[0].Trim()
        if ($st -match 'andamento') { $emAndamento += $p }
    }
}
if ($emAndamento.Count -eq 0) { exit 0 }

# Houve trabalho de codigo mais novo que o plano?
$corte = ($emAndamento | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime

$extensoes = @('*.js','*.ts','*.jsx','*.tsx','*.py','*.cs','*.java','*.go','*.rb','*.php','*.html','*.css','*.sql')
$tocados = New-Object System.Collections.Generic.List[string]
foreach ($ext in $extensoes) {
    $achados = Get-ChildItem $raiz -Filter $ext -File -Recurse -ErrorAction SilentlyContinue |
               Where-Object {
                   $_.FullName -notmatch '\\(\.git|node_modules|dist|build|vendor|\.harness)\\' -and
                   $_.LastWriteTime -gt $corte
               }
    foreach ($a in $achados) { $tocados.Add($a.Name) }
}

if ($tocados.Count -eq 0) { exit 0 }

# Registra e segura.
try {
    $reg = [pscustomobject]@{
        data    = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')
        guarda  = 'porta-saida'
        acao    = 'segurou'
        detalhe = "$($tocados.Count) arquivo(s) alterado(s) apos a ultima baixa"
    } | ConvertTo-Json -Compress
    Add-Content -Path (Join-Path $raiz '.harness\log-guardas.jsonl') -Value $reg -Encoding UTF8
} catch { }

$amostra = ($tocados | Select-Object -Unique -First 5) -join ', '
$nomes   = ($emAndamento | ForEach-Object { $_.Name }) -join ', '

[Console]::Error.WriteLine("PORTA DE SAIDA: ha plano em andamento sem baixa.")
[Console]::Error.WriteLine("")
[Console]::Error.WriteLine("Plano(s): $nomes")
[Console]::Error.WriteLine("Alterados depois da ultima baixa: $amostra")
[Console]::Error.WriteLine("")
[Console]::Error.WriteLine("Antes de encerrar, faca a baixa (Planos/MANUAL.md secao 6):")
[Console]::Error.WriteLine("  1. marcar as checkboxes entregues")
[Console]::Error.WriteLine("  2. atualizar status e atualizado_em")
[Console]::Error.WriteLine("  3. recalcular o progresso (X de Y, Z%)")
[Console]::Error.WriteLine("  4. registrar uma linha no changelog do plano")
[Console]::Error.WriteLine("  5. atualizar Planos/INDICE.md")
[Console]::Error.WriteLine("")
[Console]::Error.WriteLine("Se o trabalho desta vez nao pertence a nenhum plano, diga isso ao usuario e encerre.")
exit 2
