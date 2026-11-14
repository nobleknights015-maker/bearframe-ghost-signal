// Browser-local persistence (localStorage only).
const PROGRESS = 'bearframe_ghost_signal_progress_v1';
const SAVE = 'bearframe_ghost_signal_save_v1', SETTINGS = 'bearframe_ghost_signal_settings_v1';
const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (_) { return false; } };

export const store = {
  load: () => read(SAVE),
  save: (snap) => write(SAVE, snap),
  clear: () => { try { localStorage.removeItem(SAVE); } catch (_) {} },
  loadProgress: () => Object.assign({ unlocked: {}, done: {}, case: null }, read(PROGRESS) || {}),
  saveProgress: (p) => write(PROGRESS, p),
  loadSettings: () => Object.assign({ volume: .7, flicker: true, touch: 'auto' }, read(SETTINGS) || {}),
  saveSettings: (s) => write(SETTINGS, s),
};
