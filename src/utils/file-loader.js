/**
 * File loader — reads image and PDF files, extracts dimensions and renderable data.
 */
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Clone an ArrayBuffer to prevent detachment issues.
 * @param {ArrayBuffer} buffer
 * @returns {ArrayBuffer}
 */
function cloneArrayBuffer(buffer) {
  const copy = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(copy).set(new Uint8Array(buffer));
  return copy;
}

/**
 * Load a file and extract its data and dimensions.
 * Returns dimensions in mm (assuming 72 DPI for PDFs, 300 DPI for raster images).
 *
 * @param {File} file
 * @returns {Promise<{type: string, data: ArrayBuffer, width: number, height: number, name: string, imageDataUrl: string}>}
 */
export async function loadFile(file) {
  const originalBuffer = await file.arrayBuffer();
  // Clone the buffer immediately — the original can get detached
  const arrayBuffer = cloneArrayBuffer(originalBuffer);
  const ext = file.name.split('.').pop().toLowerCase();

  if (['jpg', 'jpeg', 'png'].includes(ext)) {
    return await _loadImage(file, arrayBuffer, ext);
  } else if (['tif', 'tiff'].includes(ext)) {
    return await _loadImage(file, arrayBuffer, 'png');
  } else if (ext === 'pdf') {
    return await _loadPdf(file, arrayBuffer);
  }

  throw new Error(`Formato no soportado: .${ext}`);
}

/**
 * Load a raster image.
 */
async function _loadImage(file, arrayBuffer, ext) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([arrayBuffer], { type: file.type || `image/${ext}` });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      // Assume 300 DPI for raster images → convert px to mm
      const DPI = 300;
      const widthMm = (img.naturalWidth / DPI) * 25.4;
      const heightMm = (img.naturalHeight / DPI) * 25.4;

      // Clone the buffer again for storage — ensure it's never detached
      const storedBuffer = cloneArrayBuffer(arrayBuffer);

      resolve({
        type: 'image',
        format: ext === 'jpg' ? 'jpeg' : ext,
        data: storedBuffer,
        width: widthMm,
        height: heightMm,
        widthPx: img.naturalWidth,
        heightPx: img.naturalHeight,
        name: file.name,
        imageDataUrl: url,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`No se pudo cargar la imagen: ${file.name}`));
    };

    img.src = url;
  });
}

/**
 * Load a PDF file, render the first page, extract dimensions.
 */
async function _loadPdf(file, arrayBuffer) {
  // Use a clone for pdfjs (it may transfer/detach the buffer)
  const pdfBuffer = cloneArrayBuffer(arrayBuffer);
  const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });

  // PDF dimensions are in points (72 DPI)
  const widthMm = (viewport.width / 72) * 25.4;
  const heightMm = (viewport.height / 72) * 25.4;

  // Render to canvas for preview
  const scale = 2;
  const scaledViewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;
  const ctx = canvas.getContext('2d');

  await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;

  const imageDataUrl = canvas.toDataURL('image/png');

  // Store a fresh clone for later use by pdf-lib
  const storedBuffer = cloneArrayBuffer(arrayBuffer);

  return {
    type: 'pdf',
    format: 'pdf',
    data: storedBuffer,
    width: widthMm,
    height: heightMm,
    widthPx: viewport.width,
    heightPx: viewport.height,
    name: file.name,
    imageDataUrl,
  };
}
