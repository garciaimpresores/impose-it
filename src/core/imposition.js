/**
 * Imposition engine — calculates how many copies of an artwork fit on a sheet.
 */

/**
 * Calculate the imposition layout.
 *
 * @param {object} params
 * @param {number} params.artWidth   - Artwork width in mm (trim size)
 * @param {number} params.artHeight  - Artwork height in mm (trim size)
 * @param {number} params.paperWidth - Paper width in mm
 * @param {number} params.paperHeight - Paper height in mm
 * @param {number} params.bleed      - Bleed in mm (added to each side of each copy)
 * @param {number} params.gutter     - Space between copies in mm
 * @param {number} params.marginTop  - Top margin in mm
 * @param {number} params.marginBottom - Bottom margin in mm
 * @param {number} params.marginLeft - Left margin in mm
 * @param {number} params.marginRight - Right margin in mm
 * @param {boolean} params.autoRotate - Try rotating artwork 90° to maximize copies
 *
 * @returns {object} { copies: [{x, y, width, height, rotated}], cols, rows, totalCopies, usagePercent, artRotated }
 */
export function calculateImposition(params) {
  const {
    artWidth,
    artHeight,
    paperWidth,
    paperHeight,
    bleed = 0,
    gutter = 0,
    marginTop = 0,
    marginBottom = 0,
    marginLeft = 0,
    marginRight = 0,
    autoRotate = false,
  } = params;

  // Available print area
  const availW = paperWidth - marginLeft - marginRight;
  const availH = paperHeight - marginTop - marginBottom;

  // Each copy occupies: trim size + 2*bleed
  const cellW = artWidth + 2 * bleed;
  const cellH = artHeight + 2 * bleed;

  // Calculate for normal orientation
  const normalResult = _calcGrid(availW, availH, cellW, cellH, gutter);

  if (!autoRotate) {
    return _buildResult(normalResult, cellW, cellH, marginLeft, marginTop, bleed, gutter, paperWidth, paperHeight, false);
  }

  // Calculate for rotated artwork (90°)
  const rotatedResult = _calcGrid(availW, availH, cellH, cellW, gutter);

  if (rotatedResult.total > normalResult.total) {
    return _buildResult(rotatedResult, cellH, cellW, marginLeft, marginTop, bleed, gutter, paperWidth, paperHeight, true);
  }

  return _buildResult(normalResult, cellW, cellH, marginLeft, marginTop, bleed, gutter, paperWidth, paperHeight, false);
}

/**
 * Calculate how many cells fit in the available area.
 */
function _calcGrid(availW, availH, cellW, cellH, gutter) {
  if (cellW <= 0 || cellH <= 0 || availW <= 0 || availH <= 0) {
    return { cols: 0, rows: 0, total: 0 };
  }

  // First cell takes cellW, each subsequent takes cellW + gutter
  const cols = Math.max(0, Math.floor((availW + gutter) / (cellW + gutter)));
  const rows = Math.max(0, Math.floor((availH + gutter) / (cellH + gutter)));

  return { cols, rows, total: cols * rows };
}

/**
 * Build the full result with positioned copies.
 */
function _buildResult(grid, cellW, cellH, marginLeft, marginTop, bleed, gutter, paperW, paperH, rotated) {
  const copies = [];

  // Center the grid on the available area
  const totalGridW = grid.cols * cellW + Math.max(0, grid.cols - 1) * gutter;
  const totalGridH = grid.rows * cellH + Math.max(0, grid.rows - 1) * gutter;

  const startX = marginLeft + (paperW - marginLeft - (paperW - (paperW - marginLeft - (paperW - marginLeft - totalGridW) / 2 - marginLeft) - marginLeft)) / 2;
  // Simplified: center the grid
  const offsetX = marginLeft + ((paperW - marginLeft - marginLeft) - totalGridW) / 2;
  const offsetY = marginTop + ((paperH - marginTop - marginTop) - totalGridH) / 2;

  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const x = offsetX + col * (cellW + gutter);
      const y = offsetY + row * (cellH + gutter);

      copies.push({
        x,
        y,
        width: cellW,
        height: cellH,
        trimX: x + bleed,
        trimY: y + bleed,
        trimWidth: rotated ? (cellH - 2 * bleed) : (cellW - 2 * bleed),
        trimHeight: rotated ? (cellW - 2 * bleed) : (cellH - 2 * bleed),
        rotated,
      });
    }
  }

  const artArea = grid.total * cellW * cellH;
  const paperArea = paperW * paperH;
  const usagePercent = paperArea > 0 ? Math.round((artArea / paperArea) * 100) : 0;

  return {
    copies,
    cols: grid.cols,
    rows: grid.rows,
    totalCopies: grid.total,
    usagePercent: Math.min(usagePercent, 100),
    artRotated: rotated,
    cellWidth: cellW,
    cellHeight: cellH,
  };
}
