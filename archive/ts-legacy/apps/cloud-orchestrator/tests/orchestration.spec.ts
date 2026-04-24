import { test, expect } from '@playwright/test';
import { SignJWT } from 'jose';

const secretKey = 'default-secret-key-change-me';
const key = new TextEncoder().encode(secretKey);

async function createSessionToken() {
    return await new SignJWT({ apiKey: 'test-key', expires: new Date(Date.now() + 1000 * 60 * 60) })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(key);
}

test.describe('Agent Orchestration', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/api/auth/me', async route => {
        await route.fulfill({ status: 200, contentType: 'application/json', json: { authenticated: true } });
    });

    // Mock initial session list to be empty or contain default
    await page.route('**/api/jules/sessions', async route => {
         if (route.request().method() === 'GET') {
             await route.fulfill({ status: 200, contentType: 'application/json', json: [] });
         } else {
             await route.continue();
         }
    });

    // Generate a valid JWT token for the middleware
    const token = await createSessionToken();

    // Bypass the middleware redirect by adding a valid session cookie
    const context = page.context();
    await context.addCookies([{
        name: 'session',
        value: token,
        domain: 'localhost',
        path: '/'
    }]);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('can create a new session', async ({ page }) => {
    // Intercept the creation POST request
    await page.route('**/api/jules/sessions', async route => {
        if (route.request().method() === 'POST') {
             const json = {
                id: 'test-session-123',
                title: 'Hello World Task',
                state: 'ACTIVE',
                createTime: new Date().toISOString(),
                sourceContext: { source: 'sources/github/test/repo' }
            };
            await route.fulfill({ status: 201, contentType: 'application/json', json });
        } else {
            await route.continue();
        }
    });

    // Intercept list sessions to include the new one after creation
    // This is tricky because the UI might refetch. 
    // We can update the mock handler dynamically or just respond with the new list if the header refreshes.
    
    // Wait for the "New Session" button to appear.
    // We use the reliable data-testid added to AppHeader
    const newSessionBtn = page.getByTestId('new-session-btn');
    await newSessionBtn.waitFor({ state: 'visible', timeout: 10000 });
    await newSessionBtn.click();
    
    // Expect the creation dialog
    // The dialog title is "Create New Session", not "New Coding Session"
    const dialogHeader = page.getByRole('heading', { name: 'Create New Session' });
    await expect(dialogHeader).toBeVisible();
    
    // Fill out the form
    await page.getByPlaceholder('Describe what you want the agent to do...').fill('Create a simple hello world script');
    
    // Click Start Session (or Create Session based on the button text)
    const startBtn = page.getByRole('button', { name: 'Create Session' });
    await startBtn.click();

    // The dialog should close
    await expect(dialogHeader).not.toBeVisible();
  });

  test('can open supervisor settings', async ({ page }) => {
    // 1. Locate the header settings trigger using the testid
    const settingsTrigger = page.getByTestId('settings-dropdown-trigger');
    
    // Ensure it's visible before clicking
    await settingsTrigger.waitFor({ state: 'visible', timeout: 10000 });
    await settingsTrigger.click();

    // 2. Click "Settings" item in the dropdown
    const settingsItem = page.getByRole('menuitem', { name: 'Settings' });
    await settingsItem.waitFor({ state: 'visible' });
    await settingsItem.click();

    // Expect Settings Dialog to be visible
    // We check for the "Integrations" tab content since that is the default tab
    // Or we can check for "GitHub Integration" text which appears in the default tab
    await expect(page.getByText('GitHub Integration')).toBeVisible({ timeout: 10000 });
  });
});
