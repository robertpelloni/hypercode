import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('should allow entering an API key and logging in', async ({ page }) => {
        // Navigate to the root, which should redirect to login if no session
        await page.goto('/');

        // Check if we are on the login page
        await expect(page).toHaveURL(/.*login/);

        // The login page has a heading "Welcome to Jules Auth"
        await expect(page.locator('h1')).toContainText('Jules Auth');

        // Fill the API key input
        const apiKeyInput = page.locator('input[type="password"]');
        await expect(apiKeyInput).toBeVisible();
        await apiKeyInput.fill('test-playwright-key');

        // Submit the form
        await page.getByRole('button', { name: 'Login' }).click();

        // Wait for redirect to dashboard
        await page.waitForURL('**/dashboard**');

        // Verify dashboard loaded
        await expect(page.locator('text=Jules Autopilot Dashboard')).toBeVisible();
    });
});
