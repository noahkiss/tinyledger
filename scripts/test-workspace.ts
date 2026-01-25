/**
 * Test script to verify workspace database creation and WAL mode.
 * Run with: npx tsx scripts/test-workspace.ts
 */
import { createWorkspace, workspaceExists, getWorkspaceDb } from '../src/lib/server/workspace';
import { listWorkspaces, removeWorkspace } from '../src/lib/server/workspace/registry';
import { workspaceSettings } from '../src/lib/server/db/schema';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const DATA_DIR = process.env.DATA_DIR ?? './data';
const TEST_WORKSPACE_ID = 'test-workspace-' + Date.now();

console.log('Testing workspace system...\n');

// Test 1: Create workspace
console.log('1. Creating test workspace:', TEST_WORKSPACE_ID);
createWorkspace(TEST_WORKSPACE_ID, 'Test Workspace', 'sole_prop');

// Test 2: Verify .db file exists
const dbPath = join(DATA_DIR, 'workspaces', `${TEST_WORKSPACE_ID}.db`);
console.log('2. Database file exists:', existsSync(dbPath) ? 'PASS' : 'FAIL');

// Test 3: Verify WAL mode (check for .db-wal file after write)
const walPath = dbPath + '-wal';
console.log('3. WAL mode enabled (.db-wal exists):', existsSync(walPath) ? 'PASS' : 'FAIL (may be empty)');

// Test 4: Verify workspaceExists function
console.log('4. workspaceExists returns true:', workspaceExists(TEST_WORKSPACE_ID) ? 'PASS' : 'FAIL');

// Test 5: Verify workspace is in registry
const workspaces = listWorkspaces();
const inRegistry = workspaces.some((w) => w.id === TEST_WORKSPACE_ID);
console.log('5. Workspace in registry:', inRegistry ? 'PASS' : 'FAIL');

// Test 6: Read workspace settings from database
const db = getWorkspaceDb(TEST_WORKSPACE_ID);
const settings = db.select().from(workspaceSettings).limit(1).get();
console.log('6. Settings read from DB:', settings?.name === 'Test Workspace' ? 'PASS' : 'FAIL');
console.log('   Settings:', JSON.stringify(settings, null, 2));

// Cleanup
console.log('\n7. Cleaning up test workspace...');
removeWorkspace(TEST_WORKSPACE_ID);
try {
	unlinkSync(dbPath);
	if (existsSync(walPath)) unlinkSync(walPath);
	const shmPath = dbPath + '-shm';
	if (existsSync(shmPath)) unlinkSync(shmPath);
	console.log('   Cleanup: PASS');
} catch (e) {
	console.log('   Cleanup: FAIL -', e);
}

console.log('\nAll tests completed!');
