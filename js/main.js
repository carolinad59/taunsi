// Arranque y router sencillo por hash entre pantallas.
import { state, commit, replaceState, resetState, exportJSON, parseState, currentStreak } from './storage.js';
import { loadCourse } from './course.js';
import { renderPath, buildPath } from './path.js';
import { sessionForNode, buildReviewSession, buildTestSession, runSession, renderLessonIntro } from './lesson.js';
import { heartsNow, msToNextHeart } from './hearts.js';
import { dueIds } from './srs.js';
import { h, toast, confirmModal, fmtMs } from './ui.js';

const app = document.getElementById('app');
const nav = document.getElementById('nav');
let course = null;

const fetchJson = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`${u}: ${r.status}`); return r.json(); };
const go = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };
const env = () => ({ state, commit, course, settings: state.settings });

async function boot() {
  try { course = await loadCourse(fetchJson); }
  catch (e) {
    app.replaceChildren(h('div', { class: 'card' }, h('h2', {}, 'No se pudo cargar el curso'),
      h('p', {}, 'Si abriste index.html con doble clic (file://), los módulos no cargan. Arranca un servidor local: python3 -m http.server 8080 y abre http://localhost:8080'),
      h('pre', {}, String(e.message))));
    return;
  }
  window.addEventListener('hashchange', route);
  route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

function route() {
  const [r, arg] = location.hash.replace(/^#\/?/, '').split('/');
  document.body.dataset.theme = '';
  const inSession = r === 'play' || r === 'placement' || r === 'practice';
  nav.hidden = inSession || r === 'lesson';
  nav.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.dataset.r === (r || '')));
  window.scrollTo(0, 0);
  if (r === 'review') return viewReview();
  if (r === 'settings') return viewSettings();
  if (r === 'lesson') return viewIntro(arg);
  if (r === 'play') return viewPlay(arg);
  if (r === 'placement') return viewPlacement(arg);
  if (r === 'practice') return viewPractice();
  viewHome();
}

/* ── Inicio / recorrido ── */
function statsBar() {
  const hearts = state.settings.heartsUnlimited ? '∞' : heartsNow(state);
  return h('div', { class: 'statsbar' },
    h('span', { title: 'Racha', 'aria-label': `Racha de ${currentStreak(state)} días` }, `🔥 ${currentStreak(state)}`),
    h('span', { title: 'XP', 'aria-label': `${state.xp} XP` }, `⭐ ${state.xp}`),
    h('span', { title: 'Corazones', 'aria-label': `${hearts} corazones` }, `❤ ${hearts}`));
}

function viewHome() {
  const { next } = buildPath(course, state);
  const top = h('div', { class: 'home-top' }, h('h1', { class: 'brand' }, 'Taunsi', h('small', {}, 'تونسي')), statsBar(),
    next ? h('button', { class: 'btn primary wide', type: 'button', onclick: () => openNode(next) },
      `Continuar: ${next.kind === 'lesson' ? next.lesson.title : next.kind === 'review' ? 'Repaso' : 'Prueba de unidad'}`)
      : h('p', { class: 'pill' }, '🏁 ¡Has completado el curso!'));
  const pathHost = h('div', { class: 'path' });
  app.replaceChildren(top, pathHost);
  renderPath(pathHost, course, state, {
    onNode: (n) => { if (n.status === 'locked') return toast('Completa antes la lección anterior 🔒'); openNode(n); },
    onSkip: async (unit) => {
      const ok = await confirmModal({ title: `Ya lo sé: ${unit.title}`, text: 'Haz una prueba de 10 ejercicios sin lecciones. Si aciertas al menos el 80 % a la primera, saltas la unidad.', ok: 'Empezar prueba' });
      if (ok) go(`#/placement/${unit.id}`);
    },
  });
  const cur = pathHost.querySelector('.node.available');
  cur?.scrollIntoView({ block: 'center', behavior: 'instant' in window ? 'instant' : 'auto' });
}

function openNode(n) { go(n.kind === 'lesson' ? `#/lesson/${n.id}` : `#/play/${n.id}`); }

function viewIntro(id) {
  const lesson = course.lessonById.get(id);
  if (!lesson) return go('#/');
  renderLessonIntro(app, lesson, { settings: state.settings, onStart: () => go(`#/play/${id}`), onBack: () => go('#/') });
}

function startSession(session, backHash = '#/') {
  if (!session) { toast('Aún no hay suficientes ítems aprendidos para repasar.'); return go(backHash); }
  runSession(app, session, {
    ...env(),
    onExit: () => go(backHash),
    onFinish: () => go(backHash),
    onPractice: () => go('#/practice'),
  });
}
function viewPlay(id) { startSession(sessionForNode(course, state, id)); }
function viewPlacement(unitId) {
  const unit = course.units.find((u) => u.id === unitId);
  startSession(unit ? buildTestSession(course, unit, { placement: true }) : null);
}
function viewPractice() { startSession(buildReviewSession(course, state), '#/review'); }

/* ── Repaso libre ── */
function viewReview() {
  const learned = Object.keys(state.srs).length;
  const due = dueIds(state.srs).length;
  app.replaceChildren(h('div', { class: 'page' }, h('h1', {}, 'Repaso'),
    h('div', { class: 'card' },
      h('p', {}, `Ítems aprendidos: `, h('strong', {}, learned)),
      h('p', {}, `Pendientes de repasar hoy: `, h('strong', {}, due)),
      h('p', { class: 'hint' }, 'El repaso prioriza lo que has fallado o hace más tiempo que no ves. Completar una práctica te da un corazón.'),
      h('button', { class: 'btn primary wide', type: 'button', disabled: learned < 4, onclick: () => go('#/practice') }, learned < 4 ? 'Completa antes alguna lección' : 'Empezar práctica'))));
}

/* ── Ajustes ── */
function viewSettings() {
  const s = state.settings;
  const sw = (label, key, desc) => h('label', { class: 'switch-row' }, h('span', {}, h('strong', {}, label), h('small', {}, desc)),
    h('input', { type: 'checkbox', role: 'switch', checked: s[key] ? true : null, onchange: (e) => { s[key] = e.target.checked; commit(); } }));
  const file = h('input', { type: 'file', accept: 'application/json', hidden: true, onchange: async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { replaceState(parseState(await f.text())); toast('Progreso importado ✔'); route(); } catch (err) { toast(`No se pudo importar: ${err.message}`, 5000); }
  } });
  const hrs = h('input', { type: 'number', min: '1', max: '24', value: String(s.heartHours), class: 'num', 'aria-label': 'Horas por corazón',
    onchange: (e) => { s.heartHours = Math.max(1, Math.min(24, Number(e.target.value) || 4)); commit(); } });
  app.replaceChildren(h('div', { class: 'page' }, h('h1', {}, 'Ajustes'),
    h('div', { class: 'card' },
      sw('Mostrar escritura árabe', 'showArabic', 'Oculta el bloque en árabe si solo quieres el alfabeto latino.'),
      sw('Corazones ilimitados', 'heartsUnlimited', 'Para uso personal: los errores no te bloquean.'),
      h('label', { class: 'switch-row' }, h('span', {}, h('strong', {}, 'Horas para recuperar un corazón'), h('small', {}, `Ahora: ${state.settings.heartsUnlimited ? '∞' : heartsNow(state)} corazones` + (msToNextHeart(state) ? ` · siguiente en ${fmtMs(msToNextHeart(state))}` : ''))), hrs)),
    h('div', { class: 'card' }, h('h3', {}, 'Tu progreso'),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn ghost', type: 'button', onclick: () => {
          const a = h('a', { href: URL.createObjectURL(new Blob([exportJSON()], { type: 'application/json' })), download: 'taunsi-progreso.json' });
          document.body.append(a); a.click(); a.remove();
        } }, '⬇ Exportar'),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => file.click() }, '⬆ Importar'), file,
        h('button', { class: 'btn danger', type: 'button', onclick: async () => {
          if (!(await confirmModal({ title: 'Reiniciar progreso', text: 'Se borrará todo tu progreso: XP, racha y repaso.', ok: 'Continuar', danger: true }))) return;
          if (!(await confirmModal({ title: '¿Seguro?', text: 'Esta acción no se puede deshacer. Exporta antes si quieres una copia.', ok: 'Borrar todo', danger: true }))) return;
          resetState(); toast('Progreso reiniciado'); go('#/');
        } }, 'Reiniciar'))),
    h('div', { class: 'card guide' }, h('h3', {}, 'Guía de sonidos (Arabizi)'),
      h('table', {}, h('tbody', {}, [
        ['2', 'ء', 'Golpe de glotis, como la pausa de «uh-oh»'], ['3', 'ع', 'Garganta profunda («a» apretada)'],
        ['7', 'ح', '«h» fuerte y aspirada'], ['5', 'خ', '«j» española, más raspada'],
        ['6', 'ط', '«t» enfática'], ['9', 'ق', 'Sonido de glotis (también se oye «g»)'],
        ['8 / gh', 'غ', 'Como la «r» francesa, más gutural'], ['ch', 'ش', '«sh» inglesa'],
        ['j', 'ج', '«j» suave del francés «je»'], ['dh', 'ض ظ', '«z» enfática'],
      ].map(([a, b, c]) => h('tr', {}, h('td', {}, h('strong', {}, a)), h('td', { dir: 'rtl', lang: 'ar' }, b), h('td', {}, c)))))),
    h('p', { class: 'hint' }, 'Taunsi · Uso personal · El contenido debe revisarse con un hablante nativo.')));
}

boot();
