/* pharmacy-bd headless-Chrome smoke test (raw CDP, no deps).
 * Run: node tests/smoke.mjs  (from the pharmacy-bd folder)
 * Loads index.html over file://, drives the real UI, collects
 * console/page errors, asserts visible state at 1440px and 390px. */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const SHELL = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell';
const PAGE_URL = 'file:///home/hatch/workspace/muse-project-factory/builds/pharmacy-bd/index.html';
const PORT = 9229;

let pass = 0, fail = 0;
const errors = [];
const netReqs = [];
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

const chrome = spawn(SHELL, ['--headless', '--no-sandbox', '--disable-gpu',
  `--remote-debugging-port=${PORT}`, 'about:blank'], { stdio: 'ignore' });

async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(500);
  }
  throw new Error('headless_shell did not start');
}

let msgId = 0;
const pending = new Map();
let ws;
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evalJs(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('page exception: ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result.value;
}
async function click(selector) {
  await evalJs(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) throw new Error('missing ' + ${JSON.stringify(selector)}); e.click(); return true; })()`);
}
async function setVal(selector, value) {
  await evalJs(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); e.value = ${JSON.stringify(value)}; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
}

try {
  const wsUrl = await getWsUrl();
  ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m.result); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push('EXCEPTION: ' + JSON.stringify(m.params.exceptionDetails).slice(0, 300));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('CONSOLE.ERROR: ' + JSON.stringify(m.params.args).slice(0, 300));
    if (m.method === 'Network.requestWillBeSent') netReqs.push(m.params.request.url);
  };
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: PAGE_URL });
  await sleep(1500);
  // fresh storage so seeded samples are deterministic
  await evalJs(`localStorage.clear()`);
  await send('Page.navigate', { url: PAGE_URL });
  await sleep(1200);

  /* ---- dashboard with seeded samples ---- */
  check('title is Pharmacy BD', await evalJs(`document.title.includes('Pharmacy BD')`));
  check('7 seeded medicines', await evalJs(`document.querySelector('#statMeds').textContent`) === '7');
  check('348 units in stock', await evalJs(`document.querySelector('#statUnits').textContent`) === '348');
  check('stock value ৳8,386', await evalJs(`document.querySelector('#statValue').textContent`) === '৳8,386');
  check('1 expired', await evalJs(`document.querySelector('#statExpired').textContent`) === '1');
  check('2 expiring soon', await evalJs(`document.querySelector('#statExpiring').textContent`) === '2');
  check('0 low stock (expiring wins over low)', await evalJs(`document.querySelector('#statLow').textContent`) === '0');
  check('3 alerts listed', await evalJs(`document.querySelectorAll('#alertList li').length`) === 3);
  check('expired alert names Cetirizine', await evalJs(`document.querySelector('#alertList li.expired').textContent.includes('Cetirizine')`));

  /* ---- stock tab: search + add ---- */
  await click(`.tab[data-tab="stock"]`);
  await sleep(300);
  check('7 rows in stock table', await evalJs(`document.querySelectorAll('#stockBody tr').length`) === 7);
  await setVal('#searchInput', 'napa');
  await sleep(300);
  check('search "napa" -> 1 row', await evalJs(`document.querySelectorAll('#stockBody tr').length`) === 1);
  await setVal('#searchInput', '');
  await setVal('#catFilter', 'allergy');
  await sleep(300);
  check('category allergy -> 2 rows', await evalJs(`document.querySelectorAll('#stockBody tr').length`) === 2);
  await setVal('#catFilter', 'all');
  await sleep(300);
  await click('#addBtn');
  await sleep(200);
  await setVal('#fName', 'TestMed 100mg');
  await setVal('#fGeneric', 'TestGeneric');
  await setVal('#fBatch', 'TM-0001');
  await setVal('#fExpiry', '2027-12-31');
  await setVal('#fQty', '25');
  await setVal('#fPrice', '10');
  await setVal('#fLowAt', '5');
  await evalJs(`document.querySelector('#medForm').requestSubmit()`);
  await sleep(400);
  check('add medicine -> 8 rows', await evalJs(`document.querySelectorAll('#stockBody tr').length`) === 8);
  check('dashboard now 8 medicines', await evalJs(`document.querySelector('#statMeds').textContent`) === '8');

  /* ---- sell tab: sell 2 Napa, stock drops 120 -> 118 ---- */
  await click(`.tab[data-tab="sell"]`);
  await sleep(300);
  await evalJs(`(() => { const s = document.querySelector('#sMed'); s.value = 'm1'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  await setVal('#sQty', '2');
  await sleep(200);
  check('sell total shows ৳4', await evalJs(`document.querySelector('#sTotal').textContent`) === '৳4');
  await evalJs(`document.querySelector('#sellForm').requestSubmit()`);
  await sleep(400);
  check('sale recorded message shown', await evalJs(`!document.querySelector('#sellDone').hidden`));
  check("today's sales ৳4", await evalJs(`document.querySelector('#statToday').textContent`) === '৳4');
  await click(`.tab[data-tab="stock"]`);
  await sleep(300);
  check('Napa qty now 118', await evalJs(`(() => { const rows = [...document.querySelectorAll('#stockBody tr')]; const r = rows.find(x => x.textContent.includes('Napa')); return r ? r.children[3].textContent : 'missing'; })()`) === '118');
  await click(`.tab[data-tab="sales"]`);
  await sleep(300);
  check('sales log has 1 entry', await evalJs(`document.querySelectorAll('#salesList li').length`) === 1);
  check('sales entry shows Napa x2', await evalJs(`document.querySelector('#salesList li').textContent.includes('Napa')`));

  /* ---- oversell rejected ---- */
  await click(`.tab[data-tab="sell"]`);
  await sleep(300);
  await evalJs(`(() => { const s = document.querySelector('#sMed'); s.value = 'm1'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  await setVal('#sQty', '9999');
  await evalJs(`document.querySelector('#sellForm').requestSubmit()`);
  await sleep(400);
  check('oversell shows error', await evalJs(`document.querySelector('#sellErr').textContent.length > 0`));

  /* ---- language toggle ---- */
  await click('#langBtn');
  await sleep(400);
  check('title switches to Bengali', await evalJs(`document.querySelector('#appTitle').textContent`) === 'ফার্মেসি বিডি');
  check('dashboard label in Bengali', await evalJs(`document.querySelector('#statMeds').previousElementSibling.textContent`) === 'ওষুধ');
  await click('#langBtn');
  await sleep(400);
  check('title back to English', await evalJs(`document.querySelector('#appTitle').textContent`) === 'Pharmacy BD');

  /* ---- 390px mobile: no horizontal overflow ---- */
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(800);
  const overflow = await evalJs(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  check('390px no horizontal overflow', overflow <= 1, 'overflow=' + overflow);

  /* ---- errors + network ---- */
  check('zero console/page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
  const external = netReqs.filter((u) => !u.startsWith('file://') && !u.startsWith('data:'));
  check('zero non-file network requests', external.length === 0, external.join(', ').slice(0, 200));
} catch (e) {
  fail++;
  console.log('FAIL harness error — ' + e.message);
} finally {
  try { chrome.kill(); } catch { /* already dead */ }
  console.log(`\nSMOKE: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
