import { describe, expect, it } from 'vitest';

import {
  formatSettingsConfig,
  getSettingsSaveErrorMessage,
} from './settings-page-normalizers';

describe('settings page normalizers', () => {
  it('formats config safely and survives circular payloads', () => {
    expect(formatSettingsConfig({ featureFlag: true })).toBe(`{
  "featureFlag": true
}`);

    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(formatSettingsConfig(circular)).toBe(`{
  "error": "Configuration payload is not serializable."
}`);
    expect(formatSettingsConfig(undefined)).toBe('');
  });

  it('extracts useful save error messages from unknown throw shapes', () => {
    expect(getSettingsSaveErrorMessage(new Error('Bad config'))).toBe('Bad config');
    expect(getSettingsSaveErrorMessage({ message: 'Invalid JSON' })).toBe('Invalid JSON');
    expect(getSettingsSaveErrorMessage('Nope')).toBe('Nope');
    expect(getSettingsSaveErrorMessage({ bad: true })).toBe('Unknown error');
  });
});
