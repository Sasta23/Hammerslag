/* =====================================================================
   HAMMERSLAG – RETSSALEN · telefon-app
   Serveren bestemmer, hvad hver rolle ser. Denne fil tegner det bare.
   - Dommeren: hele processen, tekster at læse op, styring af ordet.
   - De andre: »Din tur / Lyt«, billeder, stikord og en sætningsstarter.
   ===================================================================== */
(function () {
  const $ = id => document.getElementById(id);
  const app = $('app'), foot = $('foot'), sheetEl = $('sheet'), flashEl = $('flash'), shoutEl = $('shout');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = { get: k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const params = new URLSearchParams(location.search);
  // Rollefarver fra styletilen: bordeaux, mørkegrøn, salviegrøn, polstringsblå
  const ROLE = { judge: { c: '#7a2b2b', ink: '#fff', i: 'logo', t: 'Dommer' }, prosecutor: { c: '#3f5446', ink: '#fff', i: 'scale', t: 'Anklager' }, defense: { c: '#6e846f', ink: '#fff', i: 'shield', t: 'Forsvarer' }, witness: { c: '#34405e', ink: '#fff', i: 'eye', t: 'Vidne' } };

  let V = null, auth = null, es = null, offset = 0, last = { played: 0, obj: 0, floor: undefined }, ui = { screen: 'home', err: null, sheet: null, secret: false, html: '', foot: '' };

  /* ---------- netværk ---------- */
  async function post(url, data) { return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()).catch(() => ({ error: 'Ingen forbindelse. Er du på samme Wi-Fi som computeren?' })); }
  const asRole = b => { const x = b.closest('[data-as]'); return x ? x.dataset.as : undefined; };
  async function act(type, data) { const r = await post('/api/action', { room: auth.room, token: auth.token, type, data }); if (r.error) flash({ cls: 'obj', icon: 'x', label: 'Hov', title: r.error }); }
  function connect() {
    if (es) es.close();
    store.set('rs-last', auth);
    es = new EventSource(`/api/stream?room=${auth.room}&token=${auth.token}`);
    es.onmessage = e => { const v = JSON.parse(e.data); if (v.closed) return closed(); offset = v.serverNow - Date.now(); react(v); V = v; render(); };
  }
  // Retssagen er afsluttet af dommeren: tilbage til forsiden for alle.
  function closed() {
    if (es) es.close(); es = null; store.set('rs-last', null);
    const wasJudge = V && V.me && V.me.role === 'judge';
    V = null; auth = null; ui = { ...ui, screen: 'home', sheet: null, err: null, html: '', foot: '' };
    history.replaceState(null, '', location.pathname); render();
    flash({ icon: 'logo', label: 'Retten er hævet', title: wasJudge ? 'Du har afsluttet retssagen' : 'Dommeren har afsluttet retssagen' });
  }
  async function boot() {
    const want = (params.get('r') || '').toUpperCase();
    const saved = store.get('rs-last');
    if (saved && (!want || want === saved.room)) {
      const r = await fetch(`/api/check?room=${saved.room}&token=${saved.token}`).then(r => r.json()).catch(() => ({}));
      if (r.ok) { auth = saved; return connect(); }
    }
    if (want) { ui.screen = 'join'; ui.code = want; }
    render();
  }

  /* ---------- hjælpere ---------- */
  const keys = (list, cls = '') => list && list.length ? `<div class="keys ${cls}">${list.map(k => `<span class="k">${esc(k)}</span>`).join('')}</div>` : '';
  const badge = (role, size = '') => `<div class="badge ${size}" style="background:${ROLE[role].c}">${ICON(ROLE[role].i)}</div>`;
  const setRole = role => { document.documentElement.style.setProperty('--role', role ? ROLE[role].c : '#3f5446'); document.documentElement.style.setProperty('--role-ink', role ? ROLE[role].ink : '#fff'); };
  function timerLeft() {
    const t = V && V.timer; if (!t) return null;
    return t.running ? Math.max(0, Math.ceil((t.endsAt - (Date.now() + offset)) / 1000)) : t.left;
  }
  // Uret. Ved split (fx bevisfasen) deles tiden i to: først »vælg«, så »fremlæg«.
  const phase = s => { const t = timerLeft(); return s && s.split && V.timer && t != null && t <= s.split.at && (V.timer.running || t < V.timer.secs) ? 2 : 1; };
  function timerShown(s) {
    const t = timerLeft(); if (t == null) return null;
    if (!s || !s.split) return { t, of: V.timer.secs, label: V.timer.running ? 'Tid tilbage' : 'Uret er sat på pause' };
    const ph = phase(s);
    return ph === 1 ? { t: t - s.split.at, of: V.timer.secs - s.split.at, label: s.split.first } : { t, of: s.split.at, label: s.split.second };
  }
  function timerBar(s) {
    if (!V.timer || (!V.timer.running && V.timer.left === V.timer.secs)) return '';
    const x = timerShown(s);
    return `<div class="tbar ${V.timer.running ? '' : 'paused'}" data-tbar><div class="tl"><span class="label" data-tlabel>${esc(x.label)}</span><span class="tnum" data-timer>${fmt(x.t)}</span></div><div class="track"><div class="fill" data-tfill style="width:${Math.max(0, Math.min(100, 100 * x.t / x.of))}%"></div></div></div>`;
  }
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  function seatsHtml(clickable) {
    return `<div class="seats">${V.seats.map(s => {
      const me = s.role === V.me.role, free = !s.name;
      const can = clickable && free;
      return `<${can ? 'button' : 'div'} class="seat ${me ? 'me' : ''} ${can ? 'free' : ''} ${clickable && !free && !me ? 'taken' : ''}" ${can ? `data-a="pickRole" data-r="${s.role}"` : ''}>
        ${badge(s.role)}<div><b>${s.title}</b><span>${esc({ judge: 'Leder retten', prosecutor: 'Vil have en dom', defense: 'Forsvarer sin klient', witness: 'Ved noget' }[s.role])}</span></div>
        <div class="who ${free ? 'empty' : ''}">${free ? (can ? 'Vælg' : 'Ledig') : `<span class="dot ${s.online ? '' : 'off'}"></span>${esc(s.name)}${me ? ' (dig)' : ''}`}</div></${can ? 'button' : 'div'}>`;
    }).join('')}</div>`;
  }

  /* ---------- tegn ---------- */
  function render() {
    let h = '', f = '';
    if (!V) h = ({ home: homeHtml, create: createHtml, join: joinHtml })[ui.screen]();
    else if (V.phase === 'lobby') { setRole(V.me.role); h = lobbyHtml(); }
    else if (V.me.role === 'judge') { setRole('judge'); h = judgeHtml(); f = judgeFoot(); }
    else { setRole(V.me.role); h = playerHtml(); }
    if (h !== ui.html) { app.innerHTML = h; ui.html = h; afterRender(); }
    if (f !== ui.foot) { foot.innerHTML = f ? `<div class="in">${f}</div>` : ''; foot.hidden = !f; ui.foot = f; }
    renderSheet(); tick();
  }
  function afterRender() {
    const qr = $('qr'); if (qr && V) { try { const q = qrcode(0, 'M'); q.addData(V.joinUrl); q.make(); qr.innerHTML = q.createSvgTag({ cellSize: 6, margin: 0, scalable: true }); } catch (e) { qr.hidden = true; } }
    const now = app.querySelector('.steps .now'); if (now) now.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  function homeHtml() {
    return `<div class="brand hero"><h1 class="sr">Hammerslag</h1><img class="logo" src="/logo.webp" alt="Hammerslag" width="900" height="452"><p>Et retsdrama for 2–4 spillere. Dommeren styrer – de andre får stikord og spiller deres rolle.</p></div>
      ${guideCard('Ny her? Se først, hvordan man spiller')}
      <div class="ornament">${ICON('rosette')}</div>
      <div class="list">
        ${['judge', 'prosecutor', 'defense', 'witness'].map(r => `<div class="seat">${badge(r)}<div><b>${ROLE[r].t}</b><span>${{ judge: 'Styrer retssagen og afsiger dommen', prosecutor: 'Skal bevise, at den tiltalte er skyldig', defense: 'Forsvarer sin klient', witness: 'Fortæller, hvad der skete' }[r]}</span></div><div></div></div>`).join('')}
      </div>
      <button class="btn primary lg wide" data-a="toCreate">Opret retssag – jeg er dommer</button>
      <button class="btn lg wide" data-a="toJoin">Deltag med kode</button>
`;
  }
  // Stort, tydeligt kort til introduktionsvideoen
  const guideCard = (title, small) => `<button class="guidecard ${small ? 'small' : ''}" data-a="guide" aria-label="Afspil introduktionsvideo">
    <div class="thumb"><img src="/guide-poster.jpg" alt=""><span class="play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span><span class="dur">1:00</span></div>
    <div class="gtxt"><span class="label">${ICON('video')}Introduktionsvideo</span><b>${esc(title)}</b></div></button>`;
  const SIZE_INFO = {
    4: ['Dommer, anklager, forsvarer og vidne', 'Vidnet bliver afhørt og krydsforhørt.'],
    3: ['Dommer, anklager og forsvarer', 'Vidnet møder ikke op – dommeren læser hendes forklaring.'],
    2: ['Dommer og forsvarer', 'Dommeren læser også anklagerens indlæg og beviser op.']
  };
  const sizeHtml = (n, a) => `<div class="sizes">${[2, 3, 4].map(k => `<button class="size" data-a="${a}" data-i="${k}" aria-pressed="${n === k}"><b>${k}</b><span>spillere</span></button>`).join('')}</div>
    <p class="sizeinfo"><b>${SIZE_INFO[n][0]}.</b> ${SIZE_INFO[n][1]}</p>`;
  function createHtml() {
    return `<div class="brand"><h1>Ny retssag</h1><p>Du bliver dommer. Vælg en sag.</p></div>
      ${ui.err ? `<div class="error">${esc(ui.err)}</div>` : ''}
      <div class="card"><div class="field"><label class="label" for="nm">Dit navn</label><input id="nm" maxlength="16" value="${esc(store.get('rs-name') || '')}" autocomplete="off"></div></div>
      <span class="label">Hvor mange er I?</span>${sizeHtml(ui.size || 4, 'pickSize')}
      <span class="label">Vælg sag</span>
      <div class="list">${(ui.cases || []).map(c => `<button class="opt" data-a="pickCase" data-i="${c.i}" aria-pressed="${ui.caseIdx === c.i}"><div class="ic">${ICON(c.icon)}</div><b>${esc(c.title)}</b><span>${esc(c.tagline)}</span><div class="tick">${ICON('check')}</div>${c.warning ? `<p class="warn">${esc(c.warning)}</p>` : ''}</button>`).join('')}</div>
      <button class="btn primary lg wide" data-a="create">Opret retssag</button>
      <button class="btn ghost wide" data-a="toHome">Tilbage</button>`;
  }
  function joinHtml() {
    return `<div class="brand"><h1>Deltag</h1><p>Skriv koden fra dommerens telefon.</p></div>
      ${ui.err ? `<div class="error">${esc(ui.err)}</div>` : ''}
      <div class="card">
        <div class="field"><label class="label" for="cd">Kode</label><input id="cd" class="code" maxlength="4" value="${esc(ui.code || '')}" autocomplete="off" autocapitalize="characters"></div>
        <div class="field"><label class="label" for="nm">Dit navn</label><input id="nm" maxlength="16" value="${esc(store.get('rs-name') || '')}" autocomplete="off"></div>
      </div>
      <button class="btn primary lg wide" data-a="join">Gå ind i retten</button>
      <button class="btn ghost wide" data-a="toHome">Tilbage</button>`;
  }

  function lobbyHtml() {
    const judge = V.me.role === 'judge';
    const filled = V.seats.filter(s => s.name).length;
    if (judge) return `<div class="brand" style="padding-top:6px"><span class="label">Sagen</span><h1 style="font-size:30px">${esc(V.case.title)}</h1><p>${esc(V.case.tagline)}</p>${V.case.warning ? `<p class="warn">${esc(V.case.warning)}</p>` : ''}</div>
      <div class="card" style="align-items:center;text-align:center"><span class="label">Scan for at deltage</span><div class="qr" id="qr"></div><span class="label">eller skriv koden</span><div class="codebig">${esc(V.code)}</div></div>
      <span class="label">Hvor mange er I?</span>${sizeHtml(V.size, 'size')}
      <span class="label">Rollerne</span>${seatsHtml(false)}
      ${guideCard('Første gang? Vis videoen for alle, før I starter', true)}
      <button class="btn primary lg wide" data-a="start" ${filled < V.seats.length ? 'disabled' : ''}>${filled < V.seats.length ? `Venter på spillere (${filled}/${V.seats.length})` : 'Sæt retten'}</button>
      <button class="btn ghost wide" data-a="sheet" data-s="quit" style="color:var(--wine)">${ICON('x')} Afslut og gå til forsiden</button>`;
    if (!V.me.role) return `<div class="brand" style="padding-top:6px"><span class="label">${esc(V.case.title)}</span><h1 style="font-size:32px">Hvem vil du være?</h1><p>Hver rolle kan kun vælges af én.</p></div>${seatsHtml(true)}`;
    return `<div class="brand" style="padding-top:6px"><span class="label">${esc(V.case.title)}</span><h1 style="font-size:32px">Du er ${ROLE[V.me.role].t.toLowerCase()}</h1><p>${esc(V.me.goal)}</p></div>
      <span class="label">Rollerne</span>${seatsHtml(false)}
      <div class="card"><p class="muted">Venter på, at dommeren sætter retten …</p><button class="btn sm ghost" data-a="unpick">Skift rolle</button></div>
      ${guideCard('Mens I venter: se, hvordan man spiller', true)}`;
  }

  /* ---------- spillerne ---------- */
  // Hvem har ordet? Vises øverst for alle spillere.
  function turnStrip() {
    if (V.screen.mode === 'end') return '';
    const f = V.floor, mine = f === V.me.role;
    return `<div class="turnstrip ${mine ? 'mine' : ''}"><div class="who">${V.seats.map(st => `<div class="av ${st.role === f ? 'on' : ''}" style="--c:${ROLE[st.role].c}">${badge(st.role)}<span>${st.role === V.me.role ? 'Dig' : esc(st.name || st.title)}</span></div>`).join('')}</div>
      <p>${mine ? '<b>Din tur</b> – du har ordet' : f ? `<b>${esc(V.floorName)}</b> har ordet – du lytter` : 'Ingen har ordet'}</p></div>`;
  }
  // Statuslinjen samler »hvem taler« og »hvad skal du nu« i én boks.
  function statusHtml() {
    const s = V.screen;
    const evStep = s.evSteps ? (s.evidence.some(e => e.played) ? 3 : s.evidence.some(e => e.selected) ? 2 : 1) : 0;
    const c = s.evSteps ? { ...s.cue, title: ['', 'Vælg ét bevis', 'Fremlæg dit bevis', 'Forklar dit bevis'][evStep] } : (s.cue || {});
    const who = V.floorName ? `${esc(V.floorName)} taler` : 'Vent på dommeren';
    const box = (cls, icon, label, title) => `<div class="status ${cls}"><div class="ic">${ICON(icon)}</div><div><span class="label">${label}</span><h2>${esc(title)}</h2>${c.sub ? `<p class="ssub">${esc(c.sub)}</p>` : ''}</div></div>`;
    if (s.mode === 'speak' && prepping(s)) { const run = V.timer && V.timer.running; return `<div class="status ready"><div class="ic">${ICON('hourglass')}</div><div><span class="label">${run ? 'Forberedelse · 30 sek.' : 'Din tur om lidt'}</span><h2>Forbered dig: ${esc((c.title || '').toLowerCase())}</h2><p class="ssub">${run ? 'Læs guiden. Når uret skifter til »Tal nu«, begynder du.' : 'Dommeren starter uret. Først får du 30 sek. til at forberede dig.'}</p></div></div>`; }
    if (s.mode === 'speak') return box('speak enter', c.icon || 'mic', '<span class="pulse"></span>Din tur – tal nu', c.title || 'Du har ordet');
    if (s.mode === 'ready') return box('ready', 'hourglass', 'Gør dig klar · snart din tur', c.title || 'Snart din tur');
    if (s.mode === 'private') return box('private', 'lock', 'Kun for dig', c.title || 'Forbered dig');
    if (s.mode === 'answer') return box('speak', 'eye', '<span class="pulse"></span>Du er i vidneskranken', c.title || 'Svar');
    if (s.mode === 'end') return '';
    return `<div class="status listen"><div class="ic">${ICON('ear')}</div><div><span class="label">Lyt · du skal ikke tale nu</span><h2>${esc(c.title || 'Lyt')}</h2><p class="ssub">${V.floorName ? `${esc(V.floorName)} taler. ` : ''}${esc(c.sub || 'Lyt godt efter.')}</p></div></div>`;
  }
  // Før uret starter: en lille guide til, hvad advokaten skal sige.
  // Forberedelse = uret er ikke startet endnu, ELLER vi er i de første 30 sek. af en taletur.
  const prepping = s => !s.evSteps && V.timer && ((!V.timer.running && V.timer.left === V.timer.secs) || (s.split && phase(s) === 1));
  // Taleguide: 1) sig først  2) fortæl om (med »skub«-ord)  3) slut med. Tydeligt hierarki.
  const CONNECT = ['Først …', 'Derefter …', 'Og så …', 'Og til sidst …', 'Desuden …'];
  function speechGuide(c, o = {}) {
    const cont = c.keys && c.keys.length && c.keys[0].startsWith('…');
    const con = o.connectors || CONNECT;
    const steps = [];
    if (c.starter) steps.push(`<div class="sgstep s1"><i>1</i><div><small>Begynd med at sige</small><q>${esc(c.starter)}</q></div></div>`);
    if (c.keys && c.keys.length) steps.push(`<div class="sgstep s2"><i>${steps.length + 1}</i><div><small>${cont ? 'Fortsæt sætningen – vælg det, der passer' : 'Fortæl så om 2–3 af disse – med dine egne ord'}</small>
      <ul class="flow">${c.keys.map((k, n) => `<li>${cont ? '' : `<em>${esc(con[n % con.length])}</em>`}<span>${esc(k)}</span></li>`).join('')}</ul>
      <p class="push">${ICON('bulb')}<span><b>Går du i stå?</b> Sig: »Og det betyder, at …« – og tag næste stikord.</span></p></div></div>`);
    if (c.end) steps.push(`<div class="sgstep s3"><i>${steps.length + 1}</i><div><small>Slut af med at sige</small><q>${esc(c.end)}</q></div></div>`);
    return `<section class="sg ${o.live ? 'live' : ''} enter"><div class="sghead">${ICON(o.live ? 'mic' : 'bulb')}<span>${esc(o.title || (o.live ? 'Tal nu – følg trinene' : 'Sådan gør du'))}</span></div>${steps.join('')}</section>`;
  }
  function prepHtml(c, label) {
    return speechGuide(c, { title: label || 'Sådan gør du – læs det, mens du forbereder dig' });
  }
  // Sagen: advokaten lytter OG vælger teori – guidet trin for trin.
  function sagenTask(s, me) {
    const picked = s.theories.find(t => t.picked);
    return `<section class="task"><span class="label">${ICON('bulb')}Det skal du nu</span>
      <ol class="todo">
        <li class="done"><b>Lyt til dommeren</b><span>Han læser sagen op lige nu.</span></li>
        <li class="${picked ? 'done' : 'now'}"><b>Vælg din teori</b><span>En teori er <i>din forklaring</i> på, hvad der skete. Den giver dig stikordene til din tale.</span></li>
        <li class="${picked ? 'now' : ''}"><b>Lyt videre</b><span>Dommeren giver dig ordet, når det er din tur.</span></li>
      </ol></section>
      ${picked ? `<div class="donebar">${ICON('check')}<p><b>Godt! Du har valgt »${esc(picked.title)}«</b>. Nu skal du bare lytte. Du kan stadig skifte.</p></div>` : tapHint('Tryk på den teori, du tror mest på')}
      <div class="list">${s.theories.map(t => `<button class="opt" data-a="theory" data-i="${t.i}" aria-pressed="${t.picked}"><div class="ic">${ICON(me === 'prosecutor' ? 'scale' : 'shield')}</div><b>${esc(t.title)}</b><div class="tick">${ICON('check')}</div>${keys(t.keys, 'say')}</button>`).join('')}</div>`;
  }
  const tapHint = t => `<p class="taphint">${ICON('hand')}${esc(t)}</p>`;
  // Det, man SKAL sige, står i kursiv i en taleboble. Stikord er kursive chips.
  const say = (label, text) => `<div class="starter"><small>${ICON('speech')}${label}</small><p>»${esc(text)}«</p></div>`;
  function cueHtml(c, extra = '', head = false, mode = 'speak') {
    if (!c) return '';
    // Lytter man, vises ingen replikker – kun hvad man skal lytte efter.
    const talk = mode !== 'listen' && mode !== 'end', soon = mode === 'ready';
    const body = `${talk && c.starter ? say(soon ? 'Når du får ordet' : 'Start med', c.starter) : ''}
      ${c.keys && c.keys.length ? `<div class="kw"><span class="label">${!talk ? 'Lyt efter' : c.keys[0].startsWith('…') ? 'Fortsæt sætningen med' : 'Stikord'}</span>${keys(c.keys, talk ? 'say' : 'listen')}</div>` : ''}
      ${talk && c.end ? say('Slut med', c.end) : ''}
      ${extra}
      ${c.tip ? `<p class="tip">${ICON('bulb')}${esc(c.tip)}</p>` : ''}`;
    if (!head && !body.trim()) return '';
    return `<section class="cue enter">${head ? `<div class="head"><div class="ic">${ICON(c.icon)}</div><div><h2>${esc(c.title)}</h2>${c.sub ? `<p class="sub">${esc(c.sub)}</p>` : ''}</div></div>` : ''}${body}</section>`;
  }
  // Bevisfasen i to tydelige trin: 1) vælg 2 beviser  2) fremlæg dem.
  const evTwo = s => phase(s) === 2 || s.evSteps.picked >= s.evSteps.max;
  // Bevisfasen trin for trin: 1) vælg ÉT bevis  2) fremlæg det  3) forklar det.
  function evFlow(s) {
    const st = s.evSteps, two = evTwo(s), c = s.cue || {};
    const chosen = s.evidence.find(e => e.selected), shown = s.evidence.find(e => e.played);
    const step = shown ? 3 : chosen ? 2 : 1;
    const dot = (n, t) => `<span class="${step > n ? 'done' : step === n ? 'now' : ''}"><i>${step > n ? '✓' : n}</i>${t}</span>`;
    let h = `<div class="stepper">${dot(1, 'Vælg')}<em></em>${dot(2, 'Fremlæg')}<em></em>${dot(3, 'Forklar')}</div>`;
    if (step === 1) {
      h += `<section class="evphase"><span class="label">Trin 1 af 3</span><h2>Vælg <u>ét</u> bevis</h2>
        <div class="rule1">${ICON('hand')}<p><b>Du må kun vælge 1 bevis.</b> Vælg det, der hjælper din sag mest.</p></div>
        ${tapHint('Tryk på det bevis, du vil bruge')}
        <div class="evgrid">${s.evidence.map(e => `<button class="evpick" data-a="select" data-i="${e.i}" ${e.canSelect ? '' : 'disabled'}><div class="ic">${ICON(e.icon)}</div><b>${esc(e.title)}</b>${keys(e.keys)}<span class="mark"></span></button>`).join('')}</div></section>`;
      return h;
    }
    if (step === 2) {
      h += `<section class="evphase"><span class="label">Trin 2 af 3</span><h2>Fremlæg dit bevis</h2>
        <div class="evbig"><span class="evletter">Bevis ${esc(chosen.letter)}</span><div class="evhead"><div class="ic">${ICON(chosen.icon)}</div><h3>${esc(chosen.title)}</h3></div>${keys(chosen.keys)}</div>
        <div class="explain">${ICON('bulb')}<p><b>Hvad betyder »fremlæg«?</b> Det betyder, at du viser beviset til retten. Når du trykker på knappen, kan alle se beviset på deres telefon.</p></div>
        ${chosen.canPlay ? `<button class="btn role lg wide" data-a="play" data-i="${chosen.i}">${ICON('folder')} Fremlæg Bevis ${esc(chosen.letter)}</button>` : `<p class="muted" style="text-align:center">Vent, til dommeren giver dig ordet – så kan du fremlægge.</p>`}
        <button class="btn sm ghost" data-a="select" data-i="${chosen.i}">Fortryd – vælg et andet bevis</button></section>`;
      return h;
    }
    const t = s.evTalk || { starter: c.starter, keys: shown.keys, end: c.end };
    h += `<div class="donebar">${ICON('check')}<p><b>Bevis ${esc(shown.letter)} er fremlagt.</b> Alle kan nu se det. Forklar det nu højt.</p>
      ${shown.canPlay ? `<button class="btn sm" data-a="play" data-i="${shown.i}">Vis igen</button>` : ''}</div>`;
    h += speechGuide({ starter: t.starter, keys: t.keys, end: t.end }, { live: true, title: 'Trin 3 af 3 · Forklar beviset', connectors: ['Beviset viser, at …', 'Det betyder, at …', 'Og det passer med, at …', 'Til sidst …'] });
    return h;
  }
  // Beviser vises som »sagsmapper« – tydeligt adskilt fra det, man skal sige.
  const evChips = (label, list) => `<div class="evstrip"><span class="label">${ICON('folder')}${label}</span><div class="evchips">${list.map(e => `<div class="evchip">${ICON(e.icon)}<span>${e.letter ? `<b>Bevis ${esc(e.letter)}</b> · ` : ''}${esc(e.title)}</span></div>`).join('')}</div></div>`;
  function playerHtml() {
    const s = V.screen, me = V.me.role;
    let h = `<header class="top"><div class="badge">${ICON(ROLE[me].i)}</div><div><b>${esc(V.me.name)} · ${ROLE[me].t}</b><span>${esc(V.case.title)}</span></div><button class="btn sm" data-a="sheet" data-s="role">Min rolle</button></header>`;
    h += turnStrip() + timerBar(s) + statusHtml();
    if (s.mode === 'end') return h + endHtml(s);
    return h + playerBody(s, me);
  }
  function playerBody(s, me, compact) {
    let h = '', extra = '';
    if (compact && s.showRoles) s = { ...s, showRoles: false, facts: null };
    if (s.facts) extra += `<div class="facts">${s.facts.map(([i, b, t]) => `<div class="fact">${ICON(i)}<b>${esc(b)}</b><span>${esc(t)}</span></div>`).join('')}</div>`;
    if (s.twist) extra += `<div class="fact" style="flex-direction:row;gap:12px;align-items:flex-start">${ICON(s.twist.icon)}<div><b>${esc(s.twist.title)}</b><p style="font-size:14px;margin-top:4px">${esc(s.twist.text)}</p></div></div>`;
    if (s.evSteps) h += evFlow(s);
    else if (s.sagenTask && !compact) h += sagenTask(s, me) + (extra ? `<span class="label">Fakta i sagen</span><section class="cue">${extra}</section>` : '');
    else if (!compact && s.cue && s.cue.starter && (s.mode === 'ready' || s.mode === 'speak')) h += (s.mode === 'speak' && !prepping(s) ? speechGuide(s.cue, { live: true }) : prepHtml(s.cue)) + (extra ? `<section class="cue">${extra}</section>` : '');
    else h += cueHtml(s.cue, extra, compact, s.mode);
    if (s.used && s.used.length) h += evChips('Dine fremlagte beviser – nævn dem', s.used);
    if (s.theories && !s.sagenTask) h += `<span class="label">${esc(s.theoryHint || 'Vælg én teori')}</span>${tapHint('Tryk på én teori – den bestemmer dine stikord')}<div class="list">${s.theories.map(t => `<button class="opt" data-a="theory" data-i="${t.i}" aria-pressed="${t.picked}"><div class="ic">${ICON(me === 'prosecutor' ? 'scale' : 'shield')}</div><b>${esc(t.title)}</b><div class="tick">${ICON('check')}</div>${keys(t.keys, 'say')}</button>`).join('')}</div>`;
    if (s.preview) h += `<span class="label">Dine beviser</span><div class="list">${s.preview.map(e => `<div class="item doc"><div class="ic">${ICON(e.icon)}</div><b>${esc(e.title)}</b>${keys(e.keys)}</div>`).join('')}</div>`;
    if (s.personas) h += `<span class="label">Din personlighed</span>${tapHint('Tryk på én')}<div class="list">${s.personas.map(p => `<button class="opt" data-a="persona" data-i="${p.i}" aria-pressed="${p.picked}"><div class="ic">${ICON('users')}</div><b>${esc(p.title)}</b><div class="tick">${ICON('check')}</div>${keys(p.keys)}</button>`).join('')}</div>`;
    if (s.saw) h += `<span class="label">Det fortæller du</span><div class="card">${keys(s.saw, 'say')}</div>`;
    if (s.topics) h += `<span class="label">Spørg ind til</span><div class="list">${s.topics.map(t => `<div class="item"><div class="ic">${ICON(t.icon)}</div><b>${esc(t.label)}</b>${keys(t.keys, 'say')}</div>`).join('')}</div>`;
    if (s.answers) h += `<span class="label">Det ved du</span><div class="list">${s.answers.map(a => `<div class="item"><div class="ic">${ICON(a.icon)}</div><b>${esc(a.label)}</b>${keys(a.keys, 'say')}${a.note ? `<p class="note">${esc(a.note)}</p>` : ''}</div>`).join('')}</div>`;
    if (s.shown) h += shownHtml(s.shown, s.shownBy);
    if (s.evidence && !s.evSteps) h += `<span class="label">Dine beviser</span><div class="list">${s.evidence.map(e => `<div class="item doc"><div class="ic">${ICON(e.icon)}</div><b>${esc(e.title)}</b>${keys(e.keys)}</div>`).join('')}</div>`;
    if (compact) return h;
    if (s.secret) h += `<div class="secret"><span class="label">Det kan forsvareren spørge om</span><p>${esc(s.secret)}</p></div>`;
    if (s.objection) h += `<button class="btn danger objbtn wide" data-a="sheet" data-s="object">${s.shown ? 'Indsigelse mod beviset!' : 'Indsigelse!'} <small>1 tilbage</small></button><p class="objhint">Tryk kun, hvis modparten siger noget forkert eller urimeligt.</p>`;
    else if (s.objUsed) h += `<button class="btn objbtn wide" disabled>${s.objUsed === 'bevis' ? 'Indsigelse brugt mod dette bevis' : 'Indsigelse brugt i denne tur'}</button>`;
    if (s.next && !compact) h += prepHtml(s.next, `Bagefter er det din tur – forbered dig: ${s.next.title.toLowerCase()}`);
    return h;
  }
  function endHtml(s) {
    let h = '';
    if (!s.verdict) return h + cueHtml(s.cue, '', true);
    h += `<div class="stamp ${s.verdict} enter">${s.verdict === 'guilty' ? 'Skyldig' : 'Ikke skyldig'}</div>`;
    h += `<div class="status ${s.win ? 'speak' : ''}"><div class="ic">${ICON(s.win ? 'check' : 'x')}</div><div><span class="label">${ROLE[V.me.role].t}</span><h2>${s.win ? 'Du vandt' : 'Du tabte'}</h2><p style="font-size:14px">${esc(s.winText)}</p></div></div>`;
    if (!s.truth) return h + `<p class="muted" style="text-align:center">Venter på, at dommeren viser den rigtige dom …</p>`;
    return h + truthHtml(s.truth);
  }
  const truthHtml = t => `<section class="cue enter"><div class="head"><div class="ic">${ICON('spark')}</div><div><span class="label">Den rigtige sag</span><h2>${esc(t.title)}</h2></div></div><p>${esc(t.text)}</p><div class="starter"><small>Bagefter</small>${esc(t.epilogue)}</div></section>`;

  const objTag = o => o ? `<span class="tag ${o.status}">${o.status === 'pending' ? 'Indsigelse – venter' : o.status === 'accepted' ? 'Indsigelse taget til følge' : 'Indsigelse afvist'}</span>` : '';
  const shownHtml = (items, by) => `<span class="label tagged" style="--c:${ROLE[by] ? ROLE[by].c : '#3f5446'}">${ROLE[by] ? ICON(ROLE[by].i) : ''}${by === 'prosecutor' ? 'Anklagerens' : 'Forsvarerens'} fremlagte beviser</span>${items.length ? `<div class="list">${items.map(e => `<div class="item doc"><div class="ic">${ICON(e.icon)}</div><b><span class="evletter">Bevis ${esc(e.letter)}</span> ${esc(e.title)} ${objTag(e.objection)}</b>${keys(e.keys)}</div>`).join('')}</div>` : '<p class="muted">Intet bevis fremlagt endnu.</p>'}`;
  function presentedHtml(p) {
    const notes = store.get('rs-notes-' + V.code) || {};
    const who = p.side === 'prosecutor' ? 'Anklageren' : 'Forsvareren';
    const cards = p.items.map(e => `<div class="evcard"><span class="label">Bevis ${esc(e.letter)} ${objTag(e.objection)}</span>
      <div class="evhead"><div class="ic">${ICON(e.icon)}</div><h3>${esc(e.title)}</h3></div>${keys(e.keys)}
      <div class="seg"><button class="yes" data-a="note" data-k="${e.k}" data-v="1" aria-pressed="${notes[e.k] === 1}">Overbevisende</button><button class="no" data-a="note" data-k="${e.k}" data-v="2" aria-pressed="${notes[e.k] === 2}">Tvivlsomt</button></div></div>`).join('');
    return `<section class="presented"><span class="label">${ICON('folder')}${who} har fremlagt</span>
      ${cards || `<p class="muted">Venter på, at ${who.toLowerCase()} fremlægger et bevis …</p>`}
      ${p.items.length < 1 && p.left.length ? `<p class="muted small">Kan stadig fremlægges: ${p.left.map(esc).join(' · ')}</p>` : ''}</section>`;
  }
  // Dommerens ur: samme plads før og efter start. Ikke startet = stor rød knap.
  function clockHtml(s) {
    const T = V.timer, t = timerLeft(), fresh = !T.running && T.left === T.secs;
    if (fresh) return `<button class="clock start" data-a="timer" data-t="start">${ICON('clock')}<div><span>Tryk for at starte uret</span><b>${fmt(T.secs)}</b></div>${s.timerNote ? `<small>${esc(s.timerNote)}</small>` : ''}</button>`;
    return `<div class="clock ${T.running ? 'run' : 'paused'}"><div class="face"><span class="dot"></span><b data-timer class="${t <= 10 && T.running ? 'low' : ''}">${fmt(t)}</b><span class="state">${T.running ? 'Uret kører' : 'Pause'}</span></div>
      <div class="track"><div class="fill" data-tfill style="width:${100 * t / T.secs}%"></div></div>
      ${s.timerNote ? `<small>${esc(s.timerNote)}</small>` : ''}
      <div class="row"><button class="btn sm ${T.running ? '' : 'ok'}" data-a="timer" data-t="${T.running ? 'pause' : 'start'}">${T.running ? 'Pause' : 'Fortsæt'}</button><button class="btn sm ghost" data-a="timer" data-t="reset">↺ Nulstil</button></div></div>`;
  }
  const paras = t => (Array.isArray(t) ? t : [t]).map(x => `<p>${esc(x)}</p>`).join('');
  /* ---------- dommeren ---------- */
  function judgeHtml() {
    const s = V.screen, n = V.beats.length;
    let h = `<header class="top"><div class="badge">${ICON('logo')}</div><div><b>Dommer · ${V.beat + 1}/${n}</b><span>${esc(V.case.title)} · kode ${esc(V.code)}</span></div><div class="hbtns"><button class="btn sm" data-a="sheet" data-s="roles">Roller</button><button class="btn sm quit" data-a="sheet" data-s="quit" aria-label="Afslut retssagen">${ICON('x')}</button></div></header>
      <nav class="steps" aria-label="Retssagens trin">${V.beats.map((b, i) => `<button class="${i < V.beat ? 'done' : i === V.beat ? 'now' : ''}" data-a="beat" data-i="${i}"><i>${i < V.beat ? '✓' : i + 1}</i>${esc(b)}</button>`).join('')}</nav>`;
    if (V.objection && V.objection.status === 'pending') h += `<div class="alert enter"><span class="label" style="color:#f3e1de">Indsigelse fra ${esc(V.objection.byTitle.toLowerCase())}en</span><h3>»${esc(V.objection.type)}«</h3>${V.objection.about ? `<p style="color:#f3e1de">Mod beviset: ${esc(V.objection.about)}</p>` : ''}
      <div class="row"><button class="btn ok" data-a="rule" data-ok="1">Taget til følge</button><button class="btn" data-a="rule" data-ok="0">Afvist</button></div></div>`;
    h += `<div><span class="label">Nu</span><h1 style="font-size:28px;margin-top:4px">${esc(s.now)}</h1><p class="muted" style="margin-top:6px">${esc(s.hint)}</p></div>`;
    if (V.turn && V.turn.n > 1) h += `<div class="turns">${V.turn.labels.map((l, i) => `<span class="${i < V.turn.i ? 'done' : i === V.turn.i ? 'now' : ''}">${i < V.turn.i ? '✓ ' : ''}${esc(l)}</span>`).join('<i>→</i>')}</div>`;
    if (V.timer) h += clockHtml(s);
    if (s.presented) h += presentedHtml(s.presented);
    if (s.script && !(V.screen.extras || []).some(e => e.type === 'verdict' && V.verdict)) h += `<div class="script"><span class="label">${ICON('speech')}Læs højt</span>${paras(s.script)}</div>`;
    if (s.warning && V.beat === 0) h += `<p class="warn">${esc(s.warning)}</p>`;
    if (V.beat > 0 && V.beat < n - 1) h += `<div><span class="label">Hvem har ordet?</span><div class="floor" style="margin-top:6px">${V.seats.map(st => `<button data-a="floor" data-r="${st.role}" aria-pressed="${V.floor === st.role}">${badge(st.role)}<span>${esc(st.name || st.title)}</span></button>`).join('')}</div></div>`;
    for (const e of s.extras) h += judgeExtra(e, s);
    for (const x of V.alsoPlays || []) if (x.screen.mode !== 'end') h += `<section class="also" data-as="${x.role}"><div class="alsohead">${badge(x.role)}<div><span class="label">Du spiller også</span><h2>${ROLE[x.role].t}</h2></div>${V.floor === x.role ? '<span class="tag">Har ordet</span>' : ''}</div>${playerBody(x.screen, x.role, true)}</section>`;
    return h;
  }
  function judgeExtra(e, s) {
    const notes = store.get('rs-notes-' + V.code) || {};
    switch (e.type) {
      case 'timeline': return `<div class="card"><span class="label">Tidslinjen</span><div class="tl">${e.items.map(([t, x]) => `<div><b>${esc(t)}</b><span>${esc(x)}</span></div>`).join('')}</div></div>`;
      case 'tools': return `<div class="card"><span class="label">Din magt</span>
        <p><b>Ordet:</b> Tryk på en person under »Hvem har ordet?«. Deres telefon skifter til »Din tur«.</p>
        <p><b>Indsigelser:</b> Advokaterne har én indsigelse hver pr. trin. Den dukker op her – du afgør den.</p>
        <p><b>Næste trin:</b> Den store knap nederst flytter alle videre.</p></div>`;
      case 'questions': return `<div class="card"><span class="label">Dine egne spørgsmål til vidnet</span>${e.items.map(q => `<p>• ${esc(q)}</p>`).join('')}</div>`;
      case 'rules': return `<div class="card"><span class="label">Indsigelse – tag til følge hvis …</span>
        <p><b>Ledende:</b> spørgsmålet indeholder selv svaret.</p><p><b>Rygter:</b> vidnet har kun hørt det fra andre.</p><p><b>Gætter:</b> vidnet siger »jeg tror nok …«.</p><p><b>Irrelevant:</b> det har intet med sagen at gøre.</p><p><b>Presser vidnet:</b> spørgsmålene er urimelige.</p>
        <p class="muted">Hver advokat har én indsigelse pr. trin. Forsvareren kan gøre indsigelse mod anklageren og vidnet – anklageren kun mod forsvareren. »Vidnet gætter« og »Rygter« kan kun bruges, når vidnet taler.</p></div>`;
      case 'twist': return `<div class="cue"><div class="head"><div class="ic">${ICON(e.icon)}</div><div><span class="label">Nyt bevis</span><h2>${esc(e.title)}</h2></div></div></div>`;
      case 'notebook': {
        const ev = s.evidence;
        if (e.summary) {
          if (V.verdict) return '';
          const ok = ev.filter(x => x.side === 'prosecutor' && notes[x.k] === 1).length, bad = ev.filter(x => x.side === 'prosecutor' && notes[x.k] === 2).length, dok = ev.filter(x => x.side === 'defense' && notes[x.k] === 1).length;
          return `<div class="card"><span class="label">Dine noter</span><p>Anklagerens beviser: <b>${ok}</b> overbevisende · <b>${bad}</b> tvivlsomme</p><p>Forsvarets beviser: <b>${dok}</b> overbevisende</p>
            <p class="muted">Spørg dig selv: Har nogen SET det ske? Er der en anden forklaring? Var vidnet troværdigt?</p></div>`;
        }
        const row = x => `<div class="item ${x.played ? '' : ''}"><div class="ic">${ICON(x.icon)}</div><b>${esc(x.title)} ${x.played ? '<span class="tag">Fremlagt</span>' : ''}</b>${keys(x.keys)}
          <div class="seg"><button class="yes" data-a="note" data-k="${x.k}" data-v="1" aria-pressed="${notes[x.k] === 1}">Overbevisende</button><button class="no" data-a="note" data-k="${x.k}" data-v="2" aria-pressed="${notes[x.k] === 2}">Tvivlsomt</button></div></div>`;
        return `<span class="label">Anklagerens beviser</span><div class="list">${ev.filter(x => x.side === 'prosecutor').map(row).join('')}</div>
          <span class="label">Forsvarets beviser</span><div class="list">${ev.filter(x => x.side === 'defense').map(row).join('')}</div>`;
      }
      case 'verdict': {
        if (!V.verdict) return `<button class="btn danger lg wide" data-a="verdict" data-v="guilty">Skyldig</button><button class="btn ok lg wide" data-a="verdict" data-v="notGuilty">Ikke skyldig</button>`;
        const g = V.verdict === 'guilty';
        const pick = (side, v) => s.evidence.filter(x => x.side === side && notes[x.k] === v).map(x => x.title.toLowerCase());
        const reasons = g ? pick('prosecutor', 1) : [...pick('defense', 1), ...pick('prosecutor', 2)];
        const why = reasons.length ? reasons.slice(0, 3).join(', ') : (g ? 'beviserne samlet' : 'at skylden ikke er bevist');
        let h = `<div class="stamp ${V.verdict}">${g ? 'Skyldig' : 'Ikke skyldig'}</div>
          <div class="script"><span class="label">${ICON('speech')}Læs dommen højt</span><p>Retten finder ${esc(V.case.accused)} ${g ? 'SKYLDIG' : 'IKKE SKYLDIG'}. ${g ? 'Retten lægger især vægt på' : 'Der er rimelig tvivl, især på grund af'}: ${esc(why)}.</p></div>`;
        if (!V.revealed) return h + `<button class="btn primary lg wide" data-a="reveal">Vis den rigtige dom for alle</button><button class="btn ghost wide" data-a="verdict" data-v="">Fortryd dommen</button>`;
        const right = s.truth.truth === V.verdict;
        return h + truthHtml(s.truth) + `<div class="status ${right ? 'speak' : ''}"><div class="ic">${ICON(right ? 'check' : 'x')}</div><div><h2>${right ? 'Retten ramte plet' : 'Retten tog fejl'}</h2><p style="font-size:14px">${right ? 'Dommen passer med sandheden.' : 'Retten kan kun dømme ud fra det, der bliver bevist.'}</p></div></div>
          <button class="btn wide" data-a="newcase">Ny sag med de samme spillere</button>`;
      }
    }
    return '';
  }
  function judgeFoot() {
    const n = V.beats.length, tu = V.turn || { i: 0, n: 1 };
    const back = tu.i > 0 ? `data-a="turn" data-i="${tu.i - 1}"` : `data-a="beat" data-i="${Math.max(0, V.beat - 1)}" ${V.beat === 0 ? 'disabled' : ''}`;
    if (tu.next) return `<button class="btn" ${back} aria-label="Tilbage">◀</button><button class="btn primary" data-a="turn" data-i="${tu.i + 1}">Giv ordet videre: ${esc(tu.next)} ▶</button>`;
    if (tu.i > 0 && V.beat < n - 1) return `<button class="btn" ${back} aria-label="Tilbage">◀</button><button class="btn primary" data-a="beat" data-i="${V.beat + 1}">Næste: ${esc(V.beats[V.beat + 1])} ▶</button>`;
    if (V.beat >= n - 1) return `<button class="btn" data-a="beat" data-i="${V.beat - 1}" aria-label="Forrige trin">◀</button><button class="btn" disabled>Sidste trin</button>`;
    return `<button class="btn" data-a="beat" data-i="${Math.max(0, V.beat - 1)}" ${V.beat === 0 ? 'disabled' : ''} aria-label="Forrige trin">◀</button>
      <button class="btn primary" data-a="beat" data-i="${V.beat + 1}">Næste: ${esc(V.beats[V.beat + 1])} ▶</button>`;
  }

  /* ---------- skuffer ---------- */
  function renderSheet() {
    let h = '';
    if (ui.sheet === 'quit' && V) h = `<h2>Afslut retssagen?</h2><p>Alle spillere bliver sendt tilbage til forsiden, og retssagen slettes. Det kan ikke fortrydes.</p>
      <button class="btn danger lg wide" data-a="close">Ja, afslut for alle</button><button class="btn wide" data-a="closeSheet">Nej, fortsæt</button>`;
    else if (ui.sheet === 'role' && V) {
      const s = V.screen || {};
      h = `<h2>Du er ${ROLE[V.me.role].t.toLowerCase()}</h2><p>${esc(V.me.goal)}</p>
        <div class="card"><span class="label">Den tiltalte</span><p><b>${esc(V.case.accused)}</b></p></div>
        <span class="label">Rollerne</span>${seatsHtml(false)}`;
    } else if (ui.sheet === 'guide') h = `<h2>Sådan spiller I</h2><video src="/guide.mp4" controls playsinline autoplay style="width:100%;border-radius:6px;background:#000;aspect-ratio:16/9"></video>`;
    else if (ui.sheet === 'roles' && V) h = `<h2>Rollerne</h2>${seatsHtml(false)}`;
    else if (ui.sheet === 'object' && V) h = `<h2>Hvad er der galt?</h2><p class="muted">Vælg – så får dommeren besked. Råb »Indsigelse!« højt samtidig.</p>
      <div class="list">${(V.objections || []).map(o => `<button class="opt" data-a="object" data-t="${o.i}"><div class="ic">${ICON('hand')}</div><b>${esc(o.t)}</b><span>${esc(o.d)}</span><div></div></button>`).join('')}</div>`;
    if (h && ui.sheet !== 'quit') h += `<button class="btn wide" data-a="closeSheet">Luk</button>`;
    const key = ui.sheet + h;
    if (key === ui.sheetKey) return; ui.sheetKey = key;
    sheetEl.hidden = !h; sheetEl.className = h ? 'sheet-wrap' : '';
    sheetEl.innerHTML = h ? `<div class="sheet" role="dialog" aria-modal="true">${h}</div>` : '';
  }
  let flashT;
  function flash({ cls = '', icon, label, title, keysList }) {
    flashEl.className = 'flash ' + cls;
    flashEl.innerHTML = `<div class="ic">${ICON(icon)}</div><span class="label">${esc(label)}</span><b>${esc(title)}</b>${keysList ? keys(keysList) : ''}`;
    flashEl.hidden = false; clearTimeout(flashT); flashT = setTimeout(() => flashEl.hidden = true, 5000);
  }
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

  /* ---------- reaktioner på ændringer ---------- */
  function react(v) {
    if (!V || v.phase !== 'game') { last = { played: v.lastPlayed ? v.lastPlayed.n : 0, obj: v.objection ? v.objection.id : 0, floor: v.floor, beat: v.beat }; return; }
    if (v.lastPlayed && v.lastPlayed.n !== last.played) { flash({ icon: v.lastPlayed.icon, label: `${v.lastPlayed.byTitle === 'Anklager' ? 'Anklagerens' : 'Forsvarerens'} bevis ${v.lastPlayed.letter || ''}`, title: v.lastPlayed.title, keysList: v.lastPlayed.keys }); }
    if (v.objection && v.objection.id !== last.obj) {
      const o = v.objection;
      if (o.status === 'pending') { flash({ cls: 'obj', icon: 'hand', label: `Indsigelse · ${o.byTitle}`, title: o.type }); if (v.me.role === 'judge') buzz([200, 80, 200]); }
      else flash({ cls: o.status === 'accepted' ? 'good' : 'obj', icon: o.status === 'accepted' ? 'check' : 'x', label: 'Dommeren', title: o.status === 'accepted' ? 'Indsigelsen tages til følge' : 'Indsigelsen afvises' });
    }
    if (v.floor !== last.floor && v.floor === v.me.role && v.me.role !== 'judge') buzz(250);
    if (v.beat !== last.beat) { ui.sheet = null; window.scrollTo(0, 0); }
    last = { played: v.lastPlayed ? v.lastPlayed.n : 0, obj: v.objection ? v.objection.id : 0, floor: v.floor, beat: v.beat };
  }

  function tick() {
    const t = timerLeft(); if (t == null) return;
    const s = V.me && V.me.role !== 'judge' ? V.screen : null, x = timerShown(s);
    document.querySelectorAll('[data-timer]').forEach(el => { const v = el.closest('[data-tbar]') ? x.t : t; el.textContent = fmt(v); el.classList.toggle('low', v <= 10 && V.timer.running); });
    document.querySelectorAll('[data-tfill]').forEach(el => { el.style.width = Math.max(0, Math.min(100, 100 * x.t / x.of)) + '%'; el.classList.toggle('low', x.t <= 10); });
    const ph = phase(s);
    if (ui.phase !== undefined && ph !== ui.phase && V.timer.running) { buzz(300); knock(1); }
    if (ui.phase !== ph) { ui.phase = ph; render(); }
    // Hammerslag, når uret rammer 0.
    if (V.timer.running && t === 0 && ui.dinged !== V.timer.endsAt) { ui.dinged = V.timer.endsAt; knock(3); buzz([120, 120, 120, 120, 120]); }
  }
  /* ---------- lyd: dommerhammer slår i bordet (lavet med Web Audio, ingen lydfil) ---------- */
  let AC = null;
  const unlockAudio = () => { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) {} };
  ['pointerdown', 'touchstart', 'keydown'].forEach(ev => document.addEventListener(ev, unlockAudio, { passive: true }));
  function knock(n = 3) {
    if (!AC) return;
    const at0 = AC.currentTime + 0.02;
    for (let k = 0; k < n; k++) {
      const at = at0 + k * 0.42, vol = k === n - 1 ? 1 : 0.8;
      // dybt bump (træ mod bord)
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(150, at); o.frequency.exponentialRampToValueAtTime(55, at + 0.18);
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.9 * vol, at + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.28);
      o.connect(g).connect(AC.destination); o.start(at); o.stop(at + 0.3);
      // træ-klang
      const o2 = AC.createOscillator(), g2 = AC.createGain();
      o2.type = 'triangle'; o2.frequency.setValueAtTime(420, at); o2.frequency.exponentialRampToValueAtTime(300, at + 0.1);
      g2.gain.setValueAtTime(0.0001, at); g2.gain.exponentialRampToValueAtTime(0.35 * vol, at + 0.003); g2.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
      o2.connect(g2).connect(AC.destination); o2.start(at); o2.stop(at + 0.14);
      // klik (støj)
      const len = Math.floor(AC.sampleRate * 0.04), buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
      const src = AC.createBufferSource(), f = AC.createBiquadFilter(), g3 = AC.createGain();
      src.buffer = buf; f.type = 'bandpass'; f.frequency.value = 1600; f.Q.value = 0.8; g3.gain.value = 0.7 * vol;
      src.connect(f).connect(g3).connect(AC.destination); src.start(at);
    }
  }
  setInterval(tick, 500);

  /* ---------- klik ---------- */
  document.addEventListener('click', async e => {
    if (e.target === sheetEl) { ui.sheet = null; return render(); }
    const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    const a = b.dataset.a, i = Number(b.dataset.i);
    switch (a) {
      case 'close': ui.sheet = null; return act('close', {});
      case 'toHome': ui.screen = 'home'; ui.err = null; return render();
      case 'guide': ui.sheet = 'guide'; return render();
      case 'toJoin': ui.screen = 'join'; ui.err = null; return render();
      case 'toCreate': ui.screen = 'create'; ui.err = null; ui.cases = await fetch('/api/cases').then(r => r.json()).catch(() => []); if (ui.caseIdx == null) ui.caseIdx = 0; return render();
      case 'pickCase': ui.caseIdx = i; store.set('rs-name', ($('nm') || {}).value || ''); return render();
      case 'create': {
        const name = $('nm').value.trim(); store.set('rs-name', name);
        const r = await post('/api/create', { name, caseIdx: ui.caseIdx, size: ui.size || 4 }); if (r.error) { ui.err = r.error; return render(); }
        auth = { room: r.room, token: r.token }; return connect();
      }
      case 'join': {
        const room = $('cd').value.trim().toUpperCase(), name = $('nm').value.trim(); store.set('rs-name', name); ui.code = room;
        const r = await post('/api/join', { room, name }); if (r.error) { ui.err = r.error; return render(); }
        auth = { room: r.room, token: r.token }; history.replaceState(null, '', `?r=${r.room}`); return connect();
      }
      case 'pickSize': ui.size = i; store.set('rs-name', ($('nm') || {}).value || ''); return render();
      case 'size': return act('size', { n: i });
      case 'pickRole': return act('role', { role: b.dataset.r });
      case 'unpick': return act('role', { role: null });
      case 'start': return act('start');
      case 'beat': return act('beat', { i });
      case 'turn': return act('turn', { i });
      case 'floor': return act('floor', { role: V.floor === b.dataset.r ? null : b.dataset.r });
      case 'timer': return act('timer', { a: b.dataset.t });
      case 'theory': return act('theory', { i, as: asRole(b) });
      case 'persona': return act('persona', { i, as: asRole(b) });
      case 'play': return act('play', { i, as: asRole(b) });
      case 'select': return act('select', { i, as: asRole(b) });
      case 'secret': ui.secret = !ui.secret; ui.html = ''; return render();
      case 'sheet': ui.sheet = b.dataset.s; return render();
      case 'closeSheet': ui.sheet = null; return render();
      case 'object': ui.sheet = null; render(); buzz(200); return act('object', { t: Number(b.dataset.t) });
      case 'rule': return act('rule', { ok: b.dataset.ok === '1' });
      case 'note': { const k = 'rs-notes-' + V.code, n = store.get(k) || {}, v = Number(b.dataset.v); n[b.dataset.k] = n[b.dataset.k] === v ? 0 : v; store.set(k, n); ui.html = ''; return render(); }
      case 'verdict': return act('verdict', { v: b.dataset.v || null });
      case 'reveal': return act('reveal');
      case 'newcase': return act('newcase');
    }
  });
  boot();
})();
