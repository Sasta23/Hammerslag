/* =====================================================================
   HAMMERSLAG – RETSSALEN (prototype)
   Start:  node server.js     (ingen ekstra pakker)
   Åbn:    http://localhost:3000 på dommerens telefon eller computer.
   Alle telefoner skal være på samme Wi-Fi/hotspot som computeren.

   Idé: Dommeren styrer. Serveren holder styr på, hvilket trin retssagen
   er i, og hvem der har ordet, og sender hver telefon præcis det, den
   rolle skal se lige nu: stikord, billeder og en sætningsstarter.
   ===================================================================== */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const CASES = require('./data/cases.js');

const PORT = Number(process.env.PORT) || 3000;
const PUB = path.join(__dirname, 'public');

const ROLES = {
  judge:      { title: 'Dommer',    color: '#7a2b2b', icon: 'logo',  goal: 'Du leder retssagen og afsiger dommen.' },
  prosecutor: { title: 'Anklager',  color: '#3f5446', icon: 'scale',  goal: 'Få dommeren til at sige SKYLDIG.' },
  defense:    { title: 'Forsvarer', color: '#6e846f', icon: 'shield', goal: 'Skab rimelig tvivl, så dommen bliver IKKE SKYLDIG.' },
  witness:    { title: 'Vidne',     color: '#34405e', icon: 'eye',    goal: 'Fortæl retten, hvad der skete – med dine egne ord.' }
};
const ORDER = ['judge', 'prosecutor', 'defense', 'witness'];
// Antal spillere → hvilke roller er med. Ved 3 møder vidnet ikke op (forklaringen
// læses op). Ved 2 læser dommeren også anklagerens indlæg op.
const SIZES = { 4: ORDER, 3: ['judge', 'prosecutor', 'defense'], 2: ['judge', 'defense'] };
const rolesOf = r => SIZES[r.size] || ORDER;

/* Retssagens trin. floor = hvem der har ordet, når trinnet starter. */
const BEATS = [
  { id: 'sagen', label: 'Sagen', floor: 'judge' },
  { id: 'forb', label: 'Forberedelse', floor: null, secs: 60 },
  { id: 'aab_p', label: 'Anklagerens åbningstale', floor: 'prosecutor', secs: 45 },
  { id: 'aab_d', label: 'Forsvarerens åbningstale', floor: 'defense', secs: 45 },
  { id: 'vidne', label: 'Vidnet fortæller', floor: 'witness', secs: 45 },
  { id: 'fh_p', label: 'Anklageren afhører', floor: 'prosecutor', secs: 60 },
  { id: 'fh_d', label: 'Forsvareren krydsforhører', floor: 'defense', secs: 60 },
  { id: 'bev_p', label: 'Anklagerens beviser', floor: 'prosecutor', secs: 90 },
  { id: 'bev_d', label: 'Forsvarerens beviser', floor: 'defense', secs: 90 },
  { id: 'twist', label: 'Nyt bevis', floor: 'judge', secs: 90 },
  { id: 'sid_p', label: 'Anklagerens sidste ord', floor: 'prosecutor', secs: 30 },
  { id: 'sid_d', label: 'Forsvarerens sidste ord', floor: 'defense', secs: 30 },
  { id: 'dom', label: 'Dommen', floor: 'judge' }
];
const OBJECTIONS = [
  { t: 'Ledende spørgsmål!', d: 'Spørgsmålet indeholder selv svaret' },
  { t: 'Vidnet gætter!', d: 'Vidnet ved det ikke – hun gætter' },
  { t: 'Det er bare rygter!', d: 'Vidnet har kun hørt det fra andre' },
  { t: 'Beviset viser ikke det!', d: 'Beviset beviser ikke det, de påstår' },
  { t: 'Det er irrelevant!', d: 'Det har intet med sagen at gøre' },
  { t: 'De presser vidnet!', d: 'Spørgsmålene er urimelige over for vidnet' }
];
const MAX_EVIDENCE = 2;
const BEV = { bev_p: 'prosecutor', bev_d: 'defense' };
// Hvem må gøre indsigelse? Vidnet er anklagerens vidne – så forsvareren må
// gøre indsigelse, når anklageren eller vidnet taler, og anklageren kun, når
// forsvareren taler. Én indsigelse pr. advokat pr. trin – i bevisfasen én pr. bevis.
const OBJ_BEATS = ['aab_p', 'aab_d', 'vidne', 'fh_p', 'fh_d', 'bev_p', 'bev_d', 'twist'];
const lastEv = r => r.played[r.played.length - 1];
function objKey(r, role) {
  if (!BEV[BT(r).id]) return role;
  const L = lastEv(r); return L ? `${role}:${L.role}${L.i}` : null;
}
function allowedObj(r, role) {
  const id = BT(r).id, f = r.floor;
  if (r.phase !== 'game' || !OBJ_BEATS.includes(id) || !(role === 'prosecutor' || role === 'defense')) return [];
  if (!(role === 'defense' ? ['prosecutor', 'witness'] : ['defense']).includes(f)) return [];
  const key = objKey(r, role); if (!key || r.objUsed[key]) return [];
  if (BEV[id]) { const L = lastEv(r); return L && L.role === BEV[id] && L.role !== role ? [3, 4] : []; }
  const list = [4];
  const witnessTalks = ['vidne', 'fh_p', 'fh_d'].includes(id) || f === 'witness';
  if (role === 'defense' && witnessTalks) list.unshift(1, 2);
  if (role === 'defense' && id === 'fh_p') list.unshift(0);
  if (role === 'prosecutor' && id === 'fh_d') list.unshift(0, 5);
  return list;
}
const evOf = (r, x) => (x.role === 'prosecutor' ? C(r).prosecution : C(r).defense).evidence[x.i];
function presented(r, side) {
  return r.played.filter(x => x.role === side).map((x, n) => ({ n: n + 1, k: (side === 'prosecutor' ? 'p' : 'd') + x.i, ...evOf(r, x), objection: r.evObj[x.role + x.i] || null }));
}

/* ---------- rum ---------- */
const rooms = new Map();
const tok = () => crypto.randomBytes(16).toString('hex');
const pick = (v, room) => Array.isArray(v) && Array.isArray(v[0]) ? v[room.variant] : v;
function code() { const L = 'ABCDEFGHJKLMNPRSTUVWXYZ'; let c; do { c = Array.from({ length: 4 }, () => L[crypto.randomInt(L.length)]).join(''); } while (rooms.has(c)); return c; }
function lan() {
  for (const list of Object.values(os.networkInterfaces())) for (const n of list || [])
    if (n.family === 'IPv4' && !n.internal && /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))/.test(n.address)) return n.address;
  for (const list of Object.values(os.networkInterfaces())) for (const n of list || []) if (n.family === 'IPv4' && !n.internal) return n.address;
  return 'localhost';
}
function base(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
  const h = (req.headers.host || '').split(':')[0];
  if (h && h !== 'localhost' && h !== '127.0.0.1') return `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
  return `http://${lan()}:${PORT}`;
}
function newRoom(caseIdx, joinBase, size = 4) {
  const r = { code: code(), caseIdx, size, variant: crypto.randomInt(CASES[caseIdx].twists.length), joinBase, players: [], phase: 'lobby', beat: 0, turn: 0, floor: 'judge',
    timer: null, objection: null, played: [], theory: {}, persona: null, objUsed: {}, evObj: {}, sel: {}, verdict: null, revealed: false, conns: new Set(), fx: 0, touched: Date.now() };
  rooms.set(r.code, r); return r;
}
const BYID = Object.fromEntries([...BEATS, { id: 'forkl', label: 'Vidneforklaringen', floor: 'judge', secs: 60 }].map(b => [b.id, b]));
// Vertical slice: 7 trin. Et trin kan have flere »ture« – dommeren giver ordet videre med »Næste«.
const STEPS = {
  4: [['Sagen', 'sagen'], ['Åbningstaler', 'aab_p', 'aab_d'], ['Vidnet', 'vidne', 'fh_p', 'fh_d'], ['Anklagerens beviser', 'bev_p'], ['Forsvarerens beviser', 'bev_d'], ['Sidste ord', 'sid_p', 'sid_d'], ['Dommen', 'dom']],
  3: [['Sagen', 'sagen'], ['Åbningstaler', 'aab_p', 'aab_d'], ['Vidneforklaringen', 'forkl'], ['Anklagerens beviser', 'bev_p'], ['Forsvarerens beviser', 'bev_d'], ['Sidste ord', 'sid_p', 'sid_d'], ['Dommen', 'dom']]
};
const stepsOf = r => STEPS[r.size === 4 ? 4 : 3];
const turnsOf = r => stepsOf(r)[r.beat].slice(1);
const BT = r => BYID[turnsOf(r)[r.turn || 0]];
// Ved 2 spillere fremlægger dommeren anklagerens beviser.
const alsoPlays = r => r.phase === 'game' && r.size === 2 && BT(r).id === 'bev_p' ? ['prosecutor'] : [];
const C = r => CASES[r.caseIdx];
const T = r => C(r).twists[r.variant];
const byRole = (r, role) => r.players.find(p => p.role === role);
const nameOf = (r, role) => (byRole(r, role) || {}).name || ROLES[role].title;

/* ---------- hvad hver rolle ser ---------- */
function judgeScreen(r) {
  const c = C(r), b = BT(r), w = c.witness, s = {};
  const ex = [];
  switch (b.id) {
    case 'sagen':
      s.now = 'Sæt retten'; s.hint = 'Rejs dig, og læs sagen højt. Imens vælger advokaterne deres teori.';
      s.script = ['Retten er sat.', `I dag behandler vi sagen mod ${c.accused.name}, ${c.accused.about}.`, ...c.intro, `${c.accused.name} er tiltalt for ${c.charge}. Han nægter sig skyldig.`];
      if (r.size < 4) s.script.push(`Vidnet ${w.name} møder ikke op i dag. Retten læser hendes forklaring til politiet op.${r.size === 2 ? ' Anklagerens indlæg bliver også læst op af retten.' : ''}`);
      s.warning = c.warning;
      ex.push({ type: 'timeline', items: c.timeline }); break;
    case 'forb':
      s.now = 'Forberedelse'; s.hint = 'Alle forbereder sig på deres telefon. Start uret.';
      s.script = 'Retten giver parterne ét minut til at forberede sig.';
      ex.push({ type: 'tools' }); break;
    case 'aab_p': s.now = 'Anklagerens åbningstale';
      if (r.size === 2) { s.hint = 'Læs anklagerens åbningstale højt. Forsvareren lytter.'; s.script = ['Anklagemyndigheden har ordet. Retten læser op:', ...c.prosecution.script.opening]; }
      else { s.hint = 'Lyt: Hvad påstår anklageren? Kan det bevises?'; s.script = 'Anklageren har ordet.'; }
      break;
    case 'forkl': s.now = 'Vidneforklaringen';
      s.hint = `Læs forklaringen roligt højt. Giv derefter ordet til ${r.size === 2 ? 'forsvareren' : 'hver advokat'} for en kort kommentar.`;
      s.script = [`${w.name}, ${w.about}, har forklaret til politiet:`, ...w.statement.map(x => `»${x}«`)];
      ex.push({ type: 'questions', items: c.judgeQuestions.map(q => q.replace(/\b(du|Du)\b/g, 'hun')) }); break;
    case 'aab_d': s.now = 'Forsvarerens åbningstale'; s.hint = 'Lyt: Hvilken tvivl prøver forsvaret at skabe?'; s.script = 'Tak. Forsvareren har ordet.'; break;
    case 'vidne': s.now = 'Kald vidnet'; s.hint = 'Vidnet fortæller med egne ord, hvad der skete.';
      s.script = [`Retten kalder vidnet ${w.name}, ${w.about}.`, 'De skal tale sandt. Fortæl retten, hvad der skete.']; break;
    case 'fh_p': s.now = 'Anklageren afhører'; s.hint = 'Hold øje med indsigelser. Du må også selv spørge.';
      s.script = 'Anklageren må stille vidnet spørgsmål.'; ex.push({ type: 'questions', items: c.judgeQuestions }, { type: 'rules' }); break;
    case 'fh_d': s.now = 'Forsvareren krydsforhører'; s.hint = 'Hold øje med indsigelser. Du må også selv spørge.';
      s.script = 'Forsvareren må nu krydsforhøre vidnet.'; ex.push({ type: 'questions', items: c.judgeQuestions }, { type: 'rules' }); break;
    case 'bev_p': case 'bev_d': {
      const P = b.id === 'bev_p', side = BEV[b.id];
      s.now = P ? 'Anklagerens beviser' : 'Forsvarerens beviser';
      s.timerNote = '0:30 til at vælge beviser · 1:00 til at fremlægge';
      s.hint = P && r.size === 2 ? `Du fremlægger anklagerens beviser i boksen nederst (højst ${MAX_EVIDENCE}). Læs dem højt. Forsvareren kan gøre indsigelse mod hvert bevis.` : `${P ? 'Anklageren' : 'Forsvareren'} fremlægger op til ${MAX_EVIDENCE} beviser. ${P ? 'Forsvareren' : 'Anklageren'} kan gøre indsigelse mod hvert bevis. Vurdér hvert bevis.`;
      s.script = [`${P ? 'Anklageren' : 'Forsvareren'} må nu fremlægge sine beviser.`, `Højst ${MAX_EVIDENCE} beviser.`];
      s.presented = { side, items: presented(r, side), left: (P ? c.prosecution : c.defense).evidence.filter((e, i) => !r.played.some(x => x.role === side && x.i === i)).map(e => e.title) };
      break;
    }
    case 'twist': s.now = 'Nyt bevis'; s.hint = r.size === 4 ? 'Læs det roligt højt. Giv så ordet til vidnet – og bagefter advokaterne.' : 'Læs det roligt højt. Giv så ordet til advokaterne.';
      s.script = ['Ro i retten! Der er kommet nyt i sagen.', `${T(r).reveal.title}: ${T(r).reveal.text}`, r.size === 4 ? `${w.name}, kan De fortælle retten mere om det?` : r.size === 3 ? 'Hvad siger parterne til det?' : 'Forsvarer, hvad siger De til det?'];
      ex.push({ type: 'twist', ...T(r).reveal }); break;
    case 'sid_p': s.now = 'Anklagerens sidste ord'; s.hint = '30 sekunder. Ingen afbrydelser.'; s.script = r.size === 2 ? ['Anklagerens sidste ord. Retten læser op:', ...c.prosecution.script.closing] : 'Anklageren, De har 30 sekunder til Deres sidste ord.';
      if (r.size === 2) s.hint = 'Læs anklagerens sidste ord højt.'; break;
    case 'sid_d': s.now = 'Forsvarerens sidste ord'; s.hint = 'Forsvaret har altid det sidste ord.'; s.script = 'Forsvareren, De har ordet til sidst.'; break;
    case 'dom':
      s.now = r.verdict ? 'Læs dommen op' : 'Afsig din dom';
      s.hint = r.verdict ? 'Rejs dig, og læs dommen højt. Afslør så sandheden.' : 'Er det BEVIST? Er der rimelig tvivl, skal den tiltalte frikendes.';
      ex.push({ type: 'notebook', summary: true }, { type: 'verdict' }); break;
  }
  s.extras = ex;
  s.evidence = [
    ...c.prosecution.evidence.map((e, i) => ({ k: 'p' + i, side: 'prosecutor', ...e, played: r.played.some(x => x.role === 'prosecutor' && x.i === i) })),
    ...c.defense.evidence.map((e, i) => ({ k: 'd' + i, side: 'defense', ...e, played: r.played.some(x => x.role === 'defense' && x.i === i) }))
  ];
  if (r.revealed) s.truth = { title: T(r).truthTitle, text: T(r).truthText, truth: T(r).truth, epilogue: T(r).epilogue[r.verdict] };
  return s;
}

function playerScreen(r, role) {
  const c = C(r), b = BT(r), w = c.witness, me = role, mine = r.floor === me;
  const lawyer = role === 'prosecutor' || role === 'defense';
  const side = role === 'prosecutor' ? c.prosecution : role === 'defense' ? c.defense : null;
  const th = side && r.theory[role] != null ? side.theories[r.theory[role]] : null;
  const s = { mode: mine ? 'speak' : 'listen' };
  const listen = (title, keys, icon = 'ear') => Object.assign(s, { mode: 'listen', cue: { icon, title, keys } });
  const speak = (title, icon, keys, starter, tip) => Object.assign(s, { mode: 'speak', cue: { icon, title, keys, starter, tip } });
  const theoryChoice = () => side.theories.map((t, i) => ({ i, title: t.title, keys: t.keys, picked: r.theory[role] === i }));

  switch (b.id) {
    case 'sagen':
      s.mode = 'listen'; s.cue = { icon: 'logo', title: 'Dommeren sætter retten', sub: 'Lyt godt efter.' };
      s.facts = c.facts; s.showRoles = true;
      if (lawyer) { s.theories = theoryChoice(); s.theoryHint = 'Vælg din teori, mens du lytter'; }
      if (role === 'witness') { s.personas = w.personas.map((p, i) => ({ i, title: p.t, keys: p.keys, picked: r.persona === i })); }
      break;
    case 'forb':
      s.mode = 'private';
      if (lawyer) { s.cue = { icon: role === 'prosecutor' ? 'scale' : 'shield', title: 'Vælg din teori', sub: 'Hvad skete der – ifølge dig?' }; s.theories = theoryChoice(); s.preview = side.evidence; }
      else { s.cue = { icon: 'eye', title: 'Hvem er du som vidne?', sub: `Du er ${w.name}, ${w.about}.` }; s.personas = w.personas.map((p, i) => ({ i, title: p.t, keys: p.keys, picked: r.persona === i })); s.saw = w.keys; s.secret = w.pressure; }
      break;
    case 'aab_p': case 'aab_d': {
      const speaker = b.id === 'aab_p' ? 'prosecutor' : 'defense';
      if (role === speaker) {
        if (!th) { s.mode = 'private'; s.cue = { icon: 'scale', title: 'Vælg din teori først', sub: 'Så får du dine stikord.' }; s.theories = theoryChoice(); break; }
        speak('Din åbningstale', 'mic', th.keys, th.starter); s.cue.end = role === 'prosecutor' ? 'Det vil vi bevise i dag.' : 'Ved tvivl skal man frifinde.';
        s.theoryTitle = th.title; if (!mine) s.mode = 'ready';
      } else if (lawyer) listen('Lyt efter huller', role === 'prosecutor' ? ['Undskyldninger', 'Hvad kan du modbevise?', 'Husk til dit sidste ord'] : ['Hvad påstår de?', 'Hvad mangler bevis?', 'Husk til krydsforhøret']);
      else listen('Øv dit vidneudsagn', w.keys, 'eye');
      break;
    }
    case 'vidne':
      if (role === 'witness') { speak('Fortæl, hvad der skete', 'eye', w.keys, w.starter, r.persona != null ? `Husk: Du er ${w.personas[r.persona].t.toLowerCase()}.` : null); s.cue.end = 'Det er det, jeg husker.'; if (!mine) s.mode = 'ready'; }
      else listen('Lyt til vidnet', ['Hvad siger hun præcist?', 'Hvad er usikkert?', 'Hvad kan du spørge om?'], 'ear');
      break;
    case 'fh_p': case 'fh_d': {
      const asker = b.id === 'fh_p' ? 'prosecutor' : 'defense';
      const topics = (asker === 'prosecutor' ? c.prosecution : c.defense).topics;
      const answers = w.answers[asker === 'prosecutor' ? 'prosecution' : 'defense'];
      if (role === asker) {
        s.mode = mine ? 'speak' : 'listen';
        s.cue = { icon: 'mic', title: asker === 'prosecutor' ? 'Spørg vidnet' : 'Krydsforhør vidnet', sub: asker === 'prosecutor' ? `Få ${w.name} til at sige noget, der skader ${c.accused.short}.` : `Find huller i ${w.name}s historie.`, starter: 'Kan De fortælle retten, hvad …', tip: 'Ét spørgsmål ad gangen.', end: 'Tak. Ingen flere spørgsmål.' };
        s.topics = topics.map((t, i) => ({ icon: t.icon, label: t.label, keys: t.keys }));
      } else if (role === 'witness') {
        s.mode = 'answer';
        s.cue = { icon: 'eye', title: 'Du bliver afhørt', sub: 'Svar med dine egne ord.' };
        s.answers = topics.map((t, i) => ({ icon: t.icon, label: t.label, keys: pick(answers[i].keys, r), note: answers[i].note || null }));
        if (asker === 'defense') s.secret = w.pressure;
      } else listen('Lyt efter svarene', asker === 'prosecutor' ? ['Hvad er usikkert?', 'Noter svar, du kan bruge', 'Ledende spørgsmål?'] : ['Ledende spørgsmål?', 'Presser de vidnet?', 'Er det relevant?']);
      break;
    }
    case 'forkl':
      if (lawyer) {
        const P = role === 'prosecutor';
        listen('Lyt til vidneforklaringen', P ? ['Hvad støtter din sag?', 'Passer det med beviserne?'] : ['Hvad er usikkert?', 'Hvad mangler bevis?', 'Ingen kan krydsforhøre hende']);
        s.cue.sub = 'Bagefter må du kommentere.';
        s.cue.starter = P ? 'Forklaringen viser tydeligt, at …' : 'Forklaringen beviser ikke, at …';
      }
      break;
    case 'bev_p': case 'bev_d': {
      const presenter = BEV[b.id], items = presented(r, presenter);
      if (role === presenter) {
        const played = i => r.played.some(x => x.role === role && x.i === i), sel = r.sel[role] || [];
        s.mode = mine ? 'speak' : 'ready';
        s.cue = { icon: 'folder', title: 'Dine beviser', starter: 'Ærede dommer, beviset viser …', end: role === 'prosecutor' ? 'Det beviser hans skyld.' : 'Det skaber rimelig tvivl.' };
        s.evSteps = { picked: sel.length, max: MAX_EVIDENCE, shown: items.length };
        s.split = { at: 60, first: 'Vælg dine beviser', second: 'Fremlæg dine beviser' };
        s.evidence = side.evidence.map((e, i) => ({ i, ...e, played: played(i), selected: sel.includes(i), canSelect: !played(i) && (sel.includes(i) || sel.length < MAX_EVIDENCE), canPlay: mine && sel.includes(i) }));
        s.evidence.sort((a, b) => b.selected - a.selected);
      } else if (lawyer) {
        listen(`${ROLES[presenter].title}en fremlægger`, ['Hvad viser det IKKE?', 'Anden forklaring?'], 'folder');
        s.cue.sub = 'Én indsigelse pr. bevis.'; s.cue.starter = 'Det beviser intet, fordi …';
        s.shown = items; s.shownBy = presenter;
      } else { listen('Lyt til beviserne', ['Lyt roligt', 'Dommeren kan spørge dig'], 'ear'); s.shown = items; s.shownBy = presenter; }
      break;
    }
    case 'twist':
      s.twist = T(r).reveal;
      if (role === 'witness') {
        s.mode = mine ? 'speak' : 'ready';
        s.cue = { icon: 'spark', title: mine ? 'Fortæl om det nye bevis' : 'Gør dig klar', sub: mine ? null : 'Når du får ordet, fortæller du om det her.', keys: T(r).moment, starter: T(r).momentStarter, tip: 'Tal roligt. Du må gerne holde pauser.' };
      } else {
        const P = role === 'prosecutor';
        s.mode = mine ? 'speak' : 'listen';
        s.cue = { icon: 'spark', title: mine ? 'Hvad betyder det for sagen?' : 'Lyt til vidnet', sub: mine ? null : 'Bagefter spørger dommeren dig.', keys: P ? ['Beviset støtter vidnet', 'Stadig skyldig'] : ['Beviser det alt?', 'Rimelig tvivl', 'Ord mod ord'], starter: P ? 'Beviset viser tydeligt, at …' : 'Beviset viser ikke, at …' };
      }
      break;
    case 'sid_p': case 'sid_d': {
      const speaker = b.id === 'sid_p' ? 'prosecutor' : 'defense';
      if (role === speaker) {
        if (!th) { s.mode = 'private'; s.cue = { icon: 'scale', title: 'Vælg din teori', sub: 'Vælg den, du har brugt.' }; s.theories = theoryChoice(); break; }
        const used = side.evidence.filter((e, i) => r.played.some(x => x.role === role && x.i === i)).map(e => ({ icon: e.icon, title: e.title }));
        speak('Dit sidste ord', 'mic', th.closeKeys, th.closeStarter); s.cue.end = speaker === 'defense' ? 'Der er rimelig tvivl, ærede dommer.' : 'Han bør findes skyldig.';
        if (!mine) s.mode = 'ready';
        s.used = used;
      } else listen('Lyt', role === 'witness' ? ['Snart kommer dommen'] : ['Snart er det din tur', 'Hvad vil du slutte med?']);
      break;
    }
    case 'dom':
      s.mode = 'end';
      s.cue = { icon: 'logo', title: r.verdict ? 'Dommen er afsagt' : 'Dommeren overvejer …', sub: r.verdict ? (r.revealed ? '' : 'Venter på den rigtige dom …') : 'Hold vejret.' };
      if (r.verdict) {
        s.verdict = r.verdict;
        const win = role === 'prosecutor' ? r.verdict === 'guilty' : role === 'defense' ? r.verdict === 'notGuilty' : r.verdict === T(r).truth;
        s.win = win;
        s.winText = role === 'witness' ? (win ? 'Dommen passer med sandheden.' : 'Dommen passer ikke med sandheden.') : (win ? 'Du fik den dom, du kæmpede for!' : 'Dommeren valgte modpartens side.');
      }
      if (r.revealed) s.truth = { title: T(r).truthTitle, text: T(r).truthText, truth: T(r).truth, epilogue: T(r).epilogue[r.verdict] };
      break;
  }
  // Dommeren kan give ordet til hvem som helst – så skifter skærmen til »din tur«.
  if (mine && s.mode === 'listen') { s.mode = 'speak'; s.cue = { ...s.cue, title: 'Dommeren giver dig ordet', sub: null, starter: s.cue && s.cue.starter || 'Ærede dommer, jeg mener …' }; }
  return s;
}

function view(r, p) {
  const c = C(r);
  const v = {
    code: r.code, joinUrl: `${r.joinBase}/?r=${r.code}`, phase: r.phase, serverNow: Date.now(), fx: r.fx,
    case: { title: c.title, tagline: c.tagline, icon: c.icon, accused: c.accused.name, warning: c.warning },
    size: r.size,
    seats: rolesOf(r).map(k => { const x = byRole(r, k); return { role: k, title: ROLES[k].title, color: ROLES[k].color, icon: ROLES[k].icon, name: x ? x.name : null, online: x ? x.conns > 0 : false }; }),
    me: { id: p.id, name: p.name, role: p.role, goal: p.role ? ROLES[p.role].goal : '' }
  };
  if (r.phase !== 'game') return v;
  Object.assign(v, {
    beat: r.beat, beatLabel: BT(r).label, floor: r.floor, floorName: r.floor ? nameOf(r, r.floor) : null,
    timer: r.timer, objection: r.objection && { ...r.objection, byName: nameOf(r, r.objection.by), byTitle: ROLES[r.objection.by].title },
    lastPlayed: r.played.length ? (() => { const x = r.played[r.played.length - 1]; const e = (x.role === 'prosecutor' ? c.prosecution : c.defense).evidence[x.i]; return { n: r.played.length, by: nameOf(r, x.role), byTitle: ROLES[x.role].title, ...e }; })() : null,
    verdict: r.verdict, revealed: r.revealed
  });
  if (p.role === 'judge') { v.beats = stepsOf(r).map(x => x[0]); const tu = turnsOf(r); v.turn = { i: r.turn, n: tu.length, next: tu[r.turn + 1] ? BYID[tu[r.turn + 1]].label : null, labels: tu.map(id => BYID[id].label) }; v.screen = judgeScreen(r); v.alsoPlays = alsoPlays(r).map(role => ({ role, screen: playerScreen(r, role) })); }
  else {
    v.screen = playerScreen(r, p.role);
    // Næste i samme trin? Så får man en guide til sin tur, mens man lytter.
    const tu = turnsOf(r), nx = r.phase === 'game' && tu[r.turn + 1] && BYID[tu[r.turn + 1]];
    if (nx && nx.floor === p.role && r.floor !== p.role && (p.role === 'prosecutor' || p.role === 'defense')) {
      const save = [r.turn, r.floor]; r.turn++; r.floor = p.role;
      try { const ns = playerScreen(r, p.role); if (ns.cue && ns.cue.starter) v.screen.next = ns.cue; } finally { [r.turn, r.floor] = save; }
    }
    const ok = allowedObj(r, p.role), key = objKey(r, p.role);
    v.objections = ok.map(i => ({ i, ...OBJECTIONS[i] }));
    v.screen.objection = ok.length > 0;
    v.screen.objUsed = !ok.length && !!key && !!r.objUsed[key] && (BEV[BT(r).id] ? 'bevis' : 'tur');
  }
  return v;
}

/* ---------- live-forbindelser ---------- */
function push(conn) { const r = rooms.get(conn.room), p = r && r.players.find(x => x.id === conn.pid); if (p) conn.res.write(`data: ${JSON.stringify(view(r, p))}\n\n`); }
function broadcast(r) { r.touched = Date.now(); for (const c of r.conns) push(c); }

/* ---------- handlinger ---------- */
function act(r, p, type, d = {}) {
  // Med 3 spillere spiller dommeren også den manglende rolle.
  if (p.role === 'judge' && d && d.as && alsoPlays(r).includes(d.as) && ['theory', 'persona', 'play', 'select'].includes(type)) p = { ...p, role: d.as };
  const judge = p.role === 'judge', game = r.phase === 'game';
  const need = ok => { if (!ok) throw new Error('Det kan du ikke lige nu.'); };
  switch (type) {
    case 'role':
      need(r.phase === 'lobby' && !judge && (d.role === null || (rolesOf(r).includes(d.role) && d.role !== 'judge')));
      if (d.role === null) { p.role = null; break; }
      if (byRole(r, d.role) && byRole(r, d.role) !== p) throw new Error(`${nameOf(r, d.role)} er allerede ${ROLES[d.role].title.toLowerCase()}.`);
      p.role = d.role; break;
    case 'start': need(judge && r.phase === 'lobby' && rolesOf(r).every(k => byRole(r, k))); r.phase = 'game'; if (r.size === 2) r.theory.prosecutor = 0; setBeat(r, 0); break;
    case 'size': need(judge && r.phase === 'lobby' && SIZES[d.n]); r.size = d.n; for (const x of r.players) if (x.role && !rolesOf(r).includes(x.role)) x.role = null; break;
    case 'beat': need(judge && game && Number.isInteger(d.i) && d.i >= 0 && d.i < stepsOf(r).length); setBeat(r, d.i); break;
    case 'turn': need(judge && game && Number.isInteger(d.i) && d.i >= 0 && d.i < turnsOf(r).length); r.turn = d.i; applyTurn(r); break;
    case 'floor': need(judge && game && (d.role === null || ORDER.includes(d.role))); r.floor = d.role; r.fx++; break;
    case 'timer': {
      need(judge && game); const t = r.timer || { secs: BT(r).secs || 60, endsAt: null, left: BT(r).secs || 60, running: false };
      if (d.a === 'start') { t.endsAt = Date.now() + t.left * 1000; t.running = true; }
      else if (d.a === 'pause') { t.left = Math.max(0, Math.ceil((t.endsAt - Date.now()) / 1000)); t.running = false; }
      else if (d.a === 'reset') { t.left = t.secs; t.running = false; t.endsAt = null; }
      r.timer = t; break;
    }
    case 'theory': need(game && (p.role === 'prosecutor' || p.role === 'defense') && [0, 1].includes(d.i)); r.theory[p.role] = d.i; break;
    case 'persona': need(game && p.role === 'witness' && Number.isInteger(d.i) && C(r).witness.personas[d.i]); r.persona = d.i; break;
    case 'object': {
      need(game && allowedObj(r, p.role).includes(d.t) && !(r.objection && r.objection.status === 'pending'));
      r.objUsed[objKey(r, p.role)] = true;
      const L = BEV[BT(r).id] && lastEv(r);
      r.objection = { by: p.role, type: OBJECTIONS[d.t].t, status: 'pending', id: ++r.fx, ev: L ? L.role + L.i : null, about: L ? evOf(r, L).title : null };
      if (L) r.evObj[r.objection.ev] = { type: r.objection.type, status: 'pending' };
      break;
    }
    case 'rule':
      need(judge && r.objection && r.objection.status === 'pending'); r.objection.status = d.ok ? 'accepted' : 'rejected'; r.objection.id = ++r.fx;
      if (r.objection.ev) r.evObj[r.objection.ev] = { type: r.objection.type, status: r.objection.status };
      break;
    case 'select': {
      need(game && BEV[BT(r).id] === p.role && Number.isInteger(d.i) && (p.role === 'prosecutor' ? C(r).prosecution : C(r).defense).evidence[d.i]);
      const sel = r.sel[p.role] = r.sel[p.role] || [];
      if (sel.includes(d.i)) { need(!r.played.some(x => x.role === p.role && x.i === d.i)); sel.splice(sel.indexOf(d.i), 1); }
      else { if (sel.length >= MAX_EVIDENCE) throw new Error(`Du kan højst vælge ${MAX_EVIDENCE} beviser.`); sel.push(d.i); }
      // Har man valgt sine beviser, springer uret videre til »fremlæg« (1 minut).
      if (sel.length === MAX_EVIDENCE && r.timer) {
        const t = r.timer, left = t.running ? Math.ceil((t.endsAt - Date.now()) / 1000) : t.left;
        t.left = Math.min(left, 60); t.endsAt = Date.now() + t.left * 1000; t.running = true; r.fx++;
      }
      break;
    }
    case 'play': {
      need(game && BEV[BT(r).id] === p.role && r.floor === p.role && !(r.objection && r.objection.status === 'pending'));
      const ev = (p.role === 'prosecutor' ? C(r).prosecution : C(r).defense).evidence; need(ev[d.i]);
      if (!(r.sel[p.role] || []).includes(d.i)) throw new Error('Vælg beviset først.');
      if (!r.played.some(x => x.role === p.role && x.i === d.i) && r.played.filter(x => x.role === p.role).length >= MAX_EVIDENCE) throw new Error(`Du kan højst fremlægge ${MAX_EVIDENCE} beviser.`);
      if (!r.played.some(x => x.role === p.role && x.i === d.i)) r.played.push({ role: p.role, i: d.i });
      else { r.played = r.played.filter(x => !(x.role === p.role && x.i === d.i)); r.played.push({ role: p.role, i: d.i }); }
      r.fx++; break;
    }
    case 'verdict': need(judge && BT(r).id === 'dom' && ['guilty', 'notGuilty', null].includes(d.v)); r.verdict = d.v; if (!d.v) r.revealed = false; break;
    case 'reveal': need(judge && r.verdict); r.revealed = true; break;
    case 'newcase': need(judge); Object.assign(r, { phase: 'lobby', beat: 0, turn: 0, caseIdx: (r.caseIdx + 1) % CASES.length, variant: crypto.randomInt(CASES[(r.caseIdx + 1) % CASES.length].twists.length), played: [], theory: {}, persona: null, objUsed: {}, evObj: {}, sel: {}, verdict: null, revealed: false, objection: null, timer: null }); break;
    default: throw new Error('Ukendt handling');
  }
}
function setBeat(r, i) { r.beat = i; r.turn = 0; applyTurn(r); }
function applyTurn(r) {
  const b = BT(r);
  r.floor = b.floor; r.objection = null; r.objUsed = {};
  r.timer = b.secs ? { secs: b.secs, left: b.secs, endsAt: null, running: false } : null;
  r.fx++;
}

/* ---------- HTTP ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const json = (res, code, o) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
const body = req => new Promise((ok, bad) => { let s = ''; req.on('data', d => { s += d; if (s.length > 1e5) req.destroy(); }); req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { bad(e); } }); });
const cleanName = n => String(n || '').trim().slice(0, 16);

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname === '/api/cases') return json(res, 200, CASES.map((c, i) => ({ i, title: c.title, tagline: c.tagline, icon: c.icon, warning: c.warning })));
    if (url.pathname === '/api/create' && req.method === 'POST') {
      const d = await body(req); const name = cleanName(d.name);
      if (!name) return json(res, 400, { error: 'Skriv dit navn.' });
      const r = newRoom(Math.max(0, Math.min(CASES.length - 1, Number(d.caseIdx) || 0)), base(req), SIZES[d.size] ? Number(d.size) : 4);
      const p = { id: tok().slice(0, 8), token: tok(), name, role: 'judge', conns: 0 }; r.players.push(p);
      return json(res, 200, { room: r.code, token: p.token });
    }
    if (url.pathname === '/api/join' && req.method === 'POST') {
      const d = await body(req); const r = rooms.get(String(d.room || '').toUpperCase().trim());
      if (!r) return json(res, 404, { error: 'Retssagen findes ikke. Tjek koden.' });
      const name = cleanName(d.name);
      if (!name) return json(res, 400, { error: 'Skriv dit navn.' });
      if (r.phase !== 'lobby') return json(res, 409, { error: 'Retssagen er allerede i gang.' });
      if (r.players.length >= 4) return json(res, 409, { error: 'Der er allerede 4 i retten.' });
      if (r.players.some(p => p.name.toLowerCase() === name.toLowerCase())) return json(res, 409, { error: 'Det navn er taget.' });
      const p = { id: tok().slice(0, 8), token: tok(), name, role: null, conns: 0 }; r.players.push(p); broadcast(r);
      return json(res, 200, { room: r.code, token: p.token });
    }
    if (url.pathname === '/api/check') {
      const r = rooms.get(String(url.searchParams.get('room') || '').toUpperCase());
      return json(res, 200, { ok: !!(r && r.players.find(p => p.token === url.searchParams.get('token'))), exists: !!r });
    }
    if (url.pathname === '/api/action' && req.method === 'POST') {
      const d = await body(req); const r = rooms.get(String(d.room || '').toUpperCase());
      const p = r && r.players.find(x => x.token === d.token);
      if (!p) return json(res, 403, { error: 'Ukendt spiller.' });
      act(r, p, d.type, d.data || {}); broadcast(r); return json(res, 200, { ok: true });
    }
    if (url.pathname === '/api/stream') {
      const r = rooms.get(String(url.searchParams.get('room') || '').toUpperCase());
      const p = r && r.players.find(x => x.token === url.searchParams.get('token'));
      if (!p) { res.writeHead(403); return res.end(); }
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.write('retry: 1500\n\n');
      const conn = { room: r.code, pid: p.id, res }; r.conns.add(conn); p.conns++; broadcast(r);
      const ping = setInterval(() => res.write(': ping\n\n'), 20000);
      req.on('close', () => { clearInterval(ping); r.conns.delete(conn); p.conns = Math.max(0, p.conns - 1); broadcast(r); });
      return;
    }
    const f = path.normalize(path.join(PUB, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname)));
    if (!f.startsWith(PUB)) { res.writeHead(403); return res.end(); }
    // Video: understøt Range-forespørgsler (kræves af iPhone).
    if (path.extname(f) === '.mp4') return fs.stat(f, (err, st) => {
      if (err) { res.writeHead(404); return res.end('Ikke fundet'); }
      const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
      if (!m) { res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': st.size, 'Accept-Ranges': 'bytes' }); return fs.createReadStream(f).pipe(res); }
      const start = m[1] ? +m[1] : 0, end = m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;
      res.writeHead(206, { 'Content-Type': 'video/mp4', 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes' });
      fs.createReadStream(f, { start, end }).pipe(res);
    });
    fs.readFile(f, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Ikke fundet'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(data);
    });
  } catch (e) { json(res, 400, { error: e.message || 'Noget gik galt.' }); }
}).listen(PORT, () => {
  console.log(`\n  HAMMERSLAG – RETSSALEN kører\n\n  Åbn på telefonerne:  http://${lan()}:${PORT}\n  (Alle skal være på samme Wi-Fi som denne computer.)\n\n  Stop med Ctrl + C.\n`);
});
setInterval(() => { for (const [k, r] of rooms) if (Date.now() - r.touched > 6 * 3600e3 && !r.conns.size) rooms.delete(k); }, 600e3);
