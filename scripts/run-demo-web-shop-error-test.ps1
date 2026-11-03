# Step 1: Collect the existing email used by the negative registration test.
$env:DEMO_SHOP_EXISTING_EMAIL = Read-Host "Existing Demo Web Shop email"
$env:BASE_URL = "https://demowebshop.tricentis.com"
$env:TEST_SUITE = "demo-web-shop-error"

# Step 2: Collect the password without displaying it.
$securePassword = Read-Host "Demo Web Shop password" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR(
  $securePassword
)

try {
  # Step 3: Run only the duplicate-email test in headed mode.
  $env:DEMO_SHOP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
    $passwordPointer
  )
  npx playwright test tests/demo-web-shop/checkout.spec.ts `
    --grep "existing email" --headed
}
finally {
  # Step 4: Clear credentials after the test run, including interrupted runs.
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  Remove-Item Env:DEMO_SHOP_EXISTING_EMAIL -ErrorAction SilentlyContinue
  Remove-Item Env:DEMO_SHOP_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:BASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:TEST_SUITE -ErrorAction SilentlyContinue
}
