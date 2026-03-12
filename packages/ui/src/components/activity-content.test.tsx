import { getCopyableActivityContent, hasVisibleActivityContent } from './activity-content';

describe('activity-content helpers', () => {
  it('unwraps placeholder activity text from metadata for copy', () => {
    expect(
      getCopyableActivityContent('[agentMessaged]', {
        agentMessaged: { agentMessage: 'Finished refactoring the export menu.' },
      }),
    ).toBe('Finished refactoring the export menu.');
  });

  it('keeps placeholder activities visible but not copyable when no real text exists', () => {
    expect(hasVisibleActivityContent('[userMessaged]')).toBe(true);
    expect(getCopyableActivityContent('[userMessaged]')).toBeNull();
  });

  it('unwraps wrapped json message payloads for copy', () => {
    expect(getCopyableActivityContent('{"message":"Hello from JSON"}')).toBe('Hello from JSON');
  });

  it('treats empty json payloads as hidden and non-copyable', () => {
    expect(hasVisibleActivityContent('{}')).toBe(false);
    expect(hasVisibleActivityContent('[]')).toBe(false);
    expect(getCopyableActivityContent('{}')).toBeNull();
  });
});