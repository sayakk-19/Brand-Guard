import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPreferences, savePreferences } from '../../client/src/preferences.js';

test('preferences survive invalid storage and reject unsupported values', () => {
  let stored = '{broken';
  globalThis.localStorage = { getItem: () => stored };
  try {
    assert.deepEqual(readPreferences(), { theme: 'light', compactLists: false, preferredChannel: 'linkedin' });
    stored = JSON.stringify({ theme: 'invalid', compactLists: 'true', preferredChannel: 'invalid' });
    assert.deepEqual(readPreferences(), { theme: 'light', compactLists: false, preferredChannel: 'linkedin' });
    stored = 'null';
    assert.equal(readPreferences().theme, 'light');
  } finally { delete globalThis.localStorage; }
});

test('preferences persist theme, list density and publishing channel together', () => {
  let stored;
  let changed = false;
  globalThis.localStorage = { getItem: () => stored, setItem: (key, value) => { stored = value; } };
  globalThis.document = { documentElement: { dataset: {} } };
  globalThis.window = { dispatchEvent: (event) => { changed = event.type === 'brandguard-preferences-changed'; } };
  try {
    const preferences = { theme: 'dark', compactLists: true, preferredChannel: 'email' };
    savePreferences(preferences);
    assert.deepEqual(readPreferences(), preferences);
    assert.equal(document.documentElement.dataset.theme, 'dark');
    assert.ok(changed);
  } finally { delete globalThis.localStorage; delete globalThis.document; delete globalThis.window; }
});
