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
  node scripts/credentials.mjs check --app $App | Out-Host

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
  Write-Host "Report: npx playwright show-report artifacts/$App/report"
}
finally {
  # Step 4: Clear secrets this runner set, including on interruption.
  foreach ($name in $promptedVars) { Remove-Item "Env:$name" -ErrorAction SilentlyContinue }
  Remove-Item Env:BASE_URL, Env:TEST_SUITE -ErrorAction SilentlyContinue
  $env:CREDENTIALS_FILE = $previousAccountsFile
}
exit $exitCode
