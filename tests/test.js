/* pharmacy-bd — node unit tests. Run: node tests/test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const DATA = require('../js/data.js');
const L = require('../js/logic.js');

const TODAY = '2026-11-18';
const good = {
  id: 'm1', name: 'Napa 500mg', generic: 'Paracetamol', category: 'pain',
  batch: 'NP-2401', expiry: '2027-05-01', qty: 120, price: 2, lowAt: 20
};

test('data: 8 categories, 7 samples, i18n en/bn keys match, none empty', () => {
  assert.equal(DATA.CATEGORIES.length, 8);
  assert.equal(new Set(DATA.CATEGORIES.map((c) => c.id)).size, 8);
  assert.equal(DATA.SAMPLE.length, 7);
  assert.equal(DATA.EXPIRING_SOON_DAYS, 30);
  const en = Object.keys(DATA.I18N.en).sort();
  assert.deepEqual(Object.keys(DATA.I18N.bn).sort(), en);
  for (const k of en) assert.ok(DATA.I18N.en[k].length > 0 && DATA.I18N.bn[k].length > 0, k);
});

test('daysToExpiry: 0 on expiry day, negative after, 30-day boundary', () => {
  assert.equal(L.daysToExpiry('2026-11-18', TODAY), 0);
  assert.equal(L.daysToExpiry('2026-11-19', TODAY), 1);
  assert.equal(L.daysToExpiry('2026-11-17', TODAY), -1);
  assert.equal(L.daysToExpiry('2026-12-18', TODAY), 30);
  assert.equal(L.daysToExpiry('2026-12-19', TODAY), 31);
});

test('validateMedicine: accepts good, rejects each bad field', () => {
  assert.equal(L.validateMedicine(good).ok, true);
  assert.equal(L.validateMedicine({ ...good, name: 'x' }).errors.name, 'name');
  assert.equal(L.validateMedicine({ ...good, name: '' }).errors.name, 'name');
  assert.equal(L.validateMedicine({ ...good, generic: '' }).errors.generic, 'generic');
  assert.equal(L.validateMedicine({ ...good, batch: '' }).errors.batch, 'batch');
  assert.equal(L.validateMedicine({ ...good, expiry: '2026-02-30' }).errors.expiry, 'expiry');
  assert.equal(L.validateMedicine({ ...good, expiry: '18-11-2026' }).errors.expiry, 'expiry');
  assert.equal(L.validateMedicine({ ...good, qty: -1 }).errors.qty, 'qty');
  assert.equal(L.validateMedicine({ ...good, qty: 1.5 }).errors.qty, 'qty');
  assert.equal(L.validateMedicine({ ...good, price: -5 }).errors.price, 'price');
  assert.equal(L.validateMedicine({ ...good, price: NaN }).errors.price, 'price');
  assert.equal(L.validateMedicine({ ...good, lowAt: -1 }).errors.lowAt, 'lowAt');
  assert.equal(L.validateMedicine({ ...good, lowAt: 2.5 }).errors.lowAt, 'lowAt');
});

test('stockStatus: expired > expiring (≤30d) > low > ok', () => {
  assert.equal(L.stockStatus({ ...good, expiry: '2026-11-17' }, TODAY), 'expired');
  assert.equal(L.stockStatus({ ...good, expiry: '2026-11-18' }, TODAY), 'expiring'); // 0 days
  assert.equal(L.stockStatus({ ...good, expiry: '2026-12-18' }, TODAY), 'expiring'); // 30 days
  assert.equal(L.stockStatus({ ...good, expiry: '2026-12-19' }, TODAY), 'ok'); // 31 days
  assert.equal(L.stockStatus({ ...good, expiry: '2027-05-01', qty: 20 }, TODAY), 'low'); // qty == lowAt
  assert.equal(L.stockStatus({ ...good, expiry: '2027-05-01', qty: 21 }, TODAY), 'ok');
  assert.equal(L.stockStatus({ ...good, expiry: '2026-11-17', qty: 1 }, TODAY), 'expired'); // expired wins over low
});

test('summarize + alerts: counts and sort order (expired, expiring, low)', () => {
  const items = [
    { ...good, id: 'a', expiry: '2027-06-01', qty: 100 },
    { ...good, id: 'b', expiry: '2026-11-10', qty: 50 },
    { ...good, id: 'c', expiry: '2026-12-01', qty: 50 },
    { ...good, id: 'd', expiry: '2027-06-01', qty: 5 }
  ];
  const s = L.summarize(items, TODAY);
  assert.equal(s.total, 4);
  assert.equal(s.units, 205);
  assert.equal(s.value, 100 * 2 + 50 * 2 + 50 * 2 + 5 * 2);
  assert.equal(s.expired, 1); assert.equal(s.expiring, 1); assert.equal(s.low, 1);
  const al = L.alerts(items, TODAY);
  assert.deepEqual(al.map((x) => x.id), ['b', 'c', 'd']);
  assert.equal(al[1].days, 13); // 2026-12-01 - 2026-11-18
});

test('sale: validates qty/stock, applies and totals', () => {
  assert.equal(L.validateSale([good], 'm1', 0).error, 'qty');
  assert.equal(L.validateSale([good], 'm1', 121).error, 'stock');
  assert.equal(L.validateSale([good], 'm1', 120).ok, true);
  assert.equal(L.validateSale([good], 'nope', 1).error, 'notfound');
  const res = L.applySale([good], 'm1', 10, new Date('2026-11-18T10:00:00Z'));
  assert.equal(res.items[0].qty, 110);
  assert.equal(good.qty, 120, 'input not mutated');
  assert.equal(res.sale.total, 20);
  assert.equal(res.sale.date.slice(0, 10), '2026-11-18');
  assert.equal(L.applySale([good], 'm1', 200), null);
});

test('salesTotal: date-range sums', () => {
  const sales = [
    { total: 100, date: '2026-11-18T09:00:00.000Z' },
    { total: 50, date: '2026-11-17T09:00:00.000Z' },
    { total: 200, date: '2026-11-02T09:00:00.000Z' }
  ];
  assert.deepEqual(L.salesTotal(sales, '2026-11-18', '2026-11-18'), { total: 100, count: 1 });
  assert.deepEqual(L.salesTotal(sales, '2026-11-01', '2026-11-30'), { total: 350, count: 3 });
  assert.deepEqual(L.salesTotal(sales, '2026-10-01', '2026-10-31'), { total: 0, count: 0 });
});

test('searchItems: name/generic/batch, category, alerts-only', () => {
  const items = [
    { ...good, id: 'a', name: 'Napa 500mg', generic: 'Paracetamol', batch: 'NP-1', category: 'pain', expiry: '2027-06-01', qty: 100 },
    { ...good, id: 'b', name: 'Seclo 20mg', generic: 'Omeprazole', batch: 'SC-2', category: 'gastric', expiry: '2027-06-01', qty: 100 }
  ];
  assert.deepEqual(L.searchItems(items, 'napa', 'all', false, TODAY).map((m) => m.id), ['a']);
  assert.deepEqual(L.searchItems(items, 'omeprazole', 'all', false, TODAY).map((m) => m.id), ['b']);
  assert.deepEqual(L.searchItems(items, 'sc-2', 'all', false, TODAY).map((m) => m.id), ['b']);
  assert.deepEqual(L.searchItems(items, '', 'gastric', false, TODAY).map((m) => m.id), ['b']);
  assert.deepEqual(L.searchItems(items, '', 'all', true, TODAY), []); // both ok
  const low = { ...good, id: 'c', expiry: '2027-06-01', qty: 1 };
  assert.deepEqual(L.searchItems(items.concat(low), '', 'all', true, TODAY).map((m) => m.id), ['c']);
});

test('validateImport: accepts good file, rejects bad shapes whole', () => {
  const okFile = { medicines: [good], sales: [{ id: 's1', medId: 'm1', name: 'Napa', qty: 2, price: 2, total: 4, date: '2026-11-18T10:00:00.000Z' }] };
  assert.equal(L.validateImport(okFile).ok, true);
  assert.equal(L.validateImport(null).ok, false);
  assert.equal(L.validateImport([]).ok, false);
  assert.equal(L.validateImport({ medicines: [good] }).ok, false);
  assert.equal(L.validateImport({ medicines: [{ ...good, qty: -1 }], sales: [] }).ok, false);
  assert.equal(L.validateImport({ medicines: [good, good], sales: [] }).ok, false); // duplicate id
  assert.equal(L.validateImport({ medicines: [good], sales: [{ id: 's1', qty: 0 }] }).ok, false);
});

test('Bengali digits + taka formatting', () => {
  assert.equal(L.bnDigits('2026'), '২০২৬');
  assert.equal(L.bnDigits('৳1,250'), '৳১,২৫০');
  assert.equal(L.fmtNum(1250, 'bn'), '১,২৫০');
  assert.equal(L.fmtNum(1250, 'en'), '1,250');
  assert.equal(L.fmtTaka(1250, 'bn'), '৳১,২৫০');
  assert.equal(L.fmtTaka(1250, 'en'), '৳1,250');
});

test('addDays: rolls over month boundary', () => {
  assert.equal(L.addDays('2026-11-18', 25), '2026-12-13');
  assert.equal(L.addDays('2026-11-18', -10), '2026-11-08');
});
