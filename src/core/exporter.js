/**
 * PDF exporter — generates the final imposition PDF using pdf-lib.
 */
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { mmToPt } from '../utils/units.js';
import { generateCropMarks } from './cropmarks.js';

/**
 * Export the imposition layout as a PDF.
 *
 * @param {object} params
 * @param {object} params.layout       - Result from calculateImposition()
 * @param {object} params.frontFile    - Loaded front file from file-loader
 * @param {object|null} params.backFile - Loaded back file (for duplex), or null
 * @param {number} params.paperWidthMm
 * @param {number} params.paperHeightMm
 * @param {number} params.bleed        - Bleed in mm
 * @param {boolean} params.showCropMarks
 * @param {boolean} params.duplex      - Duplex printing
 * @param {object|null} params.backLayout - Layout for back side (if different file)
 * @param {string} params.jobName      - Job name for metadata
 * @returns {Promise<Uint8Array>} The PDF bytes
 */
export async function exportPDF(params) {
  const {
    layout,
    frontFile,
    backFile,
    paperWidthMm,
    paperHeightMm,
    bleed,
    markOffset = 2,
    markLength = 5,
    showCropMarks,
    duplex,
    backLayout,
    jobName = 'imposicion',
  } = params;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(jobName);
  pdfDoc.setProducer('ImposeIt');
  pdfDoc.setCreator('ImposeIt');

  const pageW = mmToPt(paperWidthMm);
  const pageH = mmToPt(paperHeightMm);

  // --- FRONT PAGE ---
  await _renderPage(pdfDoc, layout, frontFile, pageW, pageH, paperWidthMm, paperHeightMm, bleed, markOffset, markLength, showCropMarks);

  // --- BACK PAGE (duplex) ---
  if (duplex) {
    const bLayout = backLayout || layout;
    const bFile = backFile || frontFile;
    await _renderPage(pdfDoc, bLayout, bFile, pageW, pageH, paperWidthMm, paperHeightMm, bleed, markOffset, markLength, showCropMarks);
  }

  return await pdfDoc.save();
}

/**
 * Render a single page of the imposition.
 */
async function _renderPage(pdfDoc, layout, fileData, pageW, pageH, paperWMm, paperHMm, bleed, markOffset, markLength, showCropMarks) {
  const page = pdfDoc.addPage([pageW, pageH]);

  // Embed the source image/PDF
  // Clone the buffer to prevent detached ArrayBuffer errors
  let embeddedImage;
  const dataClone = fileData.data.slice(0);

  if (fileData.type === 'pdf') {
    const srcDoc = await PDFDocument.load(dataClone);
    const [embeddedPage] = await pdfDoc.embedPdf(srcDoc, [0]);
    embeddedImage = embeddedPage;
  } else if (fileData.format === 'jpeg' || fileData.format === 'jpg') {
    embeddedImage = await pdfDoc.embedJpg(dataClone);
  } else {
    // PNG or converted TIF
    embeddedImage = await pdfDoc.embedPng(dataClone);
  }

  // Draw each copy
  for (const copy of layout.copies) {
    const x = mmToPt(copy.x);
    // PDF coordinate system: y=0 is bottom, so flip
    const y = pageH - mmToPt(copy.y) - mmToPt(copy.height);
    const w = mmToPt(copy.width);
    const h = mmToPt(copy.height);

    if (fileData.type === 'pdf') {
      page.drawPage(embeddedImage, { x, y, width: w, height: h });
    } else {
      page.drawImage(embeddedImage, { x, y, width: w, height: h });
    }
  }

  // Draw crop marks
  if (showCropMarks) {
    const marks = generateCropMarks(layout, bleed, markOffset, markLength);
    const markColor = rgb(0, 0, 0);

    for (const mark of marks) {
      const x1 = mmToPt(mark.x1);
      const y1 = pageH - mmToPt(mark.y1);
      const x2 = mmToPt(mark.x2);
      const y2 = pageH - mmToPt(mark.y2);

      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: 0.25,
        color: markColor,
      });
    }
  }
}

/**
 * Request a file handle from the user BEFORE generating the PDF.
 * Must be called synchronously from a user gesture (click) — before any await.
 *
 * @param {string} filename - Suggested filename
 * @returns {Promise<FileSystemFileHandle|null>} File handle, or null if unsupported/cancelled
 */
export async function requestSaveHandle(filename) {
  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  if (!window.showSaveFilePicker) return null;

  try {
    return await window.showSaveFilePicker({
      suggestedName: safeName,
      types: [{
        description: 'Documento PDF',
        accept: { 'application/pdf': ['.pdf'] },
      }],
    });
  } catch (err) {
    if (err.name === 'AbortError') return 'cancelled';
    console.warn('showSaveFilePicker failed:', err);
    return null;
  }
}

/**
 * Write PDF bytes to a file handle obtained from requestSaveHandle.
 * @param {FileSystemFileHandle} handle
 * @param {Uint8Array} pdfBytes
 */
export async function writeToHandle(handle, pdfBytes) {
  const writable = await handle.createWritable();
  await writable.write(pdfBytes);
  await writable.close();
}

/**
 * Fallback download method using anchor element.
 * Used when File System Access API is not available.
 * @param {Uint8Array} pdfBytes
 * @param {string} filename
 */
export function downloadPDFFallback(pdfBytes, filename) {
  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 10000);
}

