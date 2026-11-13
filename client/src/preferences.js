export const preferenceDefaults = { compactLists: false, preferredChannel: 'linkedin', theme: 'light' };
export function readPreferences() {
  try {
    const value = JSON.parse(localStorage.getItem('brandguard.appPreferences') || '{}');
    return { compactLists: value?.compactLists === true, preferredChannel: ['linkedin', 'website', 'email', 'print', 'other'].includes(value?.preferredChannel) ? value.preferredChannel : 'linkedin', theme: value?.theme === 'dark' ? 'dark' : 'light' };
  } catch { return { ...preferenceDefaults }; }
}
export function savePreferences(value) {
  localStorage.setItem('brandguard.appPreferences', JSON.stringify(value));
  document.documentElement.dataset.theme = value.theme;
  window.dispatchEvent(new Event('brandguard-preferences-changed'));
}
