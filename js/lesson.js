// Motor de lección: composición de ejercicios (puro), finalización (puro) y sesión interactiva (DOM).
import { byType, ITEM_TYPES, RECOGNITION } from './exercises/index.js';
import { shuffle, sample } from './util.js';
import { itemsBefore, itemsBeforeUnit, unitItems, buildUnitTestItems } from './course.js';
import { pickReview, grade } from './srs.js';
import { heartsNow, loseHeart, gainHeart, msToNextHeart } from './hearts.js';
import { registerActivity } from './storage.js';
import { unitNodes, reviewId, testId } from './path.js';
import { h, confirmModal, confetti, fmtMs } from './ui.js';
import { play, playAll, stop } from './audio.js';

export const PASS_MARK = 0.8;
export const xpFor = (firstTry) => 10 + 2 * firstTry;

/* ───────────── Composición de ejercicios (pura) ───────────── */

/**
 * Asigna un tipo de ejercicio a cada ítem. Reglas: nunca 3 seguidos del mismo tipo,
 * reparto equilibrado, reconocimiento antes que producción al empezar, y siempre un `speak`.
 */
export function composeExercises({ items, pool, lesson = null, matchItems = null, withSpeak = true, rng = Math.random }) {
  const ctx = { pool, lesson, rng };
  const used = {};
  let last = [];
  const slots = items.map((item, i) => {
    let elig = ITEM_TYPES.filter((t) => byType[t].canBuild(item, ctx));
    if (i < 3) { const r = elig.filter((t) => RECOGNITION.includes(t)); if (r.length) elig = r; }
    let opts = elig.filter((t) => !(last[0] === t && last[1] === t));
    if (!opts.length) opts = elig;
    const min = Math.min(...opts.map((t) => used[t] || 0));
    const cand = opts.filter((t) => (used[t] || 0) === min);
    const t = cand[Math.floor(rng() * cand.length)];
    used[t] = (used[t] || 0) + 1;
    last = [t, last[0]];
    return { type: t, item };
  });
  if (withSpeak && slots.length >= 4 && !slots.some((s) => s.type === 'speak')) {
    slots[slots.length - 3].type = 'speak';
  }
  const exercises = slots.map((s) => byType[s.type].build(s.item, ctx));
  if (matchItems) {
    const m = byType.match_pairs.buildFrom(matchItems, ctx);
    if (m) exercises.splice(Math.min(4, exercises.length), 0, m);
  }
  if (lesson?.dialogue) {
    const d = byType.dialogue_reply.buildFrom(lesson, ctx);
    if (d) exercises.splice(Math.max(0, exercises.length - 2), 0, d);
  }
  return exercises;
}

/** Sesión de lección: ~70 % ítems nuevos, ~30 % repaso de lecciones anteriores. */
export function buildLessonSession(course, lesson, state, { rng = Math.random, now = Date.now() } = {}) {
  const before = itemsBefore(course, lesson.id);
  const pool = [...before, ...lesson.items];
  // Hasta 8 ítems nuevos (los más débiles primero); el resto va al ejercicio de parejas.
  const byWeak = [...lesson.items].sort((a, b) => (state.srs[a.id]?.s ?? -1) - (state.srs[b.id]?.s ?? -1));
  const chosen = new Set(byWeak.slice(0, 8).map((i) => i.id));
  const primary = lesson.items.filter((i) => chosen.has(i.id));
  const rest = lesson.items.filter((i) => !chosen.has(i.id));
  const nRev = Math.min(3, before.length, 12 - primary.length - 2);
  const learned = before.filter((i) => state.srs[i.id]);
  let revItems = learned.length ? pickReview(learned.map((i) => i.id), state.srs, nRev, now).map((id) => course.itemsById.get(id)) : [];
  if (revItems.length < nRev) { // p. ej. unidades saltadas: aún no hay SRS
    revItems = [...revItems, ...sample(before.filter((i) => !revItems.includes(i)), nRev - revItems.length, rng)];
  }
  const ordered = [...primary];
  revItems.forEach((r, k) => ordered.splice(Math.min(3 + 2 * k, ordered.length), 0, r));
  const matchItems = [...rest, ...shuffle(primary, rng)];
  const exercises = composeExercises({ items: ordered, pool, lesson, matchItems, rng });
  return { kind: 'lesson', id: lesson.id, lessonId: lesson.id, title: lesson.title, exercises, requeue: true };
}

export function buildReviewSession(course, state, { nodeId = null, upToLessonId = null, n = 10, rng = Math.random, now = Date.now() } = {}) {
  const scope = upToLessonId
    ? course.lessonsFlat.slice(0, course.lessonsFlat.findIndex((l) => l.id === upToLessonId) + 1).flatMap((l) => l.items)
    : [...course.itemsById.values()];
  const learned = scope.filter((i) => state.srs[i.id]);
  const base = learned.length >= 4 ? learned : upToLessonId ? scope : [];
  if (base.length < 4) return null;
  const ids = learned.length >= 4 ? pickReview(base.map((i) => i.id), state.srs, n, now) : sample(base, n, rng).map((i) => i.id);
  const items = shuffle(ids.map((id) => course.itemsById.get(id)), rng);
  const exercises = composeExercises({ items, pool: base, matchItems: items.slice(0, 6), rng });
  return { kind: nodeId ? 'review' : 'practice', id: nodeId || 'practice', nodeId, title: nodeId ? 'Repaso' : 'Práctica', exercises, requeue: true };
}

export function buildTestSession(course, unit, { placement = false, rng = Math.random } = {}) {
  const items = buildUnitTestItems(course, unit, rng, placement ? 10 : 12);
  const pool = [...itemsBeforeUnit(course, unit.id), ...unitItems(unit)];
  const exercises = composeExercises({ items, pool, rng });
  return {
    kind: placement ? 'placement' : 'test', id: placement ? `${unit.id}-placement` : testId(unit), nodeId: testId(unit), unitId: unit.id,
    title: placement ? `Ya lo sé: ${unit.title}` : `Prueba: ${unit.title}`, exercises, requeue: false, passMark: PASS_MARK,
  };
}

/** Resuelve un id de nodo del recorrido a una sesión. */
export function sessionForNode(course, state, nodeId, rng) {
  if (course.lessonById.has(nodeId)) return buildLessonSession(course, course.lessonById.get(nodeId), state, { rng });
  const unit = course.units.find((u) => nodeId.startsWith(u.id + '-'));
  if (!unit) return null;
  if (nodeId === testId(unit)) return buildTestSession(course, unit, { rng });
  const nodes = unitNodes(unit);
  const k = nodes.findIndex((n) => n.id === nodeId);
  if (k < 0) return null;
  const lastLesson = [...nodes.slice(0, k)].reverse().find((n) => n.kind === 'lesson');
  return buildReviewSession(course, state, { nodeId, upToLessonId: lastLesson.id, rng });
}

/* ───────────── Finalización (pura, testeable) ───────────── */

export function skipUnit(st, unit) {
  for (const l of unit.lessons) if (!st.lessons[l.id]?.done) st.lessons[l.id] = { done: true, level: 1, best: 1 };
  for (const n of unitNodes(unit)) if (n.kind !== 'lesson') st.nodes[n.id] = true;
  st.skipped[unit.id] = true;
}

/** Aplica el resultado de una sesión al progreso. stats: { total, firstTry }. */
export function completeSession(st, course, session, stats, now = new Date()) {
  const accuracy = stats.total ? stats.firstTry / stats.total : 1;
  const graded = session.kind === 'test' || session.kind === 'placement';
  const passed = graded ? accuracy >= PASS_MARK : true;
  let xp = 0;
  if (passed) {
    xp = xpFor(stats.firstTry);
    st.xp += xp;
    if (session.kind === 'lesson') {
      const e = st.lessons[session.lessonId] || { level: 0 };
      st.lessons[session.lessonId] = { done: true, level: Math.min(5, (e.level || 0) + 1), best: Math.max(e.best || 0, accuracy) };
    } else if (session.kind === 'review') { st.nodes[session.nodeId] = true; gainHeart(st, now.getTime()); }
    else if (session.kind === 'test') st.nodes[session.nodeId] = true;
    else if (session.kind === 'placement') skipUnit(st, course.units.find((u) => u.id === session.unitId));
    else if (session.kind === 'practice') gainHeart(st, now.getTime());
    if (session.kind !== 'practice') registerActivity(st, now);
  }
  return { xp, accuracy, passed };
}

/* ───────────── Sesión interactiva (DOM) ───────────── */

export function runSession(host, session, env) {
  const { state, commit, course, settings, onExit, onFinish, onPractice } = env;
  const total = session.exercises.length;
  const practice = session.kind === 'practice';
  let queue = [...session.exercises];
  let answered = 0, firstTry = 0, ended = false;
  const started = Date.now();
  const heartsEl = h('span', { class: 'hearts', 'aria-live': 'polite' });
  const bar = h('div', { class: 'bar-fill' });
  let body = h('div', { class: 'ex-area' });
  const footer = h('footer', { class: 'ex-footer' });
  const title = h('h2', { class: 'ex-title' });

  const heartsText = () => (state.settings.heartsUnlimited ? '❤ ∞' : `❤ ${heartsNow(state)}`);
  const refreshTop = () => { heartsEl.textContent = practice ? '' : heartsText(); bar.style.width = `${(answered / total) * 100}%`; };

  const exit = async () => {
    if (ended) return;
    const ok = await confirmModal({ title: '¿Salir de la lección?', text: 'Tu progreso en los ejercicios ya respondidos se conserva en el repaso.', ok: 'Salir', cancel: 'Seguir' });
    if (ok) { ended = true; stop(); document.removeEventListener('keydown', onKey); onExit(); }
  };
  const top = h('div', { class: 'ex-top' },
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Salir', onclick: exit }, '✕'),
    h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100 }, bar), heartsEl);
  host.replaceChildren(h('div', { class: 'session' }, top, title, body, footer));

  const feedbackFor = (ex, correct, expected) => {
    const item = ex.itemId ? course.itemsById.get(ex.itemId) : null;
    const lines = [];
    if (!correct) lines.push(h('div', { class: 'fb-ans' }, h('span', {}, 'Respuesta correcta: '), h('strong', {}, expected)));
    if (item?.pron) lines.push(h('div', { class: 'fb-note' }, `Pronunciación: ${item.pron}`));
    if (item?.note) lines.push(h('div', { class: 'fb-note' }, item.note));
    if (item) lines.push(h('button', { class: 'btn audio small', type: 'button', onclick: () => play(item) }, '🔊'));
    return lines;
  };

  function handle(ex, result, correct, expected) {
    footer.replaceChildren();
    const skip = correct === null;
    const isFirst = !ex._failed;
    if (skip) { queue.shift(); answered++; if (isFirst) firstTry++; }
    else if (correct) {
      queue.shift(); answered++; if (isFirst) firstTry++;
    } else {
      queue.shift(); ex._failed = true;
      if (session.requeue) queue.push(ex); else answered++;
      if (!practice) loseHeart(state);
    }
    const ids = ex.itemIds || (ex.itemId ? [ex.itemId] : []);
    if (!skip) for (const id of ids) state.srs[id] = grade(state.srs[id], correct);
    commit();
    refreshTop();
    if (skip) return next();
    body.querySelectorAll('button,input').forEach((b) => { b.disabled = true; });
    if (!correct && body.firstChild) body.classList.add('shake');
    const hearts0 = !practice && !state.settings.heartsUnlimited && heartsNow(state) === 0;
    const cont = h('button', { class: 'btn primary wide', type: 'button', onclick: () => (hearts0 ? outOfHearts() : next()) }, 'Continuar');
    footer.className = `ex-footer ${correct ? 'ok' : 'bad'}`;
    footer.append(h('div', { class: 'fb' }, h('div', { class: 'fb-head' }, correct ? ['¡Correcto!', '¡Muy bien!', '¡Eso es!'][answered % 3] : 'Casi…'), feedbackFor(ex, correct, expected)), cont);
    cont.focus();
  }

  function renderEx(ex) {
    const mod = byType[ex.type];
    title.textContent = mod.title;
    const fresh = h('div', { class: 'ex-area' });
    body.replaceWith(fresh);
    body = fresh;
    footer.className = 'ex-footer';
    footer.replaceChildren();
    let ready = false;
    const check = h('button', { class: 'btn primary wide', type: 'button', disabled: true }, 'Comprobar');
    const api = {
      settings, item: (id) => course.itemsById.get(id),
      setReady: (v) => { ready = v; check.disabled = !v; },
      finish: (correct, expected) => handle(ex, null, correct, expected),
    };
    const inst = mod.render(fresh, ex, api);
    if (inst?.check) {
      check.onclick = () => { if (!ready) return; const r = inst.check(); handle(ex, r, r.correct, r.expected); };
      footer.append(check);
    }
    fresh.querySelector('input,.choice,.tile,.pair')?.focus?.({ preventScroll: true });
  }

  function next() {
    if (ended) return;
    stop();
    if (!queue.length) return finish();
    if (!practice && !state.settings.heartsUnlimited && heartsNow(state) === 0) return outOfHearts();
    refreshTop();
    renderEx(queue[0]);
  }

  function outOfHearts() {
    ended = true; document.removeEventListener('keydown', onKey);
    const wait = msToNextHeart(state);
    host.replaceChildren(h('div', { class: 'session centered' },
      h('div', { class: 'big-emoji' }, '💔'), h('h2', {}, 'Te has quedado sin corazones'),
      h('p', {}, `Recuperas uno en ${fmtMs(wait)}. También puedes ganar uno con una sesión de práctica.`),
      h('button', { class: 'btn primary wide', type: 'button', onclick: () => onPractice() }, 'Practicar para ganar un corazón'),
      h('button', { class: 'btn ghost wide', type: 'button', onclick: () => onExit() }, 'Salir')));
  }

  function finish() {
    ended = true; document.removeEventListener('keydown', onKey);
    const stats = { total, firstTry };
    const res = completeSession(state, course, session, stats);
    commit();
    const secs = Math.round((Date.now() - started) / 1000);
    const mm = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    const graded = session.kind === 'test' || session.kind === 'placement';
    if (res.passed && graded) confetti();
    const stat = (label, val) => h('div', { class: 'stat' }, h('div', { class: 'stat-v' }, val), h('div', { class: 'stat-l' }, label));
    host.replaceChildren(h('div', { class: 'session centered summary' },
      h('div', { class: 'big-emoji' }, res.passed ? '🎉' : '📚'),
      h('h2', {}, res.passed ? (graded ? '¡Prueba superada!' : '¡Lección completada!') : 'Aún no llegas al 80 %'),
      graded && !res.passed ? h('p', {}, 'Repasa la unidad y vuelve a intentarlo: la prueba exige un 80 % de aciertos a la primera.') : null,
      h('div', { class: 'stats' }, stat('XP', res.passed ? `+${res.xp}` : '0'), stat('Precisión', `${Math.round(res.accuracy * 100)} %`), stat('Tiempo', mm)),
      h('button', { class: 'btn primary wide', type: 'button', onclick: () => onFinish(res) }, 'Continuar')));
  }

  function onKey(e) {
    if (ended) return;
    if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
      const b = footer.querySelector('button:not(:disabled)'); if (b) { e.preventDefault(); b.click(); }
    } else if (/^[1-9]$/.test(e.key) && e.target.tagName !== 'INPUT') {
      body.querySelector(`.choice[data-opt="${Number(e.key) - 1}"]`)?.click();
    }
  }
  document.addEventListener('keydown', onKey);

  if (!practice && !state.settings.heartsUnlimited && heartsNow(state) === 0) outOfHearts();
  else next();
}

/** Pantalla previa de una lección: gramática, vocabulario y "Escuchar la lección". */
export function renderLessonIntro(host, lesson, { settings, onStart, onBack }) {
  let playing = false, token = 0;
  const listenBtn = h('button', { class: 'btn audio', type: 'button' }, '🔊 Escuchar la lección');
  listenBtn.onclick = async () => {
    if (playing) { token++; playing = false; stop(); listenBtn.textContent = '🔊 Escuchar la lección'; return; }
    playing = true; const mine = ++token; listenBtn.textContent = '⏹ Parar';
    await playAll(lesson.items, { cancelled: () => mine !== token });
    if (mine === token) { playing = false; listenBtn.textContent = '🔊 Escuchar la lección'; }
  };
  host.replaceChildren(h('div', { class: 'intro' },
    h('button', { class: 'icon-btn back', type: 'button', 'aria-label': 'Volver', onclick: () => { token++; stop(); onBack(); } }, '←'),
    h('h2', {}, lesson.title),
    lesson.grammar ? h('section', { class: 'card grammar' }, h('h3', {}, lesson.grammar.title), h('p', {}, lesson.grammar.text_es)) : null,
    h('div', { class: 'row' }, listenBtn),
    h('ul', { class: 'vocab' }, lesson.items.map((it) => h('li', {},
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': `Escuchar ${it.tn}`, onclick: () => play(it) }, '🔊'),
      h('div', { class: 'v' }, h('div', { class: 'v-tn' }, it.tn, ' ', h('span', { class: 'v-es' }, `— ${it.es}`)),
        settings.showArabic && it.ar ? h('div', { class: 'ar', dir: 'rtl', lang: 'ar-TN' }, it.ar) : null,
        it.pron ? h('div', { class: 'v-pron' }, it.pron) : null,
        it.note ? h('div', { class: 'v-note' }, it.note) : null,
        it.review ? h('div', { class: 'v-review' }, 'Por revisar con un hablante nativo') : null)))),
    lesson.dialogue?.length ? h('section', { class: 'card' }, h('h3', {}, 'Diálogo'),
      lesson.dialogue.map((d) => h('p', { class: 'dlg' }, h('strong', {}, `${d.role}: `), d.tn, h('span', { class: 'v-es' }, ` — ${d.es}`)))) : null,
    h('button', { class: 'btn primary wide sticky', type: 'button', onclick: () => { token++; stop(); onStart(); } }, 'Empezar')));
}
