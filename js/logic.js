/* pharmacy-bd — pure logic: validation, stock status, sales, import.
 * Works in Node (module.exports) and in the browser (window.PHARMACY_LOGIC).
 * Dates are handled as local YYYY-MM-DD strings; "today" is injected so
 * tests can pin it. No DOM, no localStorage here. */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.PHARMACY_LOGIC = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var EXPIRING_SOON_DAYS = 30;
  var BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function todayStr(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function addDays(dateStr, n) {
    var p = dateStr.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    d.setDate(d.getDate() + n);
    return todayStr(d);
  }

  function isValidDateStr(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var p = s.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.getFullYear() === +p[0] && d.getMonth() === +p[1] - 1 && d.getDate() === +p[2];
  }

  /* Whole days from todayStr to expiryStr. Negative = already expired.
   * Expiry "2026-11-20" means the pack is good through that day, so
   * daysToExpiry == 0 on the expiry date itself. */
  function daysToExpiry(expiryStr, today) {
    var a = new Date(today + 'T00:00:00');
    var b = new Date(expiryStr + 'T00:00:00');
    return Math.round((b - a) / 86400000);
  }

  function isWhole(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }

  function validateMedicine(m) {
    var errors = {};
    if (!m || typeof m.name !== 'string' || m.name.trim().length < 2 || m.name.trim().length > 60) errors.name = 'name';
    if (!m || typeof m.generic !== 'string' || m.generic.trim().length < 2 || m.generic.trim().length > 60) errors.generic = 'generic';
    if (!m || typeof m.batch !== 'string' || m.batch.trim().length < 1 || m.batch.trim().length > 30) errors.batch = 'batch';
    if (!m || !isValidDateStr(m.expiry)) errors.expiry = 'expiry';
    if (!m || !isWhole(m.qty) || m.qty < 0 || m.qty > 1000000) errors.qty = 'qty';
    if (!m || typeof m.price !== 'number' || !isFinite(m.price) || m.price < 0 || m.price > 1000000) errors.price = 'price';
    if (!m || !isWhole(m.lowAt) || m.lowAt < 0 || m.lowAt > 100000) errors.lowAt = 'lowAt';
    if (!m || typeof m.category !== 'string' || !m.category) errors.category = 'category';
    return { ok: Object.keys(errors).length === 0, errors: errors };
  }

  /* Status priority: expired beats expiring beats low stock. */
  function stockStatus(m, today) {
    var d = daysToExpiry(m.expiry, today);
    if (d < 0) return 'expired';
    if (d <= EXPIRING_SOON_DAYS) return 'expiring';
    if (m.qty <= m.lowAt) return 'low';
    return 'ok';
  }

  function summarize(items, today) {
    var s = { total: items.length, units: 0, value: 0, low: 0, expiring: 0, expired: 0 };
    for (var i = 0; i < items.length; i++) {
      var m = items[i];
      s.units += m.qty;
      s.value += m.qty * m.price;
      var st = stockStatus(m, today);
      if (st === 'low') s.low++;
      else if (st === 'expiring') s.expiring++;
      else if (st === 'expired') s.expired++;
    }
    return s;
  }

  function alerts(items, today) {
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var m = items[i];
      var st = stockStatus(m, today);
      if (st === 'expired') out.push({ id: m.id, kind: 'expired', days: daysToExpiry(m.expiry, today) });
      else if (st === 'expiring') out.push({ id: m.id, kind: 'expiring', days: daysToExpiry(m.expiry, today) });
      else if (st === 'low') out.push({ id: m.id, kind: 'low', days: null });
    }
    out.sort(function (a, b) {
      var rank = { expired: 0, expiring: 1, low: 2 };
      if (rank[a.kind] !== rank[b.kind]) return rank[a.kind] - rank[b.kind];
      return (a.days === null ? 9999 : a.days) - (b.days === null ? 9999 : b.days);
    });
    return out;
  }

  function validateSale(items, id, qty) {
    if (!isWhole(qty) || qty < 1) return { ok: false, error: 'qty' };
    var m = null;
    for (var i = 0; i < items.length; i++) if (items[i].id === id) m = items[i];
    if (!m) return { ok: false, error: 'notfound' };
    if (qty > m.qty) return { ok: false, error: 'stock' };
    return { ok: true, error: null, total: qty * m.price, medicine: m };
  }

  /* Returns { items, sale } with stock reduced; does not mutate input. */
  function applySale(items, id, qty, when) {
    var check = validateSale(items, id, qty);
    if (!check.ok) return null;
    var next = items.map(function (m) {
      return m.id === id ? Object.assign({}, m, { qty: m.qty - qty }) : m;
    });
    var sale = {
      id: 's' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36),
      medId: id, name: check.medicine.name, qty: qty,
      price: check.medicine.price, total: check.total,
      date: (when || new Date()).toISOString()
    };
    return { items: next, sale: sale };
  }

  function salesTotal(sales, fromDateStr, toDateStr) {
    var sum = 0, count = 0;
    for (var i = 0; i < sales.length; i++) {
      var d = sales[i].date.slice(0, 10);
      if (d >= fromDateStr && d <= toDateStr) { sum += sales[i].total; count++; }
    }
    return { total: sum, count: count };
  }

  function searchItems(items, query, category, alertsOnly, today) {
    var q = (query || '').trim().toLowerCase();
    return items.filter(function (m) {
      if (category && category !== 'all' && m.category !== category) return false;
      if (alertsOnly && stockStatus(m, today) === 'ok') return false;
      if (!q) return true;
      return (m.name + ' ' + m.generic + ' ' + m.batch).toLowerCase().indexOf(q) !== -1;
    });
  }

  function validateImport(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'root' };
    if (!Array.isArray(data.medicines) || !Array.isArray(data.sales)) return { ok: false, error: 'shape' };
    var ids = {};
    for (var i = 0; i < data.medicines.length; i++) {
      var m = data.medicines[i];
      if (!m || typeof m.id !== 'string' || !m.id) return { ok: false, error: 'med-id' };
      if (ids[m.id]) return { ok: false, error: 'med-dup' };
      ids[m.id] = true;
      if (!validateMedicine(m).ok) return { ok: false, error: 'med-' + i };
    }
    for (var j = 0; j < data.sales.length; j++) {
      var s = data.sales[j];
      if (!s || typeof s.id !== 'string' || !s.id || typeof s.medId !== 'string' ||
          typeof s.name !== 'string' || !isWhole(s.qty) || s.qty < 1 ||
          typeof s.total !== 'number' || s.total < 0 ||
          typeof s.date !== 'string' || isNaN(Date.parse(s.date))) {
        return { ok: false, error: 'sale-' + j };
      }
    }
    return { ok: true, error: null };
  }

  function bnDigits(input) {
    return String(input).replace(/[0-9]/g, function (d) { return BN_DIGITS[+d]; });
  }

  function fmtNum(n, lang) {
    var s = Number(n).toLocaleString('en-US');
    return lang === 'bn' ? bnDigits(s) : s;
  }

  function fmtTaka(n, lang) {
    var s = '৳' + Number(n).toLocaleString('en-US');
    return lang === 'bn' ? bnDigits(s) : s;
  }

  return {
    EXPIRING_SOON_DAYS: EXPIRING_SOON_DAYS,
    todayStr: todayStr, addDays: addDays, isValidDateStr: isValidDateStr,
    daysToExpiry: daysToExpiry, validateMedicine: validateMedicine,
    stockStatus: stockStatus, summarize: summarize, alerts: alerts,
    validateSale: validateSale, applySale: applySale,
    salesTotal: salesTotal, searchItems: searchItems,
    validateImport: validateImport, bnDigits: bnDigits,
    fmtNum: fmtNum, fmtTaka: fmtTaka
  };
});
