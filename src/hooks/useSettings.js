import { useState, useEffect } from 'react';
import { loadSettings, saveSettings } from '../utils/persistence';
import { fetchModels } from '../services/ollama';

export function useSettings() {
  const [settings, setSettings] = useState(null);
  const [models, setModels] = useState([]);

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setSettings(s);
      const m = await fetchModels(s.ollama_url);
      setModels(m);
    })();
  }, []);

  const updateSettings = async (newSettings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
    const m = await fetchModels(newSettings.ollama_url);
    setModels(m);
  };

  return { settings, models, updateSettings, setModels };
}
