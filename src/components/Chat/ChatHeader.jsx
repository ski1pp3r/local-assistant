import React from 'react';

export default function ChatHeader({ 
  t, 
  models, 
  selectedModel, 
  setSelectedModel, 
  personalities, 
  selectedPId, 
  setSelectedPId, 
  onOpenTerminal, 
  onExportChat,
  activeThread
}) {
  return (
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
        <select value={selectedPId} onChange={e => setSelectedPId(e.target.value)}>
          {personalities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      {activeThread && (
        <div className="header-actions">
          <button className="btn-terminal-toggle" onClick={onOpenTerminal} title="Process Monitor">TERMINAL</button>
          <button className="btn-export" onClick={() => onExportChat('md')} title={t('export_md')}>MD</button>
          <button className="btn-export" onClick={() => onExportChat('json')} title={t('export_json')}>JS</button>
        </div>
      )}
    </div>
  );
}
