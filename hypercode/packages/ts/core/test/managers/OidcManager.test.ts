import { describe, test, expect, beforeEach, afterEach, mock } from 'vitest';
import { OidcManager, type OidcProvider } from '../../src/managers/OidcManager.ts';
import crypto from 'crypto';

describe('OidcManager', () => {
  let oidcManager: OidcManager;
  const mockProvider: Omit<OidcProvider, 'id' | 'createdAt' | 'updatedAt'> = {
    name: 'Test Provider',
    issuerUrl: 'https://auth.example.com',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    scopes: ['openid', 'profile', 'email'],
    enabled: true,
  };

  beforeEach(() => {
    oidcManager = new OidcManager();
  });

  describe('Provider Management', () => {
    test('should add a provider', () => {
      const provider = oidcManager.addProvider(mockProvider);
      expect(provider.id).toBeDefined();
      expect(provider.name).toBe(mockProvider.name);
      expect(oidcManager.getProviders().length).toBe(1);
    });

    test('should get a provider by id', () => {
      const added = oidcManager.addProvider(mockProvider);
      const retrieved = oidcManager.getProvider(added.id);
      expect(retrieved?.id).toBe(added.id);
    });

    test('should redact client secret when listing providers', () => {
      oidcManager.addProvider(mockProvider);
      const providers = oidcManager.getProviders();
      expect(providers[0].clientSecret).toBe('***REDACTED***');
    });

    test('should update a provider', () => {
      const added = oidcManager.addProvider(mockProvider);
      const updated = oidcManager.updateProvider(added.id, { name: 'New Name' });
      expect(updated?.name).toBe('New Name');
      expect(oidcManager.getProvider(added.id)?.name).toBe('New Name');
    });

    test('should remove a provider', () => {
      const added = oidcManager.addProvider(mockProvider);
      const success = oidcManager.removeProvider(added.id);
      expect(success).toBe(true);
      expect(oidcManager.getProviders().length).toBe(0);
    });

    test('should set and get default provider', () => {
      const added = oidcManager.addProvider(mockProvider);
      oidcManager.setDefaultProvider(added.id);
      expect(oidcManager.getDefaultProvider()?.id).toBe(added.id);
    });
  });

  describe('Authorization Flow', () => {
    test('should build authorization URL', () => {
      const added = oidcManager.addProvider(mockProvider);
      const state = 'test-state';
      const redirectUri = 'http://localhost:3000/callback';
      const url = oidcManager.buildAuthorizationUrl(added.id, state, redirectUri);
      
      expect(url).toContain('response_type=code');
      expect(url).toContain(`client_id=${mockProvider.clientId}`);
      expect(url).toContain(`state=${state}`);
      expect(url).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
    });
  });

  describe('Session Management', () => {
    const mockTokens = {
      accessToken: 'access-token',
      expiresAt: Date.now() + 3600000,
      tokenType: 'Bearer',
    };
    const mockUserInfo = {
      sub: 'user-123',
      email: 'user@example.com',
      name: 'Test User',
    };

    test('should create and retrieve a session', () => {
      const sessionId = oidcManager.createSession('provider-1', mockTokens, mockUserInfo);
      expect(sessionId).toBeDefined();
      
      const session = oidcManager.getSession(sessionId);
      expect(session?.userId).toBe(mockUserInfo.sub);
      expect(session?.userInfo.email).toBe(mockUserInfo.email);
    });

    test('should return null for expired session', () => {
      const expiredTokens = { ...mockTokens, expiresAt: Date.now() - 1000 };
      const sessionId = oidcManager.createSession('provider-1', expiredTokens, mockUserInfo);
      
      const session = oidcManager.getSession(sessionId);
      expect(session).toBeNull();
    });

    test('should revoke a session', () => {
      const sessionId = oidcManager.createSession('provider-1', mockTokens, mockUserInfo);
      const success = oidcManager.revokeSession(sessionId);
      expect(success).toBe(true);
      expect(oidcManager.getSession(sessionId)).toBeNull();
    });
  });
});
