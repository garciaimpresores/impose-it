/**
 * Predefined paper sizes for print imposition.
 * All dimensions in millimeters (width × height in portrait orientation).
 */

export const PAPER_SIZES = [
  // --- Oversize / Press sheets ---
  { id: 'sra3',    name: 'SRA3',        width: 320,   height: 450   },
  { id: 'sra4',    name: 'SRA4',        width: 225,   height: 320   },
  { id: '13x19',   name: '13 × 19"',    width: 330.2, height: 482.6 },
  { id: '12x18',   name: '12 × 18"',    width: 304.8, height: 457.2 },

  // --- ISO standard ---
  { id: 'a3',      name: 'A3',          width: 297,   height: 420   },
  { id: 'a4',      name: 'A4',          width: 210,   height: 297   },
  { id: 'a5',      name: 'A5',          width: 148,   height: 210   },

  // --- US standard ---
  { id: 'tabloid', name: 'Tabloide (11×17")', width: 279.4, height: 431.8 },
  { id: 'letter',  name: 'Carta (8.5×11")',   width: 215.9, height: 279.4 },
  { id: 'legal',   name: 'Legal (8.5×14")',   width: 215.9, height: 355.6 },
];

/**
 * Get a paper size by its ID.
 * @param {string} id
 * @returns {object|null}
 */
export function getPaperSize(id) {
  return PAPER_SIZES.find(p => p.id === id) || null;
}

/**
 * Build a custom paper size object.
 * @param {number} widthMm
 * @param {number} heightMm
 * @returns {object}
 */
export function customPaperSize(widthMm, heightMm) {
  return {
    id: 'custom',
    name: `Personalizado (${widthMm}×${heightMm} mm)`,
    width: widthMm,
    height: heightMm,
  };
}
