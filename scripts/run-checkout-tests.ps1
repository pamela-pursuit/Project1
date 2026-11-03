$env:TEST_USERNAME = Read-Host "Username"
$env:BASE_URL = "https://rahulshettyacademy.com/loginpagePractise/"
$env:TEST_SUITE = "rahul-shetty"

$securePassword = Read-Host "Password" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR(
  $securePassword
)

try {
  $env:TEST_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
    $passwordPointer
  )
  # Run only the Rahul Shetty suite and save fresh screenshots and report data.
  npx playwright test tests/rahul-shetty --headed
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  Write-Host ""
  Write-Host "HTML report: artifacts/rahul-shetty/report/index.html"
  Write-Host "Screenshots: artifacts/rahul-shetty/test-results/"
  Write-Host "Open report: npx playwright show-report artifacts/rahul-shetty/report"
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  Remove-Item Env:TEST_USERNAME -ErrorAction SilentlyContinue
  Remove-Item Env:TEST_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:BASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:TEST_SUITE -ErrorAction SilentlyContinue
}
