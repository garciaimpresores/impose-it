/**
 * ImposeIt — Main application module.
 * Orchestrates UI, imposition engine, preview, and export.
 */
import { PAPER_SIZES, getPaperSize, customPaperSize } from './core/paper-sizes.js';
import { calculateImposition } from './core/imposition.js';
import { generateCropMarks } from './core/cropmarks.js';
import { exportPDF, requestSaveHandle, writeToHandle, downloadPDFFallback } from './core/exporter.js';
import { loadFile } from './utils/file-loader.js';
import { getPresets, savePreset, loadPreset, deletePreset } from './ui/presets.js';

// ─── State ───────────────────────────────────────────────────
const state = {
  frontFile: null,
  backFile: null,
  paperSize: 'sra3',
  orientation: 'portrait',
  customWidth: 320,
  customHeight: 450,
  bleed: 3,
  markOffset: 2,
  markLength: 5,
  gutter: 0,
  marginH: 5,
  marginV: 5,
  cropMarks: true,
  autoRotate: false,
  duplex: false,
  jobName: 'imposicion',
  // Computed
  layout: null,
  backLayout: null,
  // Preview
  zoom: 1,
  panX: 0,
  panY: 0,
};

// ─── DOM refs ────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const refs = {
  // File
  dropFront: $('drop-zone-front'),
  inputFront: $('file-input-front'),
  infoFront: $('file-info-front'),
  nameFront: $('file-name-front'),
  dimsFront: $('file-dims-front'),
  removeFront: $('remove-front'),
  dropBack: $('drop-zone-back'),
  inputBack: $('file-input-back'),
  infoBack: $('file-info-back'),
  nameBack: $('file-name-back'),
  dimsBack: $('file-dims-back'),
  removeBack: $('remove-back'),
  duplexFileSection: $('duplex-file-section'),

  // Paper
  paperSelect: $('paper-size'),
  customSizeGroup: $('custom-size-group'),
  customWidth: $('custom-width'),
  customHeight: $('custom-height'),
  btnPortrait: $('btn-portrait'),
  btnLandscape: $('btn-landscape'),

  // Crop
  cropToggle: $('crop-marks-toggle'),
  bleedInput: $('bleed-input'),
  markOffsetInput: $('mark-offset'),
  markLengthInput: $('mark-length'),

  // Spacing
  gutterInput: $('gutter-input'),
  marginH: $('margin-h'),
  marginV: $('margin-v'),
  autoRotate: $('auto-rotate-toggle'),

  // Print
  btnSingle: $('btn-single'),
  btnDuplex: $('btn-duplex'),

  // Presets
  presetName: $('preset-name'),
  presetSaveBtn: $('preset-save-btn'),
  presetList: $('preset-list'),

  // Export
  jobName: $('job-name'),
  exportBtn: $('export-btn'),

  // Preview
  canvas: $('preview-canvas'),
  canvasContainer: $('canvas-container'),
  emptyState: $('empty-state'),
  infoCopies: $('info-copies'),
  infoUsage: $('info-usage'),
  infoGrid: $('info-grid'),
  zoomIn: $('zoom-in'),
  zoomOut: $('zoom-out'),
  zoomFit: $('zoom-fit'),
  zoomLevel: $('zoom-level'),
};

// ─── Initialize ──────────────────────────────────────────────
function init() {
  populatePaperSizes();
  bindEvents();
  renderPresets();
  updatePreview();
}

// ─── Paper Size Dropdown ─────────────────────────────────────
function populatePaperSizes() {
  const optgroup1 = document.createElement('optgroup');
  optgroup1.label = 'Sobremedida / Prensa';
  const optgroup2 = document.createElement('optgroup');
  optgroup2.label = 'ISO Estándar';
  const optgroup3 = document.createElement('optgroup');
  optgroup3.label = 'US Estándar';
  const optgroup4 = document.createElement('optgroup');
  optgroup4.label = 'Otro';

  PAPER_SIZES.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} (${p.width}×${p.height} mm)`;

    if (['sra3', 'sra4', '13x19', '12x18'].includes(p.id)) {
      optgroup1.appendChild(opt);
    } else if (['a3', 'a4', 'a5'].includes(p.id)) {
      optgroup2.appendChild(opt);
    } else {
      optgroup3.appendChild(opt);
    }
  });

  const customOpt = document.createElement('option');
  customOpt.value = 'custom';
  customOpt.textContent = 'Personalizado...';
  optgroup4.appendChild(customOpt);

  refs.paperSelect.appendChild(optgroup1);
  refs.paperSelect.appendChild(optgroup2);
  refs.paperSelect.appendChild(optgroup3);
  refs.paperSelect.appendChild(optgroup4);
}

// ─── Events ──────────────────────────────────────────────────
function bindEvents() {
  // Section collapsing
  document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', () => {
      header.parentElement.classList.toggle('collapsed');
    });
  });

  // File drop zones
  setupDropZone(refs.dropFront, refs.inputFront, 'front');
  setupDropZone(refs.dropBack, refs.inputBack, 'back');
  refs.removeFront.addEventListener('click', () => removeFile('front'));
  refs.removeBack.addEventListener('click', () => removeFile('back'));

  // Paper size
  refs.paperSelect.addEventListener('change', () => {
    state.paperSize = refs.paperSelect.value;
    refs.customSizeGroup.hidden = state.paperSize !== 'custom';
    recalculate();
  });

  refs.customWidth.addEventListener('input', () => {
    state.customWidth = parseFloat(refs.customWidth.value) || 320;
    recalculate();
  });

  refs.customHeight.addEventListener('input', () => {
    state.customHeight = parseFloat(refs.customHeight.value) || 450;
    recalculate();
  });

  // Orientation
  refs.btnPortrait.addEventListener('click', () => setOrientation('portrait'));
  refs.btnLandscape.addEventListener('click', () => setOrientation('landscape'));

  // Crop marks & bleed
  refs.cropToggle.addEventListener('change', () => {
    state.cropMarks = refs.cropToggle.checked;
    updatePreview();
  });

  refs.bleedInput.addEventListener('input', () => {
    state.bleed = parseFloat(refs.bleedInput.value) || 0;
    recalculate();
  });

  refs.markOffsetInput.addEventListener('input', () => {
    state.markOffset = parseFloat(refs.markOffsetInput.value) || 0;
    updatePreview();
  });

  refs.markLengthInput.addEventListener('input', () => {
    state.markLength = parseFloat(refs.markLengthInput.value) || 5;
    updatePreview();
  });

  // Spacing
  refs.gutterInput.addEventListener('input', () => {
    state.gutter = parseFloat(refs.gutterInput.value) || 0;
    recalculate();
  });

  refs.marginH.addEventListener('input', () => {
    state.marginH = parseFloat(refs.marginH.value) || 0;
    recalculate();
  });

  refs.marginV.addEventListener('input', () => {
    state.marginV = parseFloat(refs.marginV.value) || 0;
    recalculate();
  });

  refs.autoRotate.addEventListener('change', () => {
    state.autoRotate = refs.autoRotate.checked;
    recalculate();
  });

  // Duplex
  refs.btnSingle.addEventListener('click', () => setDuplex(false));
  refs.btnDuplex.addEventListener('click', () => setDuplex(true));

  // Job name
  refs.jobName.addEventListener('input', () => {
    state.jobName = refs.jobName.value || 'imposicion';
  });

  // Presets
  refs.presetSaveBtn.addEventListener('click', handleSavePreset);

  // Export
  refs.exportBtn.addEventListener('click', handleExport);

  // Zoom
  refs.zoomIn.addEventListener('click', () => setZoom(state.zoom + 0.15));
  refs.zoomOut.addEventListener('click', () => setZoom(state.zoom - 0.15));
  refs.zoomFit.addEventListener('click', fitZoom);

  refs.canvasContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(state.zoom + delta);
  }, { passive: false });

  // Pan
  let isPanning = false;
  let panStart = { x: 0, y: 0 };

  refs.canvasContainer.addEventListener('mousedown', (e) => {
    isPanning = true;
    panStart = { x: e.clientX - state.panX, y: e.clientY - state.panY };
    refs.canvasContainer.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    state.panX = e.clientX - panStart.x;
    state.panY = e.clientY - panStart.y;
    applyTransform();
  });

  window.addEventListener('mouseup', () => {
    isPanning = false;
    refs.canvasContainer.style.cursor = 'grab';
  });

  refs.canvasContainer.style.cursor = 'grab';
}

// ─── File Handling ───────────────────────────────────────────
function setupDropZone(dropZone, input, side) {
  dropZone.addEventListener('click', () => input.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) await handleFile(file, side);
  });

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) await handleFile(file, side);
    input.value = '';
  });
}

async function handleFile(file, side) {
  try {
    const loaded = await loadFile(file);

    if (side === 'front') {
      state.frontFile = loaded;
      refs.nameFront.textContent = loaded.name;
      refs.dimsFront.textContent = `${loaded.width.toFixed(1)}×${loaded.height.toFixed(1)} mm`;
      refs.dropFront.hidden = true;
      refs.infoFront.hidden = false;

      // Update jobName field to default to front file name without extension
      let baseName = file.name;
      const lastDotIndex = baseName.lastIndexOf('.');
      if (lastDotIndex > 0) {
        baseName = baseName.substring(0, lastDotIndex);
      }
      state.jobName = baseName;
      refs.jobName.value = baseName;
    } else {
      state.backFile = loaded;
      refs.nameBack.textContent = loaded.name;
      refs.dimsBack.textContent = `${loaded.width.toFixed(1)}×${loaded.height.toFixed(1)} mm`;
      refs.dropBack.hidden = true;
      refs.infoBack.hidden = false;
    }

    recalculate();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

function removeFile(side) {
  if (side === 'front') {
    state.frontFile = null;
    refs.dropFront.hidden = false;
    refs.infoFront.hidden = true;
  } else {
    state.backFile = null;
    refs.dropBack.hidden = false;
    refs.infoBack.hidden = true;
  }
  recalculate();
}

// ─── Orientation ─────────────────────────────────────────────
function setOrientation(o) {
  state.orientation = o;
  refs.btnPortrait.classList.toggle('active', o === 'portrait');
  refs.btnLandscape.classList.toggle('active', o === 'landscape');
  recalculate();
}

// ─── Duplex ──────────────────────────────────────────────────
function setDuplex(d) {
  state.duplex = d;
  refs.btnSingle.classList.toggle('active', !d);
  refs.btnDuplex.classList.toggle('active', d);
  refs.duplexFileSection.hidden = !d;
  recalculate();
}

// ─── Recalculate ─────────────────────────────────────────────
function recalculate() {
  const paper = getPaperDimensions();

  if (state.frontFile) {
    state.layout = calculateImposition({
      artWidth: state.frontFile.width,
      artHeight: state.frontFile.height,
      paperWidth: paper.width,
      paperHeight: paper.height,
      bleed: state.bleed,
      gutter: state.gutter,
      marginTop: state.marginV,
      marginBottom: state.marginV,
      marginLeft: state.marginH,
      marginRight: state.marginH,
      autoRotate: state.autoRotate,
    });
  } else {
    state.layout = null;
  }

  if (state.duplex && state.backFile) {
    state.backLayout = calculateImposition({
      artWidth: state.backFile.width,
      artHeight: state.backFile.height,
      paperWidth: paper.width,
      paperHeight: paper.height,
      bleed: state.bleed,
      gutter: state.gutter,
      marginTop: state.marginV,
      marginBottom: state.marginV,
      marginLeft: state.marginH,
      marginRight: state.marginH,
      autoRotate: state.autoRotate,
    });
  } else {
    state.backLayout = null;
  }

  updatePreview();
  updateInfo();
  refs.exportBtn.disabled = !state.frontFile || !state.layout || state.layout.totalCopies === 0;
}

function getPaperDimensions() {
  let w, h;

  if (state.paperSize === 'custom') {
    w = state.customWidth;
    h = state.customHeight;
  } else {
    const p = getPaperSize(state.paperSize);
    w = p.width;
    h = p.height;
  }

  // Apply orientation
  if (state.orientation === 'landscape') {
    return { width: Math.max(w, h), height: Math.min(w, h) };
  }
  return { width: Math.min(w, h), height: Math.max(w, h) };
}

// ─── Preview ─────────────────────────────────────────────────
function updatePreview() {
  const canvas = refs.canvas;
  const ctx = canvas.getContext('2d');
  const paper = getPaperDimensions();

  // Show/hide empty state
  const hasContent = !!state.frontFile;
  refs.emptyState.classList.toggle('hidden', hasContent);
  canvas.style.display = hasContent ? 'block' : 'none';

  if (!hasContent) return;

  // Canvas size — scale mm to pixels for display (1mm = 2px base)
  const SCALE = 2;
  canvas.width = paper.width * SCALE;
  canvas.height = paper.height * SCALE;

  // Paper background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw layout
  if (state.layout && state.frontFile) {
    const img = new Image();
    img.onload = () => {
      drawLayout(ctx, state.layout, img, SCALE);
      if (state.cropMarks) {
        drawCropMarks(ctx, state.layout, SCALE);
      }
    };
    img.src = state.frontFile.imageDataUrl;

    // Also draw immediately with a placeholder color
    for (const copy of state.layout.copies) {
      ctx.fillStyle = 'rgba(77, 166, 255, 0.08)';
      ctx.strokeStyle = 'rgba(77, 166, 255, 0.3)';
      ctx.lineWidth = 1;
      const x = copy.x * SCALE;
      const y = copy.y * SCALE;
      const w = copy.width * SCALE;
      const h = copy.height * SCALE;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);

      // Trim area
      if (state.bleed > 0) {
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.4)';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(
          copy.trimX * SCALE,
          copy.trimY * SCALE,
          copy.trimWidth * SCALE,
          copy.trimHeight * SCALE
        );
        ctx.setLineDash([]);
      }
    }

    if (state.cropMarks) {
      drawCropMarks(ctx, state.layout, SCALE);
    }
  }

  fitZoom();
}

function drawLayout(ctx, layout, img, scale) {
  // Redraw paper
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (const copy of layout.copies) {
    const x = copy.x * scale;
    const y = copy.y * scale;
    const w = copy.width * scale;
    const h = copy.height * scale;

    ctx.drawImage(img, x, y, w, h);

    // Trim indicator
    if (state.bleed > 0) {
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(
        copy.trimX * scale,
        copy.trimY * scale,
        copy.trimWidth * scale,
        copy.trimHeight * scale
      );
      ctx.setLineDash([]);
    }
  }

  if (state.cropMarks) {
    drawCropMarks(ctx, layout, scale);
  }
}

function drawCropMarks(ctx, layout, scale) {
  const marks = generateCropMarks(layout, state.bleed, state.markOffset, state.markLength);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.5;

  for (const m of marks) {
    ctx.beginPath();
    ctx.moveTo(m.x1 * scale, m.y1 * scale);
    ctx.lineTo(m.x2 * scale, m.y2 * scale);
    ctx.stroke();
  }
}

function updateInfo() {
  if (state.layout) {
    refs.infoCopies.textContent = `${state.layout.totalCopies} copia${state.layout.totalCopies !== 1 ? 's' : ''}`;
    refs.infoUsage.textContent = `${state.layout.usagePercent}% uso`;
    refs.infoGrid.textContent = `${state.layout.cols}×${state.layout.rows}`;
  } else {
    refs.infoCopies.textContent = '0 copias';
    refs.infoUsage.textContent = '0% uso';
    refs.infoGrid.textContent = '0×0';
  }
}

// ─── Zoom & Pan ──────────────────────────────────────────────
function setZoom(z) {
  state.zoom = Math.max(0.1, Math.min(5, z));
  refs.zoomLevel.textContent = `${Math.round(state.zoom * 100)}%`;
  applyTransform();
}

function fitZoom() {
  const container = refs.canvasContainer;
  const canvas = refs.canvas;
  if (!canvas.width || !canvas.height) return;

  const padH = 40;
  const padV = 40;
  const scaleX = (container.clientWidth - padH * 2) / canvas.width;
  const scaleY = (container.clientHeight - padV * 2) / canvas.height;
  state.zoom = Math.min(scaleX, scaleY, 3);
  state.panX = 0;
  state.panY = 0;
  refs.zoomLevel.textContent = `${Math.round(state.zoom * 100)}%`;
  applyTransform();
}

function applyTransform() {
  refs.canvas.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
}

// ─── Presets ─────────────────────────────────────────────────
function handleSavePreset() {
  const name = refs.presetName.value.trim();
  if (!name) {
    showToast('Escribe un nombre para el preset', 'error');
    return;
  }

  savePreset(name, {
    paperSize: state.paperSize,
    orientation: state.orientation,
    customWidth: state.customWidth,
    customHeight: state.customHeight,
    bleed: state.bleed,
    markOffset: state.markOffset,
    markLength: state.markLength,
    gutter: state.gutter,
    marginH: state.marginH,
    marginV: state.marginV,
    cropMarks: state.cropMarks,
    autoRotate: state.autoRotate,
    duplex: state.duplex,
  });

  refs.presetName.value = '';
  renderPresets();
  showToast(`Preset "${name}" guardado`, 'success');
}

function handleLoadPreset(name) {
  const config = loadPreset(name);
  if (!config) return;

  // Apply config to state and UI
  state.paperSize = config.paperSize || 'sra3';
  state.orientation = config.orientation || 'portrait';
  state.customWidth = config.customWidth || 320;
  state.customHeight = config.customHeight || 450;
  state.bleed = config.bleed ?? 3;
  state.markOffset = config.markOffset ?? 2;
  state.markLength = config.markLength ?? 5;
  state.gutter = config.gutter ?? 0;
  state.marginH = config.marginH ?? 5;
  state.marginV = config.marginV ?? 5;
  state.cropMarks = config.cropMarks ?? true;
  state.autoRotate = config.autoRotate ?? false;
  state.duplex = config.duplex ?? false;

  // Update UI elements
  refs.paperSelect.value = state.paperSize;
  refs.customSizeGroup.hidden = state.paperSize !== 'custom';
  refs.customWidth.value = state.customWidth;
  refs.customHeight.value = state.customHeight;
  setOrientation(state.orientation);
  refs.cropToggle.checked = state.cropMarks;
  refs.bleedInput.value = state.bleed;
  refs.markOffsetInput.value = state.markOffset;
  refs.markLengthInput.value = state.markLength;
  refs.gutterInput.value = state.gutter;
  refs.marginH.value = state.marginH;
  refs.marginV.value = state.marginV;
  refs.autoRotate.checked = state.autoRotate;
  setDuplex(state.duplex);

  recalculate();
  showToast(`Preset "${name}" cargado`, 'success');
}

function handleDeletePreset(name) {
  deletePreset(name);
  renderPresets();
  showToast(`Preset "${name}" eliminado`, 'success');
}

function renderPresets() {
  const presets = getPresets();
  refs.presetList.innerHTML = '';

  if (presets.length === 0) {
    refs.presetList.innerHTML = '<div style="padding:8px;color:var(--text-muted);font-size:11px;text-align:center;">No hay presets guardados</div>';
    return;
  }

  presets.forEach(p => {
    const item = document.createElement('div');
    item.className = 'preset-item';

    item.innerHTML = `
      <span class="preset-item-name">${p.name}</span>
      <button class="preset-delete" title="Eliminar">✕</button>
    `;

    item.querySelector('.preset-item-name').addEventListener('click', () => handleLoadPreset(p.name));
    item.querySelector('.preset-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      handleDeletePreset(p.name);
    });

    refs.presetList.appendChild(item);
  });
}

// ─── Export ──────────────────────────────────────────────────
async function handleExport() {
  if (!state.frontFile || !state.layout) return;

  const paper = getPaperDimensions();
  const pdfFilename = `${state.jobName}.pdf`;

  // Step 1: Open the "Save As" dialog IMMEDIATELY (user gesture is still active)
  const handle = await requestSaveHandle(pdfFilename);
  if (handle === 'cancelled') return; // User cancelled the dialog

  refs.exportBtn.disabled = true;
  refs.exportBtn.textContent = 'Exportando...';

  try {
    // Step 2: Generate the PDF
    const pdfBytes = await exportPDF({
      layout: state.layout,
      frontFile: state.frontFile,
      backFile: state.backFile,
      paperWidthMm: paper.width,
      paperHeightMm: paper.height,
      bleed: state.bleed,
      markOffset: state.markOffset,
      markLength: state.markLength,
      showCropMarks: state.cropMarks,
      duplex: state.duplex,
      backLayout: state.backLayout,
      jobName: state.jobName,
    });

    // Step 3: Write the PDF to disk
    if (handle) {
      // Native file system — write directly to the chosen location
      await writeToHandle(handle, pdfBytes);
    } else {
      // Fallback — anchor download
      downloadPDFFallback(pdfBytes, pdfFilename);
    }

    showToast('PDF exportado correctamente', 'success');
  } catch (err) {
    console.error('Export error:', err);
    showToast(`Error al exportar: ${err.message}`, 'error');
  } finally {
    refs.exportBtn.disabled = false;
    refs.exportBtn.innerHTML = '<span class="btn-icon-left">📤</span> Exportar PDF';
  }
}

// ─── Toast ───────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ─── Boot ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
