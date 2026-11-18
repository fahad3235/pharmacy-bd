# pharmacy-bd — TEST RESULTS (run #376, 2026-11-18, 17:00 slot)

## Unit tests — 11/11 pass
Command: `node tests/test.js`
- data: 8 categories, 7 samples, i18n en/bn keys match, none empty
- daysToExpiry: 0 on expiry day, negative after, 30-day boundary
- validateMedicine: accepts good, rejects each bad field (name, generic, batch, expiry, qty, price, lowAt)
- stockStatus: expired > expiring (≤30d) > low > ok, incl. 30/31-day boundary and qty == lowAt
- summarize + alerts: counts and sort order (expired, expiring, low); 13 days to 2026-12-01
- sale: validates qty/stock, applies and totals (2 × ৳2 = ৳4... test uses qty 10 → ৳20), input not mutated
- salesTotal: date-range sums (today ৳100, month ৳350, empty range ৳0)
- searchItems: name/generic/batch, category, alerts-only
- validateImport: accepts good file, rejects null/array/missing arrays/bad medicine/duplicate id/bad sale
- Bengali digits + taka formatting (2026 → ২০২৬, ৳1,250 → ৳১,২৫০)
- addDays: rolls over month boundary

One repair during testing: `colActions` i18n value was an empty string, which the
key-parity test correctly flagged — set to "Actions" / "কাজ". No app bug.

## Headless-Chrome smoke — 27/27 pass
Command: `node tests/smoke.mjs` (raw CDP, headless_shell-1187, file://)
Seeded dashboard verified by hand through the real UI:
- 7 medicines, 348 units, stock value ৳8,386, 1 expired, 2 expiring soon, 0 low
- 3 alerts listed; expired alert names Cetirizine
- search "napa" → 1 row; category allergy → 2 rows
- add medicine → 8 rows, dashboard 8 medicines
- sell 2 × Napa → total ৳4, sale recorded, today's sales ৳4, Napa qty 120 → 118
- sales log has 1 entry (Napa ×2)
- oversell (9,999) rejected with error message
- EN → বাংলা toggle (title ফার্মেসি বিডি, label ওষুধ) and back
- 390px mobile: no horizontal overflow
- 0 console/page errors, 0 non-file network requests

## Live verification (after push)
- Repo: https://github.com/fahad3235/pharmacy-bd
- Pages: https://fahad3235.github.io/pharmacy-bd/ — HTTP 200 (to be confirmed after Pages enable)
