$ErrorActionPreference = 'Stop'

if (-not (Test-Path package.json)) {
  throw 'package.json not found'
}

if (-not (Test-Path next.config.ts)) {
  throw 'next.config.ts not found'
}

$tmp = [System.IO.Path]::GetTempFileName()
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$output = ''
$previousErrorActionPreference = $ErrorActionPreference

try {
  $ErrorActionPreference = 'Continue'
  $env:NODE_OPTIONS = '--max-old-space-size=4096'
  $output = & node .\node_modules\next\dist\bin\next build 2>&1
  $exitCode = $LASTEXITCODE
} finally {
  Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
  $ErrorActionPreference = $previousErrorActionPreference
  $sw.Stop()
}

$output | Set-Content -Path $tmp
$output | ForEach-Object { $_ }

$text = Get-Content -Path $tmp -Raw
Remove-Item -LiteralPath $tmp -Force

function Get-MetricValue([string]$Pattern) {
  $match = [regex]::Match($text, $Pattern)
  if ($match.Success) {
    return [double]$match.Groups[1].Value
  }

  return -1
}

function Get-DurationSeconds([string]$Pattern) {
  $match = [regex]::Match($text, $Pattern)
  if (-not $match.Success) {
    return -1
  }

  $value = [double]$match.Groups[1].Value
  $unit = $match.Groups[2].Value
  if ($unit -eq 'ms') {
    return $value / 1000
  }

  return $value
}

$compile = Get-MetricValue 'Compiled successfully in ([0-9.]+)s'
$typescript = Get-MetricValue 'Finished TypeScript in ([0-9.]+)s'
$static = Get-DurationSeconds 'Generating static pages .* in ([0-9.]+)(ms|s)'
$warningCount = ([regex]::Matches($text, '(?m)^\s*(?:\u26A0\s*)?(?:Warning:|The ")')).Count

Write-Output ('METRIC build_wall_seconds={0:N3}' -f $sw.Elapsed.TotalSeconds)
Write-Output ('METRIC next_compile_seconds={0:N3}' -f $compile)
Write-Output ('METRIC next_typescript_seconds={0:N3}' -f $typescript)
Write-Output ('METRIC next_static_seconds={0:N3}' -f $static)
Write-Output ('METRIC build_warning_count={0}' -f $warningCount)
Write-Output ('METRIC build_exit_code={0}' -f $exitCode)

exit $exitCode
