CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `api_keys` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`key` text NOT NULL,
	`user_id` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_unique` ON `api_keys` (`key`);--> statement-breakpoint
CREATE INDEX `api_keys_user_id_idx` ON `api_keys` (`user_id`);--> statement-breakpoint
CREATE INDEX `api_keys_key_idx` ON `api_keys` (`key`);--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_name_per_user_idx` ON `api_keys` (`user_id`,`name`);--> statement-breakpoint
CREATE TABLE `config` (
	`id` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `docker_sessions` (
	`uuid` text PRIMARY KEY NOT NULL,
	`mcp_server_uuid` text NOT NULL,
	`container_id` text NOT NULL,
	`container_name` text,
	`url` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`started_at` integer,
	`stopped_at` integer,
	`error_message` text,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`last_retry_at` integer,
	`max_retries` integer DEFAULT 3 NOT NULL,
	FOREIGN KEY (`mcp_server_uuid`) REFERENCES `mcp_servers`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ds_mcp_server_uuid_idx` ON `docker_sessions` (`mcp_server_uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `ds_unique_server_idx` ON `docker_sessions` (`mcp_server_uuid`);--> statement-breakpoint
CREATE TABLE `endpoints` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`namespace_uuid` text NOT NULL,
	`enable_api_key_auth` integer DEFAULT 1 NOT NULL,
	`enable_oauth` integer DEFAULT 0 NOT NULL,
	`enable_max_rate` integer DEFAULT 0 NOT NULL,
	`enable_client_max_rate` integer DEFAULT 0 NOT NULL,
	`max_rate` integer,
	`max_rate_seconds` integer,
	`client_max_rate` integer,
	`client_max_rate_seconds` integer,
	`client_max_rate_strategy` text,
	`client_max_rate_strategy_key` text,
	`use_query_param_auth` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`namespace_uuid`) REFERENCES `namespaces`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `endpoints_namespace_uuid_idx` ON `endpoints` (`namespace_uuid`);--> statement-breakpoint
CREATE INDEX `endpoints_user_id_idx` ON `endpoints` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `endpoints_name_unique` ON `endpoints` (`name`);--> statement-breakpoint
CREATE TABLE `mcp_servers` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text DEFAULT 'STDIO' NOT NULL,
	`command` text,
	`args` text DEFAULT '[]' NOT NULL,
	`env` text DEFAULT '{}' NOT NULL,
	`url` text,
	`error_status` text DEFAULT 'NONE' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`bearer_token` text,
	`headers` text DEFAULT '{}' NOT NULL,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `mcp_servers_name_idx` ON `mcp_servers` (`name`);--> statement-breakpoint
CREATE INDEX `mcp_servers_user_id_idx` ON `mcp_servers` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `mcp_servers_name_user_unique` ON `mcp_servers` (`name`,`user_id`);--> statement-breakpoint
CREATE TABLE `namespace_server_mappings` (
	`uuid` text PRIMARY KEY NOT NULL,
	`namespace_uuid` text NOT NULL,
	`mcp_server_uuid` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`namespace_uuid`) REFERENCES `namespaces`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mcp_server_uuid`) REFERENCES `mcp_servers`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `nsm_namespace_uuid_idx` ON `namespace_server_mappings` (`namespace_uuid`);--> statement-breakpoint
CREATE INDEX `nsm_mcp_server_uuid_idx` ON `namespace_server_mappings` (`mcp_server_uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `nsm_unique_idx` ON `namespace_server_mappings` (`namespace_uuid`,`mcp_server_uuid`);--> statement-breakpoint
CREATE TABLE `namespace_tool_mappings` (
	`uuid` text PRIMARY KEY NOT NULL,
	`namespace_uuid` text NOT NULL,
	`tool_uuid` text NOT NULL,
	`mcp_server_uuid` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`override_name` text,
	`override_title` text,
	`override_description` text,
	`override_annotations` text DEFAULT 'null',
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`namespace_uuid`) REFERENCES `namespaces`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tool_uuid`) REFERENCES `tools`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mcp_server_uuid`) REFERENCES `mcp_servers`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ntm_namespace_uuid_idx` ON `namespace_tool_mappings` (`namespace_uuid`);--> statement-breakpoint
CREATE INDEX `ntm_tool_uuid_idx` ON `namespace_tool_mappings` (`tool_uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `ntm_unique_idx` ON `namespace_tool_mappings` (`namespace_uuid`,`tool_uuid`);--> statement-breakpoint
CREATE TABLE `namespaces` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `namespaces_user_id_idx` ON `namespaces` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `namespaces_name_user_unique_idx` ON `namespaces` (`name`,`user_id`);--> statement-breakpoint
CREATE TABLE `oauth_access_tokens` (
	`access_token` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`user_id` text NOT NULL,
	`scope` text DEFAULT 'admin' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `oauth_clients`(`client_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `oat_client_id_idx` ON `oauth_access_tokens` (`client_id`);--> statement-breakpoint
CREATE INDEX `oat_user_id_idx` ON `oauth_access_tokens` (`user_id`);--> statement-breakpoint
CREATE TABLE `oauth_authorization_codes` (
	`code` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`redirect_uri` text NOT NULL,
	`scope` text DEFAULT 'admin' NOT NULL,
	`user_id` text NOT NULL,
	`code_challenge` text,
	`code_challenge_method` text,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `oauth_clients`(`client_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `oac_client_id_idx` ON `oauth_authorization_codes` (`client_id`);--> statement-breakpoint
CREATE INDEX `oac_user_id_idx` ON `oauth_authorization_codes` (`user_id`);--> statement-breakpoint
CREATE TABLE `oauth_clients` (
	`client_id` text PRIMARY KEY NOT NULL,
	`client_secret` text,
	`client_name` text NOT NULL,
	`redirect_uris` text DEFAULT '[]' NOT NULL,
	`grant_types` text DEFAULT '["authorization_code","refresh_token"]' NOT NULL,
	`response_types` text DEFAULT '["code"]' NOT NULL,
	`token_endpoint_auth_method` text DEFAULT 'none' NOT NULL,
	`scope` text DEFAULT 'admin',
	`client_uri` text,
	`logo_uri` text,
	`contacts` text,
	`tos_uri` text,
	`policy_uri` text,
	`software_id` text,
	`software_version` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `oauth_sessions` (
	`uuid` text PRIMARY KEY NOT NULL,
	`mcp_server_uuid` text NOT NULL,
	`client_information` text DEFAULT '{}' NOT NULL,
	`tokens` text,
	`code_verifier` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`mcp_server_uuid`) REFERENCES `mcp_servers`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `oauth_sessions_mcp_server_uuid_idx` ON `oauth_sessions` (`mcp_server_uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_sessions_unique_per_server_idx` ON `oauth_sessions` (`mcp_server_uuid`);--> statement-breakpoint
CREATE TABLE `policies` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`rules` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `policies_name_unique_idx` ON `policies` (`name`);--> statement-breakpoint
CREATE TABLE `saved_scripts` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`code` text NOT NULL,
	`language` text DEFAULT 'javascript' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `saved_scripts_name_user_unique_idx` ON `saved_scripts` (`name`,`user_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE TABLE `tool_call_logs` (
	`uuid` text PRIMARY KEY NOT NULL,
	`tool_name` text NOT NULL,
	`mcp_server_uuid` text,
	`namespace_uuid` text,
	`endpoint_uuid` text,
	`args` text,
	`result` text,
	`error` text,
	`duration_ms` integer,
	`session_id` text,
	`parent_call_uuid` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`mcp_server_uuid`) REFERENCES `mcp_servers`(`uuid`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`namespace_uuid`) REFERENCES `namespaces`(`uuid`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`endpoint_uuid`) REFERENCES `endpoints`(`uuid`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `tcl_tool_name_idx` ON `tool_call_logs` (`tool_name`);--> statement-breakpoint
CREATE INDEX `tcl_mcp_server_uuid_idx` ON `tool_call_logs` (`mcp_server_uuid`);--> statement-breakpoint
CREATE INDEX `tcl_created_at_idx` ON `tool_call_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `tool_set_items` (
	`uuid` text PRIMARY KEY NOT NULL,
	`tool_set_uuid` text NOT NULL,
	`tool_uuid` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`tool_set_uuid`) REFERENCES `tool_sets`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tool_uuid`) REFERENCES `tools`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tsi_tool_set_uuid_idx` ON `tool_set_items` (`tool_set_uuid`);--> statement-breakpoint
CREATE INDEX `tsi_tool_uuid_idx` ON `tool_set_items` (`tool_uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `tsi_unique_idx` ON `tool_set_items` (`tool_set_uuid`,`tool_uuid`);--> statement-breakpoint
CREATE TABLE `tool_sets` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tool_sets_name_user_unique_idx` ON `tool_sets` (`name`,`user_id`);--> statement-breakpoint
CREATE TABLE `tools` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`tool_schema` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`mcp_server_uuid` text NOT NULL,
	FOREIGN KEY (`mcp_server_uuid`) REFERENCES `mcp_servers`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tools_mcp_server_uuid_idx` ON `tools` (`mcp_server_uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `tools_unique_tool_name_per_server_idx` ON `tools` (`mcp_server_uuid`,`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT 0 NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
