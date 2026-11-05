<#
.SYNOPSIS
  Runs an application's E2E suite across browsers and refreshes its workbook.

.EXAMPLE
  .\scripts\run-e2e.ps1 -App my-app -BaseUrl https://example.com

.EXAMPLE
  .\scripts\run-e2e.ps1 -App my-app -BaseUrl https://staging.example.com -AccountsFile D:\secure\credentials.xlsx
#>
param(
  [Parameter(Mandatory)][ValidatePattern('^[a-z0-9][a-z0-9-]*$')][string]$App,
  [Parameter(Mandatory)][string]$BaseUrl,
  [string]$TestPath = "tests/$App",
  [ValidateSet('chromium', 'firefox', 'webkit')][string[]]$Browsers = @('chromium', 'firefox', 'webkit'),
  # JSON or XLSX credential file (defaults to credentials/credentials.json|.xlsx).
  [string]$AccountsFile,
  # Environment variables to prompt for (hidden input) when not already set.
  [string[]]$SecretVars = @(),
  [string]$Grep,
  [switch]$Headed
)

$uri = $null
if (-not [Uri]::TryCreate($BaseUrl, [UriKind]::Absolute, [ref]$uri) -or $uri.Scheme -notin 'http', 'https') {
  throw "BaseUrl must be an absolute http(s) URL: $BaseUrl"
}

if ($AccountsFile -and -not (Test-Path -LiteralPath $AccountsFile -PathType Leaf)) {
  throw "AccountsFile not found: $AccountsFile"
}

$promptedVars = @()
$previousAccountsFile = $env:CREDENTIALS_FILE
$exitCode = 1
try {
  # Step 0: Point the credential store at the requested file and verify it (masked output).
  if ($AccountsFile) { $env:CREDENTIALS_FILE = (Resolve-Path -LiteralPath $AccountsFile).Path }
  # Shown only when a credential source exists; apps without login need none.
  $credentialCheck = node scripts/credentials.mjs check --app $App 2>&1
  if (-not ($credentialCheck -match '^No credentials source')) { $credentialCheck | Out-Host }

  # Step 1: Collect missing secrets without echoing them.
  foreach ($name in $SecretVars) {
    if (-not [Environment]::GetEnvironmentVariable($name)) {
      $secure = Read-Host "$name" -AsSecureString
      $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
      try {
        [Environment]::SetEnvironmentVariable($name, [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer))
      }
      finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
      }
      $promptedVars += $name
    }
  }

  # Step 2: Run the suite on every requested browser in one invocation.
  $env:BASE_URL = $BaseUrl
  $env:TEST_SUITE = $App
  # One folder per run: artifacts/<App>/runs/<RunId>/ (UTC timestamp).
  $env:E2E_RUN_ID = (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd_HH-mm-ss')
  $runDirectory = "artifacts/$App/runs/$($env:E2E_RUN_ID)"
  $arguments = @('playwright', 'test', $TestPath) + ($Browsers | ForEach-Object { "--project=$_" })
  if ($Grep) { $arguments += @('--grep', $Grep) }
  if ($Headed) { $arguments += '--headed' }
  Write-Host "npx $($arguments -join ' ')"
  & npx @arguments
  $exitCode = $LASTEXITCODE

  # Step 3: Merge results into the catalogue and rebuild the workbook.
  if (Test-Path "test-plans/$App/scenarios.json") {
    node scripts/workbook.mjs sync --app $App
    node scripts/workbook.mjs build --app $App
  }
  Write-Host ""
  Write-Host "Saved run:   $runDirectory"
  Write-Host "  Summary:     $runDirectory/summary.md"
  Write-Host "  Screenshots: $runDirectory/screenshots/<browser>/"
  Write-Host "  Report:      npx playwright show-report $runDirectory/report"
}
finally {
  # Step 4: Clear secrets and run settings this runner set, including on interruption.
  foreach ($name in $promptedVars) { Remove-Item "Env:$name" -ErrorAction SilentlyContinue }
  Remove-Item Env:BASE_URL, Env:TEST_SUITE, Env:E2E_RUN_ID -ErrorAction SilentlyContinue
  $env:CREDENTIALS_FILE = $previousAccountsFile
}
exit $exitCode
