/**
 * Preset management — save/load/delete configuration presets using localStorage.
 */

const STORAGE_KEY = 'imposeit_presets';

/**
 * Get all saved presets.
 * @returns {Array<{name: string, config: object}>}
 */
export function getPresets() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save a preset with the given name and config.
 * If a preset with the same name exists, it will be overwritten.
 * @param {string} name
 * @param {object} config
 */
export function savePreset(name, config) {
  const presets = getPresets();
  const existing = presets.findIndex(p => p.name === name);

  const preset = {
    name,
    config: { ...config },
    savedAt: new Date().toISOString(),
  };

  if (existing >= 0) {
    presets[existing] = preset;
  } else {
    presets.push(preset);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

/**
 * Load a preset by name.
 * @param {string} name
 * @returns {object|null}
 */
export function loadPreset(name) {
  const presets = getPresets();
  const preset = presets.find(p => p.name === name);
  return preset ? preset.config : null;
}

/**
 * Delete a preset by name.
 * @param {string} name
 * @returns {boolean}
 */
export function deletePreset(name) {
  const presets = getPresets();
  const filtered = presets.filter(p => p.name !== name);
  if (filtered.length !== presets.length) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  }
  return false;
}
