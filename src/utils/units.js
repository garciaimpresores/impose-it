/**
 * Unit conversion utilities for print layout.
 * PDF uses points (1pt = 1/72 inch).
 * Print uses mm.
 */

const MM_PER_INCH = 25.4;
const PT_PER_INCH = 72;
const PT_PER_MM = PT_PER_INCH / MM_PER_INCH; // ≈ 2.83465

/**
 * Convert millimeters to PDF points.
 * @param {number} mm
 * @returns {number} points
 */
export function mmToPt(mm) {
  return mm * PT_PER_MM;
}

/**
 * Convert PDF points to millimeters.
 * @param {number} pt
 * @returns {number} mm
 */
export function ptToMm(pt) {
  return pt / PT_PER_MM;
}

/**
 * Convert millimeters to pixels at a given DPI.
 * @param {number} mm
 * @param {number} dpi
 * @returns {number} pixels
 */
export function mmToPx(mm, dpi = 72) {
  return (mm / MM_PER_INCH) * dpi;
}

/**
 * Convert inches to millimeters.
 * @param {number} inches
 * @returns {number} mm
 */
export function inToMm(inches) {
  return inches * MM_PER_INCH;
}

/**
 * Convert pixels (at a given DPI) to millimeters.
 * @param {number} px
 * @param {number} dpi
 * @returns {number} mm
 */
export function pxToMm(px, dpi = 300) {
  return (px / dpi) * MM_PER_INCH;
}
