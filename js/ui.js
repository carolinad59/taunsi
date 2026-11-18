// Utilidades de DOM. No toca `document` al importarse (se puede importar desde Node).
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export function toast(msg, ms = 2600) {
  const host = document.getElementById('toasts');
  if (!host) return;
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  host.append(t);
  setTimeout(() => t.remove(), ms);
}

/** Modal de confirmación accesible. Devuelve una promesa<boolean>. */
export function confirmModal({ title, text, ok = 'Aceptar', cancel = 'Cancelar', danger = false }) {
  return new Promise((resolve) => {
    const prev = document.activeElement;
    const close = (v) => { overlay.remove(); prev?.focus?.(); resolve(v); };
    const okBtn = h('button', { class: `btn ${danger ? 'danger' : 'primary'}`, type: 'button', onclick: () => close(true) }, ok);
    const overlay = h('div', { class: 'overlay', onkeydown: (e) => { if (e.key === 'Escape') close(false); } },
      h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        h('h3', {}, title), h('p', {}, text),
        h('div', { class: 'modal-actions' },
          h('button', { class: 'btn ghost', type: 'button', onclick: () => close(false) }, cancel), okBtn)));
    document.body.append(overlay);
    okBtn.focus();
  });
}

/** Confeti sencillo (no se muestra con prefers-reduced-motion). */
export function confetti() {
  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#1b5fa8', '#e4572e', '#f2b134', '#0f9b8e', '#c0457a'];
  const box = h('div', { class: 'confetti', 'aria-hidden': 'true' });
  for (let i = 0; i < 60; i++) {
    box.append(h('i', { style: `left:${Math.random() * 100}%;background:${colors[i % 5]};animation-delay:${Math.random() * 0.6}s;animation-duration:${1.6 + Math.random() * 1.4}s` }));
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 3500);
}

export const fmtMs = (ms) => {
  const m = Math.ceil(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
};
