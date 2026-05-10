import { useState, useRef, useCallback } from 'react';
import { log, LOG_TYPES } from '../utils/logger';

export function useTTS(settings) {
  const [synthesizing, setSynthesizing] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const audioSourceRef = useRef(null);
  const speechQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const hasShownSynthesizingRef = useRef(false);

  const stopTTS = useCallback(() => {
    const wasActive = isPlayingRef.current || speechQueueRef.current.length > 0 || window.speechSynthesis.speaking;
    
    speechQueueRef.current = [];
    isPlayingRef.current = false;
    hasShownSynthesizingRef.current = false;
    
    if (wasActive) {
      log('TTS_CANCELLED', LOG_TYPES.TTS);
    }
    
    window.speechSynthesis.cancel();

    if (audioSourceRef.current) {
      try { audioSourceRef.current.pause(); } catch(e) {}
      audioSourceRef.current = null;
    }
    setSpeakingIdx(null);
    setSynthesizing(false);
  }, []);

  const processSpeechQueue = useCallback(async () => {
    if (isPlayingRef.current || !settings?.local_tts) return;
    
    if (speechQueueRef.current.length === 0) {
      setSpeakingIdx(null);
      setSynthesizing(false);
      return;
    }
    
    const text = speechQueueRef.current.shift();
    if (!text) {
      setSpeakingIdx(null);
      return;
    }

    isPlayingRef.current = true;
    if (!hasShownSynthesizingRef.current) {
      setSynthesizing(true);
      hasShownSynthesizingRef.current = true;
    }

    try {
      log(`TTS_GENERATING: "${text.slice(0, 30)}..."`, LOG_TYPES.TTS);
      const audio = await window.puter.ai.txt2speech(text);
      setSynthesizing(false);
      audio.onplay = () => log('TTS_PLAYBACK_STARTED', LOG_TYPES.TTS);
      audio.onended = () => {
        log('TTS_PLAYBACK_ENDED', LOG_TYPES.TTS);
        isPlayingRef.current = false;
        processSpeechQueue();
      };

      audioSourceRef.current = audio;
      audio.play();
    } catch (err) {
      console.error('Speech queue error:', err);
      isPlayingRef.current = false;
      setSynthesizing(false);
      processSpeechQueue();
    }
  }, [settings]);

  const speakMessage = useCallback(async (text, idx) => {
    if (speakingIdx === idx) {
      stopTTS();
      return;
    }

    stopTTS();

    const clean = text
      .replace(/<SEARCH>[\s\S]*?<\/SEARCH>/g, '')
      .replace(/<FETCH>[\s\S]*?<\/FETCH>/g, '')
      .replace(/```[\s\S]*?```/g, ' Code-Block. ')
      .replace(/`[^`]+`/g, '')
      .replace(/[#*_~>\[\]()|-]/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/\n+/g, '. ')
      .trim();

    if (settings?.local_tts) {
      try {
        setSpeakingIdx(idx);
        const chunks = [];
        let remaining = clean;
        while (remaining.length > 0) {
          if (remaining.length <= 2000) {
            chunks.push(remaining);
            break;
          }
          let splitIdx = remaining.lastIndexOf('.', 2000);
          if (splitIdx === -1) splitIdx = remaining.lastIndexOf(' ', 2000);
          if (splitIdx === -1) splitIdx = 2000;
          chunks.push(remaining.slice(0, splitIdx + 1).trim());
          remaining = remaining.slice(splitIdx + 1).trim();
        }

        speechQueueRef.current = chunks;
        isPlayingRef.current = false;
        processSpeechQueue();
      } catch (err) {
        console.error('Puter TTS error:', err);
        setSpeakingIdx(null);
        setSynthesizing(false);
      }
      return;
    }

    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = settings?.ui_language === 'en' ? 'en-US' : 'de-DE';
    utter.rate = 1.0;
    utter.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const voice = voices
      .filter(v => v.lang.startsWith(settings?.ui_language || 'de'))
      .sort((a, b) => {
        const score = (v) => (v.name.includes('Natural') ? 100 : 0) + (v.name.includes('Google') ? 50 : 0) + (v.name.includes('Premium') ? 80 : 0);
        return score(b) - score(a);
      })[0];
    
    if (voice) utter.voice = voice;
    utter.onend = () => setSpeakingIdx(prev => prev === idx ? null : prev);
    utter.onerror = () => setSpeakingIdx(null);

    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utter);
  }, [speakingIdx, settings, stopTTS, processSpeechQueue]);

  return { synthesizing, speakingIdx, setSpeakingIdx, stopTTS, speakMessage, speechQueueRef, processSpeechQueue };
}
