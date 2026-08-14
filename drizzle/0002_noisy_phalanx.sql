ALTER TABLE `users` ADD `firebaseUid` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `firebaseLinkedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_firebase_uid_unique` UNIQUE(`firebaseUid`);