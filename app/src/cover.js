// VICE GRID poster renderer — draws the multi-panel cover onto any canvas.
// Pure drawing code: given a state object it renders the same poster at any
// size, so the live preview and the exported PNG share one code path.

export const LOOKS = {
  sunset: { name: 'Sunset Strip', filter: 'saturate(1.28) contrast(1.06) sepia(0.22)', warm: 0.5, cool: 0.08 },
  neon: { name: 'Neon Night', filter: 'saturate(1.55) contrast(1.14) hue-rotate(-14deg)', warm: 0.1, cool: 0.5 },
  heat: { name: 'Heat Wave', filter: 'saturate(1.65) contrast(1.2) brightness(1.06)', warm: 0.42, cool: 0.14 },
};

export const LAYOUTS = {
  grid: { name: '2×2 Grid', panels: 4 },
  hero: { name: 'Hero + Strip', panels: 4 },
  triptych: { name: 'Triptych', panels: 3 },
  duo: { name: 'Duo', panels: 2 },
};

// Panel rectangles for a layout, inside the area above the caption band.
// Returns [{x, y, w, h}] in the same units as the poster size.
export function layoutPanels(layout, w, h, bandH, gap) {
  const top = 0;
  const areaH = h - bandH;
  const g = gap;
  if (layout === 'grid') {
    const cw = (w - g) / 2;
    const ch = (areaH - g) / 2;
    return [
      { x: 0, y: top, w: cw, h: ch },
      { x: cw + g, y: top, w: cw, h: ch },
      { x: 0, y: top + ch + g, w: cw, h: ch },
      { x: cw + g, y: top + ch + g, w: cw, h: ch },
    ];
  }
  if (layout === 'hero') {
    const heroH = areaH * 0.6;
    const stripH = areaH - heroH - g;
    const sw = (w - 2 * g) / 3;
    return [
      { x: 0, y: top, w, h: heroH },
      { x: 0, y: top + heroH + g, w: sw, h: stripH },
      { x: sw + g, y: top + heroH + g, w: sw, h: stripH },
      { x: 2 * (sw + g), y: top + heroH + g, w: sw, h: stripH },
    ];
  }
  if (layout === 'triptych') {
    const cw = (w - 2 * g) / 3;
    return [
      { x: 0, y: top, w: cw, h: areaH },
      { x: cw + g, y: top, w: cw, h: areaH },
      { x: 2 * (cw + g), y: top, w: cw, h: areaH },
    ];
  }
  // duo
  const cw = (w - g) / 2;
  return [
    { x: 0, y: top, w: cw, h: areaH },
    { x: cw + g, y: top, w: cw, h: areaH },
  ];
}

// Draw one photo into a panel rect, cover-fit, with pan (px, py in fractions
// of the panel size, -0.5..0.5) and zoom (>= 1).
function drawPhotoInto(ctx, img, rect, pan, zoom) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * base;
  const dh = ih * base;
  const dx = rect.x + (rect.w - dw) / 2 + pan.x * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + pan.y * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

// Warm sunset wash (top) and cool neon wash (bottom) over the whole poster.
function gradeOverlays(ctx, w, h, bandH, look, grade) {
  const t = grade / 100;
  const warmA = look.warm * (0.25 + 0.75 * (1 - t));
  const coolA = look.cool * (0.25 + 0.75 * t);
  const warm = ctx.createLinearGradient(0, 0, w, h - bandH);
  warm.addColorStop(0, `rgba(255, 122, 24, ${warmA * 0.55})`);
  warm.addColorStop(0.55, `rgba(255, 46, 136, ${warmA * 0.3})`);
  warm.addColorStop(1, 'rgba(255, 46, 136, 0)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, w, h - bandH);
  const cool = ctx.createLinearGradient(0, 0, 0, h - bandH);
  cool.addColorStop(0, 'rgba(34, 230, 255, 0)');
  cool.addColorStop(1, `rgba(34, 230, 255, ${coolA * 0.5})`);
  ctx.fillStyle = cool;
  ctx.fillRect(0, 0, w, h - bandH);
  // Vignette: darken the corners so the panels read as one poster.
  const vg = ctx.createRadialGradient(
    w / 2, (h - bandH) / 2, Math.min(w, h - bandH) * 0.35,
    w / 2, (h - bandH) / 2, Math.max(w, h - bandH) * 0.75,
  );
  vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vg.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h - bandH);
}

// Bold poster caption: big italic title with a hard outline, a gold rule and
// a letterspaced subtitle, sitting on a dark band at the poster's foot.
function drawCaption(ctx, w, h, bandH, title, subtitle) {
  const bandY = h - bandH;
  const bg = ctx.createLinearGradient(0, bandY, 0, h);
  bg.addColorStop(0, 'rgba(10, 4, 18, 0.92)');
  bg.addColorStop(1, '#0a0412');
  ctx.fillStyle = bg;
  ctx.fillRect(0, bandY, w, bandH);
  const rule = ctx.createLinearGradient(0, 0, w, 0);
  rule.addColorStop(0, '#ffc53d');
  rule.addColorStop(0.5, '#ff2e88');
  rule.addColorStop(1, '#22e6ff');
  ctx.fillStyle = rule;
  ctx.fillRect(0, bandY, w, Math.max(3, h * 0.004));

  const pad = w * 0.045;
  const titleSize = Math.min(bandH * 0.52, w * 0.085);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  try { ctx.letterSpacing = `${Math.round(w * 0.002)}px`; } catch (_) { /* older canvas */ }
  ctx.font = `900 italic ${titleSize}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, titleSize * 0.09);
  ctx.strokeStyle = '#12041f';
  ctx.shadowColor = 'rgba(255, 46, 136, 0.55)';
  ctx.shadowBlur = titleSize * 0.18;
  ctx.shadowOffsetY = titleSize * 0.04;
  const tx = pad;
  const ty = bandY + bandH * 0.44;
  ctx.strokeText(title, tx, ty);
  const fill = ctx.createLinearGradient(tx, ty - titleSize / 2, tx, ty + titleSize / 2);
  fill.addColorStop(0, '#ffffff');
  fill.addColorStop(1, '#ffc53d');
  ctx.fillStyle = fill;
  ctx.fillText(title, tx, ty);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const subSize = Math.max(11, bandH * 0.16);
  ctx.font = `700 ${subSize}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
  ctx.fillStyle = '#22e6ff';
  try { ctx.letterSpacing = `${Math.round(subSize * 0.35)}px`; } catch (_) { /* older canvas */ }
  ctx.fillText(subtitle.toUpperCase(), pad, bandY + bandH * 0.82);
  try { ctx.letterSpacing = '0px'; } catch (_) { /* older canvas */ }
}

// Render the whole poster. state: { photos, panels, layout, look, grade,
// title, subtitle }. photos[i] = { img, pan: {x, y}, zoom }. panels[i] is a
// photo index (or -1 for an empty panel). selectedPanel (optional) draws the
// editor's selection outline — preview only, never in an export.
export function drawPoster(ctx, w, h, state, selectedPanel = -1) {
  const bandH = Math.round(h * 0.15);
  const gap = Math.max(4, Math.round(w * 0.007));
  const look = LOOKS[state.look] || LOOKS.sunset;
  const rects = layoutPanels(state.layout, w, h, bandH, gap);
  const count = (LAYOUTS[state.layout] || LAYOUTS.grid).panels;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);
  ctx.filter = look.filter;
  for (let i = 0; i < count; i += 1) {
    const photoIdx = state.panels[i];
    const rect = rects[i];
    if (photoIdx == null || photoIdx < 0 || !state.photos[photoIdx]) {
      ctx.fillStyle = '#1d1030';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = Math.max(1, w * 0.002);
      ctx.setLineDash([w * 0.012, w * 0.008]);
      ctx.strokeRect(rect.x + gap, rect.y + gap, rect.w - 2 * gap, rect.h - 2 * gap);
      ctx.setLineDash([]);
      continue;
    }
    const photo = state.photos[photoIdx];
    drawPhotoInto(ctx, photo.img, rect, photo.pan, photo.zoom);
  }
  ctx.filter = 'none';
  gradeOverlays(ctx, w, h, bandH, look, state.grade);
  drawCaption(ctx, w, h, bandH, state.title, state.subtitle);

  if (selectedPanel >= 0 && selectedPanel < count) {
    const r = rects[selectedPanel];
    ctx.strokeStyle = '#22e6ff';
    ctx.lineWidth = Math.max(3, w * 0.005);
    ctx.setLineDash([]);
    ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  }
}

// Render the poster onto a fresh canvas at the requested size and return it.
export function renderPoster(width, height, state) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawPoster(canvas.getContext('2d'), width, height, state, -1);
  return canvas;
}
