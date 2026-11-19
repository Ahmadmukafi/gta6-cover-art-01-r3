// VICE GRID editor wiring — photos, panels, looks, layouts, pan/zoom, export.
// The poster itself is drawn by cover.js; this file only owns the UI state
// and the pointer interactions on the preview canvas.

import { LOOKS, LAYOUTS, layoutPanels, drawPoster, renderPoster } from './cover.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const poster = $('#poster');
const pctx = poster.getContext('2d');
const statusEl = $('#status');

const state = {
  photos: [], // { img, name, pan: {x, y}, zoom }
  panels: [0, 1, 0, 1],
  layout: 'grid',
  look: 'sunset',
  grade: 30,
  title: 'SUNSET HEIST',
  subtitle: 'LEONIDA • 2026',
};

let selectedPanel = 0;
let pickedPhoto = 0;
let drag = null; // { panel, lastX, lastY } while panning a panel's photo

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

function gradeLabel() {
  if (state.grade <= 33) return 'Golden hour';
  if (state.grade <= 66) return 'Sunset';
  return 'Neon night';
}

function render() {
  drawPoster(pctx, poster.width, poster.height, state, selectedPanel);
  $$('.look-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.look === state.look));
  $$('.layout-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.layout === state.layout));
  $('#gradeVal').textContent = gradeLabel();
}

function renderFilmstrip() {
  const strip = $('#filmstrip');
  strip.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const thumb = document.createElement('img');
    thumb.src = photo.img.src;
    thumb.alt = photo.name;
    thumb.title = photo.name;
    thumb.draggable = true;
    thumb.classList.toggle('is-picked', i === pickedPhoto);
    thumb.addEventListener('click', () => {
      pickedPhoto = i;
      renderFilmstrip();
    });
    thumb.addEventListener('dragstart', (ev) => {
      ev.dataTransfer.setData('text/vice-photo', String(i));
      ev.dataTransfer.effectAllowed = 'copy';
    });
    strip.appendChild(thumb);
  });
}

function addPhoto(img, name) {
  state.photos.push({ img, name, pan: { x: 0, y: 0 }, zoom: 1 });
  pickedPhoto = state.photos.length - 1;
  renderFilmstrip();
  render();
}

function panelCount() {
  return (LAYOUTS[state.layout] || LAYOUTS.grid).panels;
}

function panelRects() {
  const bandH = Math.round(poster.height * 0.15);
  const gap = Math.max(4, Math.round(poster.width * 0.007));
  return layoutPanels(state.layout, poster.width, poster.height, bandH, gap);
}

function panelAt(clientX, clientY) {
  const r = poster.getBoundingClientRect();
  const x = ((clientX - r.left) / r.width) * poster.width;
  const y = ((clientY - r.top) / r.height) * poster.height;
  const rects = panelRects();
  for (let i = 0; i < panelCount(); i += 1) {
    const p = rects[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}

function assignPhoto(panel, photoIdx) {
  if (panel < 0 || panel >= panelCount()) return;
  if (photoIdx < 0 || photoIdx >= state.photos.length) return;
  state.panels[panel] = photoIdx;
  selectedPanel = panel;
  pickedPhoto = photoIdx;
  renderFilmstrip();
  render();
}

poster.addEventListener('pointerdown', (ev) => {
  const panel = panelAt(ev.clientX, ev.clientY);
  if (panel < 0) return;
  selectedPanel = panel;
  poster.setPointerCapture(ev.pointerId);
  drag = { panel, lastX: ev.clientX, lastY: ev.clientY, moved: false };
  render();
});

poster.addEventListener('pointermove', (ev) => {
  if (!drag) return;
  const r = poster.getBoundingClientRect();
  const dx = (ev.clientX - drag.lastX) / r.width;
  const dy = (ev.clientY - drag.lastY) / r.height;
  if (Math.abs(ev.clientX - drag.lastX) + Math.abs(ev.clientY - drag.lastY) > 2) drag.moved = true;
  const photoIdx = state.panels[drag.panel];
  const photo = state.photos[photoIdx];
  if (photo) {
    photo.pan.x = Math.max(-0.5, Math.min(0.5, photo.pan.x + dx));
    photo.pan.y = Math.max(-0.5, Math.min(0.5, photo.pan.y + dy));
  }
  drag.lastX = ev.clientX;
  drag.lastY = ev.clientY;
  render();
});

poster.addEventListener('pointerup', (ev) => {
  if (!drag) return;
  // A click without a drag places the picked photo into the panel.
  if (!drag.moved) assignPhoto(drag.panel, pickedPhoto);
  drag = null;
  render();
});

poster.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  const panel = panelAt(ev.clientX, ev.clientY);
  if (panel < 0) return;
  const photo = state.photos[state.panels[panel]];
  if (!photo) return;
  selectedPanel = panel;
  photo.zoom = Math.max(1, Math.min(3, photo.zoom * (1 - ev.deltaY * 0.001)));
  render();
}, { passive: false });

poster.addEventListener('dragover', (ev) => {
  ev.preventDefault();
  ev.dataTransfer.dropEffect = 'copy';
});

poster.addEventListener('drop', (ev) => {
  ev.preventDefault();
  const idx = Number(ev.dataTransfer.getData('text/vice-photo'));
  if (Number.isInteger(idx)) assignPhoto(panelAt(ev.clientX, ev.clientY), idx);
});

$$('.look-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.look = btn.dataset.look;
    state.grade = state.look === 'neon' ? 85 : state.look === 'heat' ? 55 : 30;
    $('#grade').value = String(state.grade);
    render();
  });
});

$$('.layout-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.layout = btn.dataset.layout;
    selectedPanel = 0;
    render();
  });
});

$('#grade').addEventListener('input', (ev) => {
  state.grade = Number(ev.target.value);
  render();
});

$('#title').addEventListener('input', (ev) => {
  state.title = ev.target.value.toUpperCase() || 'VICE GRID';
  render();
});

$('#subtitle').addEventListener('input', (ev) => {
  state.subtitle = ev.target.value || '';
  render();
});

$('#addPhotos').addEventListener('click', () => $('#photoInput').click());

$('#photoInput').addEventListener('change', async (ev) => {
  for (const file of ev.target.files) {
    try {
      const img = await loadImage(URL.createObjectURL(file));
      addPhoto(img, file.name);
    } catch (err) {
      statusEl.textContent = `Could not load ${file.name}.`;
    }
  }
  ev.target.value = '';
  statusEl.textContent = `${state.photos.length} photo(s) loaded.`;
});

function exportSize() {
  const [w, h] = $('#size').value.split('x').map(Number);
  return { w, h };
}

async function exportPng() {
  const { w, h } = exportSize();
  const canvas = renderPoster(w, h, state);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vice-grid-${w}x${h}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  statusEl.textContent = `Exported ${w} × ${h} PNG.`;
  return url;
}

$('#exportBtn').addEventListener('click', exportPng);

// Keyboard shortcuts — press 1-4 for a layout, L for the next look, E to
// export the current poster. Typing in a text field never triggers a shortcut.
const SHORTCUT_LAYOUTS = ['grid', 'hero', 'triptych', 'duo'];
const SHORTCUT_LOOKS = ['sunset', 'neon', 'heat'];

function applyLookChoice(look) {
  state.look = look;
  state.grade = look === 'neon' ? 85 : look === 'heat' ? 55 : 30;
  $('#grade').value = String(state.grade);
  render();
}

document.addEventListener('keydown', (ev) => {
  if (ev.target && ev.target.matches('input, select, textarea')) return;
  if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
  const key = ev.key.toLowerCase();
  const layoutIndex = Number.parseInt(key, 10) - 1;
  if (layoutIndex >= 0 && layoutIndex < SHORTCUT_LAYOUTS.length) {
    state.layout = SHORTCUT_LAYOUTS[layoutIndex];
    selectedPanel = 0;
    render();
    return;
  }
  if (key === 'l') {
    const next = SHORTCUT_LOOKS[(SHORTCUT_LOOKS.indexOf(state.look) + 1) % SHORTCUT_LOOKS.length];
    applyLookChoice(next);
    return;
  }
  if (key === 'e') exportPng();
});

// Screenshot helper for this entry's own shots: returns a data URL of the
// poster the app would export, at the requested size. Used only to take the
// entry's screenshots; the export button above is the user-facing path.
function exportDataURL(w, h) {
  return renderPoster(w, h, state).toDataURL('image/png');
}

// Deep-link a shot: ?shot=cover&photo=boulevard&caption=SUNSET%20HEIST or
// ?shot=editor&photo=pier&look=neon&layout=hero — used to stage screenshots.
function applyShotParams(params) {
  const photo = params.get('photo');
  if (photo === 'pier' && state.photos[1]) {
    state.panels = [1, 1, 1, 1];
  } else if (photo === 'boulevard' && state.photos[0]) {
    state.panels = [0, 0, 0, 0];
  }
  const look = params.get('look');
  if (look && LOOKS[look]) {
    state.look = look;
    state.grade = look === 'neon' ? 85 : look === 'heat' ? 55 : 30;
    $('#grade').value = String(state.grade);
  }
  const layout = params.get('layout');
  if (layout && LAYOUTS[layout]) state.layout = layout;
  const caption = params.get('caption');
  if (caption) {
    state.title = caption.toUpperCase();
    $('#title').value = state.title;
  }
  const sub = params.get('subtitle');
  if (sub) {
    state.subtitle = sub;
    $('#subtitle').value = sub;
  }
  render();
}

async function boot() {
  try {
    const boulevard = await loadImage('./samples/boulevard.jpg');
    addPhoto(boulevard, 'boulevard.jpg');
    const pier = await loadImage('./samples/pier.jpg');
    addPhoto(pier, 'pier.jpg');
    // Boulevard first, pier second: the default grid mixes both.
    state.panels = [0, 1, 0, 1];
    pickedPhoto = 0;
    renderFilmstrip();
  } catch (err) {
    statusEl.textContent = 'Sample photos could not load — add your own photos to begin.';
  }
  const params = new URLSearchParams(location.search);
  if (params.get('shot')) applyShotParams(params);
  render();
  if (!params.get('shot')) statusEl.textContent = 'Ready — pick a photo, choose a look, export your cover.';
  window.__viceGrid = { state, exportDataURL, renderPoster, applyShotParams };
}

boot();
