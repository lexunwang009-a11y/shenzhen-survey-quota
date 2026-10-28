CREATE TABLE `admins` (
	`email` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quota_cells` (
	`key` text PRIMARY KEY NOT NULL,
	`district` text NOT NULL,
	`education` text NOT NULL,
	`age` text NOT NULL,
	`quota` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`cell_key` text NOT NULL,
	`claimant_name` text NOT NULL,
	`organization` text NOT NULL,
	`phone` text NOT NULL,
	`created_at` text NOT NULL
);
