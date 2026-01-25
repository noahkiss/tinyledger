import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DATA_DIR = process.env.DATA_DIR ?? './data';

export interface WorkspaceEntry {
	id: string;
	name: string;
	createdAt: string;
}

interface Registry {
	workspaces: WorkspaceEntry[];
}

function getRegistryPath(): string {
	return join(DATA_DIR, 'workspaces.json');
}

function ensureDataDir(): void {
	if (!existsSync(DATA_DIR)) {
		mkdirSync(DATA_DIR, { recursive: true });
	}
}

function loadRegistry(): Registry {
	ensureDataDir();
	const registryPath = getRegistryPath();

	if (!existsSync(registryPath)) {
		return { workspaces: [] };
	}

	try {
		const content = readFileSync(registryPath, 'utf-8');
		return JSON.parse(content) as Registry;
	} catch {
		return { workspaces: [] };
	}
}

function saveRegistry(registry: Registry): void {
	ensureDataDir();
	const registryPath = getRegistryPath();
	writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}

/**
 * Get list of all workspaces
 */
export function listWorkspaces(): WorkspaceEntry[] {
	return loadRegistry().workspaces;
}

/**
 * Add a workspace to the registry
 */
export function addWorkspace(id: string, name: string): void {
	const registry = loadRegistry();

	// Check if already exists
	if (registry.workspaces.some((w) => w.id === id)) {
		return;
	}

	registry.workspaces.push({
		id,
		name,
		createdAt: new Date().toISOString()
	});

	saveRegistry(registry);
}

/**
 * Remove a workspace from the registry
 */
export function removeWorkspace(id: string): void {
	const registry = loadRegistry();
	registry.workspaces = registry.workspaces.filter((w) => w.id !== id);
	saveRegistry(registry);
}

/**
 * Update workspace name in registry
 */
export function updateWorkspaceName(id: string, name: string): void {
	const registry = loadRegistry();
	const workspace = registry.workspaces.find((w) => w.id === id);
	if (workspace) {
		workspace.name = name;
		saveRegistry(registry);
	}
}

/**
 * Check if workspace exists in registry
 */
export function workspaceInRegistry(id: string): boolean {
	return loadRegistry().workspaces.some((w) => w.id === id);
}
