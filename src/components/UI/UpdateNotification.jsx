import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { translations } from '../../utils/translations';
import './UpdateNotification.css';

const UpdateNotification = () => {
  const { settings } = useSettings();
  const [status, setStatus] = useState(null); // 'checking', 'available', 'downloading', 'downloaded', 'error'
  const [info, setInfo] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  const t = useCallback((key, params = {}) => {
    const lang = settings?.ui_language || 'de';
    let text = translations[lang][key] || translations['de'][key] || key;
    Object.keys(params).forEach(p => {
      text = text.replace(`{${p}}`, params[p]);
    });
    return text;
  }, [settings]);

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
          <h3>{t('update_available')}</h3>
          <button className="close-btn" onClick={handleClose}>&times;</button>
        </div>
        
        <div className="update-body">
          {status === 'available' && (
            <>
              <p>{t('update_ver_available', { version: info?.version })}</p>
              <button className="update-action-btn" onClick={handleDownload}>
                {t('update_download_now')}
              </button>
            </>
          )}

          {status === 'downloading' && (
            <>
              <p>{t('transcribing').replace('TRANSKRIBIERUNG', 'DOWNLOADING').replace('TRANSCRIBING', 'DOWNLOADING')} {Math.round(progress)}%</p>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </>
          )}

          {status === 'downloaded' && (
            <>
              <p>{t('update_ready_install')}</p>
              <button className="update-action-btn install" onClick={handleInstall}>
                {t('update_install_now')}
              </button>
            </>
          )}

          {status === 'error' && (
            <p className="error-text">{t('update_error')}: {error}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;

