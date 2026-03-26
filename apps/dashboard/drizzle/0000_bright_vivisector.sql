CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`budget_id` text,
	`feature` text NOT NULL,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`current_spend` real NOT NULL,
	`threshold` real NOT NULL,
	`triggered_at` integer NOT NULL,
	`resolved` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`feature` text NOT NULL,
	`period` text NOT NULL,
	`limit_usd` real NOT NULL,
	`alert_threshold` real DEFAULT 0.8,
	`webhook_url` text,
	`email` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cost_events` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp` integer NOT NULL,
	`feature` text NOT NULL,
	`team` text,
	`user_id` text,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`input_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL,
	`total_tokens` integer NOT NULL,
	`input_cost` real NOT NULL,
	`output_cost` real NOT NULL,
	`total_cost` real NOT NULL,
	`latency_ms` integer,
	`status` text DEFAULT 'success',
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `model_pricing` (
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`input_price_per_1k` real NOT NULL,
	`output_price_per_1k` real NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`provider`, `model`)
);
