import React, { useState, useEffect } from 'react';
import './UpdateNotification.css';

const UpdateNotification = () => {
  const [status, setStatus] = useState(null); // 'checking', 'available', 'downloading', 'downloaded', 'error'
  const [info, setInfo] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onUpdateStatus) {
      window.electronAPI.onUpdateStatus((data) => {
        console.log('Update Status:', data);
        setStatus(data.type);
        
        if (data.type === 'available') {
          setInfo(data.info);
          setIsVisible(true);
        } else if (data.type === 'downloading') {
          setProgress(data.progress.percent);
        } else if (data.type === 'downloaded') {
          setIsVisible(true);
        } else if (data.type === 'error') {
          setError(data.message);
          setIsVisible(true);
          setTimeout(() => setIsVisible(false), 5000);
        } else if (data.type === 'not-available') {
          // Keep quiet if no update
        }
      });
    }
  }, []);

  const handleDownload = () => {
    window.electronAPI.startDownload();
  };

  const handleInstall = () => {
    window.electronAPI.quitAndInstall();
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className={`update-notification-container ${status}`}>
      <div className="update-notification-content">
        <div className="update-header">
          <span className="update-icon">🚀</span>
          <h3>Update Verfügbar</h3>
          <button className="close-btn" onClick={handleClose}>&times;</button>
        </div>
        
        <div className="update-body">
          {status === 'available' && (
            <>
              <p>Version {info?.version} ist jetzt verfügbar!</p>
              <button className="update-action-btn" onClick={handleDownload}>
                Jetzt Herunterladen
              </button>
            </>
          )}

          {status === 'downloading' && (
            <>
              <p>Herunterladen... {Math.round(progress)}%</p>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </>
          )}

          {status === 'downloaded' && (
            <>
              <p>Das Update wurde heruntergeladen und ist bereit zur Installation.</p>
              <button className="update-action-btn install" onClick={handleInstall}>
                Jetzt Installieren & Neustarten
              </button>
            </>
          )}

          {status === 'error' && (
            <p className="error-text">Update Fehler: {error}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;
