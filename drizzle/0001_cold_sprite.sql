CREATE TABLE `agentRunEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` varchar(32) NOT NULL,
	`projectId` varchar(32) NOT NULL,
	`ownerId` int NOT NULL,
	`sequence` int NOT NULL,
	`type` varchar(80) NOT NULL,
	`payloadJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agentRunEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `agent_run_events_unique` UNIQUE(`runId`,`sequence`)
);
--> statement-breakpoint
CREATE TABLE `agentRuns` (
	`id` varchar(32) NOT NULL,
	`projectId` varchar(32) NOT NULL,
	`conversationId` varchar(32) NOT NULL,
	`ownerId` int NOT NULL,
	`status` enum('queued','running','awaiting_confirmation','completed','failed','cancelled') NOT NULL DEFAULT 'queued',
	`providerConfigId` varchar(32),
	`model` varchar(160),
	`errorCode` varchar(80),
	`errorMessage` text,
	`metadataJson` text,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agentRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `artifactVersions` (
	`id` varchar(32) NOT NULL,
	`artifactId` varchar(32) NOT NULL,
	`projectId` varchar(32) NOT NULL,
	`ownerId` int NOT NULL,
	`version` int NOT NULL,
	`operation` enum('create','edit','restore') NOT NULL,
	`summary` varchar(320) NOT NULL,
	`content` text NOT NULL,
	`patchJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `artifactVersions_id` PRIMARY KEY(`id`),
	CONSTRAINT `artifact_versions_unique` UNIQUE(`artifactId`,`version`)
);
--> statement-breakpoint
CREATE TABLE `artifacts` (
	`id` varchar(32) NOT NULL,
	`projectId` varchar(32) NOT NULL,
	`conversationId` varchar(32),
	`ownerId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`filePath` varchar(320) NOT NULL,
	`language` varchar(48) NOT NULL DEFAULT 'text',
	`kind` enum('code','html','markdown','image_prompt','other') NOT NULL DEFAULT 'code',
	`content` text NOT NULL,
	`previewMode` enum('none','html','react') NOT NULL DEFAULT 'none',
	`version` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `artifacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` varchar(32) NOT NULL,
	`projectId` varchar(32) NOT NULL,
	`ownerId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` varchar(32) NOT NULL,
	`projectId` varchar(32) NOT NULL,
	`conversationId` varchar(32) NOT NULL,
	`ownerId` int NOT NULL,
	`role` enum('system','user','assistant','tool') NOT NULL,
	`kind` enum('message','thinking','tool_call','tool_result','error') NOT NULL DEFAULT 'message',
	`content` text NOT NULL,
	`metadataJson` text,
	`isFinal` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` varchar(32) NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` text,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`template` varchar(80) NOT NULL DEFAULT 'blank',
	`previewUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `providerConfigs` (
	`id` varchar(32) NOT NULL,
	`ownerId` int NOT NULL,
	`slot` enum('text_1','text_2','text_3','text_4','image_1') NOT NULL,
	`provider` enum('openai','anthropic','gemini','compatible','other') NOT NULL,
	`model` varchar(160) NOT NULL,
	`baseUrl` text,
	`apiKeyCiphertext` text NOT NULL,
	`apiKeyFingerprint` varchar(24) NOT NULL,
	`priority` int NOT NULL DEFAULT 0,
	`enabled` boolean NOT NULL DEFAULT false,
	`failureCount` int NOT NULL DEFAULT 0,
	`lastFailureAt` timestamp,
	`lastSuccessAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `providerConfigs_id` PRIMARY KEY(`id`),
	CONSTRAINT `provider_configs_slot_unique` UNIQUE(`ownerId`,`slot`)
);
--> statement-breakpoint
CREATE TABLE `userPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`autonomyMode` enum('ask','autonomous') NOT NULL DEFAULT 'ask',
	`preferredTextSlot` varchar(16),
	`firebaseProjectId` varchar(160),
	`firebaseAuthConfigured` boolean NOT NULL DEFAULT false,
	`firestoreConfigured` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_preferences_owner_unique` UNIQUE(`ownerId`)
);
--> statement-breakpoint
CREATE INDEX `agent_run_events_owner_idx` ON `agentRunEvents` (`ownerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `agent_runs_owner_idx` ON `agentRuns` (`ownerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `artifact_versions_owner_idx` ON `artifactVersions` (`ownerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `artifacts_project_idx` ON `artifacts` (`projectId`,`ownerId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `conversations_project_idx` ON `conversations` (`projectId`,`ownerId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `messages_conversation_idx` ON `messages` (`conversationId`,`ownerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `projects_owner_idx` ON `projects` (`ownerId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `provider_configs_routing_idx` ON `providerConfigs` (`ownerId`,`enabled`,`priority`);