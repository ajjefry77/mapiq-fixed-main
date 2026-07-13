import axios from 'axios';
const SERVER = import.meta.env.VITE_SERVER

let settingsCache = {};

export async function loadSettings() {
    const res = await axios.get(SERVER + '/api/settings');
    settingsCache = res.data;
    return settingsCache;
}

export function getSetting(key, defaultValue = null) {
    return settingsCache[key] ?? defaultValue;
}

export async function saveSettings(updatedSettings) {
    await axios.put(SERVER + '/api/settings', updatedSettings);
    settingsCache = { ...settingsCache, ...updatedSettings };
}
