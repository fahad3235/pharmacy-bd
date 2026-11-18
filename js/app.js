/* pharmacy-bd — UI wiring. Depends on window.PHARMACY_DATA + PHARMACY_LOGIC. */
(function () {
  'use strict';
  var DATA = window.PHARMACY_DATA;
  var L = window.PHARMACY_LOGIC;
  var LS_KEY = 'pharmacy-bd-v1';
  var LANG_KEY = 'pharmacy-bd-lang';

  var lang = localStorage.getItem(LANG_KEY) || 'en';
  var state = load();

  function t(key) { return (DATA.I18N[lang] && DATA.I18N[lang][key]) || DATA.I18N.en[key] || key; }
  function catName(id) {
    var c = DATA.CATEGORIES.find(function (x) { return x.id === id; });
    return c ? (lang === 'bn' ? c.bn : c.en) : id;
  }
  function fmtN(n) { return L.fmtNum(n, lang); }
  function fmtTk(n) { return L.fmtTaka(n, lang); }

  function load() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var d = JSON.parse(raw);
        if (d && Array.isArray(d.medicines) && Array.isArray(d.sales) && L.validateImport(d).ok) return d;
      }
    } catch (e) { /* corrupt storage -> reseed */ }
    return seed();
  }

  function seed() {
    var today = L.todayStr();
    var meds = DATA.SAMPLE.map(function (s, i) {
      return {
        id: 'm' + (i + 1), name: s.name, generic: s.generic, category: s.category,
        batch: s.batch, expiry: L.addDays(today, s.expiryInDays),
        qty: s.qty, price: s.price, lowAt: s.lowAt
      };
    });
    var d = { medicines: meds, sales: [] };
    save(d);
    return d;
  }

  function save(d) {
    state = d;
    localStorage.setItem(LS_KEY, JSON.stringify(d));
  }

  function $(id) { return document.getElementById(id); }

  /* ---------- i18n ---------- */
  function applyLang() {
    document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    $('appTitle').textContent = t('appTitle');
    $('appSub').textContent = t('appSub');
    $('langBtn').textContent = t('langBtn');
    $('searchInput').placeholder = t('searchPh');
    $('formTitle').textContent = $('fId').value ? t('editMed') : t('addMed');
    document.querySelectorAll('.tab').forEach(function (b) {
      b.textContent = t('tab' + b.dataset.tab.charAt(0).toUpperCase() + b.dataset.tab.slice(1));
    });
    var cf = $('catFilter');
    var cur = cf.value || 'all';
    cf.innerHTML = '<option value="all">' + t('filterAll') + '</option>' +
      DATA.CATEGORIES.map(function (c) {
        return '<option value="' + c.id + '">' + (lang === 'bn' ? c.bn : c.en) + '</option>';
      }).join('');
    cf.value = cur;
    var fc = $('fCategory');
    fc.innerHTML = DATA.CATEGORIES.map(function (c) {
      return '<option value="' + c.id + '">' + (lang === 'bn' ? c.bn : c.en) + '</option>';
    }).join('');
    renderAll();
  }

  /* ---------- tabs ---------- */
  document.querySelectorAll('.tab').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('active'); });
      document.querySelectorAll('.panel').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      $('tab-' + b.dataset.tab).classList.add('active');
    });
  });

  /* ---------- dashboard ---------- */
  function renderDashboard() {
    var today = L.todayStr();
    var s = L.summarize(state.medicines, today);
    $('statMeds').textContent = fmtN(s.total);
    $('statUnits').textContent = fmtN(s.units);
    $('statValue').textContent = fmtTk(s.value);
    $('statLow').textContent = fmtN(s.low);
    $('statExpiring').textContent = fmtN(s.expiring);
    $('statExpired').textContent = fmtN(s.expired);
    var tToday = L.salesTotal(state.sales, today, today);
    $('statToday').textContent = fmtTk(tToday.total);
    var monthStart = today.slice(0, 8) + '01';
    var monthEnd = today.slice(0, 8) + '31';
    $('statMonth').textContent = fmtTk(L.salesTotal(state.sales, monthStart, monthEnd).total);

    var al = L.alerts(state.medicines, today);
    $('noAlerts').hidden = al.length > 0;
    $('alertList').innerHTML = al.map(function (a) {
      var m = state.medicines.find(function (x) { return x.id === a.id; });
      var txt;
      if (a.kind === 'expired') txt = t('alertExpired') + ' — ' + m.name;
      else if (a.kind === 'expiring') txt = m.name + ' — ' + t('alertExpiring') + ' ' + fmtN(a.days) + ' ' + t('days');
      else txt = m.name + ' — ' + t('alertLow') + ' (' + fmtN(m.qty) + ')';
      return '<li class="' + a.kind + '">' + escapeHtml(txt) + '</li>';
    }).join('');
  }

  /* ---------- stock ---------- */
  function renderStock() {
    var today = L.todayStr();
    var items = L.searchItems(state.medicines, $('searchInput').value, $('catFilter').value, $('alertsOnly').checked, today);
    $('noStock').hidden = state.medicines.length > 0;
    $('stockTable').style.display = items.length ? '' : 'none';
    $('stockBody').innerHTML = items.map(function (m) {
      var st = L.stockStatus(m, today);
      var d = L.daysToExpiry(m.expiry, today);
      var expTxt = m.expiry + (st === 'expired' ? ' (' + fmtN(-d) + ' ' + t('days') + ' ' + t('alertExpired') + ')'
        : st === 'expiring' ? ' (' + fmtN(d) + ' ' + t('days') + ')' : '');
      return '<tr>' +
        '<td>' + escapeHtml(m.name) + '<span class="sub">' + escapeHtml(m.generic) + ' • ' + escapeHtml(catName(m.category)) + '</span></td>' +
        '<td>' + escapeHtml(m.batch) + '</td>' +
        '<td>' + escapeHtml(expTxt) + '</td>' +
        '<td>' + fmtN(m.qty) + '</td>' +
        '<td>' + fmtTk(m.price) + '</td>' +
        '<td>' + fmtTk(m.qty * m.price) + '</td>' +
        '<td><span class="badge ' + st + '">' + t(st === 'ok' ? 'statusOk' : st === 'low' ? 'statusLow' : st === 'expiring' ? 'statusExpiring' : 'statusExpired') + '</span></td>' +
        '<td><button class="row-btn" data-edit="' + m.id + '">Edit</button>' +
        '<button class="row-btn del" data-del="' + m.id + '">' + t('del') + '</button></td>' +
        '</tr>';
    }).join('');
    $('stockBody').querySelectorAll('[data-edit]').forEach(function (b) {
      b.addEventListener('click', function () { openForm(b.getAttribute('data-edit')); });
    });
    $('stockBody').querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (confirm(t('confirmDelete'))) {
          save({ medicines: state.medicines.filter(function (m) { return m.id !== b.getAttribute('data-del'); }), sales: state.sales });
          renderAll();
        }
      });
    });
  }

  function openForm(id) {
    var f = $('medForm');
    f.hidden = false;
    $('formTitle').textContent = id ? t('editMed') : t('addMed');
    var m = id ? state.medicines.find(function (x) { return x.id === id; }) : null;
    $('fId').value = m ? m.id : '';
    $('fName').value = m ? m.name : '';
    $('fGeneric').value = m ? m.generic : '';
    $('fCategory').value = m ? m.category : 'pain';
    $('fBatch').value = m ? m.batch : '';
    $('fExpiry').value = m ? m.expiry : '';
    $('fQty').value = m ? m.qty : '';
    $('fPrice').value = m ? m.price : '';
    $('fLowAt').value = m ? m.lowAt : 10;
    ['eName', 'eGeneric', 'eBatch', 'eExpiry', 'eQty', 'ePrice', 'eLowAt'].forEach(function (x) { $(x).textContent = ''; });
    f.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    $('fName').focus();
  }

  $('addBtn').addEventListener('click', function () { openForm(null); });
  $('formCancel').addEventListener('click', function () { $('medForm').hidden = true; });
  $('searchInput').addEventListener('input', renderStock);
  $('catFilter').addEventListener('change', renderStock);
  $('alertsOnly').addEventListener('change', renderStock);

  $('medForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var m = {
      id: $('fId').value || ('m' + Date.now().toString(36)),
      name: $('fName').value.trim(), generic: $('fGeneric').value.trim(),
      category: $('fCategory').value, batch: $('fBatch').value.trim(),
      expiry: $('fExpiry').value,
      qty: Number($('fQty').value), price: Number($('fPrice').value),
      lowAt: Number($('fLowAt').value)
    };
    var v = L.validateMedicine(m);
    var map = { name: 'eName', generic: 'eGeneric', batch: 'eBatch', expiry: 'eExpiry', qty: 'eQty', price: 'ePrice', lowAt: 'eLowAt' };
    var msgKey = { name: 'errName', generic: 'errGeneric', batch: 'errBatch', expiry: 'errExpiry', qty: 'errQtyNum', price: 'errPrice', lowAt: 'errLowAt' };
    Object.keys(map).forEach(function (k) { $(map[k]).textContent = v.errors[k] ? t(msgKey[k]) : ''; });
    if (!v.ok) return;
    var meds = state.medicines.slice();
    var idx = meds.findIndex(function (x) { return x.id === m.id; });
    if (idx >= 0) meds[idx] = m; else meds.push(m);
    save({ medicines: meds, sales: state.sales });
    $('medForm').hidden = true;
    renderAll();
  });

  /* ---------- sell ---------- */
  function renderSell() {
    var sel = $('sMed');
    var cur = sel.value;
    sel.innerHTML = state.medicines.map(function (m) {
      return '<option value="' + m.id + '">' + escapeHtml(m.name) + ' — ' + fmtTk(m.price) + ' (' + fmtN(m.qty) + ' ' + t('fQty').toLowerCase() + ')</option>';
    }).join('');
    if (cur && state.medicines.some(function (m) { return m.id === cur; })) sel.value = cur;
    updateSellTotal();
  }

  function updateSellTotal() {
    var m = state.medicines.find(function (x) { return x.id === $('sMed').value; });
    var q = Number($('sQty').value);
    if (!m) { $('sTotal').textContent = fmtTk(0); $('sStock').textContent = ''; return; }
    $('sTotal').textContent = fmtTk(isFinite(q) && q > 0 ? q * m.price : 0);
    $('sStock').textContent = '• ' + t('totalUnits') + ': ' + fmtN(m.qty);
  }
  $('sMed').addEventListener('change', updateSellTotal);
  $('sQty').addEventListener('input', updateSellTotal);

  $('sellForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    $('sellErr').textContent = '';
    $('sellDone').hidden = true;
    var qty = Number($('sQty').value);
    var res = L.applySale(state.medicines, $('sMed').value, qty);
    if (!res) {
      var chk = L.validateSale(state.medicines, $('sMed').value, qty);
      $('sellErr').textContent = chk.error === 'qty' ? t('errQty') : t('errStock');
      return;
    }
    save({ medicines: res.items, sales: [res.sale].concat(state.sales) });
    $('sellDone').hidden = false;
    $('sQty').value = 1;
    renderAll();
  });

  /* ---------- sales log ---------- */
  function renderSales() {
    var filter = $('salesDate').value;
    var list = filter ? state.sales.filter(function (s) { return s.date.slice(0, 10) === filter; }) : state.sales;
    $('noSales').hidden = list.length > 0;
    var tot = list.reduce(function (a, s) { return a + s.total; }, 0);
    $('salesSummary').textContent = fmtN(list.length) + ' • ' + fmtTk(tot);
    $('salesList').innerHTML = list.map(function (s) {
      var d = new Date(s.date);
      var when = d.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      return '<li><div><strong>' + escapeHtml(s.name) + '</strong> × ' + fmtN(s.qty) +
        '<div class="s-meta">' + escapeHtml(when) + '</div></div>' +
        '<div><strong>' + fmtTk(s.total) + '</strong> <button class="row-btn del" data-sale-del="' + s.id + '">' + t('del') + '</button></div></li>';
    }).join('');
    $('salesList').querySelectorAll('[data-sale-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-sale-del');
        var sale = state.sales.find(function (s) { return s.id === id; });
        if (!sale) return;
        var meds = state.medicines.map(function (m) {
          return m.id === sale.medId ? Object.assign({}, m, { qty: m.qty + sale.qty }) : m;
        });
        save({ medicines: meds, sales: state.sales.filter(function (s) { return s.id !== id; }) });
        renderAll();
      });
    });
  }
  $('salesDate').addEventListener('change', renderSales);
  $('salesClear').addEventListener('click', function () { $('salesDate').value = ''; renderSales(); });

  /* ---------- data ---------- */
  $('exportBtn').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify({ medicines: state.medicines, sales: state.sales }, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pharmacy-bd-backup.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  $('importBtn').addEventListener('click', function () { $('importFile').click(); });
  $('importFile').addEventListener('change', function () {
    var file = $('importFile').files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      $('importMsg').hidden = true; $('importErr').hidden = true;
      try {
        var data = JSON.parse(reader.result);
        var v = L.validateImport(data);
        if (!v.ok) throw new Error(v.error);
        save({ medicines: data.medicines, sales: data.sales });
        $('importMsg').textContent = t('importOk');
        $('importMsg').hidden = false;
        renderAll();
      } catch (e) {
        $('importErr').textContent = t('importBad');
        $('importErr').hidden = false;
      }
      $('importFile').value = '';
    };
    reader.readAsText(file);
  });
  $('eraseBtn').addEventListener('click', function () {
    var ans = prompt(t('eraseConfirm'));
    if (ans === 'DELETE') {
      localStorage.removeItem(LS_KEY);
      state = seed();
      renderAll();
    }
  });

  /* ---------- language ---------- */
  $('langBtn').addEventListener('click', function () {
    lang = lang === 'en' ? 'bn' : 'en';
    localStorage.setItem(LANG_KEY, lang);
    applyLang();
  });

  function renderAll() { renderDashboard(); renderStock(); renderSell(); renderSales(); }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  applyLang();
})();
