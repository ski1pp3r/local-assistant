import React, { useState, useEffect } from 'react';

export default function MullvadStatus({ enabled }) {
  const [status, setStatus] = useState('checking'); // 'checking', 'protected', 'unprotected', 'error'

  const checkStatus = async () => {
    if (!enabled) {
      setStatus('unprotected');
      return;
    }
    setStatus('checking');
    try {
      // am.i.mullvad.net/json is a great way to check
      // We use the electronAPI.fetchUrl which now uses the proxy if enabled
      const res = await window.electronAPI.fetchUrl('https://am.i.mullvad.net/json');
      if (res.includes('"mullvad_exit_ip":true')) {
        setStatus('protected');
      } else {
        setStatus('unprotected');
      }
    } catch (e) {
      setStatus('error');
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [enabled]);

  const getStatusColor = () => {
    switch (status) {
      case 'protected': return '#4caf50';
      case 'unprotected': return enabled ? '#ff9800' : '#888';
      case 'error': return '#f44336';
      default: return '#888';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'checking': return 'Checking...';
      case 'protected': return 'Protected (Mullvad)';
      case 'unprotected': return enabled ? 'Not Protected (Proxy active but not Mullvad exit?)' : 'Proxy Disabled';
      case 'error': return 'Proxy Error (Is Mullvad running?)';
      default: return 'Unknown';
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px', 
      marginTop: '8px',
      fontSize: '0.85rem',
      color: getStatusColor()
    }}>
      <div style={{ 
        width: '8px', 
        height: '8px', 
        borderRadius: '50%', 
        backgroundColor: getStatusColor(),
        boxShadow: status === 'protected' ? '0 0 8px #4caf50' : 'none'
      }} />
      <span>{getStatusText()}</span>
    </div>
  );
}
