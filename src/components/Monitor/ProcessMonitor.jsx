import React, { useState, useEffect, useRef } from 'react';

/**
 * ProcessMonitor Component
 * Can be used as a floating div (standalone=false) or a full window (standalone=true).
 */
export default function ProcessMonitor({ standalone = false, onClose }) {
  const [logs, setLogs] = useState([]);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: window.innerWidth - 420, y: 60 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const scrollRef = useRef(null);

  useEffect(() => {
    // 1. Listen to Local Custom Events (same window)
    const handleLogEvent = (e) => {
      setLogs(prev => [...prev, e.detail].slice(-200));
    };
    
    // 2. Listen to BroadcastChannel (other windows)
    const channel = new BroadcastChannel('app_logs');
    channel.onmessage = (e) => {
      setLogs(prev => [...prev, e.data].slice(-200));
    };

    window.addEventListener('app-log', handleLogEvent);
    return () => {
      window.removeEventListener('app-log', handleLogEvent);
      channel.close();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current && !minimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, minimized]);

  const onMouseDown = (e) => {
    if (standalone) return; // OS handles window dragging
    if (e.target.closest('.pm-header-btns')) return;
    setIsDragging(true);
    setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
  };

  useEffect(() => {
    if (standalone) return;
    const onMouseMove = (e) => {
      if (!isDragging) return;
      setPos({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    };
    const onMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, dragOffset, standalone]);

  const clearLogs = () => setLogs([]);

  const getTypeColor = (type) => {
    switch (type) {
      case 'api_send': return '#00ff00';
      case 'api_recv': return '#00ccff';
      case 'error': return '#ff4444';
      case 'tts': return '#ff9800';
      case 'stt': return '#e91e63';
      case 'system': return '#9c27b0';
      default: return '#888';
    }
  };

  const containerStyle = standalone 
    ? { left: 0, top: 0, width: '100%', height: '100vh', position: 'relative', border: 'none' }
    : { left: pos.x, top: pos.y };

  return (
    <div 
      className={`process-monitor ${minimized ? 'minimized' : ''} ${standalone ? 'standalone' : ''}`}
      style={containerStyle}
    >
      <div className="pm-header" onMouseDown={onMouseDown}>
        <div className="pm-title">
          <span className="pm-icon">⚡</span>
          PROCESS_MONITOR v1.1 {standalone && '(STANDALONE)'}
        </div>
        <div className="pm-header-btns">
          <button onClick={clearLogs} title="Clear Logs">CLR</button>
          {!standalone && <button onClick={() => setMinimized(!minimized)}>{minimized ? '+' : '-'}</button>}
          {onClose && <button onClick={onClose}>✕</button>}
        </div>
      </div>
      
      {!minimized && (
        <div className="pm-content" ref={scrollRef}>
          {logs.length === 0 ? (
            <div className="pm-empty">AWAITING_DATA...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="pm-log-line">
                <span className="pm-time">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
                <span className="pm-type" style={{ color: getTypeColor(log.type) }}>[{log.type.toUpperCase()}]</span>
                <span className="pm-msg">{log.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
