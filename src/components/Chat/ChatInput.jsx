import React from 'react';

export default function ChatInput({ 
  input, 
  setInput, 
  onSendMessage, 
  onKeyDown, 
  streaming, 
  onAbort, 
  listening, 
  modelLoading, 
  transcribing, 
  synthesizing, 
  onToggleListening, 
  onStopTTS, 
  speakingIdx, 
  t, 
  textareaRef 
}) {
  return (
    <div className="input-area">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t('input_placeholder')}
        rows={1}
        disabled={streaming}
      />
      {streaming ? (
        <button className="btn-abort" onClick={onAbort} title="STOP">
          ■
        </button>
      ) : (
        <>
          <button
            className={`btn-mic ${listening ? 'active' : ''} ${modelLoading ? 'loading' : ''} ${transcribing ? 'transcribing' : ''}`}
            onClick={onToggleListening}
            title={modelLoading ? t('initializing_transcription') : (listening ? t('stop_tts') : t('speak_tts'))}
            disabled={modelLoading || transcribing}
          >
            {modelLoading ? '⏳' : (transcribing ? '...' : (listening ? '⏹' : '🎤'))}
          </button>
          <button className="btn-send" onClick={onSendMessage} disabled={streaming || !input.trim()} title="▶">
            ▶
          </button>
        </>
      )}
      {speakingIdx !== null && (
        <button className="btn-stop-tts" onClick={onStopTTS} title={t('stop_tts')}>
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
  );
}
