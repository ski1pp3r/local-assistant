import { log, LOG_TYPES } from './logger';

const api = window.electronAPI || {
  readFile: async () => null,
  writeFile: async () => false,
  checkOllama: async () => false,
  startOllama: async () => ({ success: false, error: 'Electron API not found' }),
  openExternal: async () => {},
  webSearch: async () => [],
  fetchUrl: async () => ''
};

export async function loadJSON(fileName) {
  try {
    const raw = await api.readFile(fileName);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error(`loadJSON(${fileName}):`, e);
    return null;
  }
}

export async function saveJSON(fileName, data) {
  try {
    const success = await api.writeFile(fileName, JSON.stringify(data, null, 2));
    if (success) log(`FILE_SAVE: ${fileName}`, LOG_TYPES.SYSTEM);
    return success;
  } catch (e) {
    console.error(`saveJSON(${fileName}):`, e);
    return false;
  }
}

export async function loadThreads() {
  return (await loadJSON('threads.json')) || {};
}
export async function saveThreads(threads) {
  return saveJSON('threads.json', threads);
}

export async function loadPersonalities() {
  return (await loadJSON('personalities.json')) || [];
}
export async function savePersonalities(list) {
  return saveJSON('personalities.json', list);
}

export async function loadSettings() {
  return (await loadJSON('settings.json')) || {
    ollama_url: 'http://localhost:11434',
    memory_depth: 20,
    default_personality_id: 'default',
    local_tts: false,
    ui_language: 'de',
    auto_tts: false,
    Browser_Access: false
  };
}
export async function saveSettings(s) {
  return saveJSON('settings.json', s);
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
