import React, { useState, useEffect } from 'react';
import {
  loadSettings, saveSettings,
  loadPersonalities, savePersonalities,
  generateId
} from '../../utils/persistence';
import { 
  fetchModels, pullModel, deleteModel 
} from '../../services/ollama';
import { translations } from '../../utils/translations';
import MullvadStatus from './MullvadStatus';


export default function SettingsPanel({ onClose, onSettingsChanged, onClearThreads, puterUser, setPuterUser }) {
  const [settings, setSettings] = useState(null);
  const [personalities, setPersonalities] = useState([]);
  const [editingP, setEditingP] = useState(null); 
  const [saved, setSaved] = useState(false);
  const [models, setModels] = useState([]);
  const [newModelName, setNewModelName] = useState('');
  const [pulling, setPulling] = useState(false);
  const [pullStatus, setPullStatus] = useState(null); 
  const [version, setVersion] = useState('');
  const [updateStatus, setUpdateStatus] = useState({ type: 'idle' });


  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setSettings(s);
      setPersonalities(await loadPersonalities());
      setModels(await fetchModels(s.ollama_url));
      if (window.electronAPI) {
        setVersion(await window.electronAPI.getAppVersion());
        window.electronAPI.onUpdateStatus((status) => setUpdateStatus(status));
      }
      
      

      
    })();
  }, []);



  const handlePuterLogin = async () => {
    if (!window.puter) return;
    try {
      const user = await window.puter.auth.signIn();
      setPuterUser(user);
    } catch (e) {
      console.error('Puter Login Error:', e);
    }
  };

  const handlePuterLogout = async () => {
    if (!window.puter) return;
    window.puter.auth.signOut();
    setPuterUser(null);
  };

  const t = (key) => {
    const lang = settings?.ui_language || 'de';
    return translations[lang][key] || translations['de'][key] || key;
  };

  const refreshModels = async () => {
    if (settings) setModels(await fetchModels(settings.ollama_url));
  };

  const handlePullModel = async () => {
    const name = newModelName.trim();
    if (!name || pulling) return;

    setPulling(true);
    setPullStatus({ status: 'Starting...', total: 0, completed: 0 });

    try {
      for await (const part of pullModel(settings.ollama_url, name)) {
        setPullStatus({
          status: part.status,
          total: part.total || 0,
          completed: part.completed || 0
        });
      }
      setNewModelName('');
      await refreshModels();
    } catch (e) {
      alert(`${t('loading')} ${e.message}`);
    } finally {
      setPulling(false);
      setPullStatus(null);
    }
  };

  const handleDeleteModel = async (name) => {
    if (!confirm(`${t('delete_confirm')} "${name}"`)) return;
    const ok = await deleteModel(settings.ollama_url, name);
    if (ok) refreshModels();
    else alert('Error.');
  };

  if (!settings) return null;

  const handleSaveSettings = async () => {
    await saveSettings(settings);
    onSettingsChanged(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleDeletePersonality = async (id) => {
    if (id === 'default') return;
    if (!confirm(t('delete_confirm'))) return;
    const next = personalities.filter(p => p.id !== id);
    setPersonalities(next);
    await savePersonalities(next);
    if (settings.default_personality_id === id) {
      const s = { ...settings, default_personality_id: 'default' };
      setSettings(s);
      await saveSettings(s);
      onSettingsChanged(s);
    }
  };

  const handleSavePersonality = async () => {
    if (!editingP.name.trim()) return;
    let next;
    if (personalities.find(p => p.id === editingP.id)) {
      next = personalities.map(p => p.id === editingP.id ? editingP : p);
    } else {
      next = [...personalities, editingP];
    }
    setPersonalities(next);
    await savePersonalities(next);
    setEditingP(null);
  };

  const startNewPersonality = () => {
    setEditingP({
      id: generateId(),
      name: '',
      nutzer_info: '',
      verhalten: ''
    });
  };

  if (editingP) {
    const isEdit = personalities.find(p => p.id === editingP.id);
    return (
      <div className="overlay" onClick={onClose}>
        <div className="settings-panel" onClick={e => e.stopPropagation()}>
          <h2>{isEdit ? t('personality_edit') : t('personality_new')}</h2>

          <label>{t('name')}</label>
          <input
            type="text"
            value={editingP.name}
            onChange={e => setEditingP({ ...editingP, name: e.target.value })}
            placeholder={t('placeholder_coding_assistant')}
          />

          <label>{t('user_info')}</label>
          <textarea
            value={editingP.nutzer_info}
            onChange={e => setEditingP({ ...editingP, nutzer_info: e.target.value })}
            placeholder={t('placeholder_user_info')}
            rows={3}
          />

          <label>{t('assistant_behavior')}</label>
          <textarea
            value={editingP.verhalten}
            onChange={e => setEditingP({ ...editingP, verhalten: e.target.value })}
            placeholder={t('placeholder_behavior')}
            rows={3}
          />

          <div className="btn-row">
            <button className="btn-primary" onClick={handleSavePersonality}>{t('save_btn')}</button>
            <button className="btn-secondary" onClick={() => setEditingP(null)}>{t('cancel')}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <h2>{t('settings_title')}</h2>

        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <label>{t('ui_language')}</label>
            <select
              value={settings.ui_language || 'de'}
              onChange={e => setSettings({ ...settings, ui_language: e.target.value })}
            >
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>{t('memory_depth')}</label>
            <input
              type="number"
              min={1}
              max={100}
              value={settings.memory_depth}
              onChange={e => setSettings({ ...settings, memory_depth: parseInt(e.target.value) || 20 })}
            />
          </div>
        </div>

        <label>{t('ollama_url')}</label>
        <input
          type="text"
          value={settings.ollama_url}
          onChange={e => setSettings({ ...settings, ollama_url: e.target.value })}
        />

        <label>{t('default_personality')}</label>
        <select
          value={settings.default_personality_id}
          onChange={e => setSettings({ ...settings, default_personality_id: e.target.value })}
        >
          {personalities.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <div className="checkbox-row">
          <input
            type="checkbox"
            id="local_tts"
            checked={settings.local_tts || false}
            onChange={e => setSettings({ ...settings, local_tts: e.target.checked })}
          />
          <label htmlFor="local_tts">{t('tts_label')}</label>
        </div>

        <div className="checkbox-row">
          <input
            type="checkbox"
            id="auto_tts"
            checked={settings.auto_tts || false}
            onChange={e => setSettings({ ...settings, auto_tts: e.target.checked })}
          />
          <label htmlFor="auto_tts">{t('auto_tts_label')}</label>
        </div>
        
        <div className="checkbox-row">
          <input
            type="checkbox"
            id="auto_memory"
            checked={settings.auto_memory || false}
            onChange={e => setSettings({ ...settings, auto_memory: e.target.checked })}
          />
          <label htmlFor="auto_memory">{t('auto_memory_label')}</label>
        </div>

        <div className="checkbox-row">
          <input
            type="checkbox"
            id="Browser_Access"
            checked={settings.Browser_Access || false}
            onChange={e => setSettings({ ...settings, Browser_Access: e.target.checked })}
          />
          <label htmlFor="Browser_Access">{t('Browser_Access')}</label>
        </div>

        <hr className="divider" />

        <label style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>Network & Privacy</label>
        <div className="checkbox-row" style={{ marginTop: '8px' }}>
          <input
            type="checkbox"
            id="mullvad_proxy_enabled"
            checked={settings.mullvad_proxy_enabled || false}
            onChange={e => setSettings({ ...settings, mullvad_proxy_enabled: e.target.checked })}
          />
          <label htmlFor="mullvad_proxy_enabled">Mullvad SOCKS5 Proxy</label>
        </div>
        <p style={{ fontSize: '11px', color: '#666', margin: '4px 0 0 24px', lineHeight: '1.4' }}>
          {t('mullvad_description')}
        </p>
        <div style={{ marginLeft: '24px' }}>
          <MullvadStatus enabled={settings.mullvad_proxy_enabled} />
        </div>


        <div className="btn-row" style={{ marginTop: 8 }}>
          <button className="btn-primary" onClick={handleSaveSettings}>
            {saved ? t('saved_btn') : t('save_btn')}
          </button>
          <button className="btn-secondary" onClick={onClose}>{t('close_btn')}</button>
          <button 
            className="btn-danger" 
            style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid #ff4444', color: '#ff4444', fontSize: '11px', padding: '5px 10px', fontFamily: "'Fira Code', monospace" }}
            onClick={() => { if(confirm(t('clear_threads_confirm'))) { onClearThreads(); onClose(); } }}
          >
            {t('clear_threads')}
          </button>
        </div>

        <hr className="divider" />



        <div className="puter-account-section" style={{ marginTop: 12 }}>
          <label style={{ fontSize: '8px' }}>{t('puter_login_label')}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
            {puterUser ? (
              <>
                <div style={{ flex: 1, fontSize: '12px' }}>
                  <span style={{ color: '#666' }}>{t('puter_logged_in_as')}</span> <span style={{ color: '#fff', fontWeight: '600' }}>{puterUser.username}</span>
                </div>
                <button className="btn-secondary" style={{ padding: '3px 8px', fontSize: '10px' }} onClick={handlePuterLogout}>
                  {t('puter_logout_btn')}
                </button>
              </>
            ) : (
              <>
                <div style={{ flex: 1, fontSize: '11px', color: '#666' }}>
                  {t('puter_cloud_features')}
                </div>
                <button className="btn-primary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={handlePuterLogin}>
                  {t('puter_login_btn')}
                </button>
              </>
            )}
          </div>
        </div>

        <hr className="divider" />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <label style={{ margin: 0 }}>{t('personalities_label')}</label>
          <button className="btn-primary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={startNewPersonality}>
            + {t('add_btn')}
          </button>
        </div>

        <div className="personality-list">
          {personalities.map(p => (
            <div key={p.id} className="personality-item">
              <span className="p-name">{p.name}</span>
              <span className="p-actions">
                <button className="edit-btn" onClick={() => setEditingP({ ...p })}>✎</button>
                {p.id !== 'default' && (
                  <button className="del-btn" onClick={() => handleDeletePersonality(p.id)}>✕</button>
                )}
              </span>
            </div>
          ))}
        </div>

        <hr className="divider" />

        <label>{t('models_label')}</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            style={{ marginBottom: 0 }}
            value={newModelName}
            onChange={e => setNewModelName(e.target.value)}
            placeholder={t('placeholder_model')}
            disabled={pulling}
          />
          <button className="btn-primary" onClick={handlePullModel} disabled={pulling || !newModelName.trim()}>
            {pulling ? t('loading') : t('add_btn')}
          </button>
        </div>

        {pulling && pullStatus && (
          <div className="pull-progress-container">
            <div className="pull-status-text">{pullStatus.status}</div>
            {pullStatus.total > 0 && (
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${(pullStatus.completed / pullStatus.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        <div className="model-list">
          {models.map(m => (
            <div key={m} className="model-item">
              <span className="m-name">{m}</span>
              <button className="del-btn" onClick={() => handleDeleteModel(m)} title={t('delete_title')}>✕</button>
            </div>
          ))}
        </div>

        <hr className="divider" />

        <div className="update-section" style={{ marginTop: 12, paddingBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <label style={{ margin: 0, fontSize: '11px', color: '#666' }}>App Updates</label>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#fff' }}>
                Version {version}
              </p>
            </div>
            <button 
              className="btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '11px' }}
              onClick={() => window.electronAPI.checkForUpdates()}
              disabled={updateStatus.type === 'checking'}
            >
              {updateStatus.type === 'checking' ? t('update_checking') : t('check_updates')}
            </button>
          </div>
          {updateStatus.type === 'available' && (
            <p style={{ fontSize: '11px', color: '#6366f1', marginTop: 8 }}>
              {t('update_available_notice')}
            </p>
          )}
          {updateStatus.type === 'not-available' && (
            <p style={{ fontSize: '11px', color: '#10b981', marginTop: 8 }}>
              {t('update_uptodate')}
            </p>
          )}
          {updateStatus.type === 'error' && (
            <p style={{ fontSize: '11px', color: '#ef4444', marginTop: 8 }}>
              {t('update_error_search')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

