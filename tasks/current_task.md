# Current Task

## Status: Complete

### Bill / Receipt Generation (Template + Endpoint)

**What was done:**
- Enhanced `renderBillHtml()` in `backend/src/modules/orders/orders.service.ts` to produce a full thermal-receipt-style bill with:
  - Header: logo, restaurant name, address, phone, BIN/Mushak (from Settings)
  - Bill info: table, waiter, staff, date/time, invoice, customer
  - Items table with qty, name, unit price, line total
  - Totals: subtotal, discount, VAT (conditional on vatInfo.bin + taxAmount > 0), auto-round (display-only), grand total
  - Payments: method, cash tendered, returned amount
  - Footer: "Thank you, come again!"
  - Receipt-optimized CSS with print styles
- Updated `getOrderBill()` to fetch the `Settings` singleton and pass it to `renderBillHtml`
- Updated `BillView.tsx` frontend component (already existed with preview/print/download)
- All 146 backend tests pass, both apps compile clean with `tsc --noEmit`

**Open items resolved:**
1. VAT line: conditionally rendered when `vatInfo.bin` populated AND `taxAmount > 0`
2. Auto Round: display-only `Math.round(grandTotal) - grandTotal`, no schema change
3. Cash payment: `cashTendered`/`changeAmount` already on Order model
4. Settings BIN/Mushak: already on Settings model as `vatInfo.bin`/`vatInfo.mushak`

**Files changed:**
- `backend/src/modules/orders/orders.service.ts` (renderBillHtml, getOrderBill)
- `backend/tests/orders.test.ts` (tests + Settings mock)
