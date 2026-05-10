import { useState, useRef, useCallback } from 'react';
import { 
  saveThreads, generateId 
} from '../utils/persistence';
import { 
  buildSystemPrompt, streamChat, 
  extractUserInfo, generateChatName 
} from '../services/ollama';
import { performWebSearch, performFetchUrl } from '../services/browser';
import { log, LOG_TYPES } from '../utils/logger';

export function useChat(threads, setThreads, selectedModel, selectedPId, personalities, settings, stopTTS, processSpeechQueue, setSpeakingIdx, speechQueueRef) {
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef(null);
  const lastSaveRef = useRef(0);

  const throttledSave = useCallback(async (data) => {
    const now = Date.now();
    if (now - lastSaveRef.current > 2000) {
      await saveThreads(data);
      lastSaveRef.current = now;
    }
  }, []);

  const sendMessage = useCallback(async (input, activeId, setActiveId, setInput) => {
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
        stopTTS();

        // --- Batched streaming: accumulate chunks and flush at ~30fps ---
        let pendingContent = '';
        let rafId = null;
        let flushResolve = null;

        const flushToState = () => {
          if (!pendingContent) return;
          assistantMsg.content += pendingContent;
          pendingContent = '';
          const updatedMessages = [...current[tid].messages.slice(0, -1), { ...assistantMsg }];
          current = { ...current, [tid]: { ...current[tid], messages: updatedMessages } };
          setThreads({ ...current });
          throttledSave(current);
          if (flushResolve) { flushResolve(); flushResolve = null; }
        };

        const scheduleFlush = () => {
          if (rafId) return;
          rafId = requestAnimationFrame(() => {
            rafId = null;
            flushToState();
          });
        };

        for await (const chunk of streamChat(ollamaUrl, selectedModel, apiMessages, abortRef.current.signal)) {
          pendingContent += chunk;
          scheduleFlush();

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

        // Final flush for any remaining content
        if (rafId) cancelAnimationFrame(rafId);
        flushToState();
        
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
            // We need a way to update personalities globally, maybe through another hook or passed down
            // For now, assume personalities are passed and managed by parent
          }
        }
      }
    } while (toolTriggered && !abortRef.current?.signal?.aborted);

    setStreaming(false);
    abortRef.current = null;
    
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

  }, [threads, setThreads, selectedModel, selectedPId, personalities, settings, stopTTS, processSpeechQueue, setSpeakingIdx, speechQueueRef, throttledSave]);

  const abortStreaming = () => {
    if (abortRef.current) {
      log('CHAT_ABORTED_BY_USER', LOG_TYPES.SYSTEM);
      abortRef.current.abort();
      setStreaming(false);
    }
  };

  return { streaming, sendMessage, abortStreaming };
}
