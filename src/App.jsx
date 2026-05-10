import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { pipeline } from '@huggingface/transformers';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import SettingsPanel from './SettingsPanel';
import NeuralCanvas from './NeuralCanvas';
import {
  loadThreads, saveThreads,
  loadPersonalities, savePersonalities,
  loadSettings, fetchModels,
  buildSystemPrompt, streamChat, generateId,
  saveJSON, extractUserInfo, generateChatName,
  performWebSearch, performFetchUrl
} from './data';
import { translations } from './translations';
import { log, LOG_TYPES } from './logger';
import ProcessMonitor from './ProcessMonitor';

// ── Markdown code-block renderer ──
const CodeBlock = React.memo(({ inline, className, children, ...props }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  
  const handleCopy = () => {
    navigator.clipboard.writeText(String(children));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div className="code-block-wrapper">
        <button 
          className={`btn-copy-code ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
        >
          {copied ? 'COPIED' : 'COPY'}
        </button>
        <SyntaxHighlighter 
          style={oneDark} 
          language={match[1]} 
          PreTag="div"
          customStyle={{ background: '#0d0d16', borderRadius: 4, fontSize: 13, margin: 0 }} 
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    );
  }
  return <code className={className} {...props}>{children}</code>;
});

export default function App() {
  // ── state ──
  const [threads, setThreads] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [personalities, setPersonalities] = useState([]);
  const [selectedPId, setSelectedPId] = useState('default');
  const [settings, setSettings] = useState(null);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  const [listening, setListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [search, setSearch] = useState('');
  const [ollamaStatus, setOllamaStatus] = useState('checking'); 
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);

  const messagesEnd = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);
  const recognitionRef = useRef(null);

  // ── translation helper ──
  const t = (key) => {
    const lang = settings?.ui_language || 'de';
    return translations[lang][key] || translations['de'][key] || key;
  };

  // ── inject styles (Removed, now in styles.css) ──

  // ── initial load ──
  useEffect(() => {
    let interval;
    (async () => {
      const s = await loadSettings();
      setSettings(s);
      setSelectedPId(s.default_personality_id || 'default');

      const tData = await loadThreads();
      
      const cleanData = {};
      Object.keys(tData).forEach(k => {
        if (tData[k].messages && tData[k].messages.length > 0) {
          cleanData[k] = tData[k];
        }
      });
      
      const id = generateId();
      cleanData[id] = { name: 'NEW_SESSION', personality_id: s.default_personality_id || 'default', messages: [] };
      setThreads(cleanData);
      setActiveId(id);

      setPersonalities(await loadPersonalities());
      
      const checkStatus = async () => {
        if (!window.electronAPI) {
          setOllamaStatus('offline');
          return;
        }
        const ok = await window.electronAPI.checkOllama(s.ollama_url);
        const newStatus = ok ? 'online' : 'offline';
        
        setOllamaStatus(prev => {
          if (prev !== newStatus) {
            log(`SYSTEM: Ollama is now ${newStatus.toUpperCase()}`, LOG_TYPES.SYSTEM);
            // If we just came online and have no models, fetch them
            if (newStatus === 'online') {
              fetchModels(s.ollama_url).then(m => {
                setModels(m);
                if (m.length > 0 && !selectedModel) setSelectedModel(m[0]);
              });
            }
          }
          return newStatus;
        });
      };

      
      checkStatus();
      interval = setInterval(checkStatus, 10000);
    })();
    return () => interval && clearInterval(interval);
  }, []);

  // ── auto-scroll ──
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads, activeId]);

  const openTerminal = useCallback(() => {
    window.open('index.html?terminal=true', 'ProcessMonitor', 
      'width=800,height=600,menubar=no,toolbar=no,location=no,status=no,resizable=yes'
    );
  }, []);

  // ── keyboard shortcuts ──
  useEffect(() => {
    const handleGlobalKeys = (e) => {
      // Ctrl+Shift+T to toggle terminal
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        openTerminal();
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [openTerminal]);

  // ── auto-resize textarea ──
  useEffect(() => {
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px'; }
  }, [input]);

  // ── helpers ──
  const activeThread = activeId ? threads[activeId] : null;
  const activeMessages = activeThread?.messages || [];

  const persist = useCallback(async (next) => {
    setThreads(next);
    await saveThreads(next);
  }, []);

  // ── new thread ──
  const createThread = useCallback(() => {
    const id = generateId();
    const next = {
      ...threads,
      [id]: { name: 'NEW_SESSION', personality_id: selectedPId, messages: [] }
    };
    persist(next);
    setActiveId(id);
  }, [threads, selectedPId, persist]);

  // ── delete thread ──
  const deleteThread = useCallback((id) => {
    if (!confirm(t('delete_thread'))) return;
    const next = { ...threads };
    delete next[id];
    persist(next);
    if (activeId === id) {
      const keys = Object.keys(next);
      setActiveId(keys.length > 0 ? keys[keys.length - 1] : null);
    }
  }, [threads, activeId, persist, t]);

  // ── clear all threads ──
  const clearThreads = useCallback(() => {
    if (!confirm(t('clear_threads_confirm'))) return;
    persist({});
    setActiveId(null);
  }, [persist, t]);

  // ── rename thread ──
  const startRename = (id) => {
    setRenamingId(id);
    setRenameVal(threads[id]?.name || '');
  };
  const finishRename = () => {
    if (renamingId && renameVal.trim()) {
      const next = { ...threads, [renamingId]: { ...threads[renamingId], name: renameVal.trim() } };
      persist(next);
    }
    setRenamingId(null);
  };

  const [synthesizing, setSynthesizing] = useState(false);
  const audioSourceRef = useRef(null);
  const speechQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const speakingIdxRef = useRef(null);
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

  // ── throttled save ──
  const lastSaveRef = useRef(0);
  const throttledSave = useCallback(async (data) => {
    const now = Date.now();
    if (now - lastSaveRef.current > 1000) {
      await saveThreads(data);
      lastSaveRef.current = now;
    }
  }, []);

  // ── send message ──
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !selectedModel || streaming) return;

    abortRef.current = new AbortController();
    let tid = activeId;
    let current = { ...threads };

    if (!tid) {
      tid = generateId();
      current[tid] = { name: 'NEW_SESSION', personality_id: selectedPId, messages: [] };
      setActiveId(tid);
    }

    const thread = { ...current[tid] };
    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    thread.messages = [...thread.messages, userMsg];

    if (thread.messages.filter(m => m.role === 'user').length === 1) {
      thread.name = text.slice(0, 30) + (text.length > 30 ? '…' : '');
    }

    current = { ...current, [tid]: thread };
    setThreads(current);
    await saveThreads(current);
    setInput('');
    setStreaming(true);

    let toolTriggered = false;
    do {
      toolTriggered = false;
      const personality = personalities.find(p => p.id === (thread.personality_id || selectedPId));
      const systemPrompt = buildSystemPrompt(personality, settings);
      const depth = settings?.memory_depth || 20;
      const contextMsgs = thread.messages.slice(-depth).map(m => ({ role: m.role, content: m.content }));
      const apiMessages = [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...contextMsgs
      ];

      const assistantMsg = { role: 'assistant', content: '', timestamp: new Date().toISOString() };
      thread.messages = [...thread.messages, assistantMsg];
      current = { ...current, [tid]: { ...thread } };
      setThreads({ ...current });

      try {
        const ollamaUrl = settings?.ollama_url || 'http://localhost:11434';
        let autoTtsBuffer = '';
        stopTTS(); // Stop any previous speech before starting new one

        for await (const chunk of streamChat(ollamaUrl, selectedModel, apiMessages, abortRef.current.signal)) {
          assistantMsg.content += chunk;
          current = {
            ...current,
            [tid]: { ...current[tid], messages: [...current[tid].messages.slice(0, -1), { ...assistantMsg }] }
          };
          setThreads({ ...current });
          throttledSave(current);

          if (settings?.auto_tts && settings?.local_tts) {
            autoTtsBuffer += chunk;
            
            const hasUnclosedSearch = autoTtsBuffer.includes('<SEARCH>') && !autoTtsBuffer.includes('</SEARCH>');
            const hasUnclosedFetch = autoTtsBuffer.includes('<FETCH>') && !autoTtsBuffer.includes('</FETCH>');
            
            if (!hasUnclosedSearch && !hasUnclosedFetch) {
              const boundaryMatch = autoTtsBuffer.match(/[.!?\n]/);
              if (boundaryMatch) {
                const index = boundaryMatch.index + 1;
                const sentence = autoTtsBuffer.slice(0, index).trim();
                autoTtsBuffer = autoTtsBuffer.slice(index);
                let cleanSentence = sentence.replace(/<SEARCH>[\s\S]*?<\/SEARCH>/g, '').replace(/<FETCH>[\s\S]*?<\/FETCH>/g, '').trim();
                if (cleanSentence) {
                  setSpeakingIdx(thread.messages.length - 1);
                  speechQueueRef.current.push(cleanSentence);
                  processSpeechQueue();
                }
              }
            }
          }
        }
        
        if (settings?.auto_tts && settings?.local_tts && autoTtsBuffer.trim()) {
          let cleanSentence = autoTtsBuffer.trim().replace(/<SEARCH>[\s\S]*?<\/SEARCH>/g, '').replace(/<FETCH>[\s\S]*?<\/FETCH>/g, '').trim();
          if (cleanSentence) {
            setSpeakingIdx(thread.messages.length - 1);
            speechQueueRef.current.push(cleanSentence);
            processSpeechQueue();
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          assistantMsg.content += `\n\n⚠ Error: ${err.message}`;
          current = {
            ...current,
            [tid]: { ...current[tid], messages: [...current[tid].messages.slice(0, -1), { ...assistantMsg }] }
          };
          setThreads({ ...current });
        }
      }

      await saveThreads(current);
      
      // ── Browser Tool Interception ──
      if (settings?.Browser_Access && !abortRef.current?.signal?.aborted) {
        const finalContent = assistantMsg.content;
        const searchMatch = finalContent.match(/<SEARCH>(.*?)<\/SEARCH>/);
        const fetchMatch = finalContent.match(/<FETCH>(.*?)<\/FETCH>/);
        
        if (searchMatch) {
          toolTriggered = true;
          const query = searchMatch[1];
          log(`Executing search: ${query}`, LOG_TYPES.SYSTEM);
          const results = await performWebSearch(query);
          const sysMsg = { role: 'system', content: `[Browser-Suche für "${query}":\n${results.map((r,i) => `${i+1}. ${r.snippet} (URL: ${r.url})`).join('\n')}\n]\nBeantworte nun die Nutzerfrage mit diesen Informationen.`, timestamp: new Date().toISOString() };
          thread.messages = [...thread.messages, sysMsg];
          current = { ...current, [tid]: { ...thread } };
        } else if (fetchMatch) {
          toolTriggered = true;
          const url = fetchMatch[1];
          log(`Fetching URL: ${url}`, LOG_TYPES.SYSTEM);
          const text = await performFetchUrl(url);
          const sysMsg = { role: 'system', content: `[Seiteninhalt von ${url}:\n${text}\n]\nFasse dies zusammen oder beantworte die Frage basierend darauf.`, timestamp: new Date().toISOString() };
          thread.messages = [...thread.messages, sysMsg];
          current = { ...current, [tid]: { ...thread } };
        }
      }

      // ── Neural Memory (Auto User Info) ──
      // Run only on final iteration (when no tool triggered) to avoid memory spam during tools
      if (!toolTriggered && settings?.auto_memory && assistantMsg.content) {
        const targetPersonality = personalities.find(p => p.id === (settings?.default_personality_id || 'default')) || personalities[0];
        if (targetPersonality) {
          const ollamaUrl = settings?.ollama_url || 'http://localhost:11434';
          const newInfo = await extractUserInfo(
            ollamaUrl, 
            selectedModel, 
            targetPersonality.nutzer_info, 
            text, 
            assistantMsg.content,
            settings?.ui_language
          );
          if (newInfo && newInfo !== targetPersonality.nutzer_info) {
            log(`MEMORY_UPDATED: New profile facts saved.`, LOG_TYPES.SYSTEM);
            const nextP = personalities.map(p => p.id === targetPersonality.id ? { ...p, nutzer_info: newInfo } : p);
            setPersonalities(nextP);
            await savePersonalities(nextP);
            
            const textHeader = settings?.ui_language === 'en' ? 'New facts saved:' : 'Neue Fakten gespeichert:';
            const memMsg = { role: 'system', content: `[Neural Memory Updated]\n${textHeader}\n${newInfo}`, timestamp: new Date().toISOString() };
            thread.messages = [...thread.messages, memMsg];
            current = { ...current, [tid]: { ...thread } };
            setThreads({ ...current });
            await saveThreads(current);
          }
        }
      }
    } while (toolTriggered && !abortRef.current?.signal?.aborted);

    setStreaming(false);
    abortRef.current = null;
    
    // ── Generate Intelligent Name ──
    const userMsgs = thread.messages.filter(m => m.role === 'user').length;
    if (userMsgs === 1) {
      const ollamaUrl = settings?.ollama_url || 'http://localhost:11434';
      generateChatName(ollamaUrl, selectedModel, thread.messages, settings?.ui_language).then(newName => {
        setThreads(prev => {
          if (prev[tid]) {
            const next = { ...prev, [tid]: { ...prev[tid], name: newName } };
            saveThreads(next);
            return next;
          }
          return prev;
        });
      });
    }

  }, [input, activeId, threads, selectedModel, selectedPId, personalities, settings, streaming, processSpeechQueue, throttledSave]);

  // ── key handler ──
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const [transcribing, setTranscribing] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const transcriberRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // ── voice input (Whisper Transcription) ──
  const toggleListening = useCallback(async () => {
    if (listening) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setListening(false);
      }
      return;
    }

    try {
      // 1. Initialize transcriber if needed
      if (!transcriberRef.current) {
        log('STT_MODEL_LOADING', LOG_TYPES.STT);
        setModelLoading(true);
        transcriberRef.current = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-base', {
          device: 'webgpu', // Try webgpu first, fallbacks to cpu
        }).catch(async () => {
          log('STT_WEBGPU_FAILED, FALLING BACK TO CPU', LOG_TYPES.ERROR);
          // fallback to cpu if webgpu fails
          return await pipeline('automatic-speech-recognition', 'onnx-community/whisper-base');
        });
        setModelLoading(false);
        log('STT_MODEL_LOADED', LOG_TYPES.STT);
      }


      // 2. Start recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      log('STT_RECORDING_STARTED', LOG_TYPES.STT);


      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        log('STT_RECORDING_STOPPED', LOG_TYPES.STT);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setTranscribing(true);
        log('STT_TRANSCRIBING...', LOG_TYPES.STT);

        
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const channelData = audioBuffer.getChannelData(0);

          const langCode = settings?.ui_language === 'en' ? 'en' : 'de';
          console.log(`[Whisper] Transcribing with language: ${langCode}`);

          const result = await transcriberRef.current(channelData, {
            chunk_length_s: 30,
            stride_length_s: 5,
            language: langCode,
            task: 'transcribe',
          });

          const text = result.text.trim();
          if (text) {
            log(`STT_RESULT: "${text}"`, LOG_TYPES.STT);
            setInput(prev => (prev ? prev + ' ' : '') + text);
          }

        } catch (err) {
          console.error('Transcription error:', err);
          alert('Transcription failed: ' + err.message);
        } finally {
          setTranscribing(false);
          // Stop all tracks in the stream
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setListening(true);
    } catch (err) {
      console.error('Mic access error:', err);
      alert('Mic access denied: ' + err.message);
      setModelLoading(false);
    }
  }, [listening, settings]);



  // ── text-to-speech (read answer aloud) ──
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
        // Split long text into chunks of ~2000 chars (staying safe below 3000)
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
        alert('TTS failed: ' + err.message);
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
  }, [speakingIdx, settings]);

  // ── settings changed callback ──
  const onSettingsChanged = async (s) => {
    setSettings(s);
    const m = await fetchModels(s.ollama_url);
    setModels(m);
    if (m.length > 0 && !m.includes(selectedModel)) setSelectedModel(m[0]);
    setPersonalities(await loadPersonalities());
  };

  const tryStartOllama = async () => {
    if (!window.electronAPI) {
      alert('Error: Electron API not available.');
      return;
    }
    setOllamaStatus('checking');
    const res = await window.electronAPI.startOllama();
    if (!res.success) {
      alert(`Error: ${res.error}`);
      setOllamaStatus('offline');
    } else {
      // wait a bit for it to start
      setTimeout(async () => {
        const ok = await window.electronAPI.checkOllama(settings?.ollama_url);
        setOllamaStatus(ok ? 'online' : 'offline');
      }, 3000);
    }
  };

  const exportChat = (format) => {
    if (!activeThread) return;
    const data = format === 'json' 
      ? JSON.stringify(activeThread, null, 2)
      : `# ${activeThread.name}\n\n` + activeThread.messages.map(m => `**${m.role.toUpperCase()}**: ${m.content}`).join('\n\n');
    
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeThread.name.replace(/\s+/g, '_')}.${format === 'json' ? 'json' : 'md'}`;
    a.click();
  };

  const filteredThreads = useMemo(() => {
    return Object.entries(threads).filter(([_, thread]) => 
      thread.name.toLowerCase().includes(search.toLowerCase())
    ).reverse();
  }, [threads, search]);

  const deleteMessage = useCallback((idx) => {
    if (!activeId || !activeThread) return;
    const nextMsgs = activeMessages.filter((_, i) => i !== idx);
    const next = { ...threads, [activeId]: { ...activeThread, messages: nextMsgs } };
    persist(next);
  }, [activeId, activeThread, activeMessages, threads, persist]);

  const abortStreaming = () => {
    if (abortRef.current) {
      log('CHAT_ABORTED_BY_USER', LOG_TYPES.SYSTEM);
      abortRef.current.abort();
      setStreaming(false);
    }
  };





  // ── format timestamp ──
  const fmtTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString(settings?.ui_language === 'en' ? 'en-US' : 'de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  // ── render ──
  return (
    <div className="app">
      {/* ── SIDEBAR ── */}
      <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <h2>{t('sidebar_header')}</h2>
          <div className="sidebar-header-row">
            <button className="settings-gear" title="SETTINGS" onClick={() => setShowSettings(true)}>[*]</button>
            <button className="btn-new" onClick={createThread}>{t('new_thread')}</button>
          </div>
        </div>
        <div className="search-bar">
          <input 
            type="text" 
            placeholder={t('search_placeholder')} 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <div className="thread-list">
          {filteredThreads.map(([id, thread]) => (
            <div
              key={id}
              className={`thread-item ${id === activeId ? 'active' : ''}`}
              onClick={() => { setActiveId(id); setSelectedPId(thread.personality_id || selectedPId); }}
              onDoubleClick={() => startRename(id)}
            >
              {renamingId === id ? (
                <input
                  className="thread-rename-input"
                  value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onBlur={finishRename}
                  onKeyDown={e => { if (e.key === 'Enter') finishRename(); if (e.key === 'Escape') setRenamingId(null); }}
                  autoFocus
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {thread.name}
                  </span>
                  <button className="delete-btn" onClick={e => { e.stopPropagation(); deleteThread(id); }} title="✕">✕</button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      <button 
        className={`btn-sidebar-toggle ${sidebarCollapsed ? 'collapsed' : ''}`} 
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        title={sidebarCollapsed ? "Expand" : "Collapse"}
      >
        {sidebarCollapsed ? '>' : '<'}
      </button>

      {/* ── MAIN AREA ── */}
      <div className="main">
        <div className="main-bg"><NeuralCanvas active={streaming} /></div>
        {/* header */}
        <div className="chat-header">
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span className={`status-dot ${models.length > 0 ? 'online' : 'offline'}`} />
            <span style={{ fontFamily:"'Fira Code',monospace", fontSize:10, color:'#5a5b75', letterSpacing:1 }}>
              {models.length > 0 ? t('connected') : t('offline')}
            </span>
          </div>
          <div>
            <div className="header-label">{t('model_header')}</div>
            <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
              {models.length === 0 && <option value="">{t('no_models')}</option>}
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <div className="header-label">{t('personality_header')}</div>
            <select value={selectedPId} onChange={e => {
              setSelectedPId(e.target.value);
              if (activeId && threads[activeId]) {
                const next = { ...threads, [activeId]: { ...threads[activeId], personality_id: e.target.value } };
                persist(next);
              }
            }}>
              {personalities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {activeThread && (
            <div className="header-actions">
              <button 
                className="btn-terminal-toggle" 
                onClick={openTerminal}
                title="Process Monitor"
              >
                TERMINAL
              </button>

              <button className="btn-export" onClick={() => exportChat('md')} title={t('export_md')}>MD</button>
              <button className="btn-export" onClick={() => exportChat('json')} title={t('export_json')}>JS</button>
            </div>
          )}

        </div>

        {/* messages */}
        {activeThread ? (
          <>
            <div className="messages">
              {activeMessages.length === 0 && (
                <div className="empty-state">
                  <div className="icon">⟩</div>
                  <p>{t('awaiting_input')}</p>
                </div>
              )}
              {activeMessages.map((msg, i) => {
                const isToolOnly = msg.role === 'assistant' && /^<(SEARCH|FETCH)>[\s\S]*?<\/\1>$/.test(msg.content.trim());
                if (isToolOnly) return null;

                const precedingTools = [];
                if (msg.role === 'assistant') {
                  let j = i - 1;
                  while (j >= 0) {
                    const prevMsg = activeMessages[j];
                    if (prevMsg.role === 'user') break;
                    if (prevMsg.role === 'assistant') {
                      if (/^<(SEARCH|FETCH)>[\s\S]*?<\/\1>$/.test(prevMsg.content.trim())) {
                        precedingTools.unshift(prevMsg.content.trim());
                      } else {
                        break;
                      }
                    }
                    j--;
                  }
                }

                return (
                <div key={i} className={`msg ${msg.role}`}>
                  {msg.role === 'assistant' ? (
                    <>
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock }}>
                        {msg.content}
                      </ReactMarkdown>
                      {precedingTools.length > 0 && (
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {precedingTools.map((toolText, tIdx) => {
                            const searchMatch = toolText.match(/<SEARCH>(.*?)<\/SEARCH>/);
                            const fetchMatch = toolText.match(/<FETCH>(.*?)<\/FETCH>/);
                            if (searchMatch) return <div key={tIdx} style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }}>[search] {searchMatch[1]}</div>;
                            if (fetchMatch) return <div key={tIdx} style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }}>[fetch] {fetchMatch[1]}</div>;
                            return null;
                          })}
                        </div>
                      )}
                    </>
                  ) : msg.role === 'system' ? (
                    msg.content.includes('[Neural Memory Updated]') ? (
                      <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', whiteSpace: 'pre-wrap', marginTop: '6px' }}>
                        {msg.content}
                      </div>
                    ) : null
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                  )}
                  {streaming && msg.role === 'assistant' && i === activeMessages.length - 1 && (
                    <span className="streaming-indicator" />
                  )}
                  <div className="msg-footer">
                    <span className="timestamp">{fmtTime(msg.timestamp)}</span>
                    {msg.role === 'assistant' && msg.content && !streaming && !isToolOnly && (
                      <button
                        className={`btn-speak ${speakingIdx === i ? 'speaking' : ''}`}
                        onClick={() => speakMessage(msg.content, i)}
                        title={speakingIdx === i ? t('stop_tts') : t('speak_tts')}
                      >
                        {speakingIdx === i ? '•' : '›'}
                      </button>
                    )}
                  </div>
                </div>
              )})}
              <div ref={messagesEnd} />
            </div>

              {/* input */}
            <div className="input-area">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('input_placeholder')}
                rows={1}
                disabled={streaming}
              />
              {streaming ? (
                <button className="btn-abort" onClick={abortStreaming} title="STOP">
                  ■
                </button>
              ) : (
                <>
                  <button
                    className={`btn-mic ${listening ? 'active' : ''} ${modelLoading ? 'loading' : ''} ${transcribing ? 'transcribing' : ''}`}
                    onClick={toggleListening}
                    title={modelLoading ? t('initializing_transcription') : (listening ? t('stop_tts') : t('speak_tts'))}
                    disabled={modelLoading || transcribing}
                  >
                    {modelLoading ? '⏳' : (transcribing ? '...' : (listening ? '⏹' : '🎤'))}
                  </button>
                  <button className="btn-send" onClick={sendMessage} disabled={streaming || !input.trim()} title="▶">
                    ▶
                  </button>
                </>
              )}
              {speakingIdx !== null && (
                <button className="btn-stop-tts" onClick={stopTTS} title={t('stop_tts')}>
                  <span className="stop-icon">✕</span>
                </button>
              )}
              {(modelLoading || transcribing || synthesizing) && (
                <div className="transcription-status">
                  {modelLoading && t('initializing_transcription')}
                  {transcribing && t('transcribing')}
                  {synthesizing && t('generating_speech')}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="icon">_</div>
            {ollamaStatus === 'offline' ? (
              <>
                <p style={{ color: '#f00' }}>{t('status_offline')}</p>
                <button className="btn-primary" onClick={tryStartOllama} style={{ marginTop: 10 }}>{t('start_service')}</button>
              </>
            ) : (
              <p>{t('awaiting_init')}</p>
            )}
          </div>
        )}
      </div>

      {/* ── SETTINGS ── */}
      {showSettings && (
        <SettingsPanel 
          onClose={() => setShowSettings(false)} 
          onSettingsChanged={onSettingsChanged}
          onClearThreads={clearThreads}
        />
      )}
    </div>
  );
}


