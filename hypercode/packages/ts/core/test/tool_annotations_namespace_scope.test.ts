import { describe, test, expect } from 'vitest';
import { ToolAnnotationManager } from '../src/managers/ToolAnnotationManager.js';

describe('ToolAnnotationManager namespace scoping', () => {
  test('prefers namespace annotation over global', () => {
    const m = new ToolAnnotationManager();

    m.setAnnotation('srv', 't', { displayName: 'global' });
    m.setAnnotation('srv', 't', { namespaceId: 'ns', displayName: 'ns' });

    const ns = m.getAnnotation('srv', 't', 'ns');
    expect(ns?.displayName).toBe('ns');

    const other = m.getAnnotation('srv', 't', 'other');
    expect(other?.displayName).toBe('global');
  });
});
