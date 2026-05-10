/**
 * Lightweight logging utility for the Process Monitor.
 * Uses BroadcastChannel for cross-window communication.
 */

const logChannel = new BroadcastChannel('app_logs');

export const log = (message, type = 'info') => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    message: typeof message === 'object' ? JSON.stringify(message) : message,
    type // 'info', 'api_send', 'api_recv', 'error', 'system', 'tts', 'stt'
  };
  
  // Send to other windows (like the standalone terminal)
  logChannel.postMessage(logEntry);
  
  // Also dispatch locally for any listeners in the same window
  const event = new CustomEvent('app-log', { detail: logEntry });
  window.dispatchEvent(event);
  
  // Also log to console for development
  if (type === 'error') {
    console.error(`[${type.toUpperCase()}]`, message);
  } else {
    // console.log(`[${type.toUpperCase()}]`, message); // Reduced console noise
  }
};

export const LOG_TYPES = {
  INFO: 'info',
  API_SEND: 'api_send',
  API_RECV: 'api_recv',
  ERROR: 'error',
  SYSTEM: 'system',
  TTS: 'tts',
  STT: 'stt'
};
