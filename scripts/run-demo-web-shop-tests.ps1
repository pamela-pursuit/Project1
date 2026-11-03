# Step 1: Collect the new email used by the registration test.
$env:DEMO_SHOP_NEW_EMAIL = Read-Host "New Demo Web Shop customer email"
# Step 2: Collect the existing email used by validation and login tests.
$env:DEMO_SHOP_EXISTING_EMAIL = Read-Host "Existing Demo Web Shop email"
$env:BASE_URL = "https://demowebshop.tricentis.com"
$env:TEST_SUITE = "demo-web-shop"

# Step 3: Collect the password without displaying it.
$securePassword = Read-Host "Demo Web Shop password" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR(
  $securePassword
)

try {
  # Step 4: Run registration, duplicate-email, and login tests in headed mode.
  $env:DEMO_SHOP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
    $passwordPointer
  )
  npx playwright test tests/demo-web-shop/checkout.spec.ts --headed
}
finally {
  # Step 5: Clear credentials after the test run, including interrupted runs.
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  Remove-Item Env:DEMO_SHOP_NEW_EMAIL -ErrorAction SilentlyContinue
  Remove-Item Env:DEMO_SHOP_EXISTING_EMAIL -ErrorAction SilentlyContinue
  Remove-Item Env:DEMO_SHOP_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:BASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:TEST_SUITE -ErrorAction SilentlyContinue
}
