import * as vscode from 'vscode';

/**
 * The public interface of ms-python.vscode-python-envs used by AdaAssist.
 * Structural typing avoids adding runtime npm dependencies to the extension bundle.
 * https://github.com/microsoft/vscode-python-environments
 */
interface PythonEnvironmentsApi {
	getEnvironments(scope: 'all'): Promise<PythonEnvironmentRecord[]>;
	get(scope?: vscode.Uri): Promise<PythonEnvironmentRecord | undefined>;
	refreshEnvironments(scope?: vscode.Uri): Promise<void>;
	onDidChangeEnvironment?: vscode.Event<unknown>;
}

interface PythonEnvironmentRecord {
	envId: { id: string; managerId: string };
	name: string;
	displayName: string;
	version: string;
	displayPath: string;
	error?: string;
	execInfo?: { run?: { executable: string; args?: string[] } };
}

export interface DiscoveredPythonEnvironment {
	id: string;
	name: string;
	version: string;
	manager: string;
	path: string;
	executable: string;
	args: string[];
}

export async function getPythonEnvironmentsApi(): Promise<PythonEnvironmentsApi | undefined> {
	const extension = vscode.extensions.getExtension<PythonEnvironmentsApi>('ms-python.vscode-python-envs');
	if (!extension) {
		return undefined;
	}
	try {
		return extension.isActive ? extension.exports : await extension.activate();
	} catch {
		// The optional discovery service might be disabled or not initialized.
		return undefined;
	}
}

function convertEnvironment(env: PythonEnvironmentRecord | undefined): DiscoveredPythonEnvironment | undefined {
	const executable = env?.execInfo?.run?.executable?.trim();
	if (!env || env.error || !executable) {
		return undefined;
	}
	return {
		id: `${env.envId.managerId}:${env.envId.id}`,
		name: env.displayName || env.name || executable,
		version: env.version || '',
		manager: env.envId.managerId.split(':').pop() || env.envId.managerId,
		path: env.displayPath || executable,
		executable,
		args: [...(env.execInfo?.run?.args ?? [])]
	};
}

export async function discoverPythonEnvironments(refresh = false): Promise<DiscoveredPythonEnvironment[]> {
	const api = await getPythonEnvironmentsApi();
	if (!api) {
		return [];
	}
	if (refresh) {
		await api.refreshEnvironments(undefined);
	}
	const environments = await api.getEnvironments('all');
	const unique = new Map<string, DiscoveredPythonEnvironment>();
	for (const environment of environments) {
		const result = convertEnvironment(environment);
		if (result) {
			unique.set(result.id, result);
		}
	}
	return [...unique.values()].sort((a, b) =>
		a.manager.localeCompare(b.manager) || a.name.localeCompare(b.name)
	);
}

export async function getSelectedPythonEnvironment(id: string): Promise<DiscoveredPythonEnvironment | undefined> {
	return (await discoverPythonEnvironments()).find((env) => env.id === id);
}

export async function getActiveWorkspacePythonEnvironment(): Promise<DiscoveredPythonEnvironment | undefined> {
	const api = await getPythonEnvironmentsApi();
	if (!api) {
		return undefined;
	}
	const resource = vscode.window.activeTextEditor
		? vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri)?.uri
		: undefined;
	const workspace = resource ?? vscode.workspace.workspaceFolders?.[0]?.uri;
	try {
		const active = await api.get(workspace);
		return convertEnvironment(active ?? (workspace ? await api.get(undefined) : undefined));
	} catch {
		return undefined;
	}
}
