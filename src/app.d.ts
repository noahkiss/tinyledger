// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from '$lib/server/db/schema';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			workspaceId?: string;
			db?: BetterSQLite3Database<typeof schema>;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
