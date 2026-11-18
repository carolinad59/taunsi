# Taunsi · aprende árabe tunecino (Derja)

Aplicación web personal para aprender tunecino **desde cero hasta una conversación cotidiana**, con un recorrido tipo "camino de lecciones" (unidades, nodos, corazones, XP, racha, repaso y prueba de unidad). Interfaz y explicaciones en **español**; el tunecino se escribe en **Arabizi** (alfabeto latino + dígitos) y, aparte y ocultable, en escritura árabe.

HTML, CSS y JavaScript vanilla con módulos ES. Sin backend ni cuentas: el progreso vive en `localStorage` (clave `taunsi.v1`). PWA instalable y con uso offline.

## Contenido (cifras actuales)
- 13 unidades, 49 lecciones, 469 ítems, **39 marcados `review: true`**.
- 9 tipos de ejercicio: `translate_pick`, `tn_to_es_choice`, `listen_choose`, `listen_type`, `speak`, `match_pairs`, `fill_blank`, `order_words`, `dialogue_reply`.

## Arrancar en local
Los módulos ES **no cargan con `file://`**: hace falta un servidor.
```bash
python3 -m http.server 8080      # y abre http://localhost:8080
```
(o la extensión *Live Server* de VS Code). Tests y validación:
```bash
node scripts/validate-course.mjs
node --test tests/*.test.mjs
```

## Publicar con GitHub Pages
1. `.github/workflows/pages.yml` ya publica la raíz del repo (tras validar y pasar los tests).
2. En GitHub: *Settings → Pages → Source: GitHub Actions*.
3. **Ojo:** Pages en un repositorio **privado** exige plan de pago. Opciones: (a) hacer el repo **público** (Pages gratis; el contenido es solo material de estudio y no contiene datos personales), o (b) mantenerlo privado y usar la app en local / ver el código con la app de GitHub.
   Para hacerlo público: `gh repo edit --visibility public --accept-visibility-change-consequences`.

## Instalar en el móvil
Abre la URL de Pages en el móvil → menú del navegador → **Añadir a pantalla de inicio** (Safari: Compartir → *Añadir a pantalla de inicio*). Tras la primera carga funciona sin conexión. Si cambias archivos de la lista `SHELL` de `sw.js`, sube `VERSION`.

## Añadir unidades y lecciones
1. Crea `data/units/uNN-nombre.json` con el modelo:
```json
{ "id":"u13", "title":"…", "can_do":"Puedes …", "color":"#hex", "icon":"chat",
  "lessons":[{ "id":"u13-l01","title":"…","kind":"normal",
    "grammar":{"title":"…","text_es":"…"},
    "items":[{ "id":"u13-l01-ahla","type":"phrase","es":"…","tn":"Ahla","ar":"أهلا","pron":"…","alt":["ahlan"],"note":"…","tokens":["…"],"review":false }],
    "dialogue":[{"role":"A","tn":"…","es":"…","ar":"…"}] }] }
```
2. Añádela a `data/course.json` (campo `units`, en orden). 3. `node scripts/validate-course.mjs`.

Reglas: 8–14 ítems por lección, 3–5 lecciones por unidad, `tokens` unidos por espacios = `tn` exacto (obligatorio en `sentence` y en `phrase` de varias palabras), al menos un `pron` por lección, y `review:true` exige `note`. La prueba de unidad se genera sola.

## Audio
Prioridad: `audio/<id>.mp3` → si no existe, `speechSynthesis` con voz `ar-TN` (o `ar`) leyendo el campo `ar` → si no, "audio no disponible". Botones: normal, lento (0,6) y repetir; y "Escuchar la lección" en cada lección.
- Lista de lo que falta: `node scripts/list-missing-audio.mjs`.
- Si tu navegador no tiene voces árabes: instala una voz del sistema (macOS: Ajustes → Accesibilidad → Contenido hablado → Voces del sistema; Android: Ajustes de texto a voz de Google) o graba los mp3 y déjalos en `audio/` con el id del ítem como nombre.
- El reconocimiento de voz (`speak`) no está garantizado para tunecino; **nunca bloquea**: siempre hay "Lo dije bien" y "Seguir". Opcionalmente puedes grabar tu voz y reproducirla.

## Convención de escritura
`2` ء · `3` ع · `7` ح · `6` ط · `9` ق · `kh`/`5` خ · `gh`/`8` غ · `ch` ش · `j` ج · `dh` ض ظ. El normalizador acepta `sh=ch`, `q=9`, `kh=5`, `gh=8`, `ou=u`, apóstrofo=`3`, letras dobles reducidas, y variantes explícitas en `alt` (p. ej. `7`↔`h` se añade en `alt` en los ítems con 7). Un dígito que cambia el sonido (7→3, 9→2) cuenta como error si no está en `alt`.

## Decisiones de diseño y correcciones de contenido
- **Contenido escrito con "kh" y "gh"** (khobz, ghali) como en los ejemplos del encargo; "5" y "8" se aceptan como entrada equivalente.
- **El 9 (ق):** el encargo lo describía como golpe de glotis. En Túnez capital es una *q* uvular (k muy atrás) y en otras zonas una *g*; el curso lo explica así.
- **"mafish"** (pedido en el encargo) es egipcio; el curso enseña `ma famech` / `ma 3andich`. **"daba"** es del Magreb occidental; se enseña `tawa`. **"hadha/hathi"** → `hedha/hedhi`. **"kelt"** → `klit`. **`3andi souda3`** es "dolor de cabeza"; la fiebre es `3andi skhouna`. **`nhadher`** aparece como variante de `nehdher`.
- Los números 11–19 se marcan `review`; el 3 es `tlata` (`thletha` en `alt`).
- Repaso: aparece tras cada 3 lecciones (incluso al final de la unidad, justo antes de la prueba).
- La prueba de unidad exige ≥ 80 % de aciertos **a la primera**; no repite fallos. "Ya lo sé" es una prueba de ubicación de 10 ejercicios.
- `speak` no resta corazones; "Seguir" cuenta como neutral. Corazones ilimitados en Ajustes.
- Los diálogos añaden un campo opcional `ar` para poder oírlos.
- Sin perfil, amigos, ligas, tienda, notificaciones ni anuncios. Identidad visual propia (azul, terracota y arena).

## ⚠ Ítems `review: true` y revisión nativa
Todo el contenido lo ha escrito un modelo de IA, no un hablante nativo. Los ítems con `review: true` son los que no se tienen por seguros (grafía, forma coloquial o variación regional); en la pantalla previa de cada lección aparecen como "Por revisar con un hablante nativo". **Revisa todo el curso con un hablante nativo**, también la escritura árabe (`ar`) y las notas regionales, antes de darlo por bueno.

## Estructura
`js/` (motor: `lesson.js`, `path.js`, `srs.js`, `hearts.js`, `normalize.js`, `audio.js`, `speech.js`, `storage.js`, `exercises/`), `data/`, `audio/`, `scripts/`, `tests/`, `sw.js`, `manifest.webmanifest`.

## Pendiente / limitaciones
- Probado con automatización en Chrome (Safari/iOS y reconocimiento de voz sin probar).
- Sin mp3: depende de que el navegador tenga voz árabe.
- El service worker usa "red primero"; el instalado en el móvil refresca al tener conexión.
