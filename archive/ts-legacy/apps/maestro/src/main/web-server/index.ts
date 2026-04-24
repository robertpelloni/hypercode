/**
 * Web Server Module Index
 *
 * Main entry point for the web server module.
 * Re-exports all public types, classes, and utilities.
 *
 * Import from this module:
 *   import { WebServer } from './web-server';
 *   import type { Theme, LiveSessionInfo } from './web-server';
 */

// ============ Main Export ============
// Export the WebServer class
export { WebServer } from './WebServer';

// ============ Shared Types ============
// Export all shared types (canonical location for all web server types)
export type {
	// Core types
	Theme,
	LiveSessionInfo,
	RateLimitConfig,
	SessionUsageStats,
	LastResponsePreview,
	AITabData,
	SessionDetail,
	CustomAICommand,
	AutoRunState,
	CliActivity,
	SessionBroadcastData,
	SessionData,
	WebClient,
	WebClientMessage,
	// Callback types
	GetSessionsCallback,
	GetSessionDetailCallback,
	WriteToSessionCallback,
	ExecuteCommandCallback,
	InterruptSessionCallback,
	SwitchModeCallback,
	SelectSessionCallback,
	SelectTabCallback,
	NewTabCallback,
	CloseTabCallback,
	RenameTabCallback,
	GetThemeCallback,
	GetCustomCommandsCallback,
	GetHistoryCallback,
	GetWebClientsCallback,
} from './types';

// ============ Handlers ============
export { WebSocketMessageHandler } from './handlers';
export type { SessionDetailForHandler, MessageHandlerCallbacks } from './handlers';

// ============ Services ============
export { BroadcastService } from './services';
export type { WebClientInfo } from './services';

// ============ Managers ============
export { LiveSessionManager, CallbackRegistry } from './managers';
export type { LiveSessionBroadcastCallbacks, WebServerCallbacks } from './managers';

// ============ Routes ============
export { ApiRoutes, StaticRoutes, WsRoute } from './routes';
export type { ApiRouteCallbacks, WsRouteCallbacks, WsSessionData } from './routes';
