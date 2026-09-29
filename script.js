/* =========================================================
   Smart Rail – one script shared by every page.
   Each page sets <body data-page="..."> and the matching
   init function runs at the bottom of this file.

   Flow:  index.html -> trains.html -> booking.html
          -> confirm.html -> payment.html -> back to index.html
   Data is passed between pages with sessionStorage.
   Completed bookings and the logged-in user use localStorage.
   ========================================================= */

/* ---------- 1. Sample data (replace with your backend/API later) ---------- */
const STATIONS = [
  { city: 'Nagpur',    station: 'Ajni St.' },
  { city: 'Mumbai',    station: 'CSMT St.' },
  { city: 'Pune',      station: 'Pune Jn.' },
  { city: 'New Delhi', station: 'New Delhi St.' },
  { city: 'Kolkata',   station: 'Howrah Jn.' },
  { city: 'Chennai',   station: 'Chennai Central' },
  { city: 'Bengaluru', station: 'KSR Bengaluru' },
  { city: 'Hyderabad', station: 'Secunderabad Jn.' }
];

const CLASSES = {
  '1A': 'AC First Class (1A)',
  '2A': 'AC 2 Tier (2A)',
  '3A': 'AC 3 Tier (3A)',
  'SL': 'Sleeper (SL)'
};

const QUOTAS = ['General', 'Tatkal', 'Ladies', 'Senior Citizen'];

const CONCESSIONS = [
  { name: 'None', off: 0 },
  { name: 'Student', off: 0.25 },
  { name: 'Senior Citizen', off: 0.4 },
  { name: 'Divyangjan', off: 0.5 }
];

// dep = departure time, dur = journey length in minutes
const TRAINS = [
  { no: 'XS53T00', name: 'Golden Train', dep: '19:00', dur: 1020,
    fares: { '1A': 4200, '2A': 2450, '3A': 1750, 'SL': 650 },
    avail: { '1A': 'AVAILABLE 6', '2A': 'GNWL 14/ WL 65', '3A': 'AVAILABLE 42', 'SL': 'RAC 12' } },
  { no: '12139', name: 'Sahyadri Superfast', dep: '06:15', dur: 780,
    fares: { '1A': 3900, '2A': 2300, '3A': 1620, 'SL': 610 },
    avail: { '1A': 'GNWL 3/ WL 8', '2A': 'AVAILABLE 18', '3A': 'AVAILABLE 64', 'SL': 'AVAILABLE 120' } },
  { no: '22111', name: 'Konkan Link Express', dep: '09:40', dur: 900,
    fares: { '1A': 4050, '2A': 2380, '3A': 1690, 'SL': 630 },
    avail: { '1A': 'AVAILABLE 2', '2A': 'RAC 6', '3A': 'GNWL 22/ WL 40', 'SL': 'AVAILABLE 35' } },
  { no: '12289', name: 'Silver Arrow Duronto', dep: '20:50', dur: 690,
    fares: { '1A': 4600, '2A': 2750, '3A': 1980, 'SL': 720 },
    avail: { '1A': 'AVAILABLE 10', '2A': 'AVAILABLE 26', '3A': 'AVAILABLE 51', 'SL': 'GNWL 9/ WL 30' } },
  { no: '11401', name: 'Night Owl Express', dep: '22:10', dur: 1110,
    fares: { '1A': 3700, '2A': 2150, '3A': 1520, 'SL': 560 },
    avail: { '1A': 'GNWL 1/ WL 4', '2A': 'GNWL 14/ WL 65', '3A': 'RAC 20', 'SL': 'AVAILABLE 88' } },
  { no: '12105', name: 'Sunrise Mail', dep: '05:30', dur: 960,
    fares: { '1A': 3950, '2A': 2290, '3A': 1600, 'SL': 600 },
    avail: { '1A': 'AVAILABLE 4', '2A': 'AVAILABLE 12', '3A': 'AVAILABLE 30', 'SL': 'AVAILABLE 74' } },
  { no: '17641', name: 'Metro Link Express', dep: '13:20', dur: 1045,
    fares: { '1A': 3800, '2A': 2200, '3A': 1560, 'SL': 580 },
    avail: { '1A': 'AVAILABLE 8', '2A': 'GNWL 5/ WL 19', '3A': 'AVAILABLE 22', 'SL': 'RAC 4' } }
];

const MAX_SEATS = 6;
const INSURANCE_FEE = 800;

/* ---------- 2. Small helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Escape user-typed text before putting it inside innerHTML
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const fmt = (n) => Number(n).toLocaleString('en-IN') + ' Rs';

// sessionStorage = data for the current booking (cleared when the tab closes)
function store(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked */ }
}
function read(key, fallback) {
  try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch (e) { return fallback; }
}
// localStorage = data that should survive (user, finished bookings)
function storeLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked */ }
}
function readLocal(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch (e) { return fallback; }
}

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
function formatDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN',
    { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function addMinutes(time, mins) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const days = Math.floor(total / 1440);
  const rest = total % 1440;
  const hh = String(Math.floor(rest / 60)).padStart(2, '0');
  const mm = String(rest % 60).padStart(2, '0');
  return { time: `${hh}:${mm}`, days };
}
const formatDuration = (m) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
const stationOf = (city) => STATIONS.find((s) => s.city === city) || { city, station: city };

function defaultSearch() {
  return { from: 'Nagpur', to: 'Mumbai', quota: 'General', concession: 'None', date: todayISO() };
}

// Price per adult after quota and concession
function fareFor(train, cls, search) {
  let price = train.fares[cls];
  if (search.quota === 'Tatkal') price *= 1.3;
  const c = CONCESSIONS.find((x) => x.name === search.concession);
  if (c) price *= 1 - c.off;
  return Math.round(price);
}

// Same bill is used on confirm page and payment page
function computeBill(b) {
  const n = b.passengers.length;
  const fare = b.fare * n;
  const insurance = b.insurance ? INSURANCE_FEE : 0;
  const gst = Math.round(fare * 0.05);
  const overhead = 35 * n;
  const tax = Math.round(overhead * 0.18);
  return { fare, insurance, gst, overhead, tax, total: fare + insurance + gst + overhead + tax };
}

// Used when confirm/payment page is opened directly (for demo/testing)
function demoBooking() {
  const train = TRAINS[0];
  const search = defaultSearch();
  return {
    train, search, cls: '3A', fare: fareFor(train, '3A', search), insurance: false,
    passengers: [
      { name: 'Aarav Sharma', age: 28, gender: 'Male', berth: 'Lower' },
      { name: 'Diya Sharma', age: 26, gender: 'Female', berth: 'Upper' }
    ]
  };
}

/* ---------- 3. Modal + toast ---------- */
function openModal(html, onOpen) {
  let backdrop = $('#modalBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'modalBackdrop';
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = '<div class="modal" role="dialog" aria-modal="true"></div>';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
  }
  const modal = $('.modal', backdrop);
  modal.innerHTML = html;
  backdrop.classList.add('open');
  const first = $('input, select, button, a', modal);
  if (first) first.focus();
  if (onOpen) onOpen(modal);
}
function closeModal() {
  const backdrop = $('#modalBackdrop');
  if (backdrop) backdrop.classList.remove('open');
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

function toast(message) {
  let t = $('#toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    t.setAttribute('role', 'status');
    document.body.appendChild(t);
  }
  t.textContent = message;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ---------- 4. Navbar (buttons use data-action) ---------- */
const NAV_FOR_PAGE = { home: 'home', trains: 'train', booking: 'train' };

function initNavbar() {
  const current = NAV_FOR_PAGE[document.body.dataset.page];
  $$('[data-nav]').forEach((link) => {
    if (link.dataset.nav === current) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
  renderAuth();
}

// One click listener for every [data-action] button, on every page
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === 'close-modal') closeModal();
  if (action === 'food') toast('Food ordering on trains is coming soon.');
  if (action === 'loyalty') {
    const points = readLocal('bookings', []).length * 50;
    toast(`You have ${points} loyalty points. Every booking earns 50.`);
  }
  if (action === 'contact') {
    // Replace these placeholder details with your team's contact info
    openModal(`
      <h2>Contact us</h2>
      <p>Email: support@smartrail.example</p>
      <p>Helpline: 1800-000-0000</p>
      <p class="muted">We reply within 24 hours.</p>
      <div class="modal-actions"><button class="btn" data-action="close-modal">CLOSE</button></div>`);
  }
  if (action === 'login' || action === 'signup') openAuth(action);
  if (action === 'logout') {
    try { localStorage.removeItem('user'); } catch (err) { /* ignore */ }
    renderAuth();
    toast('You are logged out.');
  }
});

function renderAuth() {
  const box = $('#navAuth');
  if (!box) return;
  const user = readLocal('user', null);
  box.innerHTML = user
    ? `<span class="nav-user">Hi, ${esc(user.name)}</span>
       <button class="btn nav-btn" data-action="logout">LOGOUT</button>`
    : `<button class="btn nav-btn" data-action="login">LOGIN</button>
       <button class="btn nav-btn" data-action="signup">SIGNUP</button>`;
}

function openAuth(mode) {
  const signup = mode === 'signup';
  openModal(`
    <h2>${signup ? 'Create account' : 'Log in'}</h2>
    <form id="authForm" class="modal-form">
      ${signup ? '<label>Full name<input name="name" required autocomplete="name"></label>' : ''}
      <label>Email<input type="email" name="email" required autocomplete="email"></label>
      <label>Password<input type="password" name="password" required minlength="6"
             autocomplete="${signup ? 'new-password' : 'current-password'}"></label>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-action="close-modal">CANCEL</button>
        <button type="submit" class="btn">${signup ? 'SIGN UP' : 'LOG IN'}</button>
      </div>
    </form>`, (modal) => {
    $('#authForm', modal).addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(e.target);
      const email = data.get('email');
      const name = signup ? data.get('name') : email.split('@')[0];
      // Demo only: a real app sends this to a server. Never store passwords in the browser.
      storeLocal('user', { name, email });
      closeModal();
      renderAuth();
      toast(signup ? `Account created. Welcome, ${name}!` : `Logged in as ${name}.`);
    });
  });
}

/* ---------- 5. PAGE 1: search (index.html) ---------- */
function fillSelect(select, items, placeholder) {
  select.innerHTML = (placeholder ? `<option value="">${placeholder}</option>` : '') +
    items.map((item) => `<option value="${esc(item)}">${esc(item)}</option>`).join('');
}

function initHome() {
  const from = $('#from'), to = $('#to'), quota = $('#quota'), conc = $('#concession'), date = $('#date');
  fillSelect(from, STATIONS.map((s) => s.city), 'Select station');
  fillSelect(to, STATIONS.map((s) => s.city), 'Select station');
  fillSelect(quota, QUOTAS);
  fillSelect(conc, CONCESSIONS.map((c) => c.name));

  // Refill the last search if the user comes back
  const last = read('search', null);
  if (last) { from.value = last.from; to.value = last.to; quota.value = last.quota; conc.value = last.concession; }
  date.min = todayISO();
  date.value = last && last.date >= todayISO() ? last.date : todayISO();

  $('#searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const err = $('#searchError');
    if (!from.value || !to.value) { err.textContent = 'Choose both a FROM and a TO station.'; return; }
    if (from.value === to.value) { err.textContent = 'FROM and TO stations must be different.'; return; }
    if (!date.value || date.value < todayISO()) { err.textContent = 'Choose a journey date from today onwards.'; return; }
    err.textContent = '';
    store('search', { from: from.value, to: to.value, quota: quota.value, concession: conc.value, date: date.value });
    location.href = 'trains.html';
  });

  $('#checkPnr').addEventListener('click', checkPnr);
  $('#pnrInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') checkPnr(); });
}

function checkPnr() {
  const input = $('#pnrInput');
  const out = $('#pnrResult');
  const pnr = input.value.trim();
  if (!/^\d{10}$/.test(pnr)) {
    out.innerHTML = '<p class="pnr-error">Enter a 10-digit PNR number.</p>';
    input.focus();
    return;
  }
  const b = readLocal('bookings', []).find((x) => x.pnr === pnr);
  out.innerHTML = b
    ? `<p><strong>${esc(b.train.name)}</strong></p>
       <p>${esc(b.search.from)} to ${esc(b.search.to)}</p>
       <p>${formatDate(b.search.date)}</p>
       <p class="pnr-status">Confirmed, ${b.passengers.length} passenger(s)</p>`
    : '<p>No booking found for this PNR.</p><p>Book a ticket first, then check its PNR here.</p>';
}

/* ---------- 6. PAGE 2: train list (trains.html) ---------- */
function initTrains() {
  const search = read('search', null) || defaultSearch();
  $('#resultsText').textContent =
    `${TRAINS.length} trains from ${search.from} to ${search.to} on ${formatDate(search.date)}`;

  const list = $('#trainList');
  list.innerHTML = TRAINS.map((t, i) => trainCard(t, i, search)).join('');

  list.addEventListener('click', (e) => {
    // Class chips (1A / 2A / 3A / SL) – select one per train
    const chip = e.target.closest('.class-chip');
    if (chip) {
      const card = chip.closest('.train-card');
      $$('.class-chip', card).forEach((c) => {
        c.classList.toggle('selected', c === chip);
        c.setAttribute('aria-pressed', String(c === chip));
      });
      return;
    }
    // BOOK TICKET -> booking page
    const book = e.target.closest('.book-ticket');
    if (book) {
      const card = book.closest('.train-card');
      const chosen = $('.class-chip.selected', card);
      store('selectedTrain', { train: TRAINS[card.dataset.index], cls: chosen ? chosen.dataset.cls : null });
      location.href = 'booking.html';
    }
  });
}

function trainCard(t, i, search) {
  const src = stationOf(search.from);
  const dst = stationOf(search.to);
  const arr = addMinutes(t.dep, t.dur);
  const chips = Object.keys(CLASSES).map((c) =>
    `<button type="button" class="class-chip" data-cls="${c}" aria-pressed="false"
             title="${CLASSES[c]}: ${fmt(fareFor(t, c, search))}">${c}</button>`).join('');

  return `
    <article class="train-card" data-index="${i}">
      <div class="train-info">
        <p>Train no : ${t.no}</p>
        <p>Train name : ${t.name}</p>
        <div class="chips">${chips}</div>
      </div>
      <div class="stop">
        <p class="stop-label">Source</p>
        <p class="stop-name">${esc(src.station)}</p>
        <p class="time-box">${t.dep}</p>
      </div>
      <div class="duration">
        <span>${formatDuration(t.dur)}</span>
        <span class="arrow" aria-hidden="true"></span>
      </div>
      <div class="stop">
        <p class="stop-label">Destination</p>
        <p class="stop-name">${esc(dst.station)}</p>
        <p class="time-box">${arr.time}${arr.days ? ` <small>+${arr.days} day</small>` : ''}</p>
      </div>
      <button type="button" class="btn book-ticket">BOOK TICKET</button>
    </article>`;
}

/* ---------- 7. PAGE 3: class, seats, passengers (booking.html) ---------- */
function initBooking() {
  const search = read('search', null) || defaultSearch();
  const picked = read('selectedTrain', null) || { train: TRAINS[0], cls: null };
  const train = picked.train;

  // If the user came back from the confirm page, keep what they filled in
  const saved = read('booking', null);
  const sameTrip = saved && saved.train.no === train.no && saved.search.date === search.date &&
    saved.search.from === search.from && saved.search.to === search.to;

  const state = sameTrip ? saved : {
    train, search,
    cls: picked.cls,
    fare: picked.cls ? fareFor(train, picked.cls, search) : 0,
    passengers: [emptyPassenger()],
    insurance: false
  };

  $('#tripLine').textContent =
    `${train.name} (${train.no}), ${search.from} to ${search.to}, ${formatDate(search.date)}, departs ${train.dep}`;
  $('#insurance').checked = state.insurance;

  function renderClasses() {
    $('#classGrid').innerHTML = Object.keys(CLASSES).map((c) => {
      const avail = train.avail[c];
      const selected = state.cls === c;
      return `
        <article class="class-card ${selected ? 'selected' : ''}">
          <h3>${CLASSES[c]}</h3>
          <p class="avail ${avail.startsWith('AVAILABLE') ? 'ok' : 'wl'}">${avail}</p>
          <div class="class-foot">
            <p class="price">${fmt(fareFor(train, c, search))}.<br>per adult</p>
            <button type="button" class="btn class-book" data-cls="${c}" aria-pressed="${selected}">
              ${selected ? 'SELECTED' : 'BOOK'}
            </button>
          </div>
        </article>`;
    }).join('');
  }

  function renderPassengers() {
    const n = state.passengers.length;
    $('#seatCount').textContent = n;
    $('#seatMinus').disabled = n === 0;
    $('#seatPlus').disabled = n >= MAX_SEATS;

    $('#passengerList').innerHTML = n === 0
      ? '<p class="empty">Use + above to add seats. Each seat needs one passenger.</p>'
      : state.passengers.map((p, i) => `
          <div class="passenger-row">
            <div>
              <p class="p-name">Passenger ${i + 1}</p>
              ${p.name ? `<p class="p-meta">${esc(p.name)}, ${esc(p.age)}, ${esc(p.gender)}, ${esc(p.berth)} berth</p>` : ''}
            </div>
            <button type="button" class="add-details" data-index="${i}">${p.name ? 'Edit Details' : 'Add Details'}</button>
          </div>`).join('');
    renderTotal();
  }

  function renderTotal() {
    const ready = state.cls && state.passengers.length;
    $('#runningTotal').textContent = ready ? `Total: ${fmt(computeBill(state).total)}` : '';
    store('booking', state); // keep progress if the user navigates away
  }

  // Class BOOK buttons
  $('#classGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('.class-book');
    if (!btn) return;
    state.cls = btn.dataset.cls;
    state.fare = fareFor(train, state.cls, search);
    renderClasses();
    renderTotal();
    toast(`${CLASSES[state.cls]} selected.`);
  });

  // Seat counter
  $('#seatPlus').addEventListener('click', () => {
    if (state.passengers.length < MAX_SEATS) state.passengers.push(emptyPassenger());
    else toast(`You can book up to ${MAX_SEATS} seats at a time.`);
    renderPassengers();
  });
  $('#seatMinus').addEventListener('click', () => {
    state.passengers.pop();
    renderPassengers();
  });

  // Add / edit passenger details
  $('#passengerList').addEventListener('click', (e) => {
    const btn = e.target.closest('.add-details');
    if (!btn) return;
    const i = Number(btn.dataset.index);
    openModal(passengerForm(state.passengers[i], i), (modal) => {
      $('#pForm', modal).addEventListener('submit', (ev) => {
        ev.preventDefault();
        const d = new FormData(ev.target);
        state.passengers[i] = {
          name: d.get('name').trim(), age: d.get('age'), gender: d.get('gender'), berth: d.get('berth')
        };
        closeModal();
        renderPassengers();
      });
    });
  });

  // Insurance
  $('#insurance').addEventListener('change', (e) => { state.insurance = e.target.checked; renderTotal(); });
  $('#insInfo').addEventListener('click', () =>
    toast(`Travel insurance adds ${fmt(INSURANCE_FEE)} to the whole booking and covers every passenger.`));

  // BOOK NOW -> confirm page
  $('#bookNow').addEventListener('click', () => {
    const err = $('#bookError');
    const missing = state.passengers.findIndex((p) => !p.name);
    if (!state.cls) err.textContent = 'Choose a class by pressing BOOK on one of the cards.';
    else if (!state.passengers.length) err.textContent = 'Add at least one seat using the + button.';
    else if (missing > -1) err.textContent = `Add details for Passenger ${missing + 1}.`;
    else {
      err.textContent = '';
      store('booking', state);
      location.href = 'confirm.html';
    }
  });

  renderClasses();
  renderPassengers();
}

function emptyPassenger() {
  return { name: '', age: '', gender: '', berth: 'No preference' };
}

function passengerForm(p, i) {
  const opts = (list, value) => list.map((o) => `<option ${o === value ? 'selected' : ''}>${o}</option>`).join('');
  return `
    <h2>Passenger ${i + 1}</h2>
    <form id="pForm" class="modal-form">
      <label>Full name<input name="name" required value="${esc(p.name)}" autocomplete="off"></label>
      <div class="form-row">
        <label>Age<input name="age" type="number" min="1" max="120" required value="${esc(p.age)}"></label>
        <label>Gender
          <select name="gender" required>
            <option value="">Select</option>${opts(['Male', 'Female', 'Other'], p.gender)}
          </select>
        </label>
      </div>
      <label>Berth preference
        <select name="berth">${opts(['No preference', 'Lower', 'Middle', 'Upper', 'Side lower', 'Side upper'], p.berth)}</select>
      </label>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-action="close-modal">CANCEL</button>
        <button type="submit" class="btn">SAVE DETAILS</button>
      </div>
    </form>`;
}

/* ---------- 8. PAGE 4: confirm booking (confirm.html) ---------- */
function initConfirm() {
  const b = read('booking', null) || demoBooking();
  const src = stationOf(b.search.from);
  const dst = stationOf(b.search.to);
  const arr = addMinutes(b.train.dep, b.train.dur);

  $('#cTrainName').textContent = b.train.name;
  $('#cTrainNo').textContent = b.train.no;
  $('#cFrom').textContent = src.city;
  $('#cFromSt').textContent = src.station;
  $('#cDep').textContent = b.train.dep;
  $('#cTo').textContent = dst.city;
  $('#cToSt').textContent = dst.station;
  $('#cArr').textContent = arr.time + (arr.days ? ` (+${arr.days} day)` : '');
  $('#cDate').textContent = formatDate(b.search.date);
  $('#cCount').textContent = b.passengers.length;
  $('#cClass').textContent = CLASSES[b.cls];
  $('#cQuota').textContent = b.search.quota;
  $('#cPassengers').innerHTML = b.passengers.map((p, i) =>
    `<li>${i + 1}. ${esc(p.name)}, ${esc(p.age)}, ${esc(p.gender)}, ${esc(p.berth)}</li>`).join('');
  $('#cTotal').textContent = fmt(computeBill(b).total);

  $('#payBtn').addEventListener('click', () => {
    store('booking', b);
    location.href = 'payment.html';
  });
}

/* ---------- 9. PAGE 5: payment (payment.html) ---------- */
function initPayment() {
  const b = read('booking', null) || demoBooking();
  const bill = computeBill(b);

  const rows = [['Fare', bill.fare]];
  if (bill.insurance) rows.push(['Insurance', bill.insurance]);
  rows.push(['GST', bill.gst], ['Overhead', bill.overhead], ['Tax', bill.tax]);
  $('#bill').innerHTML = rows.map(([k, v]) => `<dt>${k}:</dt><dd>${fmt(v)}</dd>`).join('');
  $('#billTotal').textContent = fmt(bill.total);

  let method = null;
  const payNow = $('#payNow');

  $$('.pm').forEach((btn) => btn.addEventListener('click', () => {
    method = btn.dataset.method;
    $$('.pm').forEach((x) => x.setAttribute('aria-checked', String(x === btn)));
    payNow.disabled = false;
    payNow.textContent = `PAY ${fmt(bill.total)} WITH ${method.toUpperCase()}`;
  }));

  payNow.addEventListener('click', () => {
    if (!method) return;
    payNow.disabled = true;
    payNow.textContent = 'Processing payment...';

    // Fake payment delay. Connect Razorpay / UPI SDK here in a real app.
    setTimeout(() => {
      const pnr = String(Math.floor(1e9 + Math.random() * 9e9)); // 10 digits
      const bookings = readLocal('bookings', []);
      bookings.push({ ...b, pnr, method, total: bill.total, bookedAt: Date.now() });
      storeLocal('bookings', bookings);
      try { sessionStorage.removeItem('booking'); sessionStorage.removeItem('selectedTrain'); } catch (e) { /* ignore */ }

      payNow.textContent = 'Paid';
      openModal(`
        <h2>Booking confirmed</h2>
        <p>Paid ${fmt(bill.total)} with ${esc(method)}.</p>
        <p class="pnr-big">PNR ${pnr}</p>
        <p>${esc(b.train.name)}, ${esc(b.search.from)} to ${esc(b.search.to)}, ${formatDate(b.search.date)}</p>
        <p class="muted">Use CHECK PNR on the home page to see this booking again.</p>
        <div class="modal-actions"><a href="index.html" class="btn">GO TO HOME</a></div>`);
    }, 1500);
  });
}

/* ---------- 10. Start the right page ---------- */
const PAGES = { home: initHome, trains: initTrains, booking: initBooking, confirm: initConfirm, payment: initPayment };

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  const init = PAGES[document.body.dataset.page];
  if (init) init();
});
