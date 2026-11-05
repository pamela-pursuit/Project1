# Discovery: demo-web-shop

Observed facts only. Anything not seen is listed under **Not observed**.
Account values are never recorded; the credential role is referred to as `existingUser`.

## 1. Run summary

| Item | Value |
| --- | --- |
| URL tested | `https://demowebshop.tricentis.com/` |
| Final URL | `https://demowebshop.tricentis.com/` (no redirect chain) |
| HTTP status | 200 (all 12 crawled pages returned 200) |
| Browser | Chromium (Playwright 1.64), desktop 1280x720 default; mobile probe 375x812 (`isMobile`, `hasTouch`) |
| Timestamp | Crawl `2026-11-05T13:32:30Z` (scripts/explore-app.mjs); guest probes p1 to p8 and signed-in probes a1 to a3 run 2026-11-05 |
| Probes | `artifacts/demo-web-shop/discovery/probes/p1-guest.mjs` … `p8-attrs.mjs`, signed-in `a1-session-account.mjs`, `a2-persist-checkout.mjs`, `a3-merge.mjs` (shared helper `auth-common.mjs`; outputs `*-out.json`; screenshots in `probes/shots/`, none taken while signed in) |
| Crawl blockers | None |
| Auth | Initially blocked (stored password rejected, section 4.1). After the coordinator fixed the credential, `existingUser` logged in successfully in a1, a2 and a3 (one login per probe, no failures). |

## 2. Application boundary and environment

- Origin: `https://demowebshop.tricentis.com`. No path prefix: the whole origin is the application.
- Off-origin links seen (out of scope): facebook.com/nopCommerce, twitter.com/nopCommerce, youtube.com/user/nopCommerce, plus.google.com, nopcommerce.com.
- Third-party script `https://s7.addthis.com/js/250/addthis_widget.js` fails with `net::ERR_NAME_NOT_RESOLVED` on product pages. This delays the page `load` event. Probes using `goto` with the default `waitUntil: 'load'` timed out (30 s) on `/computing-and-internet`; `waitUntil: 'domcontentloaded'` worked.
- Environment guess (**guess**): public shared demo (nopCommerce-based; footer says "Powered by nopCommerce", "Copyright © 2026 Tricentis Demo Web Shop. All rights reserved."). The data is shared with other users of the demo.
- No `data-testid` attributes anywhere (crawl `testIdCount: 0`).

## 3. Route map (observed)

| Title | URL | Purpose (observed) | Auth |
| --- | --- | --- | --- |
| Demo Web Shop | `/` | Home: featured products (6, each with "Add to cart"), newsletter, poll | Public |
| Demo Web Shop. Register | `/register` | Registration form | Public |
| Demo Web Shop. Login | `/login` | Login form plus "Register" button (new customer) | Public |
| Demo Web Shop. Shopping Cart | `/cart` | Cart; empty state "Your Shopping Cart is empty!" | Public (guest cart) |
| Demo Web Shop. Wishlist | `/wishlist` | Wishlist; empty state "The wishlist is empty!" | Public (guest wishlist) |
| Demo Web Shop. Books | `/books` | Category listing with view/sort/page-size/price filter | Public |
| Demo Web Shop. Computers | `/computers` | Parent category: sub-categories Desktops, Notebooks, Accessories; 0 products listed directly | Public |
| Desktops / Notebooks / Accessories | `/desktops`, `/notebooks`, `/accessories` | Sub-category listings | Public |
| Electronics / Camera, photo | `/electronics`, `/camera-photo` | Category listings | Public |
| Demo Web Shop. Search | `/search?q=<term>` | Search results plus advanced search form | Public |
| Demo Web Shop. Computing and Internet | `/computing-and-internet` | Product detail (simple product, book) | Public |
| (product) | `/health`, `/25-virtual-gift-card` | Product detail pages that have "Add to wishlist" | Public |
| (product) | `/build-your-own-computer` | Configurable product; the home "Add to cart" button navigates here instead of adding | Public |
| Demo Web Shop. Login | `/login/checkoutasguest?returnUrl=%2Fcart` | Sign-in step reached from cart Checkout as a guest: "Checkout as Guest", "Register", "Log in" | Public |
| Checkout | `/onepagecheckout` | One-page checkout (guest via "Checkout as Guest") | Guest or customer |
| My account pages | `/customer/info`, `/customer/orders`, `/customer/addresses`, `/customer/changepassword`, `/customer/downloadableproducts`, `/customer/rewardpoints` | As a guest each redirects to `/login?ReturnUrl=%2fcustomer%2f<page>` (final status 200). Signed in, they render (section 4.11) | **Requires login** |
| Demo Web Shop. Account | `/customer/info` | h1 "My account - Customer info" | Signed in |
| Demo Web Shop. Account | `/customer/addresses` | h1 "My account - Addresses"; "No addresses"; button "Add new" | Signed in |
| Demo Web Shop. Account | `/customer/orders` | h1 "My account - Orders"; "No orders" | Signed in |
| Demo Web Shop. Account | `/customer/changepassword` | h1 "My account - Change password" | Signed in |
| Demo Web Shop. Account | `/customer/rewardpoints` | h1 "My account - Reward points" | Signed in |
| (did not load) | `/customer/downloadableproducts` | Signed in: no `h1` within 20 s (twice) and 45 s (once). Did not finish rendering | Signed in |
| Demo Web Shop. Back in stock subscriptions | `/customer/backinstocksubscriptions` | h1 "My account - Back in stock subscriptions"; rendered for a guest (no redirect) and when signed in: "You are not currently subscribed to any Back In Stock notification lists" | Public / signed in |
| (redirect) | `/logout` | Signs out and lands on `/` | Signed in |
| `/onepagecheckout` direct (guest, empty cart) | redirects to `/cart` | | |

Header links (guest): "Register" `/register`, "Log in" `/login`, "Shopping cart (n)" `/cart`, "Wishlist (n)" `/wishlist`.
Header links (signed in): `<account email>` `/customer/info` (class `account`), "Log out" `/logout` (class `ico-logout`), "Shopping cart (n)" `/cart`, "Wishlist (n)" `/wishlist`. "Register" and "Log in" are absent.
Top menu: Books, Computers, Electronics, Apparel & Shoes, Digital downloads, Jewelry, Gift Cards. The same names appear again in the left "Categories" block.
Footer: Sitemap, Shipping & Returns, Privacy Notice, Conditions of Use, About us, Contact us, Search, News, Blog, Recently viewed products, Compare products list, New products, My account, Orders, Addresses, Shopping cart, Wishlist. These were not visited by the probes; they are listed only because the crawl saw them.

## 4. Pages, forms and observed behaviour

### 4.1 Login (`/login`, POST `/login`)

Fields: `Email` (text, label "Email:"), `Password` (password, label "Password:"), `RememberMe` (checkbox, label "Remember me?"). Button "Log in" (submit). Link "Forgot password?". Button "Register" (new-customer panel). There are no `required` or `maxlength` attributes and no `data-val` attributes on the login inputs.

| Probe | Action | Observed (exact) | URL after |
| --- | --- | --- | --- |
| p1 | Submit with both fields empty | Summary: "Login was unsuccessful. Please correct the errors and try again." / "No customer account found" (server round trip, no field-level message) | `/login` |
| p1 | Unknown email `not-a-registered-user-zz9@example.com` + `wrong-password-123` | "Login was unsuccessful. Please correct the errors and try again." / "No customer account found" | `/login` |
| p1 | Email `abc`, then blur | Field message under Email: "Please enter a valid email address." (client-side; submitting keeps it and does not show a summary) | `/login` |
| p5 | `existingUser` email + `wrong-password-123` | "Login was unsuccessful. Please correct the errors and try again." / "The credentials provided are incorrect" | `/login` |
| p5, p6 | `existingUser` email + the **old** stored password (before the fix) | "Login was unsuccessful. Please correct the errors and try again." / "The credentials provided are incorrect"; POST status 200; header still shows "Register" and "Log in" | `/login` |
| a1, a2, a3 | `existingUser` email + the corrected stored password | Success. Header link `.header-links .account` text equals the account email; "Log out" link visible; "Log in"/"Register" gone | `/` |

Interpretation, limited to what was observed: the two server messages differ for an unknown email ("No customer account found") and the `existingUser` email ("The credentials provided are incorrect"). The stored password was rejected. p6 confirmed that the stored email filled exactly with no whitespace and that the password field held 8 characters. Login was not retried further, to avoid any lockout. The coordinator later corrected the credential, and the a-series probes succeeded (section 4.11).

### 4.2 Register (`/register`, POST)

| Field | id | Type | Label | Client rules (data-val) |
| --- | --- | --- | --- | --- |
| Gender | `gender-male` / `gender-female` | radio | "Male" / "Female" | none |
| First name | `FirstName` | text | "First name:" | required: "First name is required." |
| Last name | `LastName` | text | "Last name:" | required: "Last name is required." |
| Email | `Email` | text | "Email:" | required: "Email is required."; email: "Wrong email" |
| Password | `Password` | password | "Password:" | required: "Password is required."; length min 6 max 999: "The password should have at least 6 characters." |
| Confirm password | `ConfirmPassword` | password | "Confirm password:" | required: "Password is required."; equalto Password: "The password and confirmation password do not match." |

No `maxlength` attribute on any field. Button "Register" (`#register-button`).

| Probe | Action | Observed (exact) |
| --- | --- | --- |
| p1 | Empty submit | Client-side (stays on `/register`, no summary): FirstName "First name is required.", LastName "Last name is required.", Email "Email is required.", Password "Password is required.", ConfirmPassword "Password is required." |
| p1 | Email `not-an-email`, password `abc`, confirm `abd`, blur | Email "Wrong email"; Password "The password should have at least 6 characters."; ConfirmPassword "The password and confirmation password do not match." |
| p1 | Password `abcdef`, confirm `abcdeg` | ConfirmPassword "The password and confirmation password do not match." (the length message disappears) |
| p7 | Valid form with the `existingUser` email (email already exists; no account created) | Summary: "The specified email already exists"; URL stays `/register`; header still guest |

### 4.3 Header search and the search page

- Header search: `input#small-searchterms` (name `q`, `value="Search store"` used as a pseudo-placeholder, no `placeholder` attribute, no label or aria-label, jQuery UI autocomplete). Button "Search". The form uses GET `/search`.
- Autocomplete (typing `comp`, p1) shows: "Build your own cheap computer", "Build your own computer", "Build your own expensive computer", "Computing and Internet", "Copy of Computing and Internet EX", "Simple Computer", "TCP Public Complete".

| Probe | Input | Observed |
| --- | --- | --- |
| p1 | `computer` | URL `/search?q=computer`, title "Demo Web Shop. Search", h1 "Search"; 4 results: "Build your own cheap computer", "Build your own computer", "Build your own expensive computer", "Simple Computer"; no pager |
| p1 | `zzqxnotfound` | `/search?q=zzqxnotfound`, 0 items, message "No products were found that matched your criteria." |
| p1 | `ab` (header) / `a` (direct URL) | Message "Search term minimum length is 3 characters" |
| p1 | Empty, or the untouched default "Search store" value | Native JS `alert`: "Please enter some search keyword"; no navigation (stays `/`) |

Search page form: "Search keyword:" `#Q` (text), "Advanced search" `#As` (checkbox). Hidden until Advanced search is ticked: "Category:" `#Cid`, "Automatically search sub categories" `#Isc`, "Manufacturer:" `#Mid`, price from/to `#Pf`/`#Pt` (no label), "Search In product descriptions" `#Sid`. The page has **2** "Search" buttons (header and page form).

### 4.4 Category listing (`/books`, p2)

Controls (all `<select>` elements without an accessible name; the visible text "View as", "Sort by", "Display … per page" sits in sibling `<span>`s). Each `onchange` triggers a full navigation via `setLocation`.

| Control | id | Options | URL param |
| --- | --- | --- | --- |
| View as | `#products-viewmode` | Grid (default), List | `viewmode=grid/list` |
| Sort by | `#products-orderby` | Position (default), Name: A to Z, Name: Z to A, Price: Low to High, Price: High to Low, Created on | `orderby=0/5/6/10/11/15` |
| Display per page | `#products-pagesize` | 4, 8 (default), 12 | `pagesize=` |
| Filter by price (links) | n/a | "Under 25.00" (`?price=-25`), "25.00 - 50.00" (`?price=25-50`), "Over 50.00" (`?price=50-`) | `price=` |

Observed results:
- Default (Position): Computing and Internet 10.00, Copy of Computing and Internet EX 10.00, Fiction 24.00, Fiction EX 24.00, Health Book 10.00, Science 51.00. Old prices also show (e.g. "30.00 10.00").
- Price: Low to High (`?orderby=10`): 10.00, 10.00, 10.00, 24.00, 24.00, 51.00.
- Name: Z to A (`?orderby=6`): Science, Health Book, Fiction EX, Fiction, Copy of Computing and Internet EX, Computing and Internet.
- Page size 4: 4 items; pager "1 2 Next"; link `Next` goes to `&pagenumber=2`; page 2 shows 2 items with pager "Previous 1 2".
- View List: `.product-list` is present and `.product-grid` is absent.
- "Under 25.00": 5 products (Science 51.00 excluded); the filter block shows "Under 25.00" and a "Remove Filter" link.
- Listing "Add to cart" buttons exist only for some products (3 of 6 on `/books`).

### 4.5 Product detail (`/computing-and-internet`, `/health`; p2, p3, p4)

- h1 "Computing and Internet"; "Price: 10.00"; "Old price: 30.00"; "Availability: In stock".
- Qty input `#addtocart_13_EnteredQuantity` (name `addtocart_13.EnteredQuantity`, label "Qty:", default `1`).
- Buttons in `.overview`: "Add to cart" (`#add-to-cart-button-13`), "Email a friend", "Add to compare list". **No "Add to wishlist"** on this product. "Add to wishlist" was present on `/health` and `/25-virtual-gift-card`, and absent on `/fiction`, `/science`, `/141-inch-laptop`, `/blue-jeans`. `/science` has no Add to cart.
- The page contains **6** "Add to cart" buttons (main product plus related or also-purchased products), so the button must be scoped to `.overview`.

| Probe | Action | Notification bar `#bar-notification` (exact) | Header |
| --- | --- | --- | --- |
| p3 | Add to cart, qty 1 | "The product has been added to your shopping cart" (class `bar-notification success`, link "shopping cart" to `/cart`, close icon `.close`) | "Shopping cart (1)" |
| p4 | `/health` Add to wishlist | "The product has been added to your wishlist" (success; link "wishlist" to `/wishlist`) | "Wishlist (1)" |
| p4 | Qty `0` then Add to cart | "Quantity should be positive" (class `bar-notification error`) | unchanged (0) |
| p4 | Qty `abc` then Add to cart | "Quantity should be positive" (error) | unchanged (0) |
| p4 | `/books` first listing "Add to cart" | "The product has been added to your shopping cart" | (1) |
| p4 | Home "Add to cart" on "Build your own computer" | No bar; navigates to `/build-your-own-computer` (h1 "Build your own computer") | n/a |

### 4.6 Shopping cart (guest; p3, p4)

Table columns: "Remove", "Product(s)", "Price", "Qty.", "Total". Row example: "Computing and Internet 10.00 [1] 10.00".
Totals block: "Sub-Total: 10.00", "Shipping: 0.00", "Tax: 0.00", "Total: 10.00".

| Element | Markup | Accessible name |
| --- | --- | --- |
| Remove checkbox | `input[name=removefromcart]` | none |
| Qty input | `input.qty-input`, name `itemquantity<cartItemId>` (dynamic id) | none |
| Update shopping cart | submit `name=updatecart` | "Update shopping cart" |
| Continue shopping | submit `name=continueshopping` | "Continue shopping" |
| Discount code | `input[name=discountcouponcode]` | none ("Enter your coupon here" is plain text) |
| Apply coupon | submit | "Apply coupon" |
| Gift card code | `input[name=giftcardcouponcode]` | none |
| Add gift card | submit | "Add gift card" |
| Country | `select#CountryId` | "Country:" (default "Select country", red `*`) |
| State / province | `select#StateProvinceId` | "State / province:" (default "Other (Non US)") |
| Zip | `input#ZipPostalCode` | "Zip / postal code:" |
| Estimate shipping | submit | "Estimate shipping" |
| Terms of service | `input#termsofservice` | **none**. The text "I agree with the terms of service and I adhere to them unconditionally" is not a `<label>`; "(read)" is a `span` that opens a popup window `/t-popup/conditionsofuse` |
| Checkout | button | "Checkout" |

| Probe | Action | Observed (exact) |
| --- | --- | --- |
| p3 | Checkout without ticking terms | jQuery UI dialog (role `dialog`, title "Terms of service"): "Please accept the terms of service before the next step." URL stays `/cart` |
| p3 | Estimate shipping with no country | Shipping options listed: "Ground (0.00)", "Next Day Air (0.00)", "2nd Day Air (0.00)", "In-Store Pickup (0.00)" with descriptions. No error |
| p3 | United States + Zip 10001 | Same four options, all 0.00. State list starts "AA (Armed Forces Americas)", "AE (Armed Forces Europe)", "Alabama", "Alaska" |
| p3 | Coupon `INVALIDCOUPON` | "The coupon code you entered couldn't be applied to your order" |
| p3 | Gift card `INVALIDGIFT` | "The coupon code you entered couldn't be applied to your order" (the same text as for coupons) |
| p3 | Qty 3 + Update | Row total 30.00; Sub-Total and Total 30.00; header "(3)" |
| p3 | Qty -1 + Update | Row removed (cart had no rows afterwards); no error message captured |
| p4 | Qty 0 + Update | Row removed; header "(0)"; no warning |
| p4 | Remove all | "Your Shopping Cart is empty!", header "(0)" |
| p7 | Ticked terms + Checkout (guest) | Navigates to `/login/checkoutasguest?returnUrl=%2Fcart`, h1 "Welcome, Please Sign In!", buttons "Checkout as Guest", "Register", "Log in" |

### 4.7 Wishlist (guest; p4)

- Empty: "The wishlist is empty!"
- With an item: columns "Remove", "Add to cart", "Product(s)", "Price", "Qty.", "Total"; row "Health Book 10.00 [1] 10.00"; buttons "Update wishlist", "Add to cart", "Email a friend"; text "Your wishlist URL for sharing:" followed by `http://demowebshop.tricentis.com/wishlist/<guid>` (http, not https).
- Tick Remove, then "Update wishlist": "The wishlist is empty!", header "Wishlist (0)".

### 4.8 Checkout (guest only; p7)

After "Checkout as Guest": URL `/onepagecheckout`, h1 "Checkout", steps "Billing Address", "Shipping Address", "Shipping Method", "Payment Method", "Payment Information", "Confirm Order". For the guest there is no `#billing-address-select`; the new-address form is shown directly.

| Field | id | Label | Required marker |
| --- | --- | --- | --- |
| First name | `BillingNewAddress_FirstName` | "First name:" | yes |
| Last name | `BillingNewAddress_LastName` | "Last name:" | yes |
| Email | `BillingNewAddress_Email` | "Email:" | yes |
| Company | `BillingNewAddress_Company` | "Company:" | no |
| Country | `BillingNewAddress_CountryId` (select) | "Country:" | yes |
| State / province | `BillingNewAddress_StateProvinceId` (select) | "State / province:" | no |
| City | `BillingNewAddress_City` | "City:" | yes |
| Address 1 | `BillingNewAddress_Address1` | "Address 1:" | yes |
| Address 2 | `BillingNewAddress_Address2` | "Address 2:" | no |
| Zip / postal code | `BillingNewAddress_ZipPostalCode` | "Zip / postal code:" | yes |
| Phone number | `BillingNewAddress_PhoneNumber` | "Phone number:" | yes |
| Fax number | `BillingNewAddress_FaxNumber` | "Fax number:" | no |

"Continue" button in `#billing-buttons-container` (exactly 1 visible "Continue" at this step).

Empty Continue (p7, client-side; the billing step stays open): "First name is required.", "Last name is required.", "Email is required.", "Country is required.", "City is required", "Street address is required", "Zip / postal code is required", "Phone is required". The last four messages have **no trailing period**. Email `not-an-email` gives "Wrong email".
The probe stopped at billing. The guest cart was then emptied ("Your Shopping Cart is empty!").

### 4.9 Mobile (375x812; p1, p2)

- `<meta name="viewport" content="width=device-width, initial-scale=1">`; no horizontal scroll (scrollWidth 375).
- The desktop `.top-menu` is hidden. A menu toggle `#mob-menu-button` (a `div` containing `<a href="">` with a hamburger icon and the text "Categories") is visible. Clicking it shows `.mob-top-menu` with BOOKS, COMPUTERS, ELECTRONICS, APPAREL & SHOES, DIGITAL DOWNLOADS, JEWELRY, GIFT CARDS.
- Header links (Register, Log in, Shopping cart(0), Wishlist(0)) and search stay visible.
- `getByRole('button', { name: /menu/i })` resolves to 0. The toggle is a link, not a button.

### 4.10 Accessibility quick notes (observed)

- `<html>` has no `lang` attribute (also `lang` empty in the crawl).
- The home page has no `h1`.
- Elements without an accessible name: header search input (its value "Search store" is not a name; `getByRole('textbox', { name: 'Search store' })` resolves to 0), newsletter email `#newsletter-email`, listing `<select>`s (`getByRole('combobox', { name: 'Sort by' })` resolves to 0), cart remove checkboxes, cart qty inputs, coupon and gift card inputs, the terms-of-service checkbox, and advanced-search price inputs.
- Register fields have no `aria-required` (the required state is conveyed only visually or by data-val).
- Validation for empty search uses a native `alert()`.
- No `img` without `alt` on the home page.

### 4.11 Signed-in flows (existingUser; probes a1, a2, a3, one login each)

**Initial account state (a1, before any change):** cart contained 1 row, "14.1-inch Laptop" qty 1 (not added by these probes); wishlist empty; header "Shopping cart (1)", "Wishlist (0)".

**Login and logout (a1)**
- After login the URL is `/`. The header shows the account email link (`/customer/info`), "Log out" (`/logout`), "Shopping cart (1)" and "Wishlist (0)". `getByRole('link', { name: 'Log in' })` and `{ name: 'Register' }` both resolve to 0.
- Reloading `/` keeps the session ("Log out" still present).
- Visiting `/login` while signed in renders the login page (h1 "Welcome, Please Sign In!") with no redirect, and the header still shows "Log out".
- Clicking "Log out" lands on `/` with header "Register", "Log in", "Shopping cart (0)", "Wishlist (0)". The guest cart is then empty, and `/customer/info` redirects to `/login?ReturnUrl=%2fcustomer%2finfo`.
- Back button after logout (three steps back: `/`, `/`, `/cart`): each page was re-requested (status 200, not from cache) and showed no "Log out" link and no account link. No cached signed-in content was observed.

**Customer info `/customer/info` (read only, a1)**: title "Demo Web Shop. Account", h1 "My account - Customer info", section "Your Personal Details". Fields: radio "Male" / "Female", "First name:" (required marker), "Last name:" (required marker), "Email:" (required marker); button "Save" (not clicked). Account navigation (`.block-account-navigation`): "Customer info", "Addresses", "Orders", "Downloadable products", "Back in stock subscriptions", "Reward points", "Change password".

- **Addresses `/customer/addresses`**: "No addresses" (empty `.address-list`, no `.no-data` element); button "Add new" (not clicked).
- **Orders `/customer/orders`**: "No orders" (empty `.order-list`).
- **Reward points `/customer/rewardpoints`**: "Your current balance is 0 reward points (0.00)." / "History" / "There is no balance history yet".
- **Back in stock subscriptions**: "You are not currently subscribed to any Back In Stock notification lists" (`.no-data`).
- **Downloadable products `/customer/downloadableproducts`**: did not render an `h1` within 20 s (a1, a2) or 45 s (a3).

**Change password `/customer/changepassword` (labels only; not submitted)**: h1 "My account - Change password".

| Field | id | Label | data-val messages |
| --- | --- | --- | --- |
| Old password | `OldPassword` | "Old password:" | required "Old password is required." |
| New password | `NewPassword` | "New password:" | required "New password is required."; length min 6 max 999 "The password should have at least 6 characters." |
| Confirm | `ConfirmNewPassword` | "Confirm password:" | required "Password is required."; equalto NewPassword "The new password and confirmation password do not match." |

Button "Change password". These messages come from data-val attributes; they were not triggered on screen.

**Wishlist (a1)**: on `/health`, "Add to wishlist" shows the bar "The product has been added to your wishlist" and the header changes to "Wishlist (1)". `/wishlist` (title "Demo Web Shop. Wishlist", h1 "Wishlist") has the same columns and buttons as the guest wishlist, and the share text "Your wishlist URL for sharing: http://demowebshop.tricentis.com/wishlist/<guid>". Remove + "Update wishlist" gives "The wishlist is empty!" and "Wishlist (0)".

**Cart persistence (a1 → a2)**: in a1, Health Book was added ("The product has been added to your shopping cart"), giving cart rows "14.1-inch Laptop", "Health Book". After logout the guest cart was empty. After a fresh login in a2 the header showed "Shopping cart (2)" and the cart held "14.1-inch Laptop" qty 1 and "Health Book" qty 1, so **the account cart persists across logout and login**. Health Book was then removed.

**Guest cart merge (a3)**: as a guest, "Computing and Internet" was added (guest cart: that 1 row). After login the header showed "Shopping cart (2)" and the cart held "14.1-inch Laptop" qty 1 and "Computing and Internet" qty 1, so **the guest cart is merged into the account cart on login**. Computing and Internet was then removed. After logout the guest cart was empty.

**Checkout signed in (a2, a3)**
- The cart Checkout without ticking terms shows the same dialog: "Please accept the terms of service before the next step."
- With terms ticked, Checkout goes **directly to `/onepagecheckout`** (h1 "Checkout"); the guest sign-in step (`/login/checkoutasguest`) is skipped. Steps: "Billing Address", "Shipping Address", "Shipping Method", "Payment Method", "Payment Information", "Confirm Order".
- Billing: **no `#billing-address-select`** (the account has no saved addresses). The new-address form is shown directly with the same 12 labels as the guest form (section 4.8). Prefill state: First name, Last name and Email prefilled; Country "Select country"; State / province "Other (Non US)"; Company, City, Address 1, Address 2, Zip / postal code, Phone number and Fax number empty.
- **Stopped at Billing Address**: continuing would save a new address to the account. Shipping address, shipping method, payment method, payment information and confirm were not observed for a signed-in user. Confirm was never clicked.
- Within the billing step, `getByRole('combobox')` resolves to 2 (Country and State).

**Final account state (a3, after cleanup)**: cart holds only the pre-existing "14.1-inch Laptop" qty 1 (left in place, because these probes did not add it); wishlist "The wishlist is empty!". No profile, address or password form was submitted.

### 4.12 Full checkout with Cash On Delivery

**Status.** User decision D3 allows one signed-in COD order. That order was **not placed**, for two reasons:
1. **Conflict:** nopCommerce checks out the whole cart. The account cart holds the pre-existing "14.1-inch Laptop" (1590.00), which D1 says must not be touched. A signed-in order would include the Laptop and remove it from the cart. A decision is needed: remove and re-add the Laptop, accept ordering it, or another option.
2. **Permission:** running the signed-in checkout probe (`c1-auth-to-confirm.mjs`, which saves a billing address to `existingUser` and stops before Confirm) was **denied by the environment's permission system** as a modification of a shared resource. That probe never ran: no login took place, no address was saved and the account was not touched.

The steps below were observed as a **guest**, with fictional data, up to the Confirm Order summary (probe `c2-guest-to-confirm.mjs`). **Confirm was not clicked**, and the guest cart was then emptied ("Your Shopping Cart is empty!"). Data used: First name "QA", Last name "Automation", Email `qa.guest@example.test`, Country "United States", State "New York", City "Testville", Address 1 "1 Test Street", Zip "10001", Phone "5550100".

Step order observed: the active `li` moved `#opc-billing` → `#opc-shipping` → `#opc-shipping_method` → `#opc-payment_method` → `#opc-payment_info` → `#opc-confirm_order`, one per Continue. No dialogs appeared and no validation errors were shown with valid data.

| Step (h2) | Fields and options (exact labels) | Default | Continue locator (count 1) |
| --- | --- | --- | --- |
| Billing Address | Guest: new-address form only (12 fields, section 4.8). Country options start "Select country", "United States", "Canada", "Afghanistan"…; State list loads by AJAX after choosing a country ("Other (Non US)" before). **No "Ship to the same address" checkbox** was present | Country "Select country", State "Other (Non US)" | `locator('#billing-buttons-container').getByRole('button', { name: 'Continue' })` |
| Shipping Address | Select `#shipping-address-select` (name `shipping_address_id`), label "Select a shipping address from your address book or enter a new address.", options "QA Automation, 1 Test Street, Testville 10001, United States", "New Address"; checkbox `#PickUpInStore` "In-Store Pickup" with text "Pick up your items at the store (put your store address here)"; link "Back" | The billing address just entered is preselected; In-Store Pickup unchecked | `locator('#shipping-buttons-container').getByRole('button', { name: 'Continue' })` |
| Shipping Method | Radios `name=shippingoption`: "Ground (10.00)" (`#shippingoption_0`), "Next Day Air (40.00)" (`#shippingoption_1`), "2nd Day Air (20.00)" (`#shippingoption_2`). Descriptions: "Compared to other shipping methods, like by flight or over seas, ground shipping is carried out closer to the earth", "The one day air shipping", "The two day air shipping"; link "Back" | Ground checked (also the cheapest; chosen) | `locator('#shipping-method-buttons-container').getByRole('button', { name: 'Continue' })` |
| Payment Method | Radios `name=paymentmethod`: "Cash On Delivery (COD) (7.00)" `#paymentmethod_0` value `Payments.CashOnDelivery`; "Check / Money Order (5.00)" `#paymentmethod_1` value `Payments.CheckMoneyOrder`; "Credit Card" `#paymentmethod_2` value `Payments.Manual`; "Purchase Order" `#paymentmethod_3` value `Payments.PurchaseOrder`; link "Back" | **COD checked by default** | `locator('#payment-method-buttons-container').getByRole('button', { name: 'Continue' })` |
| Payment Information | Text only: "You will pay by COD"; link "Back" | n/a | `locator('#payment-info-buttons-container').getByRole('button', { name: 'Continue' })` |
| Confirm Order | Summary (see below); product link "Health Book"; link "Back" | n/a | `locator('#confirm-order-buttons-container').getByRole('button', { name: 'Confirm' })` (1). **Not clicked** |

Each payment radio has **two** `<label for>` elements: a logo label wrapping an `<img alt="Cash On Delivery (COD) (7.00)">`, and a text label. `input.labels[0].innerText` is therefore empty. `locator('#opc-payment_method').getByLabel(/Cash On Delivery/)` resolves to exactly 1 and checks the COD radio. Verify the selection with the radio value `Payments.CashOnDelivery`.

**Confirm Order summary (guest, exact):**
- "Billing Address": "QA Automation", "Email: qa.guest@example.test", "Phone: 5550100", "Fax:", "1 Test Street", "Testville , New York 10001", "United States" (note the space before the comma).
- "Payment Method": "Cash On Delivery (COD)".
- "Shipping Address": same lines as billing.
- "Shipping Method": "Ground".
- Product table headers: (blank), "Product(s)", "Price", "Qty.", "Total"; row "Health Book 10.00 1 10.00".
- Totals: "Sub-Total: 10.00", "Shipping: (Ground) 10.00", "Payment method additional fee: 7.00", "Tax: 0.00", "Total: 27.00".

**Guest vs signed in (observed so far):** the guest goes through `/login/checkoutasguest` and "Checkout as Guest", while a signed-in user goes straight to `/onepagecheckout` (section 4.11). Both start with the new-address billing form when no address is saved; signed in, First name, Last name and Email are prefilled. The steps after Billing, the completion page, and the Orders list and details were **not observed signed in** (see status above).

**Guest COD order placed (probe `c3-guest-cod-order.mjs`, user decision D5, 2026-11-05).** Same guest data and steps as above. COD was verified as checked (`input[value="Payments.CashOnDelivery"]`) before Confirm. The Confirm summary payment method was "Cash On Delivery (COD)".
- Completion: URL `/checkout/completed/`, title "Demo Web Shop. Checkout", h1 **"Thank you"**, text **"Your order has been successfully processed!"**, "Order number: 2411222", link **"Click here for order details."** (`/orderdetails/<orderNumber>`), button "Continue". Screenshot: `probes/shots/c3-completion.png`.
- Guest order details `/orderdetails/2411222` (opened in the same guest session): h1 **"Order information"**, "Order #2411222", "Order Date: Thursday, November 5, 2026", **"Order Status: Pending"**, "Order Total: 27.00", Billing Address and Shipping Address as entered, "Payment Method Cash On Delivery (COD)", "Shipping Method Ground", product table "Name Price Quantity Total" with row "Health Book 10.00 1 10.00", totals "Sub-Total: 10.00", "Shipping: 10.00", "Payment method additional fee: 7.00", "Tax: 0.00", "Order Total: 27.00". Screenshot: `probes/shots/c3-order-details.png`.
- After the order the guest cart shows "Your Shopping Cart is empty!", so the cart is cleared by the order. No dialogs appeared.
- The order number is numeric (7 digits observed). Its format beyond that is not specified.
- Not observed: whether `/orderdetails/<id>` is reachable from a different session (an authorization question). Do not probe other people's orders.

## 5. Locator candidates

Verified counts come from the probes (`count()` = 1 unless noted).

| Element | Best locator (verified) | Fallback / note |
| --- | --- | --- |
| Header Register link | `getByRole('link', { name: 'Register' })` (1) | `.ico-register` |
| Header Log in link | `getByRole('link', { name: 'Log in' })` (1) | `.ico-login` |
| Header cart link + count | `getByRole('link', { name: /^Shopping cart\s*\(\d+\)$/ })` (1) | count text: `.header-links .cart-qty` |
| Header wishlist link + count | `getByRole('link', { name: /^Wishlist\s*\(\d+\)$/ })` (1) | `.header-links .wishlist-qty` |
| Header search input | `locator('#small-searchterms')` (1) | No label or placeholder; role+name fails (0) |
| Header search button | `getByRole('button', { name: 'Search' })` (1 on home) | **2 on `/search`**; scope to `.search-box` or use `.search-input` for the page form |
| Top menu category | `locator('.top-menu').getByRole('link', { name: 'Books', exact: true })` (1) | Unscoped name gives 2 (top menu + side block) |
| Login Email / Password / Remember | `getByLabel('Email:')`, `getByLabel('Password:')`, `getByLabel('Remember me?')` (1 each) | `#Email`, `#Password`, `#RememberMe` |
| Login button | `getByRole('button', { name: 'Log in' })` (1) | |
| Login error summary | `locator('.validation-summary-errors')` | No role; text assertion |
| Forgot password | `getByRole('link', { name: 'Forgot password?' })` (1) | |
| Register fields | `getByLabel('Male')`, `getByLabel('Female')`, `getByLabel('First name:')`, `getByLabel('Last name:')`, `getByLabel('Email:', { exact: true })`, `getByLabel('Password:', { exact: true })`, `getByLabel('Confirm password:')` (1 each) | `exact: true` needed because "Password:" also matches "Confirm password:" |
| Register button | `getByRole('button', { name: 'Register' })` (1) | `#register-button` |
| Field error by field | `locator('.field-validation-error[data-valmsg-for="Email"]')` | No role or association with the input |
| Search page keyword | `getByLabel('Search keyword:')` (1) | `#Q` |
| Advanced search | `getByLabel('Advanced search')` (1) | `#As` |
| Search results empty msg | `locator('.search-results')` text | |
| Sort / page size / view | `locator('#products-orderby')`, `#products-pagesize`, `#products-viewmode` | **No accessible name**; `getByRole('combobox')` gives 3 |
| Price filter | `getByRole('link', { name: 'Under 25.00' })` (1), `getByRole('link', { name: 'Remove Filter' })` (1) | |
| Pager | `locator('.pager').getByRole('link', { name: 'Next' })` (1), `{ name: '2', exact: true }` (1) | |
| Product title (PDP) | `getByRole('heading', { level: 1 })` (1) | |
| PDP qty | `getByLabel('Qty:')` (1) | id is product-specific (`#addtocart_13_EnteredQuantity`) |
| PDP Add to cart | `locator('.overview').getByRole('button', { name: 'Add to cart' })` (1) | **Unscoped gives 6**; `#add-to-cart-button-13` is product-specific |
| PDP Add to wishlist | `getByRole('button', { name: 'Add to wishlist' })` (1 on `/health`) | Absent on many products |
| PDP Add to compare / Email a friend | `getByRole('button', { name: 'Add to compare list' })`, `{ name: 'Email a friend' }` (1 each) | |
| Notification bar | `locator('#bar-notification')` (+ class `success`/`error`), close `#bar-notification .close` (1) | No role=status/alert observed |
| Listing Add to cart | `locator('.product-item', { hasText: '<name>' }).getByRole('button', { name: 'Add to cart' })` | |
| Cart table | `getByRole('table')` gives **2**; `getByRole('columnheader', { name: 'Product(s)' })` (1) | Scope rows by `.cart tbody tr` filtered by product name |
| Cart remove checkbox | `row.locator('input[name=removefromcart]')` | No accessible name |
| Cart qty | `row.locator('input.qty-input')` | No accessible name; name attribute is dynamic |
| Cart buttons | `getByRole('button', { name: 'Update shopping cart' | 'Continue shopping' | 'Checkout' | 'Estimate shipping' | 'Apply coupon' | 'Add gift card' })` (1 each) | |
| Terms checkbox | `locator('#termsofservice')` (1) | No label; `getByRole('checkbox')` gives 2 on a 1-item cart |
| TOS warning dialog | `getByRole('dialog', { name: 'Terms of service' })` (1) | `#terms-of-service-warning-box` |
| Estimate shipping fields | `getByLabel('Country:')`, `getByLabel('State / province:')`, `getByLabel('Zip / postal code:')` (1 each on cart) | |
| Coupon / gift card input | `locator('input[name=discountcouponcode]')`, `input[name=giftcardcouponcode]` | No label |
| Wishlist buttons | `getByRole('button', { name: 'Update wishlist' | 'Add to cart' | 'Email a friend' })` (1 each with one item) | |
| Checkout as Guest | `getByRole('button', { name: 'Checkout as Guest' })` (1) | |
| Billing fields (guest) | `locator('#billing-new-address-form').getByLabel('First name:', { exact: true })` etc. (1 each, verified for First/Last/Email/Country/City/Address 1/Zip/Phone) | `#BillingNewAddress_*` |
| Billing Continue | `locator('#billing-buttons-container').getByRole('button', { name: 'Continue' })` (1) | Later steps have their own containers (not verified) |
| Signed-in account link | `locator('.header-links .account')` (1) | Accessible name is the account email; `getByRole('link', { name: <email> })` works but ties the test to data |
| Log out link | `getByRole('link', { name: 'Log out' })` (1) | `.ico-logout` |
| Account navigation | `locator('.block-account-navigation').getByRole('link', { name: 'Addresses' })` (1) | Unscoped "Addresses" also matches the footer link |
| Customer info fields | `getByLabel('First name:', { exact: true })`, `getByLabel('Last name:', { exact: true })`, `getByLabel('Email:', { exact: true })`, `getByLabel('Male')`, `getByLabel('Female')` (1 each); `getByRole('button', { name: 'Save' })` (1) | `#FirstName`, `#LastName`, `#Email` |
| Change password fields | `getByLabel('Old password:')`, `getByLabel('New password:')`, `getByLabel('Confirm password:')` (1 each); `getByRole('button', { name: 'Change password' })` (1) | `#OldPassword`, `#NewPassword`, `#ConfirmNewPassword` |
| Signed-in billing form | `locator('#billing-new-address-form').getByLabel(...)` as for the guest; `#billing-address-select` absent when the account has no addresses | |
| Checkout step (active) | `locator('#opc-shipping.active')` etc.; ids `#opc-billing`, `#opc-shipping`, `#opc-shipping_method`, `#opc-payment_method`, `#opc-payment_info`, `#opc-confirm_order` | Step headings are `h2` inside `.step-title` |
| Step Continue buttons | `locator('#<step>-buttons-container').getByRole('button', { name: 'Continue' })` for `billing`, `shipping`, `shipping-method`, `payment-method`, `payment-info` (1 each, guest) | Unscoped `Continue` is ambiguous once several steps are rendered |
| Shipping address select | `getByLabel('Select a shipping address from your address book or enter a new address.')` (label observed) | `#shipping-address-select` |
| In-Store Pickup | `getByLabel('In-Store Pickup')` | `#PickUpInStore` |
| Shipping method radio | `getByLabel('Ground (10.00)', { exact: true })` (1) | `#shippingoption_0`; the price is part of the name |
| COD radio | `locator('#opc-payment_method').getByLabel(/Cash On Delivery/)` (1) | `input[name=paymentmethod][value="Payments.CashOnDelivery"]`; two labels per radio |
| Confirm button | `locator('#confirm-order-buttons-container').getByRole('button', { name: 'Confirm' })` (1) | Never clicked in discovery |
| Confirm summary blocks | `#opc-confirm_order .billing-info`, `.shipping-info`, `.cart`, `.cart-total` | No roles or landmarks |
| Mobile menu toggle | `locator('#mob-menu-button')` (verified visible and clickable) | Contains link text "Categories"; role locator not verified |

## 6. Console errors and failed requests

- Product pages: console `Failed to load resource: net::ERR_NAME_NOT_RESOLVED` for `https://s7.addthis.com/js/250/addthis_widget.js`. This delays `load` (see section 2).
- Crawl (12 pages): 0 console errors, 0 failed requests.
- No HTTP 4xx/5xx responses from the application origin were captured in the probes.

## 7. Not observed

- Signed-in Shipping Address to Confirm Order steps: not observed. The signed-in probe was denied by the environment's permission system (it saves an address to the shared account). The guest flow was observed up to the Confirm summary (4.12).
- Order placement, the completion page (URL, success text, order number), the Orders list item and `/orderdetails/<id>`: not observed. This requires clicking Confirm; it is pending the Laptop-in-cart decision and permission (4.12). Guest orders are not placed by design (A-COD-GUEST).
- "Ship to the same address" checkbox: not observed. It was absent on the guest billing step; the signed-in flow was not checked.
- Saved-address selection in checkout (`#billing-address-select`): not observed (the account has no addresses; creating one would change the profile).
- Downloadable products page content: not observed (the page did not finish rendering within 45 s).
- Order list or order details with data: not observed (the account has no orders).
- Submitting the customer info, address or change-password forms, and their on-screen validation: not observed (would change the profile, or would require submitting).
- Login with `ReturnUrl` (signing in from a protected-route redirect): not observed; not probed after the credential fix.
- "Remember me?" persistence across browser restarts: not observed.
- Successful registration: not observed (requires creating an account; disallowed).
- Forgot password / password recovery submission: not observed (requires sending an email).
- Newsletter subscribe, poll vote, Email a friend, Contact us, product reviews: not observed (they send messages or change shared data).
- Add to compare list and the compare page; recently viewed; product tags; manufacturer page; footer pages (Sitemap, News, Blog etc.): not probed.
- Configurable product ("Build your own computer") attribute validation: not probed.
- Valid discount or gift card codes: none known; not observed.
- Advanced search (category, manufacturer, price range) results: not probed.
- Firefox and WebKit behaviour: not probed (Chromium only).
- Rate limiting or account lockout after failed logins: not observed. Four failed sign-in attempts were made with the `existingUser` email before the credential fix (one deliberate wrong password and three with the old stored password). After the fix there were three successful logins and no failures.
