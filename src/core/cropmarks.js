/**
 * Crop mark generation for imposition layouts.
 *
 * Each copy gets 8 identical marks at its 4 corners:
 *   - 2 per corner (1 vertical + 1 horizontal)
 *   - All marks are the same style regardless of position (internal or external)
 *
 * Diagram per copy (numbers match the user's reference image):
 *
 *         1              2
 *         |              |
 *    8 ── ┌──────────────┐ ── 3
 *         │              │
 *         │   trim area  │
 *         │              │
 *    7 ── └──────────────┘ ── 4
 *         |              |
 *         6              5
 *
 * Marks start at `offset` mm from the trim edge and extend `length` mm outward.
 */

/**
 * Generate crop marks for all copies in the layout.
 *
 * @param {object} layout      - Result from calculateImposition()
 * @param {number} bleed       - Bleed in mm (determines where trim edge is within the cell)
 * @param {number} markOffset  - Gap between trim edge and start of mark, in mm
 * @param {number} markLength  - Length of each mark line, in mm
 * @returns {Array<{x1, y1, x2, y2}>} Array of line segments in mm coordinates
 */
export function generateCropMarks(layout, bleed, markOffset = 2, markLength = 5) {
  const marks = [];

  for (const copy of layout.copies) {
    // Trim box corners (inside the bleed)
    const left   = copy.x + bleed;
    const right  = copy.x + copy.width - bleed;
    const top    = copy.y + bleed;
    const bottom = copy.y + copy.height - bleed;

    // ── TOP-LEFT CORNER ──
    // Mark 1: vertical, going UP from top-left
    marks.push({
      x1: left,
      y1: top - markOffset,
      x2: left,
      y2: top - markOffset - markLength,
    });
    // Mark 8: horizontal, going LEFT from top-left
    marks.push({
      x1: left - markOffset,
      y1: top,
      x2: left - markOffset - markLength,
      y2: top,
    });

    // ── TOP-RIGHT CORNER ──
    // Mark 2: vertical, going UP from top-right
    marks.push({
      x1: right,
      y1: top - markOffset,
      x2: right,
      y2: top - markOffset - markLength,
    });
    // Mark 3: horizontal, going RIGHT from top-right
    marks.push({
      x1: right + markOffset,
      y1: top,
      x2: right + markOffset + markLength,
      y2: top,
    });

    // ── BOTTOM-RIGHT CORNER ──
    // Mark 4: horizontal, going RIGHT from bottom-right
    marks.push({
      x1: right + markOffset,
      y1: bottom,
      x2: right + markOffset + markLength,
      y2: bottom,
    });
    // Mark 5: vertical, going DOWN from bottom-right
    marks.push({
      x1: right,
      y1: bottom + markOffset,
      x2: right,
      y2: bottom + markOffset + markLength,
    });

    // ── BOTTOM-LEFT CORNER ──
    // Mark 6: vertical, going DOWN from bottom-left
    marks.push({
      x1: left,
      y1: bottom + markOffset,
      x2: left,
      y2: bottom + markOffset + markLength,
    });
    // Mark 7: horizontal, going LEFT from bottom-left
    marks.push({
      x1: left - markOffset,
      y1: bottom,
      x2: left - markOffset - markLength,
      y2: bottom,
    });
  }

  return marks;
}
