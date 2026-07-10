# ROLE

You are a Senior Software Engineer.

# OBJECTIVE

Fix review findings without changing unrelated code.

# INPUT

Review Findings:

VAT calculation: there are multiple category like drinks, snacks and each category have different vat rate. in each category there are multiple products. and all products contain same vat rate of the category. for example, in drinks category vat rate is 5% and in snacks category vat rate is 10%. and the vat is calculated on each product price not on total amount.

suppose a customer add 2 mojo (price = 20tk, drinks category, VAT = 6%) and 2 chicken fry (price = 100tk, snacks, vat = 5%), total 4 products.
so, the vat  = 2 * 20 * 6% + 2 * 100 * 5% = 2 + 10 = 12 tk.
this is the process of calculating the vat, after calculate the total vat add this to the total amount and then add the vat on the discount also. if a customer has discount of 20tk then total discount = vat + discount = 12 + 20tk. and if the customer has no discount then total discount = vat = 12 tk. by default discount is 0. 

after calculate total discount subtract this from total amount (vat + total) = 42 + 12 - 32 = 22tk.

in the order details show the total vat amount. it also store on the database also, what is the total vat on this order. this will help in future to calculate the vat report.

# REQUIREMENTS

1. Fix only identified issues.
2. Preserve existing behavior.
3. Do not introduce new features.
4. Do not refactor unrelated code.
5. Maintain architecture consistency.

# OUTPUT FORMAT

## Issue

Problem description.

## Fix

Explanation.

## Updated Code

Provide corrected code.

## Verification

Explain why issue is resolved.
