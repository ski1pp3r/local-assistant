import { log, LOG_TYPES } from '../utils/logger';

const api = window.electronAPI || {
  webSearch: async () => [],
  fetchUrl: async () => ''
};

export async function performWebSearch(query) {
  log(`WEB_SEARCH: "${query}"`, LOG_TYPES.SYSTEM);
  try {
    return await api.webSearch(query);
  } catch (e) {
    return [];
  }
}

export async function performFetchUrl(url) {
  log(`FETCH_URL: "${url}"`, LOG_TYPES.SYSTEM);
  try {
    return await api.fetchUrl(url);
  } catch (e) {
    return 'Fetch failed.';
  }
}
