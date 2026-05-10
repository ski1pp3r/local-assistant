import { useState, useEffect } from 'react';
import { loadSettings, saveSettings } from '../utils/persistence';
import { fetchModels } from '../services/ollama';

export function useSettings() {
  const [settings, setSettings] = useState(null);
  const [models, setModels] = useState([]);
  const [puterUser, setPuterUser] = useState(null);

  const checkPuterAuth = async () => {
    if (window.puter) {
      try {
        const signedIn = await window.puter.auth.isSignedIn();
        if (signedIn) {
          const user = await window.puter.auth.getUser();
          setPuterUser(user);
        } else {
          setPuterUser(null);
        }
      } catch (e) {
        console.error('Puter auth check error:', e);
        setPuterUser(null);
      }
    }
  };

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setSettings(s);
      const m = await fetchModels(s.ollama_url);
      setModels(m);
      await checkPuterAuth();
    })();
  }, []);

  const updateSettings = async (newSettings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
    const m = await fetchModels(newSettings.ollama_url);
    setModels(m);
  };

  return { settings, models, updateSettings, setModels, puterUser, setPuterUser, checkPuterAuth };
}
