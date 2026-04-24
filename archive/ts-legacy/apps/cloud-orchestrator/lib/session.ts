/**
 * Retrieves a mock authenticated session for local development.
 * 
 * Provides a consistent dev environment without requiring real 
 * authentication during the initial Lean Core pivot.
 * 
 * Returns a static user and workspace ID.
 */
export async function getSession() {
  // Always return a mock session for local development
  return {
    user: {
      id: "dev-admin-id",
      name: "Admin",
      email: "admin@localhost",
      workspaceId: "dev-workspace-id"
    },
    apiKey: process.env.JULES_API_KEY || 'authenticated-via-local-dev',
    workspaceId: "dev-workspace-id",
  };
}
