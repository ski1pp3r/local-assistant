import React, { memo } from 'react';

export default memo(function Sidebar({ 
  collapsed, 
  setCollapsed, 
  t, 
  onShowSettings, 
  onNewThread, 
  search, 
  setSearch, 
  filteredThreads, 
  activeId, 
  setActiveId, 
  setSelectedPId, 
  renamingId, 
  setRenamingId, 
  renameVal, 
  setRenameVal, 
  startRename, 
  finishRename, 
  deleteThread,
  threads,
  puterUser
}) {
  return (
    <>
      <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <h2>{t('sidebar_header')}</h2>
          <div className="sidebar-header-row">
            <button className="settings-gear" title="SETTINGS" onClick={onShowSettings}>[*]</button>
            <button className="btn-new" onClick={onNewThread}>{t('new_thread')}</button>
          </div>
          {puterUser?.username && (
            <div style={{ fontSize: '9px', color: '#00ff00', fontFamily: "'Fira Code', monospace", marginTop: '5px', opacity: 0.7 }}>
              ● PUTER_CONNECTED: {puterUser.username.toUpperCase()}
            </div>
          )}
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
              onClick={() => { setActiveId(id); setSelectedPId(thread.personality_id || 'default'); }}
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
        className={`btn-sidebar-toggle ${collapsed ? 'collapsed' : ''}`} 
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "Expand" : "Collapse"}
      >
        {collapsed ? '>' : '<'}
      </button>
    </>
  );
});
