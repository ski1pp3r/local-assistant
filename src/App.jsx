import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Components
import Sidebar from './components/Sidebar/Sidebar';
import ChatHeader from './components/Chat/ChatHeader';
import MessageList from './components/Chat/MessageList';
import ChatInput from './components/Chat/ChatInput';
import SettingsPanel from './components/Settings/SettingsPanel';
import NeuralCanvas from './components/UI/NeuralCanvas';

// Hooks
import { useSettings } from './hooks/useSettings';
import { useTTS } from './hooks/useTTS';
import { useSTT } from './hooks/useSTT';
import { useChat } from './hooks/useChat';

// Utilities & Services
import { 
  loadThreads, saveThreads, 
  loadPersonalities, generateId 
} from './utils/persistence';
import { translations } from './utils/translations';
import { log, LOG_TYPES } from './utils/logger';

export default function App() {
  const { 
    settings, models, updateSettings, setModels, 
    puterUser, setPuterUser, checkPuterAuth 
  } = useSettings();
  const [threads, setThreads] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [personalities, setPersonalities] = useState([]);
  const [selectedPId, setSelectedPId] = useState('default');
  const [selectedModel, setSelectedModel] = useState('');
  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  const [search, setSearch] = useState('');
  const [ollamaStatus, setOllamaStatus] = useState('checking'); 
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const t = useCallback((key) => {
    const lang = settings?.ui_language || 'de';
    return translations[lang][key] || translations['de'][key] || key;
  }, [settings]);

  const { 
    synthesizing, speakingIdx, setSpeakingIdx, 
    stopTTS, speakMessage, speechQueueRef, processSpeechQueue 
  } = useTTS(settings);

  const { 
    listening, transcribing, modelLoading, toggleListening 
  } = useSTT(settings);

  const { 
    streaming, sendMessage, abortStreaming 
  } = useChat(
    threads, setThreads, selectedModel, selectedPId, personalities, 
    settings, stopTTS, processSpeechQueue, setSpeakingIdx, speechQueueRef
  );

  // ── Initial load ──
  useEffect(() => {
    let interval;
    (async () => {
      const s = settings || await (async () => {
        // Fallback if settings hook hasn't loaded yet
        return { ollama_url: 'http://localhost:11434', ui_language: 'de' };
      })();
      
      const tData = await loadThreads();
      const cleanData = {};
      Object.keys(tData).forEach(k => {
        if (tData[k].messages && tData[k].messages.length > 0) cleanData[k] = tData[k];
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
        setOllamaStatus(newStatus);
      };

      checkStatus();
      interval = setInterval(checkStatus, 10000);
    })();
    return () => interval && clearInterval(interval);
  }, [settings]);

  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0]);
    }
  }, [models, selectedModel]);

  const activeThread = activeId ? threads[activeId] : null;
  const activeMessages = activeThread?.messages || [];

  // ── Auto-scroll ──
  const lastMsgCount = useRef(0);
  useEffect(() => {
    const count = activeMessages.length;
    if (count !== lastMsgCount.current) {
      lastMsgCount.current = count;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages.length]);

  useEffect(() => {
    if (!streaming) return;
    const id = setInterval(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
    return () => clearInterval(id);
  }, [streaming]);

  // ── Auto-resize textarea ──
  useEffect(() => {
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px'; }
  }, [input]);

  const handleSendMessage = () => {
    sendMessage(input, activeId, setActiveId, setInput);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCreateThread = useCallback(() => {
    const id = generateId();
    const next = {
      ...threads,
      [id]: { name: 'NEW_SESSION', personality_id: selectedPId, messages: [] }
    };
    setThreads(next);
    saveThreads(next);
    setActiveId(id);
  }, [threads, selectedPId]);

  const handleDeleteThread = useCallback((id) => {
    if (!confirm(t('delete_thread'))) return;
    const next = { ...threads };
    delete next[id];
    setThreads(next);
    saveThreads(next);
    if (activeId === id) {
      const keys = Object.keys(next);
      setActiveId(keys.length > 0 ? keys[keys.length - 1] : null);
    }
  }, [threads, activeId, t]);

  const startRename = (id) => {
    setRenamingId(id);
    setRenameVal(threads[id]?.name || '');
  };

  const finishRename = () => {
    if (renamingId && renameVal.trim()) {
      const next = { ...threads, [renamingId]: { ...threads[renamingId], name: renameVal.trim() } };
      setThreads(next);
      saveThreads(next);
    }
    setRenamingId(null);
  };

  const openTerminal = () => {
    window.open('index.html?terminal=true', 'ProcessMonitor', 
      'width=800,height=600,menubar=no,toolbar=no,location=no,status=no,resizable=yes'
    );
  };

  const handleExportChat = (format) => {
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

  const fmtTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString(settings?.ui_language === 'en' ? 'en-US' : 'de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="app">
      <Sidebar 
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        t={t}
        onShowSettings={() => setShowSettings(true)}
        onNewThread={handleCreateThread}
        search={search}
        setSearch={setSearch}
        filteredThreads={filteredThreads}
        activeId={activeId}
        setActiveId={setActiveId}
        setSelectedPId={setSelectedPId}
        renamingId={renamingId}
        setRenamingId={setRenamingId}
        renameVal={renameVal}
        setRenameVal={setRenameVal}
        startRename={startRename}
        finishRename={finishRename}
        deleteThread={handleDeleteThread}
        threads={threads}
        puterUser={puterUser}
      />

      <div className="main">
        <div className="main-bg"><NeuralCanvas active={streaming} /></div>
        
        <ChatHeader 
          t={t}
          models={models}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          personalities={personalities}
          selectedPId={selectedPId}
          setSelectedPId={(id) => {
            setSelectedPId(id);
            if (activeId && threads[activeId]) {
              const next = { ...threads, [activeId]: { ...threads[activeId], personality_id: id } };
              setThreads(next);
              saveThreads(next);
            }
          }}
          onOpenTerminal={openTerminal}
          onExportChat={handleExportChat}
          activeThread={activeThread}
        />

        {activeThread ? (
          <>
            <MessageList 
              messages={activeMessages}
              streaming={streaming}
              speakingIdx={speakingIdx}
              onSpeakMessage={speakMessage}
              fmtTime={fmtTime}
              t={t}
              messagesEndRef={messagesEndRef}
            />

            <ChatInput 
              input={input}
              setInput={setInput}
              onSendMessage={handleSendMessage}
              onKeyDown={handleKeyDown}
              streaming={streaming}
              onAbort={abortStreaming}
              listening={listening}
              modelLoading={modelLoading}
              transcribing={transcribing}
              synthesizing={synthesizing}
              onToggleListening={() => toggleListening((text) => setInput(prev => (prev ? prev + ' ' : '') + text))}
              onStopTTS={stopTTS}
              speakingIdx={speakingIdx}
              t={t}
              textareaRef={textareaRef}
            />
          </>
        ) : (
          <div className="empty-state">
            <div className="icon">_</div>
            <p>{t('awaiting_init')}</p>
          </div>
        )}
      </div>

      {showSettings && (
        <SettingsPanel 
          onClose={() => setShowSettings(false)} 
          onSettingsChanged={updateSettings}
          onClearThreads={() => {
            setThreads({});
            saveThreads({});
            setActiveId(null);
          }}
          puterUser={puterUser}
          setPuterUser={setPuterUser}
        />
      )}
    </div>
  );
}
