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
  const ROLE = { judge: { c: '#7a2b2b', ink: '#fff', i: 'gavel', t: 'Dommer' }, prosecutor: { c: '#3f5446', ink: '#fff', i: 'scale', t: 'Anklager' }, defense: { c: '#6e846f', ink: '#fff', i: 'shield', t: 'Forsvarer' }, witness: { c: '#34405e', ink: '#fff', i: 'eye', t: 'Vidne' } };

  let V = null, auth = null, es = null, offset = 0, last = { played: 0, obj: 0, floor: undefined }, ui = { screen: 'home', err: null, sheet: null, secret: false, html: '', foot: '' };

  /* ---------- netværk ---------- */
  async function post(url, data) { return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()).catch(() => ({ error: 'Ingen forbindelse. Er du på samme Wi-Fi som computeren?' })); }
  async function act(type, data) { const r = await post('/api/action', { room: auth.room, token: auth.token, type, data }); if (r.error) flash({ cls: 'obj', icon: 'x', label: 'Hov', title: r.error }); }
  function connect() {
    if (es) es.close();
    store.set('rs-last', auth);
    es = new EventSource(`/api/stream?room=${auth.room}&token=${auth.token}`);
    es.onmessage = e => { const v = JSON.parse(e.data); offset = v.serverNow - Date.now(); react(v); V = v; render(); };
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
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  function seatsHtml(clickable) {
    return `<div class="seats">${V.seats.map(s => {
      const me = s.role === V.me.role, free = !s.name;
      const can = clickable && free;
      return `<${can ? 'button' : 'div'} class="seat ${me ? 'me' : ''} ${can ? 'free' : ''} ${clickable && !free && !me ? 'taken' : ''}" ${can ? `data-a="pickRole" data-r="${s.role}"` : ''}>
        ${badge(s.role)}<div><b>${s.title}</b><span>${esc({ judge: 'Leder retten', prosecutor: 'Vil have en dom', defense: 'Skaber tvivl', witness: 'Ved noget' }[s.role])}</span></div>
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
    return `<div class="brand"><div class="mark">${ICON('gavel')}</div><h1>Hammerslag</h1><p>Et retsdrama for fire. Dommeren styrer – de andre får stikord og spiller deres rolle.</p></div>
      <div class="ornament">${ICON('rosette')}</div>
      <div class="list">
        ${['judge', 'prosecutor', 'defense', 'witness'].map(r => `<div class="seat">${badge(r)}<div><b>${ROLE[r].t}</b><span>${{ judge: 'Styrer retssagen og afsiger dommen', prosecutor: 'Skal bevise, at den tiltalte er skyldig', defense: 'Skal skabe rimelig tvivl', witness: 'Så noget – og gemmer på en hemmelighed' }[r]}</span></div><div></div></div>`).join('')}
      </div>
      <button class="btn primary lg wide" data-a="toCreate">Opret retssag – jeg er dommer</button>
      <button class="btn lg wide" data-a="toJoin">Deltag med kode</button>`;
  }
  function createHtml() {
    return `<div class="brand"><h1>Ny retssag</h1><p>Du bliver dommer. Vælg en sag.</p></div>
      ${ui.err ? `<div class="error">${esc(ui.err)}</div>` : ''}
      <div class="card"><div class="field"><label class="label" for="nm">Dit navn</label><input id="nm" maxlength="16" value="${esc(store.get('rs-name') || '')}" autocomplete="off"></div></div>
      <div class="list">${(ui.cases || []).map(c => `<button class="opt" data-a="pickCase" data-i="${c.i}" aria-pressed="${ui.caseIdx === c.i}"><div class="ic">${ICON(c.icon)}</div><b>${esc(c.title)}</b><span>${esc(c.tagline)}</span><div class="tick">${ICON('check')}</div></button>`).join('')}</div>
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
    if (judge) return `<div class="brand" style="padding-top:6px"><span class="label">Sagen</span><h1 style="font-size:30px">${esc(V.case.title)}</h1><p>${esc(V.case.tagline)}</p></div>
      <div class="card" style="align-items:center;text-align:center"><span class="label">Scan for at deltage</span><div class="qr" id="qr"></div><span class="label">eller skriv koden</span><div class="codebig">${esc(V.code)}</div></div>
      <span class="label">Rollerne</span>${seatsHtml(false)}
      <button class="btn primary lg wide" data-a="start" ${filled < 4 ? 'disabled' : ''}>${filled < 4 ? `Venter på spillere (${filled}/4)` : 'Sæt retten'}</button>
      ${filled < 4 && filled > 1 ? `<button class="btn ghost wide" data-a="start">Start uden alle roller</button>` : ''}`;
    if (!V.me.role) return `<div class="brand" style="padding-top:6px"><span class="label">${esc(V.case.title)}</span><h1 style="font-size:32px">Hvem vil du være?</h1><p>Hver rolle kan kun vælges af én.</p></div>${seatsHtml(true)}`;
    return `<div class="brand" style="padding-top:6px"><span class="label">${esc(V.case.title)}</span><h1 style="font-size:32px">Du er ${ROLE[V.me.role].t.toLowerCase()}</h1><p>${esc(V.me.goal)}</p></div>
      <span class="label">Rollerne</span>${seatsHtml(false)}
      <div class="card"><p class="muted">Venter på, at dommeren sætter retten …</p><button class="btn sm ghost" data-a="unpick">Skift rolle</button></div>`;
  }

  /* ---------- spillerne ---------- */
  function statusHtml() {
    const s = V.screen, t = timerLeft();
    const timer = t != null && V.timer && V.timer.running ? `<span class="timer ${t <= 10 ? 'low' : ''}" data-timer>${fmt(t)}</span>` : '';
    const who = V.floorName ? `${esc(V.floorName)} (${ROLE[V.floor].t.toLowerCase()})` : 'ingen';
    if (s.mode === 'speak') return `<div class="status speak enter"><div class="ic">${ICON('mic')}</div><div><span class="label"><span class="pulse"></span>Din tur</span><h2>Du har ordet</h2></div>${timer}</div>`;
    if (s.mode === 'ready') return `<div class="status ready"><div class="ic">${ICON('hourglass')}</div><div><span class="label">Gør dig klar</span><h2>Snart din tur</h2></div>${timer}</div>`;
    if (s.mode === 'private') return `<div class="status private"><div class="ic">${ICON('lock')}</div><div><span class="label">Kun for dig</span><h2>Forbered dig</h2></div>${timer}</div>`;
    if (s.mode === 'answer') return `<div class="status speak"><div class="ic">${ICON('eye')}</div><div><span class="label"><span class="pulse"></span>Du er i vidneskranken</span><h2>Svar på spørgsmålene</h2></div>${timer}</div>`;
    if (s.mode === 'end') return '';
    return `<div class="status"><div class="ic">${ICON('ear')}</div><div><span class="label">Lyt</span><h2>${V.floor ? `${who} taler` : 'Vent på dommeren'}</h2></div>${timer}</div>`;
  }
  function cueHtml(c, extra = '') {
    if (!c) return '';
    return `<section class="cue enter"><div class="head"><div class="ic">${ICON(c.icon)}</div><div><h2>${esc(c.title)}</h2>${c.sub ? `<p class="sub">${esc(c.sub)}</p>` : ''}</div></div>
      ${c.keys && c.keys.length ? `<div><span class="label">Stikord</span>${keys(c.keys)}</div>` : ''}
      ${c.starter ? `<div class="starter"><small>Start med</small>${esc(c.starter)}</div>` : ''}
      ${extra}
      ${c.tip ? `<p class="tip">${ICON('bulb')}${esc(c.tip)}</p>` : ''}</section>`;
  }
  function playerHtml() {
    const s = V.screen, me = V.me.role;
    let h = `<header class="top"><div class="badge">${ICON(ROLE[me].i)}</div><div><b>${esc(V.me.name)} · ${ROLE[me].t}</b><span>${esc(V.case.title)}</span></div><button class="btn sm" data-a="sheet" data-s="role">Min rolle</button></header>`;
    h += statusHtml();
    if (s.mode === 'end') return h + endHtml(s);
    let extra = '';
    if (s.facts) extra += `<div class="facts">${s.facts.map(([i, b, t]) => `<div class="fact">${ICON(i)}<b>${esc(b)}</b><span>${esc(t)}</span></div>`).join('')}</div>`;
    if (s.twist) extra += `<div class="fact" style="flex-direction:row;gap:12px;align-items:flex-start">${ICON(s.twist.icon)}<div><b>${esc(s.twist.title)}</b><p style="font-size:14px;margin-top:4px">${esc(s.twist.text)}</p></div></div>`;
    if (s.used && s.used.length) extra += `<div><span class="label">Nævn dine beviser</span>${keys(s.used)}</div>`;
    h += cueHtml(s.cue, extra);
    if (s.showRoles) h += `<span class="label">I retten i dag</span>${seatsHtml(false)}`;
    if (s.theories) h += `<span class="label">Vælg én teori</span><div class="list">${s.theories.map(t => `<button class="opt" data-a="theory" data-i="${t.i}" aria-pressed="${t.picked}"><div class="ic">${ICON(me === 'prosecutor' ? 'scale' : 'shield')}</div><b>${esc(t.title)}</b><div class="tick">${ICON('check')}</div>${keys(t.keys)}</button>`).join('')}</div>`;
    if (s.preview) h += `<span class="label">Dine beviser</span><div class="list">${s.preview.map(e => `<div class="item"><div class="ic">${ICON(e.icon)}</div><b>${esc(e.title)}</b>${keys(e.keys)}</div>`).join('')}</div>`;
    if (s.personas) h += `<span class="label">Din personlighed</span><div class="list">${s.personas.map(p => `<button class="opt" data-a="persona" data-i="${p.i}" aria-pressed="${p.picked}"><div class="ic">${ICON('users')}</div><b>${esc(p.title)}</b><div class="tick">${ICON('check')}</div>${keys(p.keys)}</button>`).join('')}</div>`;
    if (s.saw) h += `<span class="label">Det så du</span><div class="card">${keys(s.saw)}</div>`;
    if (s.topics) h += `<span class="label">Spørg ind til</span><div class="list">${s.topics.map(t => `<div class="item"><div class="ic">${ICON(t.icon)}</div><b>${esc(t.label)}</b>${keys(t.keys)}</div>`).join('')}</div>`;
    if (s.answers) h += `<span class="label">Det ved du</span><div class="list">${s.answers.map(a => `<div class="item"><div class="ic">${ICON(a.icon)}</div><b>${esc(a.label)}</b>${keys(a.keys)}${a.note ? `<p class="note">${esc(a.note)}</p>` : ''}</div>`).join('')}</div>`;
    if (s.evidence) h += `<span class="label">Dine beviser</span><div class="list">${s.evidence.map(e => `<div class="item ${e.played ? 'done' : ''}"><div class="ic">${ICON(e.played ? 'check' : e.icon)}</div><b>${esc(e.title)}</b>${keys(e.keys)}${e.canPlay ? `<button class="btn ${e.played ? '' : 'role'} sm act" data-a="play" data-i="${e.i}">${e.played ? 'Vis igen' : 'Fremlæg'}</button>` : ''}</div>`).join('')}</div>`;
    if (s.secret) h += `<div class="secret ${ui.secret ? '' : 'blur'}" data-a="secret"><span class="label">Din hemmelighed ${ui.secret ? '' : '· tryk for at se'}</span><p>${esc(s.secret)}</p></div>`;
    if (s.objection) h += `<button class="btn danger objbtn wide" data-a="sheet" data-s="object">Indsigelse!</button>`;
    return h;
  }
  function endHtml(s) {
    let h = '';
    if (!s.verdict) return h + cueHtml(s.cue);
    h += `<div class="stamp ${s.verdict} enter">${s.verdict === 'guilty' ? 'Skyldig' : 'Ikke skyldig'}</div>`;
    h += `<div class="status ${s.win ? 'speak' : ''}"><div class="ic">${ICON(s.win ? 'check' : 'x')}</div><div><span class="label">${ROLE[V.me.role].t}</span><h2>${s.win ? 'Du vandt' : 'Du tabte'}</h2><p style="font-size:14px">${esc(s.winText)}</p></div></div>`;
    if (!s.truth) return h + `<p class="muted" style="text-align:center">Venter på, at dommeren afslører sandheden …</p>`;
    return h + truthHtml(s.truth);
  }
  const truthHtml = t => `<section class="cue enter"><div class="head"><div class="ic">${ICON('spark')}</div><div><span class="label">Sandheden</span><h2>${esc(t.title)}</h2></div></div><p>${esc(t.text)}</p><div class="starter"><small>Bagefter</small>${esc(t.epilogue)}</div></section>`;

  /* ---------- dommeren ---------- */
  function judgeHtml() {
    const s = V.screen, n = V.beats.length;
    let h = `<header class="top"><div class="badge">${ICON('gavel')}</div><div><b>Dommer · trin ${V.beat + 1} af ${n}</b><span>${esc(V.case.title)} · kode ${esc(V.code)}</span></div><button class="btn sm" data-a="sheet" data-s="roles">Roller</button></header>
      <nav class="steps" aria-label="Retssagens trin">${V.beats.map((b, i) => `<button class="${i < V.beat ? 'done' : i === V.beat ? 'now' : ''}" data-a="beat" data-i="${i}"><i>${i < V.beat ? '✓' : i + 1}</i>${esc(b)}</button>`).join('')}</nav>`;
    if (V.objection && V.objection.status === 'pending') h += `<div class="alert enter"><span class="label" style="color:#f3e1de">Indsigelse fra ${esc(V.objection.byTitle.toLowerCase())}en</span><h3>»${esc(V.objection.type)}«</h3>
      <div class="row"><button class="btn ok" data-a="rule" data-ok="1">Taget til følge</button><button class="btn" data-a="rule" data-ok="0">Afvist</button></div></div>`;
    h += `<div><span class="label">Nu</span><h1 style="font-size:28px;margin-top:4px">${esc(s.now)}</h1><p class="muted" style="margin-top:6px">${esc(s.hint)}</p></div>`;
    if (s.script && !(V.screen.extras || []).some(e => e.type === 'verdict' && V.verdict)) h += `<div class="script"><span class="label">${ICON('speech')}Læs højt</span><p>${esc(s.script)}</p></div>`;
    if (V.beat > 0 && V.beat < n - 1) h += `<div><span class="label">Hvem har ordet?</span><div class="floor" style="margin-top:6px">${V.seats.map(st => `<button data-a="floor" data-r="${st.role}" aria-pressed="${V.floor === st.role}">${badge(st.role)}<span>${esc(st.name || st.title)}</span></button>`).join('')}</div></div>`;
    if (V.timer) { const t = timerLeft(); h += `<div class="timerbox"><span class="t ${t <= 10 && V.timer.running ? 'low' : ''}" data-timer>${fmt(t)}</span><span class="grow muted">${V.timer.running ? 'Uret kører' : 'Ur'}</span>
      <button class="btn sm ${V.timer.running ? '' : 'ok'}" data-a="timer" data-t="${V.timer.running ? 'pause' : 'start'}">${V.timer.running ? 'Pause' : 'Start'}</button><button class="btn sm ghost" data-a="timer" data-t="reset" aria-label="Nulstil ur">↺</button></div>`; }
    for (const e of s.extras) h += judgeExtra(e, s);
    return h;
  }
  function judgeExtra(e, s) {
    const notes = store.get('rs-notes-' + V.code) || {};
    switch (e.type) {
      case 'timeline': return `<div class="card"><span class="label">Tidslinjen</span><div class="tl">${e.items.map(([t, x]) => `<div><b>${esc(t)}</b><span>${esc(x)}</span></div>`).join('')}</div></div>`;
      case 'tools': return `<div class="card"><span class="label">Din magt</span>
        <p><b>Ordet:</b> Tryk på en person under »Hvem har ordet?«. Deres telefon skifter til »Din tur«.</p>
        <p><b>Indsigelser:</b> Advokaterne kan sende en indsigelse. Den dukker op her – du afgør den.</p>
        <p><b>Næste trin:</b> Den store knap nederst flytter alle videre.</p></div>`;
      case 'questions': return `<div class="card"><span class="label">Dine egne spørgsmål til vidnet</span>${e.items.map(q => `<p>• ${esc(q)}</p>`).join('')}</div>`;
      case 'rules': return `<div class="card"><span class="label">Indsigelse – tag til følge hvis …</span>
        <p><b>Ledende:</b> spørgsmålet indeholder selv svaret.</p><p><b>Rygter:</b> vidnet har kun hørt det fra andre.</p><p><b>Gætter:</b> vidnet siger »jeg tror nok …«.</p><p><b>Irrelevant:</b> det har intet med sagen at gøre.</p></div>`;
      case 'twist': return `<div class="cue"><div class="head"><div class="ic">${ICON(e.icon)}</div><div><span class="label">Ny afsløring</span><h2>${esc(e.title)}</h2></div></div></div>`;
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
        if (!V.revealed) return h + `<button class="btn primary lg wide" data-a="reveal">Afslør sandheden for alle</button><button class="btn ghost wide" data-a="verdict" data-v="">Fortryd dommen</button>`;
        const right = s.truth.truth === V.verdict;
        return h + truthHtml(s.truth) + `<div class="status ${right ? 'speak' : ''}"><div class="ic">${ICON(right ? 'check' : 'x')}</div><div><h2>${right ? 'Retten ramte plet' : 'Retten tog fejl'}</h2><p style="font-size:14px">${right ? 'Dommen passer med sandheden.' : 'Retten kan kun dømme ud fra det, der bliver bevist.'}</p></div></div>
          <button class="btn wide" data-a="newcase">Ny sag med de samme spillere</button>`;
      }
    }
    return '';
  }
  function judgeFoot() {
    const n = V.beats.length;
    if (V.beat >= n - 1) return `<button class="btn" data-a="beat" data-i="${V.beat - 1}" aria-label="Forrige trin">◀</button><button class="btn" disabled>Sidste trin</button>`;
    return `<button class="btn" data-a="beat" data-i="${Math.max(0, V.beat - 1)}" ${V.beat === 0 ? 'disabled' : ''} aria-label="Forrige trin">◀</button>
      <button class="btn primary" data-a="beat" data-i="${V.beat + 1}">Næste: ${esc(V.beats[V.beat + 1])} ▶</button>`;
  }

  /* ---------- skuffer ---------- */
  function renderSheet() {
    let h = '';
    if (ui.sheet === 'role' && V) {
      const s = V.screen || {};
      h = `<h2>Du er ${ROLE[V.me.role].t.toLowerCase()}</h2><p>${esc(V.me.goal)}</p>
        <div class="card"><span class="label">Den tiltalte</span><p><b>${esc(V.case.accused)}</b></p></div>
        <span class="label">Rollerne</span>${seatsHtml(false)}`;
    } else if (ui.sheet === 'roles' && V) h = `<h2>Rollerne</h2>${seatsHtml(false)}`;
    else if (ui.sheet === 'object' && V) h = `<h2>Hvad er der galt?</h2><p class="muted">Vælg – så får dommeren besked. Råb »Indsigelse!« højt samtidig.</p>
      <div class="list">${V.objections.map((o, i) => `<button class="opt" data-a="object" data-t="${i}"><div class="ic">${ICON('hand')}</div><b>${esc(o)}</b><span>${['Spørgsmålet indeholder selv svaret', 'Vidnet har kun hørt det fra andre', 'Vidnet gætter i stedet for at vide', 'Det har intet med sagen at gøre'][i]}</span><div></div></button>`).join('')}</div>`;
    if (h) h += `<button class="btn wide" data-a="closeSheet">Luk</button>`;
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
    if (v.lastPlayed && v.lastPlayed.n !== last.played) { flash({ icon: v.lastPlayed.icon, label: `${v.lastPlayed.byTitle} fremlægger`, title: v.lastPlayed.title, keysList: v.lastPlayed.keys }); }
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
    document.querySelectorAll('[data-timer]').forEach(el => { el.textContent = fmt(t); el.classList.toggle('low', t <= 10 && V.timer.running); });
  }
  setInterval(tick, 500);

  /* ---------- klik ---------- */
  document.addEventListener('click', async e => {
    if (e.target === sheetEl) { ui.sheet = null; return render(); }
    const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    const a = b.dataset.a, i = Number(b.dataset.i);
    switch (a) {
      case 'toHome': ui.screen = 'home'; ui.err = null; return render();
      case 'toJoin': ui.screen = 'join'; ui.err = null; return render();
      case 'toCreate': ui.screen = 'create'; ui.err = null; ui.cases = await fetch('/api/cases').then(r => r.json()).catch(() => []); if (ui.caseIdx == null) ui.caseIdx = 0; return render();
      case 'pickCase': ui.caseIdx = i; store.set('rs-name', ($('nm') || {}).value || ''); return render();
      case 'create': {
        const name = $('nm').value.trim(); store.set('rs-name', name);
        const r = await post('/api/create', { name, caseIdx: ui.caseIdx }); if (r.error) { ui.err = r.error; return render(); }
        auth = { room: r.room, token: r.token }; return connect();
      }
      case 'join': {
        const room = $('cd').value.trim().toUpperCase(), name = $('nm').value.trim(); store.set('rs-name', name); ui.code = room;
        const r = await post('/api/join', { room, name }); if (r.error) { ui.err = r.error; return render(); }
        auth = { room: r.room, token: r.token }; history.replaceState(null, '', `?r=${r.room}`); return connect();
      }
      case 'pickRole': return act('role', { role: b.dataset.r });
      case 'unpick': return act('role', { role: null });
      case 'start': return act('start');
      case 'beat': return act('beat', { i });
      case 'floor': return act('floor', { role: V.floor === b.dataset.r ? null : b.dataset.r });
      case 'timer': return act('timer', { a: b.dataset.t });
      case 'theory': return act('theory', { i });
      case 'persona': return act('persona', { i });
      case 'play': return act('play', { i });
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
