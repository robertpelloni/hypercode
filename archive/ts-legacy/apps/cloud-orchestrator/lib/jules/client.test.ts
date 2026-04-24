
import { JulesClient } from './client';

// Mock global fetch
global.fetch = jest.fn() as unknown as typeof fetch;

describe('JulesClient', () => {
  let client: JulesClient;
  const mockApiKey = 'test-api-key';
  const originalBaseUrl = process.env.VITE_JULES_API_BASE_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.VITE_JULES_API_BASE_URL;
    client = new JulesClient(mockApiKey);
  });

  afterAll(() => {
    if (originalBaseUrl === undefined) {
      delete process.env.VITE_JULES_API_BASE_URL;
      return;
    }

    process.env.VITE_JULES_API_BASE_URL = originalBaseUrl;
  });

  describe('Constructor', () => {
    it('should initialize with API key', () => {
      expect(client).toBeDefined();
    });
  });

  describe('Request Handling', () => {
    it('should include API key in headers', async () => {
      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await client.listSessions();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/sessions'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Jules-Api-Key': mockApiKey,
          }),
        })
      );
    });

    it('should fall back to process env for the API base URL outside Vite', async () => {
      process.env.VITE_JULES_API_BASE_URL = 'https://example.test';
      const envClient = new JulesClient(mockApiKey);

      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ sessions: [] }),
      });

      await envClient.listSessions();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://example.test/sessions'),
        expect.any(Object)
      );
    });

    it('should throw JulesAPIError on 401', async () => {
      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: { message: 'Unauthorized' } }),
      });

      await expect(client.listSessions()).rejects.toThrow('Invalid Credentials. Unauthorized');
    });

    it('should throw JulesAPIError on network failure', async () => {
      (global.fetch as unknown as jest.Mock).mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(client.listSessions()).rejects.toThrow('Failed to fetch');
    });
  });

  describe('listSources', () => {
    it('should list and transform sources', async () => {
      const mockSources = {
        sources: [
          { source: 'sources/github/owner/repo1' },
          { name: 'sources/github/owner/repo2' }
        ]
      };

      // Mock listSessions for the sorting logic inside listSources
      // We'll return empty to simplify
      (global.fetch as unknown as jest.Mock)
        .mockResolvedValueOnce({ // for listSources
          ok: true,
          json: async () => mockSources
        })
        .mockResolvedValueOnce({ // for listSessions (inside listSources)
          ok: true,
          json: async () => ({ sessions: [] })
        });

      const sources = await client.listSources();

      expect(sources).toHaveLength(2);
      expect(sources[0].name).toBe('owner/repo1');
      expect(sources[1].name).toBe('owner/repo2');
    });
  });

  describe('listSessions', () => {
    it('should list and transform sessions', async () => {
      const mockSessions = {
        sessions: [
          {
            id: '1',
            state: 'ACTIVE',
            sourceContext: { source: 'sources/github/repo' }
          }
        ]
      };

      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockSessions,
      });

      const sessions = await client.listSessions();

      expect(sessions).toHaveLength(1);
      expect(sessions[0].status).toBe('active');
      expect(sessions[0].sourceId).toBe('repo');
    });
  });

  describe('createSession', () => {
    it('should create a session with correct payload', async () => {
      const mockSession = { id: 'new-session', state: 'ACTIVE' };
      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockSession,
      });

      await client.createSession('repo-id', 'do work', 'My Task');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/sessions'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"prompt":"do work"'),
        })
      );
    });
  });

  describe('updateSession', () => {
    it('should send PATCH request with updateMask', async () => {
      const mockSession = { id: '1', title: 'New Title', state: 'ACTIVE' };

      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockSession,
      });

      await client.updateSession('1', { title: 'New Title', status: 'active' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/sessions/1?updateMask=state,title'),
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('"title":"New Title"'),
        })
      );
    });

    it('should handle partial updates correctly', async () => {
      const mockSession = { id: '1', state: 'PAUSED' };

      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockSession,
      });

      await client.updateSession('1', { status: 'paused' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/sessions/1?updateMask=state'),
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('"state":"PAUSED"'),
        })
      );
    });
  });
});
