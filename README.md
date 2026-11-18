# Pharmacy BD — Medicine Stock & Expiry Tracker

Offline, bilingual (English / বাংলা) medicine stock and expiry tracker for small pharmacies in Bangladesh. Runs entirely in the browser — no server, no account, no network requests. Data stays in the browser's localStorage.

## Problem

Small pharmacies track stock on paper or in their heads. Expired packs get sold by mistake, fast-moving medicines run out without warning, and the day's sales are forgotten by closing time. Pharmacy BD gives a shopkeeper one simple screen for all three: what is in stock, what is about to expire, and what was sold today.

## Features

- **Dashboard** — medicines count, units in stock, total stock value (৳), low-stock / expiring-soon / expired counts, today's sales and this month's sales.
- **Alerts** — expired packs, packs expiring within 30 days, and low-stock items, sorted worst-first (expired → expiring → low).
- **Stock management** — add, edit and delete medicines (name, generic, category, batch no., expiry date, quantity, unit price, low-stock level). Search by name, generic or batch; filter by category or alerts-only. Status badges: OK / Low stock / Expiring soon / Expired.
- **Sell** — record a sale in two taps; stock drops automatically, total is computed, overselling is rejected.
- **Sales log** — newest first, filter by date, totals shown; deleting a sale returns its quantity to stock.
- **Data** — JSON export (backup) and strict import (a bad file is rejected whole, existing data untouched); erase-all requires typing `DELETE`.
- **Bilingual** — full English / বাংলা toggle, persisted; Bengali digits in Bangla mode.
- **Offline-first** — zero network requests; works on desktop and 390px mobile.

Ships with 7 editable example medicines (example prices, not market prices) so the screens are useful on first open. Replace them with your real stock.

## Stack

- Plain HTML + CSS + JavaScript — no framework, no build step, no dependencies.
- `js/data.js` — categories, sample stock, EN/BN strings.
- `js/logic.js` — pure, tested logic (validation, expiry math, sales, import). Runs in Node and in the browser.
- `js/app.js` — UI wiring and localStorage persistence.
- Tests: `node:test` unit tests + a raw-CDP headless-Chrome smoke test.

## Prerequisites

Any modern browser. For the tests: Node.js 18+ and the headless Chromium shell used by the smoke test (see `tests/smoke.mjs` for the path).

## Install / run

```bash
# just open it — no install, no server needed
open index.html
# or serve locally
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Testing

```bash
node tests/test.js      # 11 unit tests (validation, expiry boundaries, sales, import, i18n)
node tests/smoke.mjs    # 27 headless-Chrome checks driving the real UI
```

Verified 2026-11-18 (run #377, 17:00 slot): 11/11 unit tests pass, 27/27 smoke checks pass, 0 console/page errors, 0 non-file network requests. Hand-verified in the smoke run: seeded dashboard (7 medicines, 348 units, ৳8,386 stock value, 1 expired, 2 expiring, 0 low), search "napa" → 1 row, adding a medicine → 8 rows, selling 2 × Napa → stock 120 → 118 and today's sales ৳4, oversell of 9,999 rejected, EN ↔ বাংলা toggle, 390px with no horizontal overflow.

## Deployment

Static site — publish the repo root on GitHub Pages (or any static host). Live site: https://fahad3235.github.io/pharmacy-bd/

## Limitations

- Data lives in one browser's localStorage — no sync across devices; export a JSON backup regularly.
- Expiry is tracked by the date you enter; always check the printed date on the pack before selling. This app does not verify medicine authenticity, safety, or dosage.
- Sample medicines and prices are examples only; enter your own stock and prices.
- No barcode scanning, no supplier ordering, no multi-user support.

## Status

Complete MVP — factory run #377 (2026-11-18, 17:00 slot). Published and verified.
