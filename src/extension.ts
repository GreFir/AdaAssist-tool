import * as vscode from 'vscode';
import { spawn, type ChildProcess } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { discoverPythonEnvironments, getActiveWorkspacePythonEnvironment, getSelectedPythonEnvironment, getPythonEnvironmentsApi } from './pythonEnvironments';
import { SessionSnapshotStore, type SavedWorkflowSession } from './sessionSnapshots';

interface LlmRequestConfig {
	base_url: string;
	api_key: string;
	model: string;
	provider: ProviderType;
	max_tokens: number;
}

interface PythonCommand {
	executable: string;
	args: string[];
}

interface PythonInterpreterPickItem extends vscode.QuickPickItem {
	value?: string;
	action?: 'auto' | 'browse' | 'refresh';
}

interface ProcessResult {
	code: number | null;
	stdout: string;
	stderr: string;
	timedOut: boolean;
}

type EnvironmentCheckStatus = 'checking' | 'ready' | 'failed' | 'warning';

interface EnvironmentCheckItem {
	label: string;
	status: EnvironmentCheckStatus;
	detail: string;
}

interface EnvironmentCheckResult {
	status: EnvironmentCheckStatus;
	items: EnvironmentCheckItem[];
	checkedAt: string;
}

interface InlineCompletionSettingsView {
	enabled: boolean;
	provider: ProviderType;
	baseUrl: string;
	model: string;
	triggerMode: 'automatic' | 'manual';
	debounceMs: number;
	maxTokens: number;
}

interface WorkflowArgs {
	problem: string;
	test_text: string;
	test_mode: TestMode;
	test_description?: string;
}

interface BackendSessionRequest extends WorkflowArgs {
	llm: LlmRequestConfig;
	context_enabled: boolean;
	max_rounds: number;
	resolved_test_code?: string;
	test_description?: string;
	additional_instruction?: string;
	prompt_language: 'en' | 'zh-CN';
}

interface BackendSessionState {
	session_id: string;
	problem_statement: string;
	test_text: string;
	test_mode: TestMode;
	llm?: {
		provider?: string;
		base_url?: string;
		model?: string;
		max_tokens?: number;
	};
	context_enabled: boolean;
	max_rounds: number;
	test_description?: string;
	additional_instruction?: string;
	prompt_language?: 'en' | 'zh-CN';
	status: string;
	current_stage: string;
	current_code: string;
	current_plan: string;
	resolved_test_code: string;
	resolved_tests_confirmed: boolean;
	latest_evaluation?: WorkflowResult;
	passed: boolean;
	attempt_count: number;
	regeneration_count: number;
	events: BackendEvent[];
	study_events?: Array<Record<string, unknown>>;
	context_entries: Array<Record<string, unknown>>;
	created_at: string;
	updated_at: string;
	available_actions: string[];
}

interface BackendEvent {
	id: string;
	stage: string;
	status: string;
	title: string;
	message: string;
	data?: Record<string, unknown>;
	created_at: string;
}

type VisualLogCategory = 'workflow' | 'model' | 'evaluation' | 'interaction' | 'extension';
type VisualLogLevel = 'info' | 'warning' | 'error';

interface VisualLogEntry {
	id: string;
	timestamp: string;
	sessionId: string | null;
	category: VisualLogCategory;
	level: VisualLogLevel;
	event: string;
	message: string;
}

interface PersistedLogHistory {
	schemaVersion: 1;
	updatedAt: string;
	entries: VisualLogEntry[];
}

interface BackendActionResult {
	stage?: string;
	message?: string;
	passed?: boolean;
	interrupted?: boolean;
	[key: string]: unknown;
}

interface BackendResponse {
	ok: boolean;
	session?: BackendSessionState;
	sessions?: BackendSessionState[];
	stage_result?: BackendActionResult;
	detail?: string;
}

interface InlineCompletionResponse extends BackendResponse {
	completion?: string;
	generation?: GenerationMetadata;
}

interface GenerationMetadata {
	duration_ms?: number;
	strategy?: string;
	usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
}

interface UserStudyTask {
	task_id: string;
	title: string;
	prompt: string;
	public_tests: string;
	difficulty?: string;
	assigned_condition?: 'auto' | 'interactive';
	sequence?: number;
}

interface TestSuggestionResponse extends BackendResponse {
	tests?: string;
}

interface EditorFunctionContext {
	name: string;
	source: string;
	start: vscode.Position;
	offset: number;
}

type WorkflowResult = {
	passed?: boolean;
	code?: string;
	[key: string]: unknown;
};

type BridgeLogLevel = 'runtime' | 'stdout' | 'stderr' | 'info' | 'error';

interface RunRequest {
	problem: string;
	testText: string;
	testMode: TestMode;
	contextEnabled: boolean;
	maxRounds: number;
	executionMode: 'auto' | 'continue';
	resolvedTestCode?: string;
	testDescription?: string;
	additionalInstruction?: string;
}

type InteractionState =
	| 'idle'
	| 'await_test_setup'
	| 'await_generation_tests'
	| 'await_code_review'
	| 'await_auto_test_edit'
	| 'await_plan'
	| 'await_failure_choice'
	| 'done';

interface ActionRequestState {
	problem?: string;
	testText?: string;
	testMode?: TestMode;
	useErrorFeedback: boolean;
	contextEnabled?: boolean;
	maxRounds?: number;
	planOverride?: string;
	executionMode?: 'auto' | 'continue';
	resolvedTestCode?: string;
	codeOverride?: string;
	codeEventId?: string;
	testDescription?: string;
	additionalInstruction?: string;
}

type OperationScope = 'workflow' | 'tests' | 'plan' | 'code' | 'runtime';

interface OperationContext {
	scope: OperationScope;
	action: string;
}

type SelectionWriteMode = 'replace' | 'append';

type ResumeState =
	| { kind: 'tests-confirmation'; request: RunRequest; restartAfterTests: boolean }
	| {
		kind: 'generation-tests';
		request: ActionRequestState;
		action: 'regenerate' | 'restart';
		runLabel: string;
		reviewMessage: string;
		useErrorFeedback: boolean;
	}
	| { kind: 'code-review'; request: ActionRequestState }
	| { kind: 'auto'; request: RunRequest };

type ProviderType = 'openai' | 'claude' | 'other' | 'ollama' | 'vllm';
type TestMode = 'manual' | 'generate';

interface ProfileMeta {
	id: string;
	name: string;
	baseUrl: string;
	model: string;
	provider: ProviderType;
	maxTokens?: number;
	apiKeyEnv?: string;
}

interface Profile extends ProfileMeta {
	apiKey: string;
}

interface ProfileView extends ProfileMeta {
	apiKeyConfigured: boolean;
}

interface ProfileFileProfile extends ProfileMeta {
	apiKey?: string;
}

interface ProfileFileData {
	version: 1;
	activeProfileId: string;
	profiles: ProfileFileProfile[];
}

const EXTENSION_ID = 'adaassist';
const LEGACY_EXTENSION_ID = 'adacoder';
const EXTENSION_DISPLAY_NAME = 'AdaAssist';
const LEGACY_API_KEY_SECRET = `${LEGACY_EXTENSION_ID}.apiKey`;
const PROFILE_API_KEY_SECRET_PREFIX = `${EXTENSION_ID}.profileApiKey`;
const PROFILE_FILE_VERSION = 1;
const DEFAULT_PROFILE_CONFIG_RELATIVE_PATH = '.vscode/adaassist-profiles.json';
const LEGACY_PROFILE_CONFIG_RELATIVE_PATH = '.vscode/adacoder-profiles.json';
const DEFAULT_BACKEND_ENTRY_RELATIVE_PATH = 'backend/main.py';
const DEFAULT_BACKEND_HOST = '127.0.0.1';
const DEFAULT_BACKEND_PORT = 8765;
const DEFAULT_LLM_BASE_URL = 'http://127.0.0.1:8003/v1';
const DEFAULT_LLM_MODEL = 'deepseek-coder-33b-instruct';
const DEFAULT_WORKFLOW_MAX_TOKENS = 1024;
const MAX_WORKFLOW_OUTPUT_TOKENS = 32768;

function normalizeWorkflowMaxTokens(value: unknown): number {
	return typeof value === 'number' && Number.isInteger(value)
		&& value >= 128 && value <= MAX_WORKFLOW_OUTPUT_TOKENS
		? value : DEFAULT_WORKFLOW_MAX_TOKENS;
}
const DEFAULT_INLINE_BASE_URL = 'http://127.0.0.1:8004/v1';
const DEFAULT_INLINE_MODEL = 'deepseek-coder-6.7b-instruct';
const SESSION_POLL_INTERVAL_MS = 300;

class BackendServerManager {
	private process: ChildProcess | undefined;
	private startPromise: Promise<void> | undefined;

	public constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly outputChannel: vscode.OutputChannel
	) {}

	public async request<T extends BackendResponse>(pathName: string, init?: RequestInit): Promise<T> {
		const response = await this.fetch(pathName, init);
		const payload = await response.json() as T;
		if (!response.ok || !payload.ok) {
			const detail = typeof payload.detail === 'string' && payload.detail.trim()
				? payload.detail.trim()
				: `Backend request failed with status ${response.status}.`;
			throw new Error(detail);
		}
		return payload;
	}

	public async fetch(pathName: string, init?: RequestInit, allowRestart = true): Promise<Response> {
		await this.ensureStarted();
		const baseUrl = this.getBaseUrl();

		try {
			return await fetch(new URL(pathName, baseUrl), {
				...init,
				headers: {
					'content-type': 'application/json',
					...(init?.headers ?? {})
				}
			});
		} catch (error) {
			if (!allowRestart || init?.signal?.aborted) {
				throw error;
			}
			this.outputChannel.appendLine(`[backend] request failed, restarting server: ${String(error)}`);
			await this.restart();
			return this.fetch(pathName, init, false);
		}
	}

	public async ensureStarted(): Promise<void> {
		if (await this.isHealthy()) {
			return;
		}

		if (this.startPromise) {
			await this.startPromise;
			return;
		}

		this.startPromise = this.startServer();
		try {
			await this.startPromise;
		} finally {
			this.startPromise = undefined;
		}
	}

	public async restart(): Promise<void> {
		this.stop();
		await this.ensureStarted();
	}

	public stop(): void {
		if (this.process && !this.process.killed) {
			this.process.kill();
		}
		this.process = undefined;
		this.startPromise = undefined;
	}

	private getBaseUrl(): string {
		return getBackendUrl();
	}

	private async startServer(): Promise<void> {
		const backendPath = resolveBackendEntryPath(this.context);
		if (!fs.existsSync(backendPath)) {
			throw new Error(`Backend entry not found: ${backendPath}`);
		}

		const pythonCommand = await resolvePythonCommand(this.context);
		const host = getConfigurationValue<string>('backendHost', DEFAULT_BACKEND_HOST) || DEFAULT_BACKEND_HOST;
		const port = getConfigurationValue<number>('backendPort', DEFAULT_BACKEND_PORT) || DEFAULT_BACKEND_PORT;
		this.outputChannel.appendLine(`[backend] python=${formatPythonCommand(pythonCommand)}`);
		this.outputChannel.appendLine(`[backend] entry=${backendPath}`);
		this.outputChannel.appendLine(`[backend] listen=${host}:${port}`);

		let processExitError = '';
		const process = spawn(
			pythonCommand.executable,
			[...pythonCommand.args, backendPath, '--host', host, '--port', String(port)],
			{
				cwd: path.dirname(backendPath),
				stdio: ['ignore', 'pipe', 'pipe'],
				windowsHide: true
			}
		);
		this.process = process;

		process.stdout?.on('data', (buffer: Buffer) => {
			const text = buffer.toString().trim();
			if (text) {
				this.outputChannel.appendLine(`[backend stdout] ${text}`);
			}
		});

		process.stderr?.on('data', (buffer: Buffer) => {
			const text = buffer.toString().trim();
			if (text) {
				processExitError = text;
				this.outputChannel.appendLine(`[backend stderr] ${text}`);
			}
		});

		process.on('exit', (code, signal) => {
			if (!processExitError) {
				processExitError = `process exited with code=${code ?? 'null'} signal=${signal ?? 'null'}`;
			}
			this.outputChannel.appendLine(`[backend exit] code=${code ?? 'null'} signal=${signal ?? 'null'}`);
			this.process = undefined;
		});

		process.on('error', (error) => {
			processExitError = `Unable to start ${formatPythonCommand(pythonCommand)}: ${error.message}`;
			this.outputChannel.appendLine(`[backend error] ${processExitError}`);
			this.process = undefined;
		});

		for (let attempt = 0; attempt < 40; attempt += 1) {
			if (await this.isHealthy()) {
				this.outputChannel.appendLine('[backend] server is ready');
				return;
			}
			if (processExitError) {
				break;
			}
			await delay(250);
		}

		if (processExitError) {
			throw new Error(`FastAPI backend failed to start: ${processExitError}`);
		}
		throw new Error('Timed out waiting for FastAPI backend to become ready. Check the AdaAssist output log for backend errors.');
	}

	private async isHealthy(): Promise<boolean> {
		try {
			const response = await fetch(new URL('/health', this.getBaseUrl()));
			if (!response.ok) {
				return false;
			}
			const payload = await response.json() as { ok?: boolean };
			return Boolean(payload.ok);
		} catch {
			return false;
		}
	}
}

class PersistentVisualLogStore {
	private static readonly maxEntries = 1000;
	private static readonly maxAgeMs = 30 * 24 * 60 * 60 * 1000;
	private static readonly maxFileBytes = 2 * 1024 * 1024;
	private readonly filePath: string;
	private entries: VisualLogEntry[] = [];
	private knownIds = new Set<string>();
	private writeQueue: Promise<void> = Promise.resolve();

	public constructor(
		context: vscode.ExtensionContext,
		private readonly outputChannel: vscode.OutputChannel
	) {
		const storageRoot = context.storageUri ?? context.globalStorageUri;
		this.filePath = vscode.Uri.joinPath(storageRoot, 'logs', 'history-v1.json').fsPath;
	}

	public async initialize(): Promise<void> {
		try {
			const raw = await fs.promises.readFile(this.filePath, 'utf8');
			const parsed = JSON.parse(raw) as Partial<PersistedLogHistory>;
			if (parsed.schemaVersion === 1 && Array.isArray(parsed.entries)) {
				this.entries = parsed.entries.filter((entry): entry is VisualLogEntry => (
					Boolean(entry)
					&& typeof entry.id === 'string'
					&& typeof entry.timestamp === 'string'
					&& typeof entry.message === 'string'
				));
			}
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
				this.outputChannel.appendLine(`[visual logs] Failed to load history: ${String(error)}`);
			}
		}
		this.prune();
		this.knownIds = new Set(this.entries.map((entry) => entry.id));
	}

	public recordSession(session: BackendSessionState | undefined): void {
		if (!session) {
			return;
		}
		const additions: VisualLogEntry[] = [];
		for (const event of session.events ?? []) {
			const id = `workflow:${session.session_id}:${event.id}`;
			if (this.knownIds.has(id)) {
				continue;
			}
			const data = event.data && typeof event.data === 'object' ? event.data : {};
			const generation = this.asRecord(data.generation);
			const usage = this.asRecord(generation?.usage);
			const evaluation = this.asRecord(data.evaluation);
			const testSummary = this.asRecord(evaluation?.test_summary);
			const details: string[] = [];
			if (typeof generation?.duration_ms === 'number') {
				details.push(`${generation.duration_ms} ms`);
			}
			if (typeof usage?.total_tokens === 'number') {
				details.push(`${usage.total_tokens} tokens`);
			}
			if (typeof testSummary?.total === 'number') {
				details.push(`${Number(testSummary.passed) || 0}/${testSummary.total} tests passed`);
			}
			const modelStages = new Set(['generate', 'regenerate', 'debug_fix', 'plan', 'tests']);
			const category: VisualLogCategory = event.stage === 'evaluate'
				? 'evaluation'
				: modelStages.has(event.stage) ? 'model' : 'workflow';
			additions.push({
				id,
				timestamp: event.created_at,
				sessionId: session.session_id,
				category,
				level: event.status === 'failed' ? 'error' : 'info',
				event: `${event.stage || 'workflow'}_${event.status || 'ready'}`,
				message: this.cleanMessage([event.title, event.message, details.join(' · ')].filter(Boolean).join(' · '))
			});
		}
		for (const rawEvent of session.study_events ?? []) {
			const studyEvent = this.asRecord(rawEvent);
			if (!studyEvent) {
				continue;
			}
			const sourceId = typeof studyEvent.id === 'string'
				? studyEvent.id
				: `${String(studyEvent.created_at || 'unknown')}:${String(studyEvent.event_type || 'interaction')}`;
			const id = `interaction:${session.session_id}:${sourceId}`;
			if (this.knownIds.has(id)) {
				continue;
			}
			const eventType = typeof studyEvent.event_type === 'string' ? studyEvent.event_type : 'interaction';
			const data = this.asRecord(studyEvent.data);
			const action = typeof data?.action === 'string' ? data.action : '';
			const reason = typeof data?.reason === 'string' ? data.reason : '';
			additions.push({
				id,
				timestamp: typeof studyEvent.created_at === 'string' ? studyEvent.created_at : new Date().toISOString(),
				sessionId: session.session_id,
				category: 'interaction',
				level: 'info',
				event: eventType,
				message: this.cleanMessage([eventType, action, reason].filter(Boolean).join(' · '))
			});
		}
		this.append(additions);
	}

	public recordExtension(level: BridgeLogLevel, text: string, sessionId?: string): void {
		this.append([{
			id: `extension:${Date.now()}:${randomBytes(6).toString('hex')}`,
			timestamp: new Date().toISOString(),
			sessionId: sessionId ?? null,
			category: 'extension',
			level: level === 'error' || level === 'stderr' ? 'error' : 'info',
			event: 'extension_message',
			message: this.cleanMessage(text)
		}]);
	}

	public latest(limit = 500): VisualLogEntry[] {
		const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
		return this.entries.slice(-safeLimit).reverse();
	}

	public async flush(): Promise<void> {
		await this.writeQueue;
	}

	private asRecord(value: unknown): Record<string, unknown> | undefined {
		return value && typeof value === 'object' ? value as Record<string, unknown> : undefined;
	}

	private cleanMessage(value: string): string {
		return String(value || '')
			.replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, '$1 [redacted]')
			.replace(/([?&](?:api[_-]?key|token|secret|password)=)[^&\s]+/gi, '$1[redacted]')
			.replace(/((?:api[_-]?key|token|secret|password)\s*[:=]\s*)[^\s,;]+/gi, '$1[redacted]')
			.slice(0, 4096);
	}

	private append(additions: VisualLogEntry[]): void {
		const unique = additions.filter((entry) => !this.knownIds.has(entry.id));
		if (unique.length === 0) {
			return;
		}
		for (const entry of unique) {
			this.knownIds.add(entry.id);
			this.entries.push(entry);
		}
		this.prune();
		const snapshot = this.serializeWithinLimit();
		this.writeQueue = this.writeQueue.then(async () => {
			await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
			const temporary = `${this.filePath}.tmp`;
			await fs.promises.writeFile(temporary, snapshot, 'utf8');
			await fs.promises.rename(temporary, this.filePath);
		}).catch((error) => {
			this.outputChannel.appendLine(`[visual logs] Failed to save history: ${String(error)}`);
		});
	}

	private prune(): void {
		const cutoff = Date.now() - PersistentVisualLogStore.maxAgeMs;
		this.entries = this.entries.filter((entry) => {
			const timestamp = Date.parse(entry.timestamp);
			return Number.isNaN(timestamp) || timestamp >= cutoff;
		}).slice(-PersistentVisualLogStore.maxEntries);
		this.knownIds = new Set(this.entries.map((entry) => entry.id));
	}

	private serializeWithinLimit(): string {
		let entries = this.entries.slice();
		let serialized = '';
		do {
			const payload: PersistedLogHistory = {
				schemaVersion: 1,
				updatedAt: new Date().toISOString(),
				entries
			};
			serialized = `${JSON.stringify(payload, null, 2)}\n`;
			if (Buffer.byteLength(serialized, 'utf8') <= PersistentVisualLogStore.maxFileBytes || entries.length === 0) {
				break;
			}
			entries = entries.slice(Math.max(1, Math.ceil(entries.length * 0.1)));
		} while (entries.length > 0);
		if (entries.length !== this.entries.length) {
			this.entries = entries;
			this.knownIds = new Set(entries.map((entry) => entry.id));
		}
		return serialized;
	}
}

class AdacoderChatPanel implements vscode.WebviewViewProvider {
	public static readonly viewType = `${EXTENSION_ID}.sidebarView`;
	private static readonly containerCommand = `workbench.view.extension.${EXTENSION_ID}-sidebar`;
	public static currentPanel: AdacoderChatPanel | undefined;

	private readonly providerDisposable: vscode.Disposable;
	private view: vscode.WebviewView | undefined;
	private readonly disposables: vscode.Disposable[] = [];
	private readonly viewDisposables: vscode.Disposable[] = [];
	private readonly backendServer: BackendServerManager;
	private readonly visualLogStore: PersistentVisualLogStore;
	private readonly sessionSnapshotStore: SessionSnapshotStore<BackendSessionState, ResumeState>;
	private running = false;
	private interruptRequested = false;
	private pollingSession = false;
	private sessionPollHandle: ReturnType<typeof setInterval> | undefined;
	private lastSessionSnapshot = '';
	private profiles: Profile[] = [];
	private activeProfileId = '';
	private preferredPage: 'task' | 'settings' | 'tests' = 'task';
	private pendingProblem = '';
	private pendingTestText = '';
	private pendingTestReveal = true;
	private studyParticipantId = '';
	private activeStudyTaskId = '';
	private studyTaskEnded = false;
	private studyTestSource = '';
	private studyAssignedConditions = new Map<string, RunRequest['executionMode']>();
	private studyTaskSetVersion: string | number = 1;
	private studyTaskSetHash = '';
	private studyBuildHash = '';
	private studyLogQueue: Promise<void> = Promise.resolve();
	private lastStudySnapshot = '';
	private archivedSessions: BackendSessionState[] = [];
	private restoredSessionId = '';
	private activeSession: BackendSessionState | undefined;
	private workflowMode: RunRequest['executionMode'] = 'continue';
	private interactiveState: InteractionState = 'idle';
	private resumeState: ResumeState | undefined;
	private activeOperation: OperationContext | undefined;
	private lastEditorSelection = '';
	private environmentCheck: EnvironmentCheckResult = {
		status: 'checking',
		items: [],
		checkedAt: ''
	};
	private studyTasks: UserStudyTask[] = [];
	private promptLanguage: 'en' | 'zh-CN' = 'en';

	private constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly outputChannel: vscode.OutputChannel
	) {
		this.backendServer = new BackendServerManager(context, outputChannel);
		this.visualLogStore = new PersistentVisualLogStore(context, outputChannel);
		this.sessionSnapshotStore = new SessionSnapshotStore<BackendSessionState, ResumeState>(context, getWorkspaceRootPath());
		this.captureEditorSelection(vscode.window.activeTextEditor);
		this.disposables.push(
			vscode.window.onDidChangeActiveTextEditor((editor) => this.captureEditorSelection(editor)),
			vscode.window.onDidChangeTextEditorSelection((event) => this.captureEditorSelection(event.textEditor))
		);
		this.providerDisposable = vscode.window.registerWebviewViewProvider(AdacoderChatPanel.viewType, this, {
			webviewOptions: {
				retainContextWhenHidden: true
			}
		});
		this.context.subscriptions.push(this.providerDisposable);
	}

	public static async createOrShow(
		context: vscode.ExtensionContext,
		outputChannel: vscode.OutputChannel
	): Promise<AdacoderChatPanel> {
		if (AdacoderChatPanel.currentPanel) {
			return AdacoderChatPanel.currentPanel;
		}

		AdacoderChatPanel.currentPanel = new AdacoderChatPanel(context, outputChannel);
		await AdacoderChatPanel.currentPanel.initialize(context);
		return AdacoderChatPanel.currentPanel;
	}

	public async reveal(): Promise<void> {
		await vscode.commands.executeCommand(AdacoderChatPanel.containerCommand);
		try {
			await vscode.commands.executeCommand(`${AdacoderChatPanel.viewType}.focus`);
		} catch {
			// Ignore focus command failures on older VS Code versions.
		}
	}

	public async disposeRuntime(): Promise<void> {
		this.stopSessionPolling();
		if (this.activeSession?.session_id && this.activeStudyTaskId && !this.studyTaskEnded) {
			await this.recordStudyEvent({
				eventType: 'task_end',
				metadata: { reason: 'extension_deactivated', passed: this.activeSession.passed }
			});
			this.studyTaskEnded = true;
			await this.persistStudySnapshot('extension_deactivated', true);
		}
		await this.studyLogQueue;
		await this.visualLogStore.flush();
		try { await this.sessionSnapshotStore.flush(); }
		catch (error) { this.outputChannel.appendLine(`[session snapshots] Flush failed: ${String(error)}`); }
		this.backendServer.stop();
		while (this.disposables.length > 0) {
			this.disposables.pop()?.dispose();
		}
	}

	public showTaskPage(): void {
		this.preferredPage = 'task';
		this.postMessage({ type: 'switchPage', page: 'task' });
	}

	public showSettingsPage(): void {
		this.preferredPage = 'settings';
		this.postMessage({ type: 'switchPage', page: 'settings' });
	}

	public showTestsPage(): void {
		this.preferredPage = 'tests';
		this.postMessage({ type: 'switchPage', page: 'tests' });
	}

	public async selectPythonInterpreter(): Promise<void> {
		const selected = await choosePythonInterpreter(this.context);
		if (!selected) {
			return;
		}
		await getExtensionConfiguration().update('pythonPath', selected, getConfigurationTarget());
		this.backendServer.stop();
		this.appendUiLog('info', `Python interpreter selected: ${selected}`);
		await this.checkEnvironment();
	}

	public prefillProblem(problem: string, mode: SelectionWriteMode = 'replace'): void {
		this.pendingProblem = mode === 'append'
			? appendDraftText(this.pendingProblem, problem)
			: problem;
		this.postMessage({
			type: 'prefillProblem',
			problem,
			mode
		});
	}

	public setTestText(testText: string, mode: SelectionWriteMode = 'replace', reveal = true): void {
		this.pendingTestText = mode === 'append'
			? appendDraftText(this.pendingTestText, testText)
			: testText;
		this.pendingTestReveal = reveal;
		this.postMessage({
			type: 'prefillTestText',
			testText,
			mode,
			reveal
		});
	}

	private captureEditorSelection(editor: vscode.TextEditor | undefined): void {
		if (!editor || editor.selection.isEmpty) {
			return;
		}
		const selected = editor.document.getText(editor.selection);
		if (selected.trim()) {
			this.lastEditorSelection = selected;
		}
	}

	private currentOrCachedEditorSelection(): string {
		const selected = getSelectedText();
		if (selected) {
			this.lastEditorSelection = selected;
			return selected;
		}
		return this.lastEditorSelection;
	}

	public async runWorkflow(context: vscode.ExtensionContext, request: RunRequest): Promise<void> {
		await this.executeWorkflow(context, request);
	}

	public async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
			this.view = webviewView;
			webviewView.webview.options = {
				enableScripts: true,
				localResourceRoots: [
					vscode.Uri.joinPath(this.context.extensionUri, 'media'),
					vscode.Uri.joinPath(this.context.extensionUri, 'node_modules')
				]
			};
		webviewView.webview.html = getChatHtml(webviewView.webview, this.context.extensionUri);

		this.clearViewDisposables();
		webviewView.webview.onDidReceiveMessage((message: unknown) => {
			void this.handleMessage(this.context, message);
		}, null, this.viewDisposables);

		webviewView.onDidDispose(() => {
			this.view = undefined;
			this.clearViewDisposables();
		}, null, this.viewDisposables);

		await this.postState();
		this.postMessage({ type: 'switchPage', page: this.preferredPage });
		if (this.pendingProblem) {
			this.postMessage({ type: 'prefillProblem', problem: this.pendingProblem });
		}
		if (this.pendingTestText) {
			this.postMessage({
				type: 'prefillTestText',
				testText: this.pendingTestText,
				reveal: this.pendingTestReveal
			});
		}
	}

	private async initialize(context: vscode.ExtensionContext): Promise<void> {
		this.archivedSessions = context.workspaceState.get<BackendSessionState[]>('adaassist.archivedSessions.v1', []).filter(item => Boolean(item?.session_id));
		await this.visualLogStore.initialize();
		await this.sessionSnapshotStore.refreshIndex();
		await this.loadProfiles(context);
		this.loadUserStudyTasks();
	}

	private clearViewDisposables(): void {
		while (this.viewDisposables.length > 0) {
			const disposable = this.viewDisposables.pop();
			disposable?.dispose();
		}
	}

	private postMessage(message: Record<string, unknown>): void {
		if (!this.view) {
			return;
		}
		void this.view.webview.postMessage(message);
	}

	private async persistActiveSessionSnapshot(): Promise<void> {
		if (!this.activeSession?.session_id) { return; }
		try {
			await this.sessionSnapshotStore.save({
				schemaVersion: 1,
				savedAt: new Date().toISOString(),
				session: this.activeSession,
				workflowMode: this.workflowMode,
				interactiveState: this.interactiveState,
				...(this.resumeState ? { resumeState: this.resumeState } : {})
			});
		} catch (error) {
			this.outputChannel.appendLine(`[session snapshots] Save failed: ${String(error)}`);
		}
	}

	private restorableSessionIds(): string[] {
		return [...new Set([
			...this.sessionSnapshotStore.knownSessionIds(),
			...this.archivedSessions.map(session => session.session_id)
		])];
	}

	private async postState(): Promise<void> {
		await this.persistActiveSessionSnapshot();
		this.visualLogStore.recordSession(this.activeSession);
		this.postMessage({
			type: 'state',
			profiles: this.profilesForWebview(),
			activeProfileId: this.activeProfileId,
			session: this.activeSession,
			workflowMode: this.workflowMode,
			interactiveState: this.interactiveState,
			canResume: Boolean(this.resumeState),
			canEditRequirement: this.canEditRequirement(),
			resumeLabel: this.resumeLabel(),
			interruptRequested: this.interruptRequested,
			running: this.running,
			operation: this.activeOperation,
			environmentCheck: this.environmentCheck,
			archivedSessions: this.archivedSessions,
			restorableSessionIds: this.restorableSessionIds(),
			restoredSessionId: this.restoredSessionId,
			pythonPath: getConfiguredPythonPath(this.context),
			pythonEnvironmentLabel: await getPythonEnvironmentDisplayLabel(this.context),
			inlineCompletion: getInlineCompletionSettings(),
			studyTasks: this.studyTasks,
			logEntries: this.visualLogStore.latest()
		});
		await this.persistStudySnapshot('state_update');
	}

	private loadUserStudyTasks(): void {
		const root = getWorkspaceRootPath();
		if (!root) {
			this.studyTasks = [];
			return;
		}
		try {
			const taskFileText = fs.readFileSync(path.join(root, '参与者任务.json'), 'utf8');
			this.studyTaskSetHash = createHash('sha256').update(taskFileText).digest('hex').slice(0, 12);
			const raw = JSON.parse(taskFileText) as {
				participant_id?: unknown;
				version?: unknown;
				tasks?: unknown[];
			};
			this.studyTaskSetVersion = typeof raw.version === 'string' || typeof raw.version === 'number'
				? raw.version
				: 1;
			const configuredParticipantId = typeof raw.participant_id === 'string'
				? raw.participant_id.trim()
				: '';
			const folderParticipantId = path.basename(root).match(/(?:^|[-_])(P\d+)(?:$|[-_])/i)?.[1] ?? '';
			let csvParticipantId = '';
			this.studyAssignedConditions.clear();
			try {
				const csvLines = fs.readFileSync(path.join(root, '记录表.csv'), 'utf8')
					.replace(/^\uFEFF/, '')
					.split(/\r?\n/)
					.filter((line) => line.trim());
				csvParticipantId = csvLines[1]?.split(',')[0]?.trim() ?? '';
				csvLines.slice(1).forEach((line) => {
					const columns = line.split(',');
					const taskId = columns[1]?.trim() ?? '';
					const rawCondition = columns[2]?.trim().toLowerCase() ?? '';
					if (taskId && (rawCondition === 'auto' || rawCondition === 'interactive' || rawCondition === 'continue')) {
						this.studyAssignedConditions.set(taskId, rawCondition === 'auto' ? 'auto' : 'continue');
					}
				});
			} catch {
				// The participant task file can also be used outside a prepared study folder.
			}
			this.studyParticipantId = configuredParticipantId || folderParticipantId || csvParticipantId;
			this.studyTasks = (Array.isArray(raw.tasks) ? raw.tasks : []).flatMap((task) => {
				if (!isRecord(task)) {
					return [];
				}
				const taskId = typeof task.task_id === 'string' ? task.task_id.trim() : '';
				const title = typeof task.title === 'string' ? task.title.trim() : '';
				const prompt = typeof task.prompt === 'string' ? task.prompt.trim() : '';
				const publicTests = typeof task.public_tests === 'string' ? task.public_tests.trim() : '';
				const difficulty = typeof task.difficulty === 'string' ? task.difficulty.trim() : '';
				const assignedCondition = task.assigned_condition === 'auto' || task.assigned_condition === 'interactive'
					? task.assigned_condition
					: undefined;
				const sequence = typeof task.sequence === 'number' && Number.isInteger(task.sequence)
					? task.sequence
					: undefined;
				if (taskId && assignedCondition) {
					this.studyAssignedConditions.set(taskId, assignedCondition === 'auto' ? 'auto' : 'continue');
				}
				return taskId && title && prompt && publicTests
					? [{
						task_id: taskId,
						title,
						prompt,
						public_tests: publicTests,
						...(difficulty ? { difficulty } : {}),
						...(assignedCondition ? { assigned_condition: assignedCondition } : {}),
						...(sequence !== undefined ? { sequence } : {})
					}]
					: [];
			});
		} catch {
			this.studyParticipantId = '';
			this.studyTaskSetVersion = 1;
			this.studyTaskSetHash = '';
			this.studyAssignedConditions.clear();
			this.studyTasks = [];
		}
	}

	private async checkEnvironment(): Promise<void> {
		this.environmentCheck = { status: 'checking', items: [], checkedAt: '' };
		await this.postState();

		const items: EnvironmentCheckItem[] = [];
		let pythonCommand: PythonCommand | undefined;
		try {
			pythonCommand = await resolvePythonCommand(this.context);
			const probe = await runCommand(pythonCommand, [
				'-c',
				'import sys, fastapi, uvicorn, openai; print(sys.version.split()[0])'
			]);
			if (probe.code !== 0) {
				throw new Error(compactProcessOutput(probe) || 'Python could not import the required backend packages.');
			}
			items.push({
				label: 'Python 与后端依赖',
				status: 'ready',
				detail: `${formatPythonCommand(pythonCommand)} (${probe.stdout.trim() || 'version unknown'})`
			});
		} catch (error) {
			items.push({
				label: 'Python 与后端依赖',
				status: 'failed',
				detail: error instanceof Error ? error.message : String(error)
			});
		}

		const backendPath = resolveBackendEntryPath(this.context);
		if (!fs.existsSync(backendPath)) {
			items.push({ label: '本地 FastAPI 后端', status: 'failed', detail: `未找到 ${backendPath}` });
		} else if (!pythonCommand) {
			items.push({ label: '本地 FastAPI 后端', status: 'failed', detail: 'Python 环境不可用，无法启动后端。' });
		} else {
			try {
				await this.backendServer.ensureStarted();
				items.push({
					label: '本地 FastAPI 后端',
					status: 'ready',
					detail: `已在 ${getBackendUrl()} 响应健康检查`
				});
			} catch (error) {
				items.push({
					label: '本地 FastAPI 后端',
					status: 'failed',
					detail: error instanceof Error ? error.message : String(error)
				});
			}
		}

		items.push(await this.checkModelEndpoint());
		const hasFailure = items.some((item) => item.status === 'failed');
		const hasWarning = items.some((item) => item.status === 'warning');
		this.environmentCheck = {
			status: hasFailure ? 'failed' : hasWarning ? 'warning' : 'ready',
			items,
			checkedAt: new Date().toLocaleTimeString()
		};
		await this.postState();
	}

	private async checkModelEndpoint(): Promise<EnvironmentCheckItem> {
		const profile = this.getActiveProfile();
		if (!profile) {
			return { label: '远端模型服务', status: 'failed', detail: '未选择 LLM 配置。' };
		}
		if (!profile.baseUrl.trim()) {
			return { label: '远端模型服务', status: 'failed', detail: '当前 LLM 配置缺少基础 URL。' };
		}
		if (profile.provider === 'claude') {
			return {
				label: '远端模型服务',
				status: 'warning',
				detail: 'Claude 配置不提供 /models 预检；将在首次请求时验证。'
			};
		}

		try {
			const baseUrl = profile.baseUrl.endsWith('/') ? profile.baseUrl : `${profile.baseUrl}/`;
			const headers: Record<string, string> = {};
			if (profile.apiKey) {
				headers.Authorization = `Bearer ${profile.apiKey}`;
			}
			const response = await fetch(new URL('models', baseUrl), {
				headers,
				signal: AbortSignal.timeout(8000)
			});
			if (!response.ok) {
				return {
					label: '远端模型服务',
					status: 'failed',
					detail: `${profile.baseUrl} 返回 HTTP ${response.status}`
				};
			}
			const payload = await response.json() as { data?: Array<{ id?: string }> };
			const modelExists = Array.isArray(payload.data) && payload.data.some((model) => model.id === profile.model);
			return modelExists
				? { label: '远端模型服务', status: 'ready', detail: `${profile.model} 可访问` }
				: { label: '远端模型服务', status: 'failed', detail: `服务可访问，但未找到模型 ${profile.model}` };
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			return { label: '远端模型服务', status: 'failed', detail: `${profile.baseUrl} 无法访问：${detail}` };
		}
	}

	private canEditRequirement(): boolean {
		return this.resumeState?.kind === 'tests-confirmation';
	}

	private resumeLabel(): string {
		if (!this.resumeState) {
			return '';
		}
		switch (this.resumeState.kind) {
			case 'tests-confirmation':
				return 'Please confirm your test file is ready. Open Tests to edit or confirm it.';
			case 'generation-tests':
				return 'Generated tests are waiting for review before code generation. Open Tests to edit or confirm them.';
			case 'code-review':
				return 'The generated code is ready for its first test run. Resume to run it now.';
			case 'auto':
				return this.interactiveState === 'await_auto_test_edit'
					? 'Auto workflow stopped. Edit tests if needed, then resume.'
					: 'Resume the auto workflow from the current progress.';
			default:
				return '';
		}
	}

	private clearResumeState(): void {
		this.resumeState = undefined;
	}


	private sessionSnapshot(session: BackendSessionState | undefined): string {
		if (!session) {
			return '';
		}
		return [
			session.session_id,
			session.updated_at,
			String(session.events.length),
			session.current_stage,
			session.status,
			String(session.resolved_test_code.length),
			String(session.current_code.length),
			String(session.current_plan.length)
		].join(':');
	}

	private startSessionPolling(): void {
		if (this.sessionPollHandle) {
			return;
		}
		this.lastSessionSnapshot = this.sessionSnapshot(this.activeSession);
		this.sessionPollHandle = setInterval(() => {
			void this.refreshActiveSession();
		}, SESSION_POLL_INTERVAL_MS);
	}

	private stopSessionPolling(): void {
		if (this.sessionPollHandle) {
			clearInterval(this.sessionPollHandle);
			this.sessionPollHandle = undefined;
		}
		this.pollingSession = false;
	}

	private async refreshActiveSession(force = false): Promise<void> {
		if (!this.activeSession?.session_id || this.pollingSession) {
			return;
		}

		this.pollingSession = true;
		try {
			const currentSessionId = this.activeSession.session_id;
			const payload = await this.backendServer.request<BackendResponse>(`/api/sessions/${currentSessionId}`);
			const session = payload.session;
			if (!session || session.session_id !== currentSessionId
				|| this.activeSession?.session_id !== currentSessionId
				|| session.events.length < this.activeSession.events.length) {
				return;
			}

			const snapshot = this.sessionSnapshot(session);
			const changed = force || snapshot !== this.lastSessionSnapshot;
			this.activeSession = session;
			this.lastSessionSnapshot = snapshot;

			if (changed) {
				await this.postState();
				this.postSessionState();
			}
		} catch {
			// Ignore transient polling failures while a workflow action is running.
		} finally {
			this.pollingSession = false;
		}
	}

	private getActiveProfile(): Profile | undefined {
		return this.profiles.find((profile) => profile.id === this.activeProfileId);
	}

	private profilesForWebview(): ProfileView[] {
		return this.profiles.map((profile) => ({
			id: profile.id,
			name: profile.name,
			baseUrl: profile.baseUrl,
			model: profile.model,
			provider: profile.provider,
			maxTokens: normalizeWorkflowMaxTokens(profile.maxTokens),
			apiKeyConfigured: Boolean(profile.apiKey)
		}));
	}

	private async handleMessage(context: vscode.ExtensionContext, message: unknown): Promise<void> {
		if (!isRecord(message) || typeof message.type !== 'string') {
			return;
		}

		try {
			switch (message.type) {
				case 'ready': {
					this.promptLanguage = message.uiLanguage === 'en' ? 'en' : 'zh-CN';
					await this.loadProfiles(context);
					this.loadUserStudyTasks();
					await this.postState();
					await this.checkEnvironment();
					break;
				}
				case 'setUiLanguage': {
					this.promptLanguage = message.uiLanguage === 'en' ? 'en' : 'zh-CN';
					break;
				}
				case 'checkEnvironment': {
					await this.checkEnvironment();
					break;
				}
				case 'saveInlineCompletionSettings': {
					await saveInlineCompletionSettings(message);
					await this.postState();
					this.appendUiLog('info', `Inline completion settings saved: model=${getInlineCompletionSettings().model}`);
					break;
				}
				case 'selectPythonInterpreter': {
					await this.selectPythonInterpreter();
					break;
				}
					case 'switchProfile': {
						const profileId = typeof message.profileId === 'string' ? message.profileId : '';
						if (!profileId) {
							break;
						}
						const exists = this.profiles.some((profile) => profile.id === profileId);
						if (!exists) {
							break;
						}
						this.activeProfileId = profileId;
						await this.persistProfiles(context);
						await this.postState();
						await this.checkEnvironment();
						break;
					}
					case 'saveProfile': {
						await this.saveProfile(context, message);
						break;
					}
					case 'deleteProfile': {
						await this.deleteProfile(context, message);
						break;
					}
					case 'runWorkflow': {
						const problem = typeof message.problem === 'string' ? message.problem : '';
						const testText = typeof message.testText === 'string' ? message.testText : '';
						const testMode: TestMode = message.testMode === 'generate' ? 'generate' : 'manual';
						const contextEnabled = typeof message.contextEnabled === 'boolean' ? message.contextEnabled : false;
							const maxRounds = typeof message.maxRounds === 'number' ? message.maxRounds : 10;
							const executionMode = message.executionMode === 'auto' ? 'auto' : 'continue';
							const resolvedTestCode = typeof message.resolvedTestCode === 'string' ? message.resolvedTestCode : undefined;
							const testDescription = typeof message.testDescription === 'string' ? message.testDescription : undefined;
							const additionalInstruction = typeof message.additionalInstruction === 'string' ? message.additionalInstruction : undefined;
							await this.executeWorkflow(context, {
								problem,
								testText,
								testMode,
								contextEnabled,
								maxRounds,
								executionMode,
								resolvedTestCode,
								testDescription,
								additionalInstruction
							});
						break;
					}
				case 'interruptWorkflow': {
					await this.interruptWorkflow();
					break;
				}
				case 'resumeWorkflow': {
					await this.resumeWorkflow(context, this.parseActionRequest(message));
					break;
				}
				case 'continueWithPlan': {
					const request = this.parseActionRequest(message);
					await this.continueWithPlan(context, request);
					break;
				}
				case 'continueWithFeedback': {
					const request = this.parseActionRequest(message);
					await this.continueWithFeedback(context, request);
					break;
				}
				case 'restartInteractiveWorkflow': {
					const request = this.parseActionRequest(message);
					await this.restartInteractiveWorkflow(context, request);
					break;
				}
				case 'stopInteractiveWorkflow': {
					await this.stopInteractiveWorkflow();
					break;
				}
				case 'runWorkflowAction': {
					const action = typeof message.action === 'string' ? message.action : '';
					await this.runWorkflowAction(context, {
						...this.parseActionRequest(message),
						action
					});
					break;
				}
				case 'updateWorkflowPlan': {
					const plan = typeof message.plan === 'string' ? message.plan : '';
					await this.updateWorkflowPlan(context, plan);
					break;
				}
					case 'updateResolvedTests': {
						const resolvedTestCode = typeof message.resolvedTestCode === 'string' ? message.resolvedTestCode : '';
						const requestId = typeof message.requestId === 'string' ? message.requestId : undefined;
						const testDescription = typeof message.testDescription === 'string' ? message.testDescription : undefined;
						await this.updateResolvedTests(context, resolvedTestCode, testDescription, requestId);
						break;
					}
					case 'addRequirement':
					case 'submitWorkflowGuidance':
					case 'submitGuidance': {
						const request = this.parseActionRequest(message);
						const guidance = typeof message.guidance === 'string'
							? message.guidance
							: request.additionalInstruction ?? '';
						await this.submitWorkflowGuidance(context, {
							...request,
							additionalInstruction: guidance
						});
						break;
					}
				case 'retestGeneratedCode': {
					const request = this.parseActionRequest(message);
					await this.retestGeneratedCode(context, request);
					break;
				}
				case 'recordStudyEvent': {
					await this.recordStudyEvent(message);
					break;
				}
				case 'restoreArchivedSession': {
                    const sessionId = typeof message.sessionId === 'string' ? message.sessionId : '';
                    await this.restoreArchivedSession(sessionId);
                    break;
                }
                case 'clearWorkflowSession': {
					await this.clearWorkflowSession(message.reason === 'user_confirmed' ? 'user_confirmed' : 'new_task');
					break;
				}
					case 'useEditorSelection': {
						const target = message.target === 'tests' ? 'tests' : 'problem';
						const mode: SelectionWriteMode = message.mode === 'append' ? 'append' : 'replace';
						const selection = this.currentOrCachedEditorSelection();
						if (!selection) {
							this.appendUiLog('error', 'No editor selection found. Select text in an editor and try again.');
							this.postMessage({
								type: 'selectionResult',
								ok: false,
								target,
								mode,
								message: 'No editor selection found.'
							});
							return;
						}
						if (target === 'tests') {
							this.setTestText(selection, mode);
						} else {
							this.prefillProblem(selection, mode);
						}
						this.postMessage({
							type: 'selectionResult',
							ok: true,
							target,
							mode,
							length: selection.length
						});
						break;
					}
				case 'loadStudyTask': {
					const taskId = typeof message.taskId === 'string' ? message.taskId : '';
					const task = this.studyTasks.find((item) => item.task_id === taskId);
					if (task) {
						this.activeStudyTaskId = task.task_id;
						this.studyTaskEnded = false;
						this.studyTestSource = 'fixed_public';
						this.lastStudySnapshot = '';
						this.prefillProblem(task.prompt);
						this.setTestText(task.public_tests, 'replace', false);
						this.appendUiLog('info', `Study task ${task.task_id} loaded with its fixed public tests.`);
					}
					break;
				}
				case 'openGeneratedCode': {
					const code = typeof message.code === 'string' ? message.code : '';
					if (code) {
						await openGeneratedCode(code);
					}
					break;
				}
				case 'insertGeneratedCode': {
					const code = typeof message.code === 'string' ? message.code : '';
					if (code) {
						await insertGeneratedCode(code);
						if (this.activeStudyTaskId && this.activeSession && !this.studyTaskEnded) {
							await this.recordStudyEvent({
								eventType: 'task_end',
								metadata: { reason: 'accepted_result', passed: this.activeSession.passed }
							});
							this.studyTaskEnded = true;
						}
					}
					break;
				}
				case 'openProfileConfig': {
					await openProfileConfigFile(context);
					break;
				}
				case 'reloadProfiles': {
					await this.loadProfiles(context);
					await this.postState();
					this.appendUiLog('info', 'Profiles reloaded from config file.');
					break;
				}
				case 'showOutput': {
					this.outputChannel.show(true);
					break;
				}
				case 'requestLogHistory': {
					this.visualLogStore.recordSession(this.activeSession);
					this.postMessage({ type: 'logHistory', entries: this.visualLogStore.latest() });
					break;
				}
				case 'clientError': {
					const reason = typeof message.reason === 'string' ? message.reason : 'Unknown webview error.';
					this.outputChannel.appendLine(`[webview error] ${reason}`);
					break;
				}
				default:
					break;
			}
			} catch (error) {
				const messageText = error instanceof Error ? error.message : String(error);
				this.appendUiLog('error', `Panel action failed: ${messageText}`);
				this.postOperationError(messageText, {
					scope: message.type === 'updateResolvedTests' ? 'tests' : 'workflow',
					action: message.type
				}, 'Panel action failed');
			}
	}

	private async saveProfile(context: vscode.ExtensionContext, message: Record<string, unknown>): Promise<void> {
		const requestedId = typeof message.id === 'string' ? message.id : '';
		const name = typeof message.name === 'string' ? message.name.trim() : '';
		const baseUrl = typeof message.baseUrl === 'string' ? message.baseUrl.trim() : '';
		const modelRaw = typeof message.model === 'string' ? message.model.trim() : '';
		const model = modelRaw || DEFAULT_LLM_MODEL;
		const provider = normalizeProvider(typeof message.provider === 'string' ? message.provider : 'other');
		const apiKey = typeof message.apiKey === 'string' ? message.apiKey.trim() : '';
		const maxTokens = message.maxTokens;
		if (typeof maxTokens !== 'number' || !Number.isInteger(maxTokens)
			|| maxTokens < 128 || maxTokens > MAX_WORKFLOW_OUTPUT_TOKENS) {
			void vscode.window.showErrorMessage('最大输出 Tokens 必须为 128–32768 之间的整数。');
			return;
		}

		if (!name) {
			this.appendUiLog('error', 'Profile name is required.');
			return;
		}

		const existingIndex = this.profiles.findIndex((profile) => profile.id === requestedId);
		if (existingIndex >= 0) {
			const existingProfile = this.profiles[existingIndex];
			const nextApiKey = apiKey || existingProfile.apiKey;
			this.profiles[existingIndex] = {
				...existingProfile,
				name,
				baseUrl,
				model,
				provider,
				maxTokens,
				apiKey: nextApiKey
			};
			if (apiKey) {
				await storeProfileApiKey(context, requestedId, apiKey, this.outputChannel);
			}
			this.activeProfileId = requestedId;
		} else {
			const id = createProfileId();
			if (apiKey) {
				await storeProfileApiKey(context, id, apiKey, this.outputChannel);
			}
			this.profiles.push({
				id,
				name,
				baseUrl,
				model,
				provider,
				maxTokens,
				apiKey
			});
			this.activeProfileId = id;
		}

		await this.persistProfiles(context);
		// Applying the user's new output limit should not require discarding
		// the current code, tests or plan. Never change the model/endpoint
		// of an already-running session implicitly.
		const active = this.activeSession;
		const matchingSession = active?.session_id
			&& active.llm?.model === model
			&& active.llm?.provider === provider
			&& (active.llm?.base_url ?? '') === baseUrl;
		if (matchingSession && !this.running
			&& active?.llm?.max_tokens !== maxTokens) {
			try {
				const response = await this.backendServer.request<BackendResponse>(
					`/api/sessions/${encodeURIComponent(active.session_id)}`, {
						method: 'PATCH',
						body: JSON.stringify({ max_tokens: maxTokens })
					}
				);
				if (response.session) {
					this.activeSession = response.session;
					this.appendUiLog('info', `Updated active session output budget to ${maxTokens} tokens.`);
				}
			} catch (error) {
				const detail = error instanceof Error ? error.message : String(error);
				this.appendUiLog('error', `Profile saved, but current session token limit was not updated: ${detail}`);
				void vscode.window.showWarningMessage(
					'Profile 已保存，但当前 Session 的输出上限未更新；新建任务可使用新设置。'
				);
			}
		}
		await this.postState();
		await this.checkEnvironment();
		this.appendUiLog('info', `Profile saved: ${name}`);
	}

	private async deleteProfile(context: vscode.ExtensionContext, message: Record<string, unknown>): Promise<void> {
		const profileId = typeof message.id === 'string' ? message.id : '';
		if (!profileId) {
			this.appendUiLog('error', 'Missing profile id.');
			return;
		}

		if (this.profiles.length <= 1) {
			this.appendUiLog('error', 'At least one profile must be kept.');
			return;
		}

		const previousLength = this.profiles.length;
		this.profiles = this.profiles.filter((profile) => profile.id !== profileId);
		if (this.profiles.length === previousLength) {
			this.appendUiLog('error', 'Profile not found.');
			return;
		}

		if (this.activeProfileId === profileId) {
			this.activeProfileId = this.profiles[0]?.id ?? '';
		}

		await deleteProfileApiKey(context, profileId, this.outputChannel);
		await this.persistProfiles(context);
		await this.postState();
		this.appendUiLog('info', 'Profile deleted.');
	}

	private validateRunRequest(request: RunRequest): Profile | undefined {
		const profile = this.getActiveProfile();
		if (!profile) {
			this.appendUiLog('error', 'No active profile. Please create one in Settings.');
			this.showSettingsPage();
			return undefined;
		}

		const problem = request.problem.trim();
		const testText = request.testText.trim();
		if (!problem) {
			this.appendUiLog('error', 'Problem input is required.');
			return undefined;
		}
		if (!profile.apiKey && profile.provider !== 'ollama' && profile.provider !== 'vllm') {
			this.appendUiLog('error', `Profile "${profile.name}" does not have an API key.`);
			this.showSettingsPage();
			return undefined;
		}

		return profile;
	}

	private buildSessionArgs(profile: Profile, request: RunRequest): BackendSessionRequest {
		return {
			problem: request.problem.trim(),
			test_text: request.testText.trim(),
			test_mode: request.testMode,
			llm: profileToRequestConfig(profile),
			context_enabled: request.contextEnabled,
			max_rounds: request.maxRounds,
			resolved_test_code: request.testMode === 'generate' ? request.resolvedTestCode?.trim() : undefined,
			test_description: request.testDescription?.trim() || undefined,
			additional_instruction: request.additionalInstruction?.trim() || undefined,
			prompt_language: this.promptLanguage
		};
	}

	private postSessionState(stageResult?: BackendActionResult): void {
		void this.persistActiveSessionSnapshot();
		this.visualLogStore.recordSession(this.activeSession);
		this.postMessage({
			type: 'workflowSession',
			session: this.activeSession,
			archivedSessions: this.archivedSessions,
			restorableSessionIds: this.restorableSessionIds(),
			restoredSessionId: this.restoredSessionId,
			stageResult,
			workflowMode: this.workflowMode,
			interactiveState: this.interactiveState,
			canResume: Boolean(this.resumeState),
			canEditRequirement: this.canEditRequirement(),
			resumeLabel: this.resumeLabel(),
			interruptRequested: this.interruptRequested,
			logEntries: this.visualLogStore.latest()
		});
	}

	private parseActionRequest(message: Record<string, unknown>): {
		problem?: string;
		testText?: string;
		testMode?: TestMode;
		useErrorFeedback: boolean;
		contextEnabled?: boolean;
		maxRounds?: number;
		planOverride?: string;
		executionMode?: 'auto' | 'continue';
		resolvedTestCode?: string;
		codeOverride?: string;
		codeEventId?: string;
		testDescription?: string;
		additionalInstruction?: string;
	} {
		const testMode: TestMode | undefined = message.testMode === 'generate'
			? 'generate'
			: message.testMode === 'manual'
				? 'manual'
				: undefined;
		const executionMode = message.executionMode === 'continue' ? 'continue' : message.executionMode === 'auto' ? 'auto' : undefined;

		return {
			problem: typeof message.problem === 'string' ? message.problem : undefined,
			testText: typeof message.testText === 'string' ? message.testText : undefined,
			testMode,
			useErrorFeedback: typeof message.useErrorFeedback === 'boolean' ? message.useErrorFeedback : true,
			contextEnabled: typeof message.contextEnabled === 'boolean' ? message.contextEnabled : undefined,
			maxRounds: typeof message.maxRounds === 'number' ? message.maxRounds : undefined,
			planOverride: typeof message.planOverride === 'string' ? message.planOverride : undefined,
			executionMode,
			resolvedTestCode: typeof message.resolvedTestCode === 'string' ? message.resolvedTestCode : undefined,
			testDescription: typeof message.testDescription === 'string' ? message.testDescription : undefined,
			additionalInstruction: typeof message.additionalInstruction === 'string'
				? message.additionalInstruction
				: typeof message.guidance === 'string' ? message.guidance : undefined,
			codeOverride: typeof message.code === 'string'
				? message.code
				: typeof message.codeOverride === 'string'
					? message.codeOverride
					: undefined,
			codeEventId: typeof message.codeEventId === 'string' ? message.codeEventId : undefined
		};
	}

	private setRunState(running: boolean, label = '', operation?: OperationContext): void {
		if (running && operation) {
			this.activeOperation = operation;
		}
		const currentOperation = operation ?? this.activeOperation ?? { scope: 'workflow' as const, action: 'workflow' };
		const payload = {
			running,
			label,
			scope: currentOperation.scope,
			action: currentOperation.action,
			operation: currentOperation
		};
		// Keep the legacy event until all installed webviews understand operationState.
		this.postMessage({ type: 'runState', ...payload });
		this.postMessage({ type: 'operationState', ...payload });
		if (!running) {
			this.activeOperation = undefined;
		}
	}

	private postOperationError(
		message: string,
		operation: OperationContext,
		title = 'Workflow Error',
		retryable = true
	): void {
		this.postMessage({
			type: 'workflowError',
			title,
			message,
			reason: `${title}: ${message}`,
			scope: operation.scope,
			action: operation.action,
			retryable,
			operation
		});
	}

	private async interruptWorkflow(): Promise<void> {
		if (!this.running) {
			return;
		}

		this.interruptRequested = true;
		this.setRunState(true, 'Stopping after the current stage...');
		await this.postState();

		if (this.workflowMode === 'auto' && this.activeSession?.session_id) {
			try {
				await this.backendServer.fetch(`/api/sessions/${this.activeSession.session_id}/interrupt`, {
					method: 'POST'
				});
			} catch (error) {
				this.appendUiLog('error', `Failed to request interrupt: ${error instanceof Error ? error.message : String(error)}`);
			}
		}
	}

	private async continueAfterTestsConfirmation(
		_context: vscode.ExtensionContext,
		resumeState: Extract<ResumeState, { kind: 'tests-confirmation' }>,
		request: ActionRequestState
	): Promise<boolean> {
		return this.runGuarded('Continuing with the reviewed tests...', 'Resume failed', async () => {
			const runRequest = this.mergeReviewedRunRequest(resumeState.request, request);
			await this.saveReviewedSetupToSession(runRequest);
			this.workflowMode = runRequest.executionMode;
			this.interactiveState = 'idle';
			await this.postState();

			if (runRequest.executionMode === 'auto') {
				this.setRunState(true, 'Running the full workflow with the reviewed tests...');
				const payload = await this.invokeWorkflowAction({
					action: 'auto_resume',
					useErrorFeedback: true,
					contextEnabled: runRequest.contextEnabled,
					maxRounds: runRequest.maxRounds,
					resolvedTestCode: runRequest.resolvedTestCode,
					testDescription: runRequest.testDescription,
					additionalInstruction: runRequest.additionalInstruction
				});
				if (payload.stage_result?.interrupted) {
					this.resumeState = { kind: 'auto', request: runRequest };
					await this.postState();
				}
				this.interactiveState = payload.stage_result?.interrupted
					? 'await_auto_test_edit'
					: this.activeSession?.passed ? 'done' : 'idle';
				this.postSessionState(payload.stage_result);
				return;
			}

			this.setRunState(true, resumeState.restartAfterTests
				? 'Restarting from the requirement with the reviewed tests...'
				: 'Generating initial code with the reviewed tests...');
			const payload = await this.invokeWorkflowAction({
				action: resumeState.restartAfterTests ? 'restart' : 'generate',
				problem: runRequest.problem,
				testText: runRequest.testText,
				testMode: runRequest.testMode,
				useErrorFeedback: !resumeState.restartAfterTests,
				contextEnabled: runRequest.contextEnabled,
				maxRounds: runRequest.maxRounds,
				resolvedTestCode: runRequest.resolvedTestCode,
				testDescription: runRequest.testDescription,
				additionalInstruction: runRequest.additionalInstruction
			});
			if (payload.stage_result?.interrupted) {
				await this.pauseForCodeReview({
					problem: runRequest.problem,
					testText: runRequest.testText,
					testMode: runRequest.testMode,
					useErrorFeedback: true,
					contextEnabled: runRequest.contextEnabled,
					maxRounds: runRequest.maxRounds,
					resolvedTestCode: runRequest.resolvedTestCode,
					testDescription: runRequest.testDescription,
					additionalInstruction: runRequest.additionalInstruction
				}, 'The generated code is ready for its first test run. Resume to run it now.');
				return;
			}
			await this.evaluateReviewedCode({
				problem: runRequest.problem,
				testText: runRequest.testText,
				testMode: runRequest.testMode,
				useErrorFeedback: true,
					contextEnabled: runRequest.contextEnabled,
					maxRounds: runRequest.maxRounds,
					resolvedTestCode: runRequest.resolvedTestCode,
					testDescription: runRequest.testDescription,
					additionalInstruction: runRequest.additionalInstruction
			}, 'Evaluating the generated code...');
		}, { scope: 'workflow', action: 'resume_after_tests' });
	}

	private async continueAfterGenerationTestsReview(
		resumeState: Extract<ResumeState, { kind: 'generation-tests' }>,
		request: ActionRequestState
	): Promise<boolean> {
		return this.runGuarded('Continuing with the reviewed tests...', 'Resume failed', async () => {
			const actionRequest = this.mergeReviewedActionRequest(resumeState.request, request);
			await this.runReviewedGenerationAction(actionRequest, {
				action: resumeState.action,
				runLabel: resumeState.runLabel,
				useErrorFeedback: resumeState.useErrorFeedback,
				evaluationLabel: 'Evaluating the regenerated code...'
			});
		}, { scope: 'workflow', action: 'resume_after_generated_tests' });
	}

	private async runReviewedGenerationAction(
		actionRequest: ActionRequestState,
		options: {
			action: 'regenerate' | 'restart';
			runLabel: string;
			useErrorFeedback: boolean;
			evaluationLabel: string;
		}
	): Promise<void> {
		await this.saveReviewedSetupToSession({
			problem: actionRequest.problem ?? this.activeSession?.problem_statement ?? '',
			testText: actionRequest.testText ?? '',
			testMode: actionRequest.testMode ?? 'manual',
			contextEnabled: actionRequest.contextEnabled ?? this.activeSession?.context_enabled ?? false,
			maxRounds: actionRequest.maxRounds ?? this.activeSession?.max_rounds ?? 10,
			executionMode: 'continue',
			resolvedTestCode: actionRequest.resolvedTestCode,
			testDescription: actionRequest.testDescription,
			additionalInstruction: actionRequest.additionalInstruction
		});
		this.workflowMode = 'continue';
		this.interactiveState = 'idle';
		this.clearResumeState();
		await this.postState();

		this.setRunState(true, options.runLabel);
		const payload = await this.invokeWorkflowAction({
			action: options.action,
			problem: actionRequest.problem,
			testText: actionRequest.testText,
			testMode: actionRequest.testMode,
			useErrorFeedback: options.useErrorFeedback,
			contextEnabled: actionRequest.contextEnabled,
				maxRounds: actionRequest.maxRounds,
				planOverride: actionRequest.planOverride,
				resolvedTestCode: actionRequest.resolvedTestCode,
				testDescription: actionRequest.testDescription,
				additionalInstruction: actionRequest.additionalInstruction
		});
		if (payload.stage_result?.interrupted) {
			await this.pauseForCodeReview(actionRequest, 'The generated code is ready for its first test run. Resume to run it now.');
			return;
		}
		await this.evaluateReviewedCode(actionRequest, options.evaluationLabel);
	}

	private async evaluateReviewedCode(actionRequest: ActionRequestState, label: string): Promise<void> {
		await this.saveReviewedSetupToSession({
			problem: actionRequest.problem ?? this.activeSession?.problem_statement ?? '',
			testText: actionRequest.testText ?? '',
			testMode: actionRequest.testMode ?? 'manual',
			contextEnabled: actionRequest.contextEnabled ?? this.activeSession?.context_enabled ?? false,
			maxRounds: actionRequest.maxRounds ?? this.activeSession?.max_rounds ?? 10,
			executionMode: 'continue',
			resolvedTestCode: actionRequest.resolvedTestCode,
			testDescription: actionRequest.testDescription,
			additionalInstruction: actionRequest.additionalInstruction
		});
		this.workflowMode = 'continue';
		this.interactiveState = 'idle';
		await this.postState();

		this.setRunState(true, label);
		await this.invokeWorkflowAction({
			action: 'evaluate',
			problem: actionRequest.problem,
			testText: actionRequest.testText,
			testMode: actionRequest.testMode,
			useErrorFeedback: actionRequest.useErrorFeedback,
			contextEnabled: actionRequest.contextEnabled,
			maxRounds: actionRequest.maxRounds,
				resolvedTestCode: actionRequest.resolvedTestCode,
				codeOverride: actionRequest.codeOverride,
				codeEventId: actionRequest.codeEventId,
				testDescription: actionRequest.testDescription,
				additionalInstruction: actionRequest.additionalInstruction
		});

		this.interruptRequested = false;
		this.interactiveState = this.activeSession?.passed ? 'done' : 'await_failure_choice';
		this.postSessionState();
	}

	private async continueAfterCodeReview(
		resumeState: Extract<ResumeState, { kind: 'code-review' }>,
		request: ActionRequestState
	): Promise<boolean> {
		return this.runGuarded('Running evaluation with the reviewed code and tests...', 'Resume failed', async () => {
			const actionRequest = this.mergeReviewedActionRequest(resumeState.request, request);
			await this.evaluateReviewedCode(actionRequest, 'Evaluating with the reviewed code and tests...');
		}, { scope: 'workflow', action: 'resume_after_code_review' });
	}

	private reviewedProblem(request: ActionRequestState, fallback: { problem?: string }): string {
		const problem = (
			request.problem
			?? fallback.problem
			?? this.activeSession?.problem_statement
			?? ''
		).trim();
		if (!problem) {
			throw new Error('Requirement is required before continuing.');
		}
		return problem;
	}

	private reviewedTestCode(request: ActionRequestState, fallback: { testText?: string; resolvedTestCode?: string }): string {
		const reviewedTestText = (request.testText ?? fallback.testText ?? '').trim();
		const reviewedResolvedTests = (
			request.resolvedTestCode
			?? fallback.resolvedTestCode
			?? this.activeSession?.resolved_test_code
			?? ''
		).trim();
		return reviewedTestText || reviewedResolvedTests;
	}

	private mergeReviewedRunRequest(base: RunRequest, request: ActionRequestState): RunRequest {
		const reviewedTestCode = this.reviewedTestCode(request, base);
		return {
			...base,
			problem: this.reviewedProblem(request, base),
			testText: reviewedTestCode,
			testMode: reviewedTestCode ? 'manual' : 'generate',
			resolvedTestCode: undefined,
			testDescription: request.testDescription ?? base.testDescription,
			additionalInstruction: request.additionalInstruction ?? base.additionalInstruction
		};
	}

	private mergeReviewedActionRequest(base: ActionRequestState, request: ActionRequestState): ActionRequestState {
		const reviewedTestCode = this.reviewedTestCode(request, base);
		return {
			...base,
			problem: this.reviewedProblem(request, base),
			testText: reviewedTestCode,
			testMode: reviewedTestCode ? 'manual' : 'generate',
			resolvedTestCode: undefined,
			codeOverride: request.codeOverride ?? base.codeOverride,
			codeEventId: request.codeEventId ?? base.codeEventId,
			testDescription: request.testDescription ?? base.testDescription,
			additionalInstruction: request.additionalInstruction ?? base.additionalInstruction
		};
	}

	private async resumeWorkflow(context: vscode.ExtensionContext, request: ActionRequestState = { useErrorFeedback: true }): Promise<void> {
		if (!this.resumeState) {
			return;
		}

		const resumeState = this.resumeState;
		const previousInteractiveState = this.interactiveState;
		const previousWorkflowMode = this.workflowMode;
		this.resumeState = undefined;
		this.interruptRequested = false;
		await this.postState();
		let succeeded = false;

		if (resumeState.kind === 'tests-confirmation') {
			succeeded = await this.continueAfterTestsConfirmation(context, resumeState, request);
		} else if (resumeState.kind === 'generation-tests') {
			succeeded = await this.continueAfterGenerationTestsReview(resumeState, request);
		} else if (resumeState.kind === 'code-review') {
			succeeded = await this.continueAfterCodeReview(resumeState, request);
		} else if (resumeState.kind === 'auto') {
			succeeded = await this.runGuarded('Resuming auto workflow...', 'Resume failed', async () => {
				const reviewedTestCode = this.reviewedTestCode(request, resumeState.request);
				const currentTestCode = (
					this.activeSession?.test_text
					|| this.activeSession?.resolved_test_code
					|| ''
				).trim();
				const testsChanged = Boolean(reviewedTestCode.trim() && reviewedTestCode.trim() !== currentTestCode);
				if (testsChanged) {
					const runRequest = this.mergeReviewedRunRequest(resumeState.request, request);
					await this.saveReviewedSetupToSession(runRequest, { announceTests: true });
					resumeState.request = runRequest;
				}
				this.workflowMode = 'auto';
				const payload = await this.invokeWorkflowAction({
					action: testsChanged ? 'auto' : 'auto_resume',
					problem: testsChanged ? resumeState.request.problem : undefined,
					testText: testsChanged ? resumeState.request.testText : undefined,
					testMode: testsChanged ? resumeState.request.testMode : undefined,
					useErrorFeedback: true,
					contextEnabled: resumeState.request.contextEnabled,
					maxRounds: resumeState.request.maxRounds,
					resolvedTestCode: testsChanged ? resumeState.request.resolvedTestCode : undefined,
					testDescription: resumeState.request.testDescription,
					additionalInstruction: resumeState.request.additionalInstruction
				});
				if (payload.stage_result?.interrupted) {
					this.resumeState = { kind: 'auto', request: resumeState.request };
				}
				this.interactiveState = payload.stage_result?.interrupted
					? 'await_auto_test_edit'
					: this.activeSession?.passed ? 'done' : 'idle';
				await this.postState();
				this.postSessionState(payload.stage_result);
			}, { scope: 'workflow', action: 'auto_resume' });
		}

		if (!succeeded) {
			// The resume point is committed only after its remote action succeeds.
			// Restoring all three fields keeps the same inline recovery controls available.
			this.resumeState = resumeState;
			this.interactiveState = previousInteractiveState;
			this.workflowMode = previousWorkflowMode;
			this.interruptRequested = false;
			await this.postState();
			this.postSessionState();
		} else if (request.additionalInstruction?.trim()) {
			await this.recordStudyEvent({
				eventType: 'requirement_edit',
				metadata: {
					action: 'resume_with_instruction',
					instruction: request.additionalInstruction.trim(),
					committed: true
				}
			});
		}
	}

	private async runGuarded(
		initialLabel: string,
		errorPrefix: string,
		work: () => Promise<void>,
		operation: OperationContext = { scope: 'workflow', action: 'workflow' }
	): Promise<boolean> {
		if (this.running) {
			this.appendUiLog('error', 'A task is already running. Please wait.');
			return false;
		}

		this.running = true;
		this.setRunState(true, initialLabel, operation);
		this.startSessionPolling();
		let succeeded = false;
		try {
			await work();
			succeeded = true;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.postOperationError(message, operation, errorPrefix);
		} finally {
			await this.refreshActiveSession(true);
			this.stopSessionPolling();
			this.running = false;
			this.setRunState(false);
		}
		return succeeded;
	}

	private async createWorkflowSession(profile: Profile, request: RunRequest): Promise<void> {
		const payload = await this.backendServer.request<BackendResponse>('/api/sessions', {
			method: 'POST',
			body: JSON.stringify(this.buildSessionArgs(profile, request))
		});
		this.activeSession = payload.session;
		this.workflowMode = request.executionMode;
		this.interactiveState = 'idle';
		this.studyTaskEnded = false;
		const fixedTests = this.studyTasks.find((task) => task.task_id === this.activeStudyTaskId)?.public_tests.trim() ?? '';
		this.studyTestSource = !request.testText.trim()
			? 'model_generated'
			: request.testText.trim() === fixedTests ? 'fixed_public' : 'user_provided';
		await this.recordStudyEvent({
			eventType: 'task_start',
			metadata: {
				execution_mode: this.studyConditionLabel(request.executionMode),
				assigned_condition: this.studyAssignedConditions.has(this.activeStudyTaskId)
					? this.studyConditionLabel(this.studyAssignedConditions.get(this.activeStudyTaskId)!)
					: '',
				test_source: this.studyTestSource
			}
		});
		const assignedCondition = this.studyAssignedConditions.get(this.activeStudyTaskId);
		if (assignedCondition && assignedCondition !== request.executionMode) {
			await this.recordStudyEvent({
				eventType: 'protocol_deviation',
				metadata: {
					reason: 'workflow_condition_mismatch',
					assigned_condition: this.studyConditionLabel(assignedCondition),
					actual_condition: this.studyConditionLabel(request.executionMode)
				}
			});
		}
		const studyLogDirectory = this.studyLogDirectory();
		if (studyLogDirectory) {
			this.outputChannel.appendLine(`[study log] Saving ${this.studyParticipantId}/${this.activeStudyTaskId} to ${studyLogDirectory}`);
		}
		await this.postState();
		this.postSessionState();
	}

	private async syncWorkflowSession(profile: Profile, request: RunRequest): Promise<void> {
		if (!this.activeSession?.session_id) {
			await this.createWorkflowSession(profile, request);
			return;
		}

		const payload = await this.backendServer.request<BackendResponse>(
			`/api/sessions/${this.activeSession.session_id}`,
			{
				method: 'PATCH',
				body: JSON.stringify({
					problem: request.problem.trim(),
					test_text: request.testText.trim(),
					test_mode: request.testMode,
						context_enabled: request.contextEnabled,
						max_rounds: request.maxRounds,
					resolved_test_code: request.testMode === 'generate' ? request.resolvedTestCode?.trim() : undefined,
					test_description: request.testDescription?.trim() || undefined,
					additional_instruction: request.additionalInstruction?.trim() || undefined,
					prompt_language: this.promptLanguage
				})
			}
		);
		this.activeSession = payload.session;
		this.workflowMode = request.executionMode;
		await this.postState();
		this.postSessionState();
	}

	private hasConfirmedResolvedTests(): boolean {
		return Boolean(
			this.activeSession?.resolved_tests_confirmed
			&& this.activeSession.resolved_test_code.trim()
		);
	}

	private async saveReviewedSetupToSession(request: RunRequest, options: { announceTests?: boolean } = {}): Promise<void> {
		if (!this.activeSession?.session_id) {
			throw new Error('No active workflow session.');
		}

		const previousTestText = (this.activeSession.resolved_test_code || this.activeSession.test_text || '').trim();
		const previousTestDescription = this.activeSession.test_description?.trim() ?? '';
		const reviewedTestText = request.testText.trim();
		const reviewedResolvedTests = request.resolvedTestCode?.trim() ?? '';
		const submittedTestText = reviewedTestText || reviewedResolvedTests;
		const submittedTestDescription = request.testDescription?.trim() ?? '';
		if (!reviewedTestText && !reviewedResolvedTests) {
			throw new Error('Review tests before continuing. Paste tests or generate a test suite first.');
		}
		const reviewedProblem = request.problem.trim();
		if (!reviewedProblem) {
			throw new Error('Requirement is required before continuing.');
		}

		const testBody = reviewedTestText
			? {
				problem: reviewedProblem,
				test_text: reviewedTestText,
				test_mode: 'manual' as TestMode,
				resolved_test_code: options.announceTests ? reviewedTestText : undefined
			}
			: {
				problem: reviewedProblem,
				test_text: '',
				test_mode: 'generate' as TestMode,
					resolved_test_code: reviewedResolvedTests
				};
		const body = {
			...testBody,
			test_description: submittedTestDescription,
			additional_instruction: request.additionalInstruction?.trim() || undefined
		};

		const payload = await this.backendServer.request<BackendResponse>(
			`/api/sessions/${this.activeSession.session_id}`,
			{
				method: 'PATCH',
				body: JSON.stringify(body)
			}
		);
		this.activeSession = payload.session;
		if (submittedTestText !== previousTestText || submittedTestDescription !== previousTestDescription) {
			await this.recordStudyEvent({
				eventType: 'test_edit',
				metadata: {
					action: 'commit_tests',
					committed: true,
					before_test_code: previousTestText,
					test_code: submittedTestText,
					before_test_description: previousTestDescription,
					test_description: submittedTestDescription
				}
			});
		}
		await this.postState();
		this.postSessionState();
	}

	private async pauseForInitialTestSetup(request: RunRequest, restartAfterTests: boolean): Promise<void> {
		const hasManualTests = Boolean(request.testText.trim());
		const hasResolvedTests = Boolean(request.resolvedTestCode?.trim()) || this.hasConfirmedResolvedTests();
		this.workflowMode = request.executionMode;
		this.interactiveState = 'await_test_setup';
		const stageResult: BackendActionResult = {
			stage: 'tests',
			message: hasManualTests || hasResolvedTests
				? 'Please confirm your test file is ready before continuing.'
				: 'No tests are configured. Open Tests to add or generate them before continuing.',
			interrupted: true
		};

		this.resumeState = { kind: 'tests-confirmation', request, restartAfterTests };
		this.interruptRequested = false;
		await this.postState();
		this.postSessionState(stageResult);
	}

	private async pauseForGenerationTestsReview(
		request: ActionRequestState,
		options: {
			action: 'regenerate' | 'restart';
			runLabel: string;
			reviewMessage: string;
			useErrorFeedback: boolean;
			stageMessage: string;
		}
	): Promise<void> {
		this.workflowMode = 'continue';
		this.interactiveState = 'await_generation_tests';
		this.resumeState = {
			kind: 'generation-tests',
			request,
			action: options.action,
			runLabel: options.runLabel,
			reviewMessage: options.reviewMessage,
			useErrorFeedback: options.useErrorFeedback
		};
		this.interruptRequested = false;
		await this.postState();
		this.postSessionState({
			stage: 'tests',
			message: options.stageMessage,
			interrupted: true,
			passed: this.activeSession?.passed ?? false
		});
	}

	private async pauseForCodeReview(request: ActionRequestState, message: string): Promise<void> {
		this.workflowMode = 'continue';
		this.interactiveState = 'await_code_review';
		this.resumeState = { kind: 'code-review', request };
		this.interruptRequested = false;
		await this.postState();
		this.postSessionState({
			stage: 'code',
			message,
			interrupted: true,
			passed: this.activeSession?.passed ?? false
		});
	}

	private async ensureSessionForStandaloneTestAction(request: {
			problem?: string;
			testText?: string;
			testMode?: TestMode;
			contextEnabled?: boolean;
			maxRounds?: number;
			executionMode?: 'auto' | 'continue';
			resolvedTestCode?: string;
			testDescription?: string;
			additionalInstruction?: string;
		}): Promise<boolean> {
		if (this.activeSession?.session_id) {
			return true;
		}

		const draftRequest: RunRequest = {
			problem: request.problem ?? '',
			testText: request.testText ?? '',
			testMode: request.testMode ?? 'generate',
			contextEnabled: request.contextEnabled ?? false,
			maxRounds: request.maxRounds ?? 10,
			executionMode: request.executionMode ?? this.workflowMode,
			resolvedTestCode: request.resolvedTestCode,
			testDescription: request.testDescription,
			additionalInstruction: request.additionalInstruction
		};
		const profile = this.validateRunRequest(draftRequest);
		if (!profile) {
			return false;
		}

		await this.createWorkflowSession(profile, draftRequest);
		return true;
	}

	private async invokeWorkflowAction(
		request: {
			action: string;
			problem?: string;
			testText?: string;
			testMode?: TestMode;
			useErrorFeedback: boolean;
			contextEnabled?: boolean;
			maxRounds?: number;
			planOverride?: string;
			executionMode?: 'auto' | 'continue';
			resolvedTestCode?: string;
			codeOverride?: string;
			codeEventId?: string;
			testDescription?: string;
			additionalInstruction?: string;
		}
	): Promise<BackendResponse> {
		if (!this.activeSession?.session_id) {
			throw new Error('No active workflow session. Start a session first.');
		}

		const payload = await this.backendServer.request<BackendResponse>(
			`/api/sessions/${this.activeSession.session_id}/actions`,
			{
				method: 'POST',
				body: JSON.stringify({
					action: request.action,
					problem: request.problem,
					test_text: request.testText,
					test_mode: request.testMode,
					use_error_feedback: request.useErrorFeedback,
					context_enabled: request.contextEnabled,
					max_rounds: request.maxRounds,
					plan_override: request.planOverride,
					resolved_test_code: request.resolvedTestCode,
					code_override: request.codeOverride,
					code_event_id: request.codeEventId,
					test_description: request.testDescription?.trim() || undefined,
					additional_instruction: request.additionalInstruction?.trim() || undefined,
					prompt_language: this.promptLanguage
				})
			}
		);

		this.activeSession = payload.session;
		await this.postState();
		this.postSessionState(payload.stage_result);
		return payload;
	}

	private async executeWorkflow(_context: vscode.ExtensionContext, request: RunRequest): Promise<void> {
		const profile = this.validateRunRequest(request);
		if (!profile) {
			this.postOperationError(
				'Check the requirement and active LLM profile, then try again.',
				{ scope: 'workflow', action: request.executionMode === 'auto' ? 'auto' : 'start' },
				'Workflow could not start',
				false
			);
			return;
		}

		await this.runGuarded(
			request.executionMode === 'auto' ? 'Preparing auto workflow...' : 'Preparing interactive workflow...',
			'Execution failed',
			async () => {
				this.clearResumeState();
				this.interruptRequested = false;
				const hadSession = Boolean(this.activeSession?.session_id);
				await this.syncWorkflowSession(profile, request);
				if (request.executionMode === 'auto') {
					let autoTestText = request.testText.trim();
					if (!autoTestText) {
						this.setRunState(true, 'Generating tests for the automatic workflow...');
						await this.invokeWorkflowAction({
							action: 'generate_tests',
							problem: request.problem,
							testText: '',
							testMode: 'generate',
							useErrorFeedback: true,
							contextEnabled: request.contextEnabled,
							maxRounds: request.maxRounds,
							testDescription: request.testDescription,
							additionalInstruction: request.additionalInstruction
						});
						autoTestText = this.activeSession?.resolved_test_code?.trim() ?? '';
						if (!autoTestText) {
							throw new Error('Automatic test generation did not produce a usable test suite.');
						}
					}

					const autoRequest: RunRequest = {
						...request,
						testText: autoTestText,
						testMode: 'manual',
						resolvedTestCode: undefined
					};
					this.setRunState(true, 'Running the full automatic workflow...');
					const payload = await this.invokeWorkflowAction({
						action: 'auto',
						problem: autoRequest.problem,
						testText: autoRequest.testText,
						testMode: autoRequest.testMode,
						useErrorFeedback: true,
						contextEnabled: autoRequest.contextEnabled,
						maxRounds: autoRequest.maxRounds,
						testDescription: autoRequest.testDescription,
						additionalInstruction: autoRequest.additionalInstruction
					});
					if (payload.stage_result?.interrupted) {
						this.resumeState = { kind: 'auto', request: autoRequest };
						await this.postState();
					}
					this.interactiveState = payload.stage_result?.interrupted
						? 'await_auto_test_edit'
						: this.activeSession?.passed ? 'done' : 'idle';
					this.postSessionState(payload.stage_result);
					return;
				}
				let interactiveRequest = request;
				if (!request.testText.trim()) {
					this.setRunState(true, 'Generating tests from the requirement...');
					await this.invokeWorkflowAction({
						action: 'generate_tests',
						problem: request.problem,
						testText: '',
						testMode: 'generate',
						useErrorFeedback: true,
						contextEnabled: request.contextEnabled,
						maxRounds: request.maxRounds,
						testDescription: request.testDescription,
						additionalInstruction: request.additionalInstruction
					});
					const generatedTests = this.activeSession?.resolved_test_code?.trim() ?? '';
					if (!generatedTests) {
						throw new Error('Test generation did not produce a usable test suite.');
					}
					interactiveRequest = {
						...request,
						testText: generatedTests,
						testMode: 'manual',
						resolvedTestCode: undefined
					};
				}
				await this.pauseForInitialTestSetup(interactiveRequest, hadSession);
			},
			{ scope: 'workflow', action: request.executionMode === 'auto' ? 'auto' : 'start' }
		);
	}

	private async continueWithPlan(
		_context: vscode.ExtensionContext,
		request: ActionRequestState
	): Promise<void> {
		if (!this.activeSession?.session_id) {
			this.appendUiLog('error', 'No active workflow session. Start a session first.');
			return;
		}

		const previousPlan = this.activeSession.current_plan;
		const submittedPlan = request.planOverride?.trim() ?? previousPlan;
		const succeeded = await this.runGuarded('Regenerating code from the reviewed plan...', 'Continue failed', async () => {
			const actionRequest = this.mergeReviewedActionRequest({
				problem: request.problem ?? this.activeSession?.problem_statement ?? '',
				testText: request.testText ?? this.activeSession?.test_text ?? '',
				testMode: request.testMode ?? this.activeSession?.test_mode ?? 'manual',
				useErrorFeedback: request.useErrorFeedback,
				contextEnabled: request.contextEnabled ?? this.activeSession?.context_enabled ?? false,
				maxRounds: request.maxRounds ?? this.activeSession?.max_rounds ?? 10,
				planOverride: request.planOverride ?? this.activeSession?.current_plan ?? '',
				executionMode: 'continue',
				resolvedTestCode: request.resolvedTestCode ?? this.activeSession?.resolved_test_code ?? ''
			}, request);
			await this.runReviewedGenerationAction(actionRequest, {
				action: 'regenerate',
				runLabel: 'Regenerating code with the reviewed tests...',
				useErrorFeedback: true,
				evaluationLabel: 'Evaluating the regenerated code...'
			});
		}, { scope: 'code', action: 'regenerate' });
		if (succeeded && submittedPlan !== previousPlan) {
			await this.recordStudyEvent({
				eventType: 'plan_edit',
				metadata: {
					action: 'continue_with_plan',
					committed: true,
					before_plan: previousPlan,
					plan: submittedPlan
				}
			});
		}
	}

	private async continueWithFeedback(
		_context: vscode.ExtensionContext,
		request: ActionRequestState
	): Promise<void> {
		if (!this.activeSession?.session_id) {
			this.appendUiLog('error', 'No active workflow session. Start a session first.');
			return;
		}

		await this.runGuarded('Creating a new plan from the latest feedback...', 'Plan failed', async () => {
			this.workflowMode = 'continue';
			this.clearResumeState();
			this.setRunState(true, 'Generating a fresh repair plan...');
			await this.invokeWorkflowAction({
				action: 'plan',
				problem: request.problem,
				testText: request.testText,
				testMode: request.testMode,
				useErrorFeedback: true,
				contextEnabled: request.contextEnabled,
					maxRounds: request.maxRounds,
					planOverride: request.planOverride,
					resolvedTestCode: request.resolvedTestCode,
					testDescription: request.testDescription,
					additionalInstruction: request.additionalInstruction
			});
			this.interruptRequested = false;
			this.interactiveState = 'await_plan';
			this.postSessionState();
		}, { scope: 'plan', action: 'plan' });
	}

	private async restartInteractiveWorkflow(
		_context: vscode.ExtensionContext,
		request: ActionRequestState
	): Promise<void> {
		if (!this.activeSession?.session_id) {
			this.appendUiLog('error', 'No active workflow session. Start a session first.');
			return;
		}

			await this.runGuarded('Restarting from the original requirement...', 'Restart failed', async () => {
				const selectedMode = request.executionMode === 'auto' ? 'auto' : 'continue';
				this.workflowMode = selectedMode;
				this.clearResumeState();

				if (selectedMode === 'auto') {
					this.setRunState(true, 'Restarting the full auto workflow from the requirement...');
					const payload = await this.invokeWorkflowAction({
						action: 'auto',
						problem: request.problem,
						testText: request.testText,
						testMode: request.testMode,
						useErrorFeedback: false,
						contextEnabled: request.contextEnabled,
						maxRounds: request.maxRounds,
						resolvedTestCode: request.resolvedTestCode,
						testDescription: request.testDescription,
						additionalInstruction: request.additionalInstruction
					});
					if (payload.stage_result?.interrupted) {
						this.resumeState = {
							kind: 'auto',
							request: {
								problem: request.problem ?? this.activeSession?.problem_statement ?? '',
								testText: request.testText ?? this.activeSession?.test_text ?? '',
								testMode: request.testMode ?? this.activeSession?.test_mode ?? 'manual',
								contextEnabled: request.contextEnabled ?? this.activeSession?.context_enabled ?? false,
					maxRounds: request.maxRounds ?? this.activeSession?.max_rounds ?? 10,
					executionMode: 'auto',
					resolvedTestCode: request.resolvedTestCode,
					testDescription: request.testDescription,
					additionalInstruction: request.additionalInstruction
							}
						};
						this.interruptRequested = false;
						await this.postState();
					}
					this.interactiveState = payload.stage_result?.interrupted
						? 'await_auto_test_edit'
						: this.activeSession?.passed ? 'done' : 'idle';
					this.postSessionState();
					return;
				}

			const actionRequest = this.mergeReviewedActionRequest({
				problem: request.problem ?? this.activeSession?.problem_statement ?? '',
				testText: request.testText ?? this.activeSession?.test_text ?? '',
				testMode: request.testMode ?? this.activeSession?.test_mode ?? 'manual',
				useErrorFeedback: false,
				contextEnabled: request.contextEnabled ?? this.activeSession?.context_enabled ?? false,
				maxRounds: request.maxRounds ?? this.activeSession?.max_rounds ?? 10,
				planOverride: request.planOverride ?? this.activeSession?.current_plan ?? '',
				executionMode: 'continue',
				resolvedTestCode: request.resolvedTestCode ?? this.activeSession?.resolved_test_code ?? '',
				testDescription: request.testDescription,
				additionalInstruction: request.additionalInstruction
			}, request);
			await this.runReviewedGenerationAction(actionRequest, {
				action: 'restart',
					runLabel: 'Generating a fresh attempt with the reviewed tests...',
					useErrorFeedback: false,
					evaluationLabel: 'Evaluating the restarted code...'
				});
			}, { scope: 'workflow', action: 'restart' });
	}

	private async stopInteractiveWorkflow(): Promise<void> {
		if (!this.activeSession?.session_id) {
			return;
		}

		if (!this.studyTaskEnded) {
			await this.recordStudyEvent({
				eventType: 'task_end',
				metadata: { reason: 'ended_by_user', passed: this.activeSession.passed }
			});
			this.studyTaskEnded = true;
		}
		this.interactiveState = 'done';
		this.interruptRequested = false;
		this.clearResumeState();
		await this.postState();
		this.postSessionState({
			stage: 'interactive',
			message: 'Interactive workflow paused by the user.',
			passed: this.activeSession.passed
		});
	}

	private async runWorkflowAction(
		_context: vscode.ExtensionContext,
		request: ActionRequestState & { action: string }
	): Promise<void> {
		const operation: OperationContext = request.action === 'generate_tests'
			? { scope: 'tests', action: 'generate_tests' }
			: request.action === 'guidance'
				? { scope: 'workflow', action: 'guidance' }
				: { scope: 'workflow', action: request.action || 'action' };
		await this.runGuarded(`Running ${request.action}...`, 'Action failed', async () => {
			if (request.action === 'generate_tests') {
				const ready = await this.ensureSessionForStandaloneTestAction({
					problem: request.problem,
					testText: request.testText,
					testMode: request.testMode,
					contextEnabled: request.contextEnabled,
					maxRounds: request.maxRounds,
					executionMode: request.executionMode,
					resolvedTestCode: request.resolvedTestCode,
					testDescription: request.testDescription,
					additionalInstruction: request.additionalInstruction
				});
			if (!ready) {
				throw new Error('Unable to prepare test generation. Check the requirement and active model profile.');
			}
			}
			await this.invokeWorkflowAction({
				action: request.action,
				problem: request.problem,
				testText: request.testText,
				testMode: request.testMode,
				useErrorFeedback: request.useErrorFeedback,
				contextEnabled: request.contextEnabled,
				maxRounds: request.maxRounds,
				planOverride: request.planOverride,
				resolvedTestCode: request.resolvedTestCode,
				testDescription: request.testDescription,
				additionalInstruction: request.additionalInstruction
			});
			if (request.action === 'plan' && this.workflowMode === 'continue') {
				this.interactiveState = 'await_plan';
				this.postSessionState();
			}
		}, operation);
	}

	private async submitWorkflowGuidance(
		_context: vscode.ExtensionContext,
		request: ActionRequestState
	): Promise<void> {
		const guidance = request.additionalInstruction?.trim() ?? '';
		if (!guidance) {
			const message = 'Enter an additional requirement before submitting.';
			this.postMessage({ type: 'guidanceResult', ok: false, message });
			this.postOperationError(message, { scope: 'workflow', action: 'guidance' }, 'Guidance not submitted', false);
			return;
		}
		if (!this.activeSession?.session_id) {
			const message = 'No active workflow session. Start a session first.';
			this.postMessage({ type: 'guidanceResult', ok: false, message });
			this.postOperationError(message, { scope: 'workflow', action: 'guidance' }, 'Guidance not submitted', false);
			return;
		}

		const succeeded = await this.runGuarded(
			'Saving guidance for the next model call...',
			'Failed to save guidance',
			async () => {
				await this.invokeWorkflowAction({
					action: 'guidance',
					problem: request.problem,
					testText: request.testText,
					testMode: request.testMode,
					useErrorFeedback: request.useErrorFeedback,
					contextEnabled: request.contextEnabled,
					maxRounds: request.maxRounds,
					planOverride: request.planOverride,
					resolvedTestCode: request.resolvedTestCode,
					testDescription: request.testDescription,
					additionalInstruction: guidance
				});
			},
			{ scope: 'workflow', action: 'guidance' }
		);
		if (succeeded) {
			await this.recordStudyEvent({
				eventType: 'requirement_edit',
				metadata: { action: 'submit_instruction', instruction: guidance, committed: true }
			});
		}
		this.postMessage({
			type: 'guidanceResult',
			ok: succeeded,
			message: succeeded
				? 'Guidance saved for the next model call.'
				: 'The guidance could not be saved.'
		});
	}

	private async retestGeneratedCode(_context: vscode.ExtensionContext, request: ActionRequestState): Promise<void> {
		if (!this.activeSession?.session_id) {
			this.appendUiLog('error', 'No active workflow session. Start a session first.');
			return;
		}

		const editedCode = request.codeOverride?.trim() ?? '';
		if (!editedCode) {
			this.appendUiLog('error', 'Edited code is empty.');
			return;
		}

		await this.runGuarded('Re-running tests for the edited code...', 'Retest failed', async () => {
			const selectedMode = this.workflowMode === 'auto' ? 'auto' : 'continue';
			const actionRequest = this.mergeReviewedActionRequest({
				problem: this.activeSession?.problem_statement ?? '',
				testText: this.activeSession?.test_text ?? '',
				testMode: this.activeSession?.test_mode ?? 'manual',
				useErrorFeedback: true,
				contextEnabled: this.activeSession?.context_enabled ?? false,
				maxRounds: this.activeSession?.max_rounds ?? 10,
				resolvedTestCode: this.activeSession?.resolved_test_code,
				codeOverride: request.codeOverride,
				codeEventId: request.codeEventId,
				testDescription: request.testDescription,
				additionalInstruction: request.additionalInstruction
			}, request);
			await this.saveReviewedSetupToSession({
				problem: actionRequest.problem ?? this.activeSession?.problem_statement ?? '',
				testText: actionRequest.testText ?? '',
				testMode: actionRequest.testMode ?? 'manual',
				contextEnabled: actionRequest.contextEnabled ?? this.activeSession?.context_enabled ?? false,
				maxRounds: actionRequest.maxRounds ?? this.activeSession?.max_rounds ?? 10,
				executionMode: selectedMode,
				resolvedTestCode: actionRequest.resolvedTestCode,
				testDescription: actionRequest.testDescription,
				additionalInstruction: actionRequest.additionalInstruction
			});
			this.clearResumeState();
			this.workflowMode = selectedMode;
			this.interactiveState = 'idle';
			await this.postState();
			this.setRunState(true, 'Evaluating edited code...');
			await this.invokeWorkflowAction({
				action: 'evaluate',
				problem: actionRequest.problem,
				testText: actionRequest.testText,
				testMode: actionRequest.testMode,
				useErrorFeedback: true,
				contextEnabled: actionRequest.contextEnabled,
				maxRounds: actionRequest.maxRounds,
				resolvedTestCode: actionRequest.resolvedTestCode,
				codeOverride: actionRequest.codeOverride,
				codeEventId: actionRequest.codeEventId,
				testDescription: actionRequest.testDescription,
				additionalInstruction: actionRequest.additionalInstruction
			});

			this.interruptRequested = false;
			this.interactiveState = this.activeSession?.passed
				? 'done'
				: selectedMode === 'continue' ? 'await_failure_choice' : 'idle';
			this.postSessionState();
		}, { scope: 'code', action: 'retest' });
	}

	private async updateWorkflowPlan(_context: vscode.ExtensionContext, plan: string): Promise<void> {
		if (!this.activeSession?.session_id) {
			this.appendUiLog('error', 'No active workflow session.');
			return;
		}

		try {
			const previousPlan = this.activeSession.current_plan;
			const payload = await this.backendServer.request<BackendResponse>(
				`/api/sessions/${this.activeSession.session_id}`,
				{
					method: 'PATCH',
					body: JSON.stringify({ plan })
				}
			);
			this.activeSession = payload.session;
			if (plan !== previousPlan) {
				await this.recordStudyEvent({
					eventType: 'plan_edit',
					metadata: {
						action: 'save_plan',
						committed: true,
						before_plan: previousPlan,
						plan
					}
				});
			}
			await this.postState();
			this.postSessionState();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.postOperationError(message, { scope: 'plan', action: 'save_plan' }, 'Failed to update plan');
		}
	}

	private async updateResolvedTests(
		_context: vscode.ExtensionContext,
		resolvedTestCode: string,
		testDescription?: string,
		requestId?: string
	): Promise<void> {
		if (!this.activeSession?.session_id) {
			const message = 'No active workflow session.';
			this.appendUiLog('error', message);
			this.postMessage({ type: 'testsSaveResult', ok: false, requestId, message });
			return;
		}

		try {
			await this.saveReviewedSetupToSession({
				problem: this.activeSession.problem_statement,
				testText: resolvedTestCode,
				testMode: resolvedTestCode.trim() ? 'manual' : 'generate',
				contextEnabled: this.activeSession.context_enabled,
				maxRounds: this.activeSession.max_rounds,
				executionMode: this.workflowMode,
				resolvedTestCode: undefined,
				testDescription
			}, { announceTests: this.interactiveState === 'await_auto_test_edit' });
			this.postMessage({
				type: 'testsSaveResult',
				ok: true,
				requestId,
				message: 'Tests saved.',
				savedAt: new Date().toISOString(),
				testLength: resolvedTestCode.trim().length
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.postMessage({ type: 'testsSaveResult', ok: false, requestId, message });
			this.postOperationError(message, { scope: 'tests', action: 'save_tests' }, 'Failed to save tests');
		}
	}

	private async restoreArchivedSession(sessionId: string): Promise<void> {
		if (this.running || this.activeOperation) {
			void vscode.window.showWarningMessage('当前任务正在运行，请等待完成后再恢复历史会话。');
			return;
		}
		if (!/^[a-zA-Z0-9_-]{8,128}$/.test(sessionId)) {
			void vscode.window.showWarningMessage('无效的历史 Session ID。');
			return;
		}
		if (this.activeSession?.session_id === sessionId) {
			this.postMessage({ type: 'switchPage', page: 'task' });
			return;
		}

		// History-v1 contains diagnostic events, not the code/test/plan needed
		// to reconstruct a session. Resolve by ID from backend memory, the
		// universal snapshot store, legacy study JSON, or archived task state.
		const saved = await this.sessionSnapshotStore.load(sessionId);
		const legacyArchive = this.archivedSessions.find(item => item.session_id === sessionId);
		const stored: SavedWorkflowSession<BackendSessionState, ResumeState> | undefined =
			saved ?? (legacyArchive ? {
				schemaVersion: 1,
				savedAt: legacyArchive.updated_at,
				session: legacyArchive,
				workflowMode: 'continue',
				interactiveState: legacyArchive.passed ? 'done' : 'idle'
			} : undefined);

		let restored: BackendSessionState | undefined;
		let backendLookupError = '';
		try {
			const response = await this.backendServer.request<BackendResponse>(
				`/api/sessions/${encodeURIComponent(sessionId)}`
			);
			restored = response.session;
		} catch (error) {
			backendLookupError = error instanceof Error ? error.message : String(error);
		}

		if (!restored && !stored) {
			void vscode.window.showWarningMessage(
				`Session ${sessionId.slice(0, 8)}：当前工作区未找到完整 JSON 快照，也无法从后端读取会话。请检查是否打开了原实验工作区，以及后端是否可用；仅凭诊断日志无法重建代码和测试。`
			);
			this.outputChannel.appendLine(`[session restore] ${sessionId}: no snapshot; backend=${backendLookupError}`);
			return;
		}
		if (!restored && stored) {
			const wanted = stored.session.llm;
			const modelProfile = this.profiles.find(item => item.model === wanted?.model
				&& item.provider === wanted?.provider && item.baseUrl === wanted?.base_url);
			const profile = modelProfile ?? this.getActiveProfile();
			if (!profile) {
				void vscode.window.showErrorMessage('恢复历史会话需要一个可用的模型 Profile。');
				return;
			}
			try {
				const response = await this.backendServer.request<BackendResponse>(
					'/api/sessions/restore', {
						method: 'POST',
						body: JSON.stringify({
							snapshot: stored.session,
							llm: {
								...profileToRequestConfig(profile),
								max_tokens: normalizeWorkflowMaxTokens(stored.session.llm?.max_tokens ?? profile.maxTokens)
							}
						})
					}
				);
				restored = response.session;
			} catch (error) {
				void vscode.window.showErrorMessage(
					`重建历史 Session 失败：${error instanceof Error ? error.message : String(error)}`
				);
				return;
			}
		}
		if (!restored) { return; }

		// Never discard the active task until the target is verified/restored.
		if (this.activeSession?.session_id) {
			const answer = await vscode.window.showWarningMessage(
				'恢复历史 Session 前需要归档当前任务，当前任务的快照和消息将保留。是否继续？',
				{ modal: true }, '归档当前任务并恢复'
			);
			if (answer !== '归档当前任务并恢复') { return; }
			await this.clearWorkflowSession('new_task');
		}

		this.activeSession = restored;
		this.restoredSessionId = sessionId;
		this.archivedSessions = this.archivedSessions.filter(item => item.session_id !== sessionId);
		await this.context.workspaceState.update('adaassist.archivedSessions.v1', this.archivedSessions);
		// Preserve recorded host-side checkpoints for our new snapshots.
		// Completed Auto tasks are opened in Interactive mode for follow-up edits.
		this.workflowMode = stored?.workflowMode === 'auto' && !restored.passed ? 'auto' : 'continue';
		this.interactiveState = restored.passed ? 'done' :
			stored?.interactiveState === 'await_plan'
				|| stored?.interactiveState === 'await_test_setup'
				|| stored?.interactiveState === 'await_generation_tests'
				|| stored?.interactiveState === 'await_code_review'
				|| stored?.interactiveState === 'await_failure_choice'
				|| stored?.interactiveState === 'await_auto_test_edit'
				? stored.interactiveState as InteractionState
				: restored.current_stage === 'plan' && restored.current_plan.trim() ? 'await_plan'
				: restored.latest_evaluation && !restored.latest_evaluation.passed ? 'await_failure_choice'
				: 'idle';
		this.resumeState = stored?.resumeState && (
			stored.resumeState.kind === 'tests-confirmation'
			|| stored.resumeState.kind === 'generation-tests'
			|| stored.resumeState.kind === 'code-review'
			|| stored.resumeState.kind === 'auto'
		) ? stored.resumeState : undefined;
		if (!this.resumeState && !restored.current_code.trim()
			&& restored.current_stage === 'tests'
			&& Boolean((restored.resolved_test_code || restored.test_text).trim())) {
			// Legacy study snapshots predate host-side pause metadata.
			this.workflowMode = 'continue';
			this.interactiveState = 'await_test_setup';
			this.resumeState = {
				kind: 'tests-confirmation',
				request: {
					problem: restored.problem_statement,
					testText: restored.test_text,
					testMode: restored.test_mode,
					contextEnabled: restored.context_enabled,
					maxRounds: restored.max_rounds,
					executionMode: 'continue',
					resolvedTestCode: restored.resolved_test_code,
					testDescription: restored.test_description,
					additionalInstruction: restored.additional_instruction
				},
				restartAfterTests: false
			};
		}
		if (!this.resumeState && !restored.passed && this.workflowMode === 'continue'
			&& restored.current_code.trim()
			&& ['generate', 'regenerate', 'debug_fix'].includes(restored.current_stage)) {
			// Older experiment JSON stores the generated candidate and workflow
			// events but did not serialize the Extension Host pause request.
			const latestCode = [...restored.events].reverse().find(event =>
				['generate', 'regenerate', 'debug_fix'].includes(event.stage)
				&& event.status === 'completed');
			this.resumeState = {
				kind: 'code-review',
				request: {
					problem: restored.problem_statement,
					testText: restored.test_text,
					testMode: restored.test_mode,
					useErrorFeedback: true,
					contextEnabled: restored.context_enabled,
					maxRounds: restored.max_rounds,
					resolvedTestCode: restored.resolved_test_code,
					codeOverride: restored.current_code,
					codeEventId: latestCode?.id
				}
			};
			this.interactiveState = 'await_code_review';
		}
		if (!this.resumeState && this.workflowMode === 'auto' && !restored.passed) {
			// The legacy study JSON records the backend's auto progress but not
			// the Extension Host resume button. Recreate its auto-resume request.
			this.resumeState = {
				kind: 'auto',
				request: {
					problem: restored.problem_statement,
					testText: restored.test_text,
					testMode: restored.test_mode,
					contextEnabled: restored.context_enabled,
					maxRounds: restored.max_rounds,
					executionMode: 'auto',
					resolvedTestCode: restored.resolved_test_code,
					testDescription: restored.test_description,
					additionalInstruction: restored.additional_instruction
				}
			};
			this.interactiveState = 'await_auto_test_edit';
		}
		if (!this.resumeState && this.interactiveState === 'await_code_review') {
			// Do not display an unusable Continue button.
			this.interactiveState = 'idle';
		}
		this.interruptRequested = false;
		this.lastSessionSnapshot = '';
		this.activeStudyTaskId = '';
		this.studyTaskEnded = true; // Historical replay never rewrites the original experiment.
		this.studyTestSource = '';
		this.lastStudySnapshot = '';
		await this.postState();
		this.postSessionState();
		this.postMessage({ type: 'switchPage', page: 'task' });
		this.appendUiLog('info', `Restored session ${sessionId} from ${saved ? 'persisted JSON' : legacyArchive ? 'archive' : 'backend'}`);
	}

	private async clearWorkflowSession(reason: 'new_task' | 'user_confirmed' = 'new_task'): Promise<void> {
		this.restoredSessionId = '';
		this.stopSessionPolling();
		if (!this.activeSession?.session_id) {
			this.activeSession = undefined;
			this.workflowMode = 'continue';
			this.interactiveState = 'idle';
			this.interruptRequested = false;
			this.clearResumeState();
			this.lastSessionSnapshot = '';
			this.activeStudyTaskId = '';
			this.studyTaskEnded = false;
			this.studyTestSource = '';
			this.lastStudySnapshot = '';
			await this.postState();
			return;
		}

		if (!this.studyTaskEnded) {
			await this.recordStudyEvent({
				eventType: 'task_end',
				metadata: {
					reason,
					passed: this.activeSession.passed,
					attempt_count: this.activeSession.attempt_count,
					regeneration_count: this.activeSession.regeneration_count
				}
			});
			this.studyTaskEnded = true;
		}
		await this.persistStudySnapshot('task_end', true);
		await this.persistActiveSessionSnapshot();

		// Archive the complete session for the visible conversation before detaching it.
		const archived = [...this.archivedSessions, structuredClone(this.activeSession)];
		this.archivedSessions = archived.slice(-20);
		await this.context.workspaceState.update('adaassist.archivedSessions.v1', this.archivedSessions);

		this.activeSession = undefined;
		this.workflowMode = 'continue';
		this.interactiveState = 'idle';
		this.interruptRequested = false;
		this.clearResumeState();
		this.lastSessionSnapshot = '';
		this.activeStudyTaskId = '';
		this.studyTaskEnded = false;
		this.studyTestSource = '';
		this.lastStudySnapshot = '';
		await this.postState();
		this.postSessionState();
	}

	private studyLogDirectory(): string | undefined {
		const root = getWorkspaceRootPath();
		if (!root || !this.studyParticipantId || !this.activeStudyTaskId) {
			return undefined;
		}
		return path.join(root, 'adaassist-study-logs');
	}

	private studyConditionLabel(mode: RunRequest['executionMode']): 'Auto' | 'Interactive' {
		return mode === 'auto' ? 'Auto' : 'Interactive';
	}

	private studyArtifactVersion(): string {
		const packageVersion = typeof this.context.extension.packageJSON.version === 'string'
			? this.context.extension.packageJSON.version
			: 'unknown';
		if (!this.studyBuildHash) {
			const hash = createHash('sha256');
			['out/extension.js', 'media/webview.js', 'media/webview.css'].forEach((relativePath) => {
				const filePath = path.join(this.context.extensionUri.fsPath, relativePath);
				if (fs.existsSync(filePath)) {
					hash.update(fs.readFileSync(filePath));
				}
			});
			this.studyBuildHash = hash.digest('hex').slice(0, 12);
		}
		return `adaassist-${packageVersion}+${this.studyBuildHash}:tasks-${String(this.studyTaskSetVersion)}+${this.studyTaskSetHash || 'unknown'}`;
	}

	private studyArtifactSnapshot(): Record<string, unknown> {
		const session = this.activeSession;
		if (!session) {
			return {};
		}
		const currentTests = (session.resolved_test_code || session.test_text || '').trim();
		const testSource = this.studyTestSource
			|| (session.test_mode === 'generate' ? 'model_generated' : 'user_provided');
		return {
			artifact_version: this.studyArtifactVersion(),
			artifact_revision: session.updated_at,
			problem: session.problem_statement,
			tests: {
				source: testSource,
				code: currentTests,
				confirmed: session.resolved_tests_confirmed
			},
			code: session.current_code,
			plan: session.current_plan,
			evaluation: session.latest_evaluation ?? null
		};
	}

	private enqueueStudyLog(work: () => Promise<void>): Promise<void> {
		const queued = this.studyLogQueue.then(work, work);
		this.studyLogQueue = queued.catch((error) => {
			this.outputChannel.appendLine(`[study log] ${String(error)}`);
		});
		return this.studyLogQueue;
	}

	private async persistStudySnapshot(reason: string, force = false): Promise<void> {
		const directory = this.studyLogDirectory();
		const session = this.activeSession;
		if (!directory || !session) {
			return;
		}
		const identity = {
			participant_id: this.studyParticipantId,
			task_id: this.activeStudyTaskId,
			condition: this.studyConditionLabel(this.workflowMode),
			assigned_condition: this.studyAssignedConditions.has(this.activeStudyTaskId)
				? this.studyConditionLabel(this.studyAssignedConditions.get(this.activeStudyTaskId)!)
				: '',
			session_id: session.session_id
		};
		const fingerprint = JSON.stringify({ identity, session });
		if (!force && fingerprint === this.lastStudySnapshot) {
			return;
		}
		const safeName = [this.studyParticipantId, this.activeStudyTaskId, session.session_id]
			.map((value) => value.replace(/[^a-zA-Z0-9_-]/g, '_'))
			.join('-');
		const destination = path.join(directory, 'sessions', `${safeName}.json`);
		const payload = {
			schema_version: 1,
			artifact_version: this.studyArtifactVersion(),
			artifact_revision: session.updated_at,
			snapshot_reason: reason,
			saved_at: new Date().toISOString(),
			...identity,
			artifacts: this.studyArtifactSnapshot(),
			session
		};
		await this.enqueueStudyLog(async () => {
			await fs.promises.mkdir(path.dirname(destination), { recursive: true });
			const temporary = `${destination}.tmp`;
			await fs.promises.writeFile(temporary, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
			await fs.promises.rename(temporary, destination);
			this.lastStudySnapshot = fingerprint;
		});
	}

	private async recordStudyEvent(message: Record<string, unknown>): Promise<void> {
		const sessionId = this.activeSession?.session_id;
		const eventType = typeof message.eventType === 'string' ? message.eventType.trim() : '';
		if (!sessionId || !eventType) {
			return;
		}
		const metadata = message.metadata && typeof message.metadata === 'object'
			? message.metadata
			: {};
		if (eventType === 'test_edit') {
			this.studyTestSource = 'user_edited';
		}
		const eventData = {
			...this.studyArtifactSnapshot(),
			...metadata
		};
		let recordedEvent: Record<string, unknown> = {
			id: randomBytes(12).toString('hex'),
			event_type: eventType,
			participant_id: this.studyParticipantId,
			task_id: this.activeStudyTaskId,
			condition: this.studyConditionLabel(this.workflowMode),
			session_id: sessionId,
			data: eventData,
			created_at: new Date().toISOString()
		};
		try {
			const payload = await this.backendServer.request<{ ok: boolean; event?: Record<string, unknown> }>(`/api/sessions/${sessionId}/study-events`, {
				method: 'POST',
				body: JSON.stringify({
					event_type: eventType,
					participant_id: this.studyParticipantId,
					task_id: this.activeStudyTaskId,
					condition: this.studyConditionLabel(this.workflowMode),
					data: eventData
				})
			});
			if (payload.event) {
				recordedEvent = payload.event;
				if (this.activeSession?.session_id === sessionId) {
					const studyEvents = this.activeSession.study_events ?? [];
					const eventId = typeof payload.event.id === 'string' ? payload.event.id : '';
					if (!eventId || !studyEvents.some((event) => event.id === eventId)) {
						this.activeSession.study_events = [...studyEvents, payload.event];
					}
					if (
						typeof payload.event.created_at === 'string'
						&& payload.event.created_at > this.activeSession.updated_at
					) {
						this.activeSession.updated_at = payload.event.created_at;
					}
				}
			}
		} catch (error) {
			this.outputChannel.appendLine(`[study event] failed to record ${eventType}: ${String(error)}`);
		}
		this.visualLogStore.recordSession(this.activeSession);

		const directory = this.studyLogDirectory();
		if (directory) {
			await this.enqueueStudyLog(async () => {
				await fs.promises.mkdir(directory, { recursive: true });
				const eventData = recordedEvent.data && typeof recordedEvent.data === 'object'
					? recordedEvent.data as Record<string, unknown>
					: {};
				await fs.promises.appendFile(
					path.join(directory, 'events.jsonl'),
					`${JSON.stringify({
						schema_version: 1,
						artifact_version: eventData.artifact_version ?? this.studyArtifactVersion(),
						artifact_revision: eventData.artifact_revision ?? this.activeSession?.updated_at ?? '',
						...recordedEvent
					})}\n`,
					'utf8'
				);
			});
			await this.persistStudySnapshot(`event:${eventType}`, true);
		}
	}

	private appendUiLog(level: BridgeLogLevel, text: string): void {
		if (!text.trim()) {
			return;
		}
		this.visualLogStore.recordExtension(level, text, this.activeSession?.session_id);
		this.postMessage({
			type: 'log',
			level,
			text
		});
		this.postMessage({ type: 'logHistory', entries: this.visualLogStore.latest() });
	}

	private async loadProfiles(context: vscode.ExtensionContext): Promise<void> {
		const profilePath = resolveProfileConfigPath(context);
		const profileFileExists = fs.existsSync(profilePath);
		const fileData = await readProfilesFromFile(profilePath, this.outputChannel);
		if (fileData && fileData.profiles.length > 0) {
			let migratedPlaintextApiKey = false;
			const profiles: Profile[] = [];
			for (const profile of fileData.profiles) {
				const id = profile.id || createProfileId();
				const plaintextApiKey = typeof profile.apiKey === 'string' ? profile.apiKey.trim() : '';
				const apiKeyEnv = normalizeOptionalString(profile.apiKeyEnv);
				if (plaintextApiKey) {
					await storeProfileApiKey(context, id, plaintextApiKey, this.outputChannel);
					migratedPlaintextApiKey = true;
				}

				profiles.push({
					id,
					name: profile.name || 'Default',
					baseUrl: profile.baseUrl || '',
					model: profile.model || DEFAULT_LLM_MODEL,
					provider: normalizeProvider(profile.provider),
					maxTokens: normalizeWorkflowMaxTokens(profile.maxTokens),
					apiKeyEnv,
					apiKey: plaintextApiKey || await readProfileApiKey(context, id, apiKeyEnv, this.outputChannel)
				});
			}
			this.profiles = profiles;
			const activeExists = this.profiles.some((profile) => profile.id === fileData.activeProfileId);
			this.activeProfileId = activeExists ? fileData.activeProfileId : this.profiles[0].id;
			if (migratedPlaintextApiKey) {
				await this.persistProfiles(context);
			}
			return;
		}
		if (profileFileExists && !fileData) {
			this.appendUiLog('error', 'Profile config file is invalid. Fix JSON and click Reload.');
			if (this.profiles.length > 0) {
				return;
			}
		}

		const legacyApiKey = await readLegacyApiKey(context, this.outputChannel);
		const defaultProfile: Profile = {
			id: createProfileId(),
			name: 'Default',
			baseUrl: (getConfigurationValue<string>('baseUrl', DEFAULT_LLM_BASE_URL) || DEFAULT_LLM_BASE_URL).trim(),
			model: (getConfigurationValue<string>('model', DEFAULT_LLM_MODEL) || DEFAULT_LLM_MODEL).trim(),
			provider: 'other',
			maxTokens: DEFAULT_WORKFLOW_MAX_TOKENS,
			apiKey: legacyApiKey
		};
		this.profiles = [defaultProfile];
		this.activeProfileId = defaultProfile.id;
		if (legacyApiKey) {
			await storeProfileApiKey(context, defaultProfile.id, legacyApiKey, this.outputChannel);
		}
		await this.persistProfiles(context);
	}

	private async persistProfiles(context: vscode.ExtensionContext): Promise<void> {
		const profilePath = resolveProfileConfigPath(context);
		const data: ProfileFileData = {
			version: PROFILE_FILE_VERSION,
			activeProfileId: this.activeProfileId,
			profiles: this.profiles.map((profile) => ({
				id: profile.id,
				name: profile.name,
				baseUrl: profile.baseUrl,
				model: profile.model,
				provider: profile.provider,
				maxTokens: normalizeWorkflowMaxTokens(profile.maxTokens),
				...(profile.apiKeyEnv ? { apiKeyEnv: profile.apiKeyEnv } : {})
			}))
		};
		await writeProfilesToFile(profilePath, data, this.outputChannel);

		const activeProfile = this.getActiveProfile();
		if (activeProfile) {
			const config = getExtensionConfiguration();
			const target = getConfigurationTarget();
			await config.update('baseUrl', activeProfile.baseUrl, target);
			await config.update('model', activeProfile.model, target);
		}
	}
}

class EditorAssistant implements vscode.InlineCompletionItemProvider, vscode.Disposable {
	private readonly backendServer: BackendServerManager;
	private readonly completionCache = new Map<string, { text: string; expiresAt: number }>();
	private readonly pendingCompletions = new Map<string, Promise<string | undefined>>();
	private readonly lastEdits = new Map<string, number>();
	private readonly inFlightControllers = new Map<string, AbortController>();
	private readonly failureCooldown = new Map<string, number>();
	private lastError = '';
	private readonly statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);

	public constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly outputChannel: vscode.OutputChannel
	) {
		this.backendServer = new BackendServerManager(context, outputChannel);
		context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
			if (event.document.languageId !== 'python' || event.contentChanges.length === 0) { return; }
			const uri = event.document.uri.toString();
			this.lastEdits.set(uri, Date.now());
			for (const [key, controller] of this.inFlightControllers) {
				if (key.startsWith(uri + ':')) { controller.abort(); }
			}
		}));
	}

	public dispose(): void {
		this.backendServer.stop();
		this.completionCache.clear();
		this.pendingCompletions.clear();
		for (const controller of this.inFlightControllers.values()) { controller.abort(); }
		this.inFlightControllers.clear();
		this.statusBar.dispose();
	}

	public async provideInlineCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		completionContext: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<vscode.InlineCompletionItem[] | undefined> {
		if (!getConfigurationValue<boolean>('inlineCompletion.enabled', true) || document.languageId !== 'python') {
			return undefined;
		}
		const automatic = completionContext.triggerKind === vscode.InlineCompletionTriggerKind.Automatic;
		if (automatic && getConfigurationValue<string>('inlineCompletion.triggerMode', 'automatic') !== 'automatic') {
			return undefined;
		}
		if (automatic && document.lineAt(position.line).text.trim().length < 2) {
			return undefined;
		}
		const requestedVersion = document.version;
		const requestedPosition = position;
		const uri = document.uri.toString();
		if (automatic) {
			const idleMs = Math.max(250, Math.min(5000, getConfigurationValue<number>('inlineCompletion.debounceMs', 700)));
			// Use the most recent edit event rather than the last model request as the debounce source.
			// VS Code may invoke the provider repeatedly while the user is idle; cache prevents re-generation.
			const elapsed = Date.now() - (this.lastEdits.get(uri) ?? 0);
			const remaining = Math.max(0, idleMs - elapsed);
			if (remaining > 0) {
				await new Promise<void>(resolve => {
					if (token.isCancellationRequested) { resolve(); return; }
					let subscription: vscode.Disposable | undefined;
					const timer = setTimeout(() => { subscription?.dispose(); resolve(); }, remaining);
					subscription = token.onCancellationRequested(() => {
						clearTimeout(timer);
						subscription?.dispose();
						resolve();
					});
				});
			}
			if (token.isCancellationRequested || document.version !== requestedVersion
				|| Date.now() - (this.lastEdits.get(uri) ?? 0) < idleMs) {
				return undefined;
			}
		}
		const functionContext = getPythonFunctionContext(document, position);
		const maxLines = Math.max(20, Math.min(200, getConfigurationValue<number>('inlineCompletion.maxContextLines', 80)));
		let completionInput = functionContext && functionContext.offset >= 1
			? buildInlineCompletionInput(functionContext, maxLines) : undefined;
		if (!completionInput) {
			// General Python completion outside a function, using bounded nearby lines.
			const offset = document.offsetAt(position);
			const before = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
			const after = document.getText().slice(offset);
			const prefix = before.split('\\n').slice(-maxLines).join('\\n');
			const suffix = after.split('\\n').slice(0, 24).join('\\n');
			if (!prefix.trim()) { return undefined; }
			completionInput = { prefix: prefix.slice(-12000), suffix: suffix.slice(0, 4000) };
		}
		const profile = await getInlineCompletionProfile(this.context, this.outputChannel).catch(() => undefined);
		if (!profile || token.isCancellationRequested || document.version !== requestedVersion) { return undefined; }
		const maxTokens = Math.max(32, Math.min(512, getConfigurationValue<number>('inlineCompletion.maxTokens', 192)));
		const cacheKey = createHash('sha256').update(JSON.stringify({
			prefix: completionInput.prefix, suffix: completionInput.suffix,
			model: profile.model, provider: profile.provider, baseUrl: profile.baseUrl,
			maxTokens
		})).digest('hex');
		const now = Date.now();
		const cached = this.completionCache.get(cacheKey);
		let completion: string | undefined;
		if (cached && cached.expiresAt > now && automatic) {
			completion = cached.text;
		} else if (automatic && (this.failureCooldown.get(cacheKey) ?? 0) > now) {
			return undefined;
		} else {
			let request = this.pendingCompletions.get(cacheKey);
			if (!request) {
				const controller = new AbortController();
				const requestKey = uri + ':' + cacheKey;
				this.inFlightControllers.set(requestKey, controller);
				request = this.requestCompletion(completionInput.prefix, completionInput.suffix, !automatic, profile, controller.signal)
					.then(value => {
						if (!controller.signal.aborted) {
							// Cache even empty completions to avoid repeated inference at an idle cursor.
							this.completionCache.delete(cacheKey);
							this.completionCache.set(cacheKey, {
								text: value ?? '',
								expiresAt: Date.now() + (value ? 5 * 60_000 : 30_000)
							});
							while (this.completionCache.size > 80) {
								const oldest = this.completionCache.keys().next().value;
								if (oldest) { this.completionCache.delete(oldest); }
							}
						}
						return value;
					}).finally(() => {
						this.pendingCompletions.delete(cacheKey);
						this.inFlightControllers.delete(requestKey);
					});
				this.pendingCompletions.set(cacheKey, request);
			}
			// A superseded VS Code request should not keep occupying the model server.
			const controller = this.inFlightControllers.get(uri + ':' + cacheKey);
			const cancellation = token.onCancellationRequested(() => controller?.abort());
			try { completion = await request; } finally { cancellation.dispose(); }
		}
		if (token.isCancellationRequested || !completion || document.version !== requestedVersion
			|| !position.isEqual(requestedPosition)
			|| !vscode.window.activeTextEditor?.selection.active.isEqual(position)) {
			return undefined;
		}

		return [new vscode.InlineCompletionItem(
			completion,
			new vscode.Range(position, position),
			{
				command: `${EXTENSION_ID}.offerTestsForAcceptedCompletion`,
				title: 'AdaAssist: Offer test suggestions'
			}
		)];
	}

	public async offerTestsForAcceptedCompletion(): Promise<void> {
		// Inline-completion commands run as the edit is accepted. Wait briefly so the
		// function extractor sees the accepted text rather than the prior document version.
		await delay(200);
		const editor = vscode.window.activeTextEditor;
		if (!editor || editor.document.languageId !== 'python' || !getPythonFunctionContext(editor.document, editor.selection.active)) {
			return;
		}
		const action = await vscode.window.showInformationMessage(
			'补全已插入。是否根据当前函数生成测试建议？',
			'生成测试建议',
			'稍后'
		);
		if (action === '生成测试建议') {
			await this.generateTestsForCurrentFunction();
		}
	}

	public async generateTestsForCurrentFunction(): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor || editor.document.languageId !== 'python') {
			void vscode.window.showWarningMessage('请将光标放在需要测试的 Python 函数内。');
			return;
		}
		const functionContext = getPythonFunctionContext(editor.document, editor.selection.active);
		if (!functionContext) {
			void vscode.window.showWarningMessage('未找到当前光标所在的 Python 函数。');
			return;
		}

		try {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: `AdaAssist: 正在为 ${functionContext.name} 生成测试建议...`
			}, async () => {
				const profile = await getActiveProfileForEditor(this.context, this.outputChannel);
				if (!profile) {
					throw new Error('未找到可用的 LLM 配置。请先打开 AdaAssist 设置并检查配置。');
				}
				this.outputChannel.appendLine(`[test suggestions] function=${functionContext.name}; model=${profile.model}; base_url=${profile.baseUrl}`);
				const payload = await this.backendServer.request<TestSuggestionResponse>('/api/editor/test-suggestions', {
					method: 'POST',
					body: JSON.stringify({
						source: functionContext.source,
						function_name: functionContext.name,
						language: 'python',
						llm: profileToRequestConfig(profile)
					})
				});
				const tests = payload.tests?.trim();
				if (!tests) {
					throw new Error('模型没有返回测试建议。');
				}
				const importSetup = buildTestImportSetup(editor.document, functionContext.name);
				const content = [
					'# AdaAssist 测试建议：运行前请检查导入语句和断言。',
					importSetup,
					'',
					tests,
					''
				].join('\n');
				const testDocument = await vscode.workspace.openTextDocument({ language: 'python', content });
				await vscode.window.showTextDocument(testDocument, { preview: false });
			});
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			this.outputChannel.appendLine(`[test suggestions] failed: ${detail}`);
			const action = await vscode.window.showErrorMessage(`AdaAssist 测试生成失败：${detail}`, '打开输出');
			if (action === '打开输出') {
				this.outputChannel.show(true);
			}
		}
	}

	private async requestCompletion(prefix: string, suffix: string, manual: boolean, profile: Profile, signal: AbortSignal): Promise<string | undefined> {
		this.setCompletionProgress(true, manual ? '正在手动生成补全...' : '正在生成补全...');
		try {
			const payload = await this.backendServer.request<InlineCompletionResponse>('/api/editor/completions', {
				signal,
				method: 'POST',
				body: JSON.stringify({
					prefix,
					suffix,
					language: 'python',
					llm: profileToRequestConfig(profile),
					max_tokens: Math.max(32, Math.min(512, getConfigurationValue<number>('inlineCompletion.maxTokens', 192)))
				})
			});
			const completion = sanitizeInlineCompletion(payload.completion ?? '');
			const generation = payload.generation;
			const usage = generation?.usage;
			const feedback = completion
				? `已生成 ${completion.split('\n').length} 行补全${generation?.duration_ms ? `，${generation.duration_ms} ms` : ''}${usage?.total_tokens !== undefined ? `，${usage.total_tokens} tokens` : ''}`
				: '模型未返回可显示的补全。';
			this.outputChannel.appendLine(`[inline completion] ${feedback}; model=${profile.model}; strategy=${generation?.strategy ?? 'unknown'}`);
			this.setCompletionProgress(false, feedback);
			return completion;
		} catch (error) {
			if (signal.aborted) { return undefined; }
			const detail = error instanceof Error ? error.message : String(error);
			const cooldownKey = createHash('sha256').update(JSON.stringify({ prefix, suffix, model: profile.model, provider: profile.provider, baseUrl: profile.baseUrl, maxTokens: Math.max(32, Math.min(512, getConfigurationValue<number>('inlineCompletion.maxTokens', 192))) })).digest('hex');
			this.failureCooldown.set(cooldownKey, Date.now() + 10_000);
			if (detail !== this.lastError) {
				this.lastError = detail;
				this.outputChannel.appendLine(`[inline completion] ${detail}`);
			}
			return undefined;
		} finally {
			if (this.statusBar.text.includes('sync~spin')) {
				this.setCompletionProgress(false, '');
			}
		}
	}

	public async triggerInlineCompletion(): Promise<void> {
		await vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
	}

	private setCompletionProgress(active: boolean, text: string): void {
		if (!active) {
			if (!text) {
				this.statusBar.hide();
				return;
			}
			this.statusBar.text = `$(check) AdaAssist ${text}`;
			this.statusBar.tooltip = 'Details are also recorded in the AdaAssist output channel.';
			this.statusBar.show();
			setTimeout(() => this.statusBar.hide(), 5000);
			return;
		}
		this.statusBar.text = `$(sync~spin) AdaAssist ${text}`;
		this.statusBar.tooltip = `AdaAssist 行内补全模型：${getInlineCompletionSettings().model}`;
		this.statusBar.show();
	}
}

export function activate(context: vscode.ExtensionContext) {
	const outputChannel = vscode.window.createOutputChannel(EXTENSION_DISPLAY_NAME);
	context.subscriptions.push(outputChannel);
	const editorAssistant = new EditorAssistant(context, outputChannel);
	context.subscriptions.push(
		editorAssistant,
		vscode.languages.registerInlineCompletionItemProvider(
			{ language: 'python' },
			editorAssistant
		),
		vscode.commands.registerCommand(
			`${EXTENSION_ID}.offerTestsForAcceptedCompletion`,
			() => editorAssistant.offerTestsForAcceptedCompletion()
		),
		vscode.commands.registerCommand(
			`${EXTENSION_ID}.generateTestsForCurrentFunction`,
			() => editorAssistant.generateTestsForCurrentFunction()
		),
		vscode.commands.registerCommand(
			`${EXTENSION_ID}.triggerInlineCompletion`,
			() => editorAssistant.triggerInlineCompletion()
		)
	);

	const ensureSidebarProvider = async (): Promise<AdacoderChatPanel> => {
		try {
			return await AdacoderChatPanel.createOrShow(context, outputChannel);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			outputChannel.appendLine(`[activate error] ${message}`);
			throw error;
		}
	};

	void ensureSidebarProvider();

	const registerCommand = (suffix: string, callback: () => Promise<void>) => {
		return [
			vscode.commands.registerCommand(`${EXTENSION_ID}.${suffix}`, callback),
			vscode.commands.registerCommand(`${LEGACY_EXTENSION_ID}.${suffix}`, callback)
		];
	};

	const openChatDisposables = registerCommand('openChat', async () => {
		const panel = await ensureSidebarProvider();
		await panel.reveal();
		panel.showTaskPage();
	});

	const openSettingsDisposables = registerCommand('openSettings', async () => {
		const panel = await ensureSidebarProvider();
		await panel.reveal();
		panel.showSettingsPage();
	});

	const openProfileConfigDisposables = registerCommand('openProfileConfig', async () => {
		await openProfileConfigFile(context);
		const panel = await ensureSidebarProvider();
		await panel.reveal();
		panel.showSettingsPage();
	});

	const selectPythonDisposables = registerCommand('selectPythonInterpreter', async () => {
		const panel = await ensureSidebarProvider();
		await panel.selectPythonInterpreter();
		await panel.reveal();
		panel.showSettingsPage();
	});

	const runWorkflowDisposables = registerCommand('runWorkflow', async () => {
		const panel = await ensureSidebarProvider();
		await panel.reveal();
		panel.showTaskPage();

		const selection = getSelectedText();
		if (selection) {
			panel.prefillProblem(selection);
		}
	});

	const runFromSelectionDisposables = registerCommand('runFromSelection', async () => {
		const selection = getSelectedText();
		if (!selection) {
			void vscode.window.showWarningMessage('Please select code or text first.');
			return;
		}

		const panel = await ensureSidebarProvider();
		await panel.reveal();
		panel.showTaskPage();
		panel.prefillProblem(selection);
		void vscode.window.showInformationMessage('Requirement text loaded from the current selection.');
	});

	context.subscriptions.push(
		...openChatDisposables,
		...openSettingsDisposables,
		...openProfileConfigDisposables,
		...selectPythonDisposables,
		...runWorkflowDisposables,
		...runFromSelectionDisposables
	);
}

export async function deactivate(): Promise<void> {
	await AdacoderChatPanel.currentPanel?.disposeRuntime();
}

function getConfigurationTarget(): vscode.ConfigurationTarget {
	return vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
		? vscode.ConfigurationTarget.Workspace
		: vscode.ConfigurationTarget.Global;
}

function getExtensionConfiguration(): vscode.WorkspaceConfiguration {
	return vscode.workspace.getConfiguration(EXTENSION_ID);
}

function getLegacyConfiguration(): vscode.WorkspaceConfiguration {
	return vscode.workspace.getConfiguration(LEGACY_EXTENSION_ID);
}

function hasConfigurationOverride(section: string, key: string): boolean {
	const inspect = vscode.workspace.getConfiguration(section).inspect(key);
	return inspect?.workspaceFolderValue !== undefined
		|| inspect?.workspaceValue !== undefined
		|| inspect?.globalValue !== undefined;
}

function getConfigurationValue<T>(key: string, defaultValue: T): T {
	if (hasConfigurationOverride(EXTENSION_ID, key)) {
		return getExtensionConfiguration().get<T>(key, defaultValue);
	}
	if (hasConfigurationOverride(LEGACY_EXTENSION_ID, key)) {
		return getLegacyConfiguration().get<T>(key, defaultValue);
	}
	return getExtensionConfiguration().get<T>(key, defaultValue);
}

function getInlineCompletionSettings(): InlineCompletionSettingsView {
	const triggerMode = getConfigurationValue<string>('inlineCompletion.triggerMode', 'automatic') === 'manual'
		? 'manual'
		: 'automatic';
	return {
		enabled: getConfigurationValue<boolean>('inlineCompletion.enabled', true),
		provider: normalizeProvider(getConfigurationValue<string>('inlineCompletion.provider', 'vllm')),
		baseUrl: (getConfigurationValue<string>('inlineCompletion.baseUrl', DEFAULT_INLINE_BASE_URL) || DEFAULT_INLINE_BASE_URL).trim(),
		model: (getConfigurationValue<string>('inlineCompletion.model', DEFAULT_INLINE_MODEL) || DEFAULT_INLINE_MODEL).trim(),
		triggerMode,
		debounceMs: Math.max(250, Math.min(5000, getConfigurationValue<number>('inlineCompletion.debounceMs', 700))),
		maxTokens: Math.max(32, Math.min(512, getConfigurationValue<number>('inlineCompletion.maxTokens', 192)))
	};
}

async function saveInlineCompletionSettings(message: Record<string, unknown>): Promise<void> {
	const config = getExtensionConfiguration();
	const target = getConfigurationTarget();
	const provider = normalizeProvider(typeof message.provider === 'string' ? message.provider : 'vllm');
	const baseUrl = typeof message.baseUrl === 'string' ? message.baseUrl.trim() : '';
	const model = typeof message.model === 'string' ? message.model.trim() : '';
	if (!baseUrl || !model) {
		throw new Error('行内补全的 Base URL 和模型不能为空。');
	}
	const debounceMs = typeof message.debounceMs === 'number'
		? Math.max(250, Math.min(5000, Math.round(message.debounceMs)))
		: 700;
	const maxTokens = typeof message.maxTokens === 'number'
		? Math.max(32, Math.min(512, Math.round(message.maxTokens)))
		: 192;
	await config.update('inlineCompletion.enabled', message.enabled !== false, target);
	await config.update('inlineCompletion.provider', provider, target);
	await config.update('inlineCompletion.baseUrl', baseUrl, target);
	await config.update('inlineCompletion.model', model, target);
	await config.update('inlineCompletion.triggerMode', message.triggerMode === 'manual' ? 'manual' : 'automatic', target);
	await config.update('inlineCompletion.debounceMs', debounceMs, target);
	await config.update('inlineCompletion.maxTokens', maxTokens, target);
}

function createProfileId(): string {
	return randomBytes(8).toString('hex');
}

function normalizeProvider(value: string | undefined): ProviderType {
	switch (value) {
		case 'openai':
		case 'claude':
		case 'other':
		case 'ollama':
		case 'vllm':
			return value;
		default:
			return 'other';
	}
}

function normalizeOptionalString(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed || undefined;
}

function profileApiKeySecretKey(profileId: string): string {
	return `${PROFILE_API_KEY_SECRET_PREFIX}.${profileId}`;
}

function resolveProfileConfigPath(context: vscode.ExtensionContext): string {
	const configuredPath = (getConfigurationValue<string>('profileConfigPath', DEFAULT_PROFILE_CONFIG_RELATIVE_PATH) || '').trim();
	const rawPath = configuredPath || DEFAULT_PROFILE_CONFIG_RELATIVE_PATH;
	const expandedPath = expandPathVariables(rawPath, context);
	const resolvedPath = path.isAbsolute(expandedPath) ? expandedPath : resolveRelativePath(expandedPath, context);

	const usesDefaultPath = rawPath === DEFAULT_PROFILE_CONFIG_RELATIVE_PATH;
	const hasCustomPath = hasConfigurationOverride(EXTENSION_ID, 'profileConfigPath')
		|| hasConfigurationOverride(LEGACY_EXTENSION_ID, 'profileConfigPath');
	if (!hasCustomPath && usesDefaultPath && !fs.existsSync(resolvedPath)) {
		const legacyExpandedPath = expandPathVariables(LEGACY_PROFILE_CONFIG_RELATIVE_PATH, context);
		const legacyResolvedPath = path.isAbsolute(legacyExpandedPath)
			? legacyExpandedPath
			: resolveRelativePath(legacyExpandedPath, context);
		if (fs.existsSync(legacyResolvedPath)) {
			return legacyResolvedPath;
		}
	}

	return resolvedPath;
}

async function openProfileConfigFile(context: vscode.ExtensionContext): Promise<void> {
	const profilePath = resolveProfileConfigPath(context);
	if (!fs.existsSync(profilePath)) {
		const emptyData: ProfileFileData = {
			version: PROFILE_FILE_VERSION,
			activeProfileId: '',
			profiles: []
		};
		fs.mkdirSync(path.dirname(profilePath), { recursive: true });
		fs.writeFileSync(profilePath, `${JSON.stringify(emptyData, null, 2)}\n`, 'utf8');
	}

	const doc = await vscode.workspace.openTextDocument(profilePath);
	await vscode.window.showTextDocument(doc, { preview: false });
}

async function readLegacyApiKey(
	context: vscode.ExtensionContext,
	outputChannel: vscode.OutputChannel
): Promise<string> {
	try {
		return (await context.secrets.get(LEGACY_API_KEY_SECRET)) ?? '';
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		outputChannel.appendLine(`[warning] Failed to read legacy api key: ${message}`);
		return '';
	}
}

async function readProfileApiKey(
	context: vscode.ExtensionContext,
	profileId: string,
	apiKeyEnv: string | undefined,
	outputChannel: vscode.OutputChannel
): Promise<string> {
	if (apiKeyEnv) {
		return process.env[apiKeyEnv] ?? '';
	}

	try {
		return (await context.secrets.get(profileApiKeySecretKey(profileId))) ?? '';
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		outputChannel.appendLine(`[warning] Failed to read profile api key: ${message}`);
		return '';
	}
}

async function storeProfileApiKey(
	context: vscode.ExtensionContext,
	profileId: string,
	apiKey: string,
	outputChannel: vscode.OutputChannel
): Promise<void> {
	try {
		await context.secrets.store(profileApiKeySecretKey(profileId), apiKey);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		outputChannel.appendLine(`[error] Failed to store profile api key: ${message}`);
		throw new Error(`Failed to store profile api key: ${message}`);
	}
}

async function deleteProfileApiKey(
	context: vscode.ExtensionContext,
	profileId: string,
	outputChannel: vscode.OutputChannel
): Promise<void> {
	try {
		await context.secrets.delete(profileApiKeySecretKey(profileId));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		outputChannel.appendLine(`[warning] Failed to delete profile api key: ${message}`);
	}
}

async function readProfilesFromFile(
	profilePath: string,
	outputChannel: vscode.OutputChannel
): Promise<ProfileFileData | undefined> {
	if (!fs.existsSync(profilePath)) {
		return undefined;
	}

	try {
		const raw = fs.readFileSync(profilePath, 'utf8');
		const parsed = JSON.parse(raw) as unknown;
		if (!isRecord(parsed)) {
			return undefined;
		}

		const rawProfiles = Array.isArray(parsed.profiles) ? parsed.profiles : [];
		const profiles: ProfileFileProfile[] = [];
		for (const item of rawProfiles) {
			if (!isRecord(item)) {
				continue;
			}
			profiles.push({
				id: typeof item.id === 'string' && item.id ? item.id : createProfileId(),
				name: typeof item.name === 'string' && item.name ? item.name : 'Profile',
				baseUrl: typeof item.baseUrl === 'string' ? item.baseUrl : '',
				model: typeof item.model === 'string' && item.model ? item.model : DEFAULT_LLM_MODEL,
				provider: normalizeProvider(typeof item.provider === 'string' ? item.provider : 'other'),
				maxTokens: normalizeWorkflowMaxTokens(item.maxTokens),
				apiKeyEnv: normalizeOptionalString(item.apiKeyEnv),
				apiKey: typeof item.apiKey === 'string' ? item.apiKey : ''
			});
		}

		const activeProfileId = typeof parsed.activeProfileId === 'string' ? parsed.activeProfileId : '';
		return {
			version: PROFILE_FILE_VERSION,
			activeProfileId,
			profiles
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		outputChannel.appendLine(`[warning] Failed to read profile file: ${message}`);
		return undefined;
	}
}

async function writeProfilesToFile(
	profilePath: string,
	data: ProfileFileData,
	outputChannel: vscode.OutputChannel,
): Promise<void> {
	try {
		fs.mkdirSync(path.dirname(profilePath), { recursive: true });
		fs.writeFileSync(profilePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		outputChannel.appendLine(`[error] Failed to write profile file: ${message}`);
		throw new Error(`Failed to write profile file: ${message}`);
	}
}

function appendDraftText(current: string, incoming: string): string {
	const existing = current.trimEnd();
	const addition = incoming.trim();
	if (!existing) {
		return addition;
	}
	if (!addition) {
		return existing;
	}
	return `${existing}\n\n${addition}`;
}

function getSelectedText(): string {
	const editor = vscode.window.activeTextEditor;
	if (!editor || editor.selection.isEmpty) {
		return '';
	}
	const selected = editor.document.getText(editor.selection);
	return selected.trim() ? selected : '';
}

async function getActiveProfileForEditor(
	context: vscode.ExtensionContext,
	outputChannel: vscode.OutputChannel
): Promise<Profile | undefined> {
	const profilePath = resolveProfileConfigPath(context);
	const fileData = await readProfilesFromFile(profilePath, outputChannel);
	if (fileData?.profiles.length) {
		const selected = fileData.profiles.find((profile) => profile.id === fileData.activeProfileId)
			?? fileData.profiles[0];
		if (selected) {
			const id = selected.id || createProfileId();
			const apiKey = selected.apiKey?.trim()
				|| await readProfileApiKey(context, id, normalizeOptionalString(selected.apiKeyEnv), outputChannel);
			return {
				id,
				name: selected.name || 'Default',
				baseUrl: selected.baseUrl.trim(),
				model: selected.model.trim() || DEFAULT_LLM_MODEL,
				provider: normalizeProvider(selected.provider),
				maxTokens: normalizeWorkflowMaxTokens(selected.maxTokens),
				apiKeyEnv: normalizeOptionalString(selected.apiKeyEnv),
				apiKey
			};
		}
	}

	return {
		id: 'editor-default',
		name: 'Default',
		baseUrl: (getConfigurationValue<string>('baseUrl', DEFAULT_LLM_BASE_URL) || DEFAULT_LLM_BASE_URL).trim(),
		model: (getConfigurationValue<string>('model', DEFAULT_LLM_MODEL) || DEFAULT_LLM_MODEL).trim(),
		provider: 'other',
		maxTokens: DEFAULT_WORKFLOW_MAX_TOKENS,
		apiKey: await readLegacyApiKey(context, outputChannel)
	};
}

async function getInlineCompletionProfile(
	context: vscode.ExtensionContext,
	outputChannel: vscode.OutputChannel
): Promise<Profile> {
	const provider = normalizeProvider(getConfigurationValue<string>('inlineCompletion.provider', 'vllm'));
	return {
		id: 'inline-completion',
		name: 'Inline Completion',
		baseUrl: (getConfigurationValue<string>('inlineCompletion.baseUrl', DEFAULT_INLINE_BASE_URL) || DEFAULT_INLINE_BASE_URL).trim(),
		model: (getConfigurationValue<string>('inlineCompletion.model', DEFAULT_INLINE_MODEL) || DEFAULT_INLINE_MODEL).trim(),
		provider,
		maxTokens: DEFAULT_WORKFLOW_MAX_TOKENS,
		apiKey: provider === 'vllm' || provider === 'ollama' ? '' : await readLegacyApiKey(context, outputChannel)
	};
}

function profileToRequestConfig(profile: Profile): LlmRequestConfig {
	return {
		base_url: profile.baseUrl,
		api_key: profile.apiKey,
		model: profile.model,
		provider: profile.provider,
		max_tokens: normalizeWorkflowMaxTokens(profile.maxTokens)
	};
}

function getPythonFunctionContext(
	document: vscode.TextDocument,
	position: vscode.Position
): EditorFunctionContext | undefined {
	const functionPattern = /^(\s*)(?:async\s+def|def)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/;
	let startLine = -1;
	let name = '';
	let indentation = 0;
	for (let line = Math.min(position.line, document.lineCount - 1); line >= 0; line -= 1) {
		const match = document.lineAt(line).text.match(functionPattern);
		if (match) {
			startLine = line;
			name = match[2];
			indentation = match[1].replace(/\t/g, '    ').length;
			break;
		}
	}
	if (startLine < 0 || !name) {
		return undefined;
	}

	let endLine = document.lineCount;
	for (let line = startLine + 1; line < document.lineCount; line += 1) {
		const text = document.lineAt(line).text;
		if (!text.trim() || text.trimStart().startsWith('#')) {
			continue;
		}
		const currentIndent = (text.match(/^\s*/)?.[0] ?? '').replace(/\t/g, '    ').length;
		if (currentIndent <= indentation) {
			endLine = line;
			break;
		}
	}
	const start = new vscode.Position(startLine, 0);
	const end = endLine < document.lineCount
		? new vscode.Position(endLine, 0)
		: document.positionAt(document.getText().length);
	const source = document.getText(new vscode.Range(start, end));
	const offset = document.offsetAt(position) - document.offsetAt(start);
	if (offset < 0 || offset > source.length) {
		return undefined;
	}
	return { name, source, start, offset };
}

function buildInlineCompletionInput(
	functionContext: EditorFunctionContext,
	maxLines: number
): { prefix: string; suffix: string } | undefined {
	const source = functionContext.source;
	if (source.length > 16_000) {
		return undefined;
	}
	let prefix = source.slice(0, functionContext.offset);
	let suffix = source.slice(functionContext.offset);
	const prefixLines = prefix.split('\n');
	if (prefixLines.length > maxLines) {
		prefix = [
			prefixLines[0],
			'# AdaAssist omitted earlier function lines for context.',
			...prefixLines.slice(-(maxLines - 2))
		].join('\n');
	}
	const suffixLines = suffix.split('\n');
	if (suffixLines.length > 24) {
		suffix = suffixLines.slice(0, 24).join('\n');
	}
	return prefix.trim() ? { prefix, suffix } : undefined;
}

function sanitizeInlineCompletion(completion: string): string {
	let cleaned = completion.replaceAll('Ġ', ' ').replaceAll('Ċ', '\n').trim();
	const fenced = cleaned.match(/^```(?:python)?\s*\n([\s\S]*?)\n?```$/i);
	if (fenced) {
		cleaned = fenced[1].trim();
	}
	const lines = cleaned.split('\n');
	if (lines.length > 1 && /^\s*(?:async\s+)?def\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(lines[0])) {
		lines.shift();
		// A top-level comment after a repeated function header is model commentary,
		// not part of the insertion requested at the cursor.
		const firstCommentAtTopLevel = lines.findIndex((line) => /^\s*#/.test(line));
		cleaned = lines.slice(0, firstCommentAtTopLevel >= 0 ? firstCommentAtTopLevel : lines.length).join('\n').trimEnd();
	}
	return cleaned.length <= 5_000 ? cleaned : '';
}

function buildTestImportSetup(document: vscode.TextDocument, functionName: string): string {
	const moduleName = getPythonModuleName(document);
	const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath;

	if (moduleName && workspaceFolder) {
		const workspaceLiteral = JSON.stringify(workspaceFolder);
		return [
			'import sys',
			'from pathlib import Path',
			`_ADAASSIST_WORKSPACE = Path(${workspaceLiteral})`,
			'if str(_ADAASSIST_WORKSPACE) not in sys.path:',
			'    sys.path.insert(0, str(_ADAASSIST_WORKSPACE))',
			`from ${moduleName} import ${functionName}`
		].join('\n');
	}

	if (document.uri.scheme === 'file') {
		const sourcePathLiteral = JSON.stringify(document.uri.fsPath);
		return [
			'import importlib.util',
			'import sys',
			'from pathlib import Path',
			`_ADAASSIST_SOURCE = Path(${sourcePathLiteral})`,
			'if str(_ADAASSIST_SOURCE.parent) not in sys.path:',
			'    sys.path.insert(0, str(_ADAASSIST_SOURCE.parent))',
			'_ADAASSIST_SPEC = importlib.util.spec_from_file_location("_adaassist_target", _ADAASSIST_SOURCE)',
			'if _ADAASSIST_SPEC is None or _ADAASSIST_SPEC.loader is None:',
			'    raise ImportError(f"Cannot load {_ADAASSIST_SOURCE}")',
			'_ADAASSIST_MODULE = importlib.util.module_from_spec(_ADAASSIST_SPEC)',
			'sys.modules[_ADAASSIST_SPEC.name] = _ADAASSIST_MODULE',
			'_ADAASSIST_SPEC.loader.exec_module(_ADAASSIST_MODULE)',
			`${functionName} = getattr(_ADAASSIST_MODULE, ${JSON.stringify(functionName)})`
		].join('\n');
	}

	return `# Save the source file before running these tests, then import ${functionName} here.`;
}

function getPythonModuleName(document: vscode.TextDocument): string | undefined {
	if (document.uri.scheme !== 'file') {
		return undefined;
	}

	const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath;
	if (!workspaceFolder) {
		return undefined;
	}

	const relativePath = path.relative(workspaceFolder, document.uri.fsPath);
	if (!relativePath || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
		return undefined;
	}

	const pathParts = relativePath.split(path.sep);
	const fileName = pathParts.pop();
	if (!fileName || path.extname(fileName) !== '.py') {
		return undefined;
	}

	const moduleLeaf = path.basename(fileName, '.py');
	if (!isPythonIdentifier(moduleLeaf)) {
		return undefined;
	}

	if (moduleLeaf === '__init__') {
		if (pathParts.length === 0 || !pathParts.every(isPythonIdentifier)) {
			return undefined;
		}
	} else if (!pathParts.every(isPythonIdentifier)) {
		return undefined;
	}

	// Every directory below the workspace root must be a package. Otherwise a
	// dotted import would silently point at the wrong module or fail at runtime.
	for (let index = 0; index < pathParts.length; index += 1) {
		const packageDirectory = path.join(workspaceFolder, ...pathParts.slice(0, index + 1));
		if (!fs.existsSync(path.join(packageDirectory, '__init__.py'))) {
			return undefined;
		}
	}

	const moduleParts = moduleLeaf === '__init__' ? pathParts : [...pathParts, moduleLeaf];
	return moduleParts.length > 0 ? moduleParts.join('.') : undefined;
}

function isPythonIdentifier(value: string): boolean {
	return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function getWorkspaceRootPath(): string | undefined {
	return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function expandPathVariables(input: string, context: vscode.ExtensionContext): string {
	let result = input;
	const workspaceRoot = getWorkspaceRootPath();
	if (workspaceRoot) {
		result = result.replaceAll('${workspaceFolder}', workspaceRoot);
	}
	result = result.replaceAll('${extensionPath}', context.extensionPath);
	return result;
}

function resolveRelativePath(input: string, context: vscode.ExtensionContext): string {
	const workspaceRoot = getWorkspaceRootPath();
	const candidates: string[] = [];
	if (workspaceRoot) {
		candidates.push(path.join(workspaceRoot, input));
	}
	candidates.push(path.join(context.extensionPath, input));

	for (const candidate of candidates) {
		if (fs.existsSync(candidate)) {
			return candidate;
		}
	}

	return candidates[0] ?? input;
}

function resolveBackendEntryPath(context: vscode.ExtensionContext): string {
	const configuredPath = (
		getConfigurationValue<string>('backendPath', DEFAULT_BACKEND_ENTRY_RELATIVE_PATH)
		|| DEFAULT_BACKEND_ENTRY_RELATIVE_PATH
	).trim();
	const expandedPath = expandPathVariables(configuredPath, context);
	let resolvedPath = path.isAbsolute(expandedPath) ? expandedPath : resolveRelativePath(expandedPath, context);

	if (!fs.existsSync(resolvedPath)) {
		const legacyPath = (getConfigurationValue<string>('bridgePath', '') || '').trim();
		if (legacyPath) {
			const expandedLegacyPath = expandPathVariables(legacyPath, context);
			const resolvedLegacyPath = path.isAbsolute(expandedLegacyPath)
				? expandedLegacyPath
				: resolveRelativePath(expandedLegacyPath, context);
			const siblingMainPath = path.join(path.dirname(resolvedLegacyPath), 'main.py');
			if (fs.existsSync(siblingMainPath)) {
				resolvedPath = siblingMainPath;
			}
		}
	}

	return resolvedPath;
}

function getBackendUrl(): string {
	const host = getConfigurationValue<string>('backendHost', DEFAULT_BACKEND_HOST) || DEFAULT_BACKEND_HOST;
	const port = getConfigurationValue<number>('backendPort', DEFAULT_BACKEND_PORT) || DEFAULT_BACKEND_PORT;
	return `http://${host}:${port}/`;
}

function detectPythonPath(context: vscode.ExtensionContext): string | undefined {
	for (const candidate of knownPythonPaths(context)) {
		if (fs.existsSync(candidate)) {
			return candidate;
		}
	}

	return undefined;
}

function knownPythonPaths(context: vscode.ExtensionContext): string[] {
	const workspaceRoot = getWorkspaceRootPath();
	const candidates: string[] = [];
	if (workspaceRoot) {
		candidates.push(path.join(workspaceRoot, '.venv', 'bin', 'python'));
		candidates.push(path.join(workspaceRoot, 'backend', '.venv', 'bin', 'python'));
		candidates.push(path.join(workspaceRoot, '.venv', 'Scripts', 'python.exe'));
		candidates.push(path.join(workspaceRoot, 'backend', '.venv', 'Scripts', 'python.exe'));
	}
	candidates.push(path.join(context.extensionPath, 'backend', '.venv', 'bin', 'python'));
	candidates.push(path.join(context.extensionPath, 'backend', '.venv', 'Scripts', 'python.exe'));
	return [...new Set(candidates)];
}

function formatPythonCommand(command: PythonCommand): string {
	return [command.executable, ...command.args].join(' ');
}

function resolveConfiguredPythonPath(value: string, context: vscode.ExtensionContext): string {
	const expanded = expandPathVariables(value, context);
	if (path.isAbsolute(expanded)) {
		return expanded;
	}
	const looksLikePath = expanded.includes('/') || expanded.includes('\\') || expanded.startsWith('.');
	return looksLikePath ? resolveRelativePath(expanded, context) : expanded;
}

function getConfiguredPythonPath(context: vscode.ExtensionContext): string {
	const configured = (getConfigurationValue<string>('pythonPath', 'auto') || 'auto').trim();
	return configured.toLowerCase() === 'auto' || configured.startsWith('env:') ? configured : resolveConfiguredPythonPath(configured, context);
}

async function getPythonEnvironmentDisplayLabel(context: vscode.ExtensionContext): Promise<string> {
	const configured = getConfiguredPythonPath(context);
	if (configured.startsWith('env:')) {
		try {
			const env = await getSelectedPythonEnvironment(configured.slice(4));
			return env ? `${env.name} (${env.manager}) · ${env.executable}` : '已选环境不可用，请重新选择';
		} catch { return '无法加载已选环境'; }
	}
	if (configured === 'auto') {
		const active = await getPythonExtensionInterpreterPath();
		return active ? `自动跟随 VS Code · ${active}` : '自动检测本机 Python';
	}
	return configured;
}

async function getPythonExtensionInterpreterPath(): Promise<string | undefined> {
	const active = await getActiveWorkspacePythonEnvironment();
	if (active) { return active.executable; }
	try {
		const result = await vscode.commands.executeCommand<unknown>('python.getActiveEnvironmentPath');
		if (typeof result === 'string') { return result; }
		if (isRecord(result)) {
			if (typeof result.fsPath === 'string') { return result.fsPath; }
			if (typeof result.path === 'string') { return result.path; }
		}
	} catch { /* Python extension may be unavailable. */ }
	return undefined;
}

async function choosePythonInterpreter(context: vscode.ExtensionContext): Promise<string | undefined> {
	for (;;) {
		const configured = getConfiguredPythonPath(context);
		const items: PythonInterpreterPickItem[] = [{
			label: '$(sync) 自动跟随 VS Code 工作区 Python',
			description: '优先使用当前工作区解释器；没有时回退到已有环境或系统 Python。',
			value: 'auto',
			action: 'auto',
			picked: configured === 'auto'
		}];
		const paths = new Set<string>();
		if (configured !== 'auto' && !configured.startsWith('env:')) { paths.add(configured); }
		const active = await getPythonExtensionInterpreterPath();
		if (active) { paths.add(active); }
		let discovered: Awaited<ReturnType<typeof discoverPythonEnvironments>> = [];
		let discoveryError = '';
		try {
			discovered = await discoverPythonEnvironments();
		} catch (error) {
			discoveryError = String(error);
		}
		const explicitEnvironment = configured.startsWith('env:') ? configured.slice(4) : '';
		for (const env of discovered) {
			const runnable = await isRunnablePython({ executable: env.executable, args: env.args });
			items.push({
				label: `$(symbol-method) ${env.name}`,
				description: `${env.manager}${env.version ? ' · Python ' + env.version : ''}`,
				detail: `${env.path} · ${env.executable}${runnable ? '' : ' (不可运行)'}`,
				value: `env:${env.id}`,
				picked: env.id === explicitEnvironment
			});
			paths.delete(env.executable);
		}
		for (const candidate of knownPythonPaths(context)) {
			if (fs.existsSync(candidate)) { paths.add(candidate); }
		}
		for (const candidate of paths) {
			const runnable = await isRunnablePython({ executable: candidate, args: [] });
			items.push({
				label: path.basename(candidate) || candidate,
				description: candidate,
				detail: candidate === active ? 'VS Code 当前解释器' : runnable ? '本地 Python 解释器' : '当前不可运行',
				value: candidate,
				picked: candidate === configured
			});
		}
		items.push({
			label: '$(refresh) 刷新本机 Python 环境',
			description: discoveryError || '重新扫描 Conda、venv、系统 Python 等环境',
			action: 'refresh'
		});
		items.push({
			label: '$(folder-opened) 浏览并选择 Python 可执行文件...',
			description: '手动选择 python.exe 或 python',
			action: 'browse'
		});
		const choice = await vscode.window.showQuickPick(items, {
			title: '选择 AdaAssist 后端 Python 解释器',
			placeHolder: '支持 Conda、venv、系统 Python；请选择已安装后端依赖的环境'
		});
		if (!choice) { return undefined; }
		if (choice.action === 'auto') { return 'auto'; }
		if (choice.action === 'refresh') {
			try {
				const api = await getPythonEnvironmentsApi();
				if (api) {
					await api.refreshEnvironments(undefined);
				} else {
					void vscode.window.showWarningMessage('安装并启用 Python Environments 扩展以扫描 Conda 等本机环境。');
				}
			} catch (error) {
				void vscode.window.showWarningMessage(`Python 环境刷新失败：${String(error)}`);
			}
			continue;
		}
		if (choice.action === 'browse') {
			const picked = await vscode.window.showOpenDialog({
				canSelectFiles: true, canSelectFolders: false, canSelectMany: false,
				openLabel: '选择 Python 解释器'
			});
			if (!picked?.[0]) { return undefined; }
			const executable = picked[0].fsPath;
			if (!await isRunnablePython({ executable, args: [] })) {
				void vscode.window.showErrorMessage(`解释器不可运行：${executable}`);
				continue;
			}
			return executable;
		}
		if (!choice.value) { continue; }
		let command: PythonCommand;
		if (choice.value.startsWith('env:')) {
			const env = discovered.find(item => `env:${item.id}` === choice.value);
			if (!env) { continue; }
			command = { executable: env.executable, args: env.args };
		} else {
			command = { executable: choice.value, args: [] };
		}
		if (!await isRunnablePython(command)) {
			void vscode.window.showErrorMessage(`Python 环境不可运行：${formatPythonCommand(command)}`);
			continue;
		}
		return choice.value;
	}
}

function pythonCommandCandidates(context: vscode.ExtensionContext): PythonCommand[] {
	const configured = (getConfigurationValue<string>('pythonPath', 'auto') || 'auto').trim();
	if (configured && configured.toLowerCase() !== 'auto' && !configured.startsWith('env:')) {
		return [{ executable: resolveConfiguredPythonPath(configured, context), args: [] }];
	}

	const detected = detectPythonPath(context);
	const candidates: PythonCommand[] = detected ? [{ executable: detected, args: [] }] : [];
	if (process.platform === 'win32') {
		candidates.push({ executable: 'python', args: [] }, { executable: 'py', args: ['-3'] });
	} else {
		candidates.push({ executable: 'python3', args: [] }, { executable: 'python', args: [] });
	}
	return candidates.filter((candidate, index, all) =>
		all.findIndex((other) => other.executable === candidate.executable && other.args.join('\u0000') === candidate.args.join('\u0000')) === index
	);
}

async function isRunnablePython(command: PythonCommand): Promise<boolean> {
	return new Promise((resolve) => {
		const probe = spawn(command.executable, [...command.args, '--version'], {
			stdio: 'ignore',
			windowsHide: true
		});
		probe.once('error', () => resolve(false));
		probe.once('exit', (code) => resolve(code === 0));
	});
}

function compactProcessOutput(result: ProcessResult): string {
	return (result.stderr || result.stdout).trim().replace(/\s+/g, ' ').slice(0, 500);
}

async function runCommand(command: PythonCommand, args: string[], timeoutMs = 8000): Promise<ProcessResult> {
	return new Promise((resolve) => {
		let stdout = '';
		let stderr = '';
		let settled = false;
		let timedOut = false;
		let timeout: ReturnType<typeof setTimeout> | undefined;
		const finish = (code: number | null) => {
			if (settled) {
				return;
			}
			settled = true;
			if (timeout) {
				clearTimeout(timeout);
			}
			resolve({ code, stdout, stderr, timedOut });
		};
		const child = spawn(command.executable, [...command.args, ...args], {
			stdio: ['ignore', 'pipe', 'pipe'],
			windowsHide: true
		});
		child.stdout?.on('data', (buffer: Buffer) => {
			stdout = (stdout + buffer.toString()).slice(-8192);
		});
		child.stderr?.on('data', (buffer: Buffer) => {
			stderr = (stderr + buffer.toString()).slice(-8192);
		});
		child.once('error', (error) => {
			stderr = error.message;
			finish(null);
		});
		child.once('exit', (code) => finish(code));
		timeout = setTimeout(() => {
			timedOut = true;
			child.kill();
			finish(null);
		}, timeoutMs);
	});
}

async function resolvePythonCommand(context: vscode.ExtensionContext): Promise<PythonCommand> {
	const configured = getConfiguredPythonPath(context);
	if (configured.startsWith('env:')) {
		const env = await getSelectedPythonEnvironment(configured.slice(4));
		if (!env) {
			throw new Error('所选 Python 环境已删除或不可用，请重新选择解释器。');
		}
		const command = { executable: env.executable, args: env.args };
		if (await isRunnablePython(command)) { return command; }
		throw new Error(`所选 Python 环境不可运行：${formatPythonCommand(command)}`);
	}
	const candidates = pythonCommandCandidates(context);
	if (configured === 'auto') {
		const active = await getPythonExtensionInterpreterPath();
		if (active) { candidates.unshift({ executable: active, args: [] }); }
	}
	for (const candidate of candidates) {
		if (await isRunnablePython(candidate)) { return candidate; }
	}
	throw new Error(
		`No usable Python interpreter found (tried: ${candidates.map(formatPythonCommand).join(', ')}). `
		+ 'Install Python 3.12+ or choose a Python environment in AdaAssist settings.'
	);
}

async function openGeneratedCode(code: string): Promise<void> {
	const doc = await vscode.workspace.openTextDocument({
		language: 'python',
		content: code
	});
	await vscode.window.showTextDocument(doc, { preview: false });
}

async function insertGeneratedCode(code: string): Promise<void> {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		throw new Error('No active editor found for code insertion.');
	}

	const selection = editor.selection;
	const hasSelection = !selection.isEmpty;
	const ok = await editor.edit((editBuilder) => {
		if (hasSelection) {
			editBuilder.replace(selection, code);
			return;
		}
		editBuilder.insert(selection.active, code);
	});

	if (!ok) {
		throw new Error('Failed to insert generated code into the editor.');
	}
}

	function getChatHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
		const nonce = randomBytes(16).toString('base64');
		const csp = [
		"default-src 'none'",
		`img-src ${webview.cspSource} data:`,
		`style-src ${webview.cspSource} 'unsafe-inline'`,
		`script-src ${webview.cspSource} 'nonce-${nonce}'`
		].join('; ');
		const highlightStyleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'highlight.css'));
		const markdownItUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', 'markdown-it', 'dist', 'markdown-it.min.js'));
		const highlightScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', '@highlightjs', 'cdn-assets', 'highlight.min.js'));
		const highlightPythonUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', '@highlightjs', 'cdn-assets', 'languages', 'python.min.js'));
		const highlightMarkdownUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', '@highlightjs', 'cdn-assets', 'languages', 'markdown.min.js'));
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'webview.css'));
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'webview.js'));
		const sendIconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'icons', 'send.svg'));
		const continueIconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'icons', 'continue.svg'));
		const stopIconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'icons', 'stop.svg'));
		const settingsIconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'icons', 'settings.svg'));
		const testsIconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'icons', 'tests.svg'));
		const logsIconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'icons', 'logs.svg'));

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<meta http-equiv="Content-Security-Policy" content="${csp}" />
		<link rel="stylesheet" href="${highlightStyleUri}" />
		<link rel="stylesheet" href="${styleUri}" />
		<title>${EXTENSION_DISPLAY_NAME}</title>
	</head>
<body data-send-icon="${sendIconUri}" data-continue-icon="${continueIconUri}" data-stop-icon="${stopIconUri}">
	<div class="app-shell">
		<header class="app-header">
			<div class="brand">
				<div class="brand-title">${EXTENSION_DISPLAY_NAME}</div>
				<div class="brand-subtitle" data-i18n="workflow">Workflow</div>
			</div>
			<div class="header-actions">
				<button class="nav-icon-btn" id="showOutputBtn" type="button" title="Logs" aria-label="Open Logs" data-i18n-title="logs" data-i18n-aria-label="openLogs">
					<img class="nav-icon" src="${logsIconUri}" alt="" />
				</button>
				<button class="nav-icon-btn" id="openTestsBtn" type="button" title="Tests" aria-label="Open Tests" data-i18n-title="tests" data-i18n-aria-label="openTests">
					<img class="nav-icon" src="${testsIconUri}" alt="" />
				</button>
				<button class="nav-icon-btn language-toggle" id="languageToggleBtn" type="button" title="Switch to Chinese" aria-label="Switch to Chinese">EN</button>
				<button class="nav-icon-btn" id="openSettingsBtn" type="button" title="Settings" aria-label="Open Settings" data-i18n-title="settings" data-i18n-aria-label="openSettings">
					<img class="nav-icon" src="${settingsIconUri}" alt="" />
				</button>
			</div>
		</header>

			<main class="page active" id="taskPage">
			<section class="conversation-shell">
				<div class="section-header conversation-header">
					<div>
						<div class="panel-title" data-i18n="conversation">Conversation</div>
						<div class="panel-copy" data-i18n="conversationHint">Requirements, code, run results, and plans appear here in order.</div>
					</div>
				</div>
				<div class="conversation-scroll" id="conversationScroll">
					<div class="timeline" id="timeline"></div>
				</div>
			</section>

			<section class="tests-drawer hidden" id="testsDrawer" aria-hidden="true">
				<section class="panel tests-panel">
					<div class="panel-header tests-code-toolbar">
						<div>
							<div class="panel-title" data-i18n="tests">Tests</div>

						</div>
						<div class="tests-icon-actions"><button class="tests-icon-button" id="useSelectionForTestsBtn" type="button" title="selectionToTests" aria-label="selectionToTests" data-i18n-title="selectionToTests" data-i18n-aria-label="selectionToTests"><svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3h7M3 6h7M3 9h4M11 8v6M8 11h6"/></svg></button><button class="tests-icon-button" id="replaceSelectionForTestsBtn" type="button" title="replaceWithSelection" aria-label="replaceWithSelection" data-i18n-title="replaceWithSelection" data-i18n-aria-label="replaceWithSelection"><svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h9M2 6h5M2 12h5M8 9h6m-3-3 3 3-3 3"/></svg></button><button class="tests-icon-button" id="generateTestsBtn" type="button" title="generateTests" aria-label="generateTests" data-i18n-title="generateTests" data-i18n-aria-label="generateTests"><svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 13 7-7m-8-4 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Zm9-1 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" transform="translate(2 0) scale(.8)"/></svg></button><button class="tests-icon-button" id="testOptionsToggleBtn" type="button" aria-expanded="false" aria-controls="testGenerationOptions" title="testOptions" aria-label="testOptions" data-i18n-title="testOptions" data-i18n-aria-label="testOptions"><svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4h12M2 12h12M5 2v4M11 10v4"/></svg></button><span class="tests-toolbar-divider" aria-hidden="true"></span><button class="tests-icon-button" id="saveResolvedTestsBtn" type="button" title="saveTests" aria-label="saveTests" data-i18n-title="saveTests" data-i18n-aria-label="saveTests"><svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 2h8l2 2v10H3ZM5 2v4h5V2M5 14V9h6v5"/></svg></button><button class="tests-icon-button" id="closeTestsDrawerBtn" type="button" title="closeTests" aria-label="closeTests" data-i18n-title="closeTests" data-i18n-aria-label="closeTests"><svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg></button></div>
					</div>

					<details class="setup-details setup-card tests-editor-card" id="testSettingsDetails" open>
						<summary class="setup-summary">
							<span data-i18n="testSuite">Test Suite</span>
							<span class="setup-summary-note" id="testsSummary">Auto-generate tests</span>
						</summary>
						<div class="setup-detail-body">
							<div class="field compact-field narrow-field hidden">
								<label for="testModeSelect" data-i18n="testMode">Test Mode</label>
								<select id="testModeSelect">
									<option value="manual" data-i18n="manualTests">Manual Tests</option>
									<option value="generate" data-i18n="generateTests">Generate Tests</option>
								</select>
							</div>
							<div class="manual-tests-shell" id="manualTestsSection">
								<div class="editable-code-shell tests-editor-shell">
									<pre class="code-block hljs editable-code-block"><code id="testInput" role="textbox" aria-multiline="true" aria-label="Test Suite" data-i18n-aria-label="testSuite" class="language-python editable-code" contenteditable="true" spellcheck="false"></code></pre>
								</div>
								<details class="test-options-details" id="testGenerationOptions">
									<summary class="visually-hidden" tabindex="-1" data-i18n="testOptions">Generation options</summary>
									<div class="field">
										<label for="testDescription" data-i18n="testGenerationGoal">Test generation goal</label>
										<textarea id="testDescription" rows="3" data-i18n-placeholder="testDescriptionPlaceholder" placeholder="Optional: describe the cases, constraints, or testing goals the generated tests should cover."></textarea>
									</div>
								</details>
								<div class="hint tests-editor-hint" id="resolvedTestsHint"></div>
								<div class="inline-operation-status" id="testsSaveResult" aria-live="polite"></div>
							</div>
						</div>
					</details>
				</section>
			</section>

			<section class="composer-shell">
					<div class="workflow-progress-anchor" id="workflowProgress" hidden>
						<div class="workflow-progress-popover" id="workflowProgressPopover" hidden>
							<ol class="workflow-progress-list" id="workflowProgressList"></ol>
						</div>
						<button class="workflow-progress-summary" id="workflowProgressToggle" type="button" aria-expanded="false">
							<span class="workflow-progress-marker" id="workflowProgressMarker" aria-hidden="true"></span>
							<span class="workflow-progress-current">
								<span class="workflow-progress-current-title" id="workflowProgressCurrentTitle"></span>
								<span class="workflow-progress-current-detail" id="workflowProgressCurrentDetail"></span>
							</span>
							<span class="workflow-progress-chevron" aria-hidden="true"></span>
						</button>
					</div>
					<div class="composer-input-shell">
						<textarea id="problemInput" placeholder="Describe the coding task, constraints, expected behavior, and anything the model must preserve." data-i18n-placeholder="problemPlaceholder"></textarea>
						<div class="composer-input-toolbar">
							<div class="composer-input-actions">
								<button class="btn secondary" id="useSelectionForProblemBtn" type="button" data-i18n="selectionToPrompt">Selection To Prompt</button>
								<button class="btn subtle" id="clearSessionBtn" type="button" data-i18n="newTask">New Task</button>
							</div>
							<button class="composer-submit-button" id="submitWorkflowBtn" type="button" title="Send workflow" aria-label="Send workflow" data-i18n-title="sendWorkflow" data-i18n-aria-label="sendWorkflow">
								<img class="composer-submit-icon" id="submitWorkflowIcon" src="${sendIconUri}" alt="" />
								<span class="visually-hidden" id="submitWorkflowLabel" data-i18n="send">Send</span>
							</button>
						</div>
					</div>
					<div class="inline-operation-status" id="operationState" aria-live="polite"></div>
					<div class="workflow-error" id="workflowError" role="alert"></div>
					<div class="composer-status" id="composerStatus" aria-live="polite"></div>
					<div class="composer-footer">
						<span class="composer-note" data-i18n="composerNote">Ctrl/Cmd+Enter to send.</span>
						<div class="composer-model-picker" id="composerModelPicker">
							<select id="taskProfileSelect" hidden aria-hidden="true" tabindex="-1"></select>
							<button id="modelPickerButton" class="model-picker-button" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="modelPickerMenu">
								<span id="modelPickerLabel"></span><span class="model-picker-chevron" aria-hidden="true"></span>
							</button>
							<div id="modelPickerMenu" class="model-picker-menu" role="menu" aria-label="Model" data-i18n-aria-label="model" hidden></div>
						</div>
					</div>
				</section>
		</main>

		<main class="page" id="logsPage">
			<section class="panel logs-panel">
				<div class="panel-header logs-page-header">
					<div>
						<div class="panel-title" data-i18n="logViewer">Logs</div>
						<div class="panel-copy" data-i18n="logViewerHint">Inspect workflow events, model calls, usage, and extension messages.</div>
					</div>
					<button class="btn subtle" id="backFromLogsBtn" type="button" data-i18n="back">Back</button>
				</div>
				<div class="logs-toolbar">
					<button class="btn secondary" id="refreshLogsBtn" type="button" data-i18n="refreshLogs">Refresh</button>
					<button class="btn secondary" id="openRawOutputBtn" type="button" data-i18n="openOutput">Open VS Code Output</button>
				</div>
				<div class="visual-log-list" id="visualLogList"></div>
			</section>
		</main>

			<main class="page" id="settingsPage">
				<section class="panel settings-panel">
					<div class="panel-header">
						<div>
							<div class="panel-title" data-i18n="settings">Settings</div>
							<div class="panel-copy" data-i18n="settingsHint">Configure workflow behavior, model access, and the local runtime.</div>
						</div>
						<button class="btn subtle" id="backToWorkflowBtn" type="button" data-i18n="back">Back</button>
					</div>
					<div class="settings-tabs" role="tablist" aria-label="Settings">
						<button class="settings-tab active" id="workflowSettingsTabBtn" type="button" role="tab" data-settings-tab="workflow" data-i18n="workflow">Workflow</button>
						<button class="settings-tab" id="profilesSettingsTabBtn" type="button" role="tab" data-settings-tab="profiles" data-i18n="profiles">Profiles</button>
						<button class="settings-tab" id="runtimeSettingsTabBtn" type="button" role="tab" data-settings-tab="runtime" data-i18n="runtime">Runtime</button>
					</div>
					<section class="settings-tab-panel" id="workflowSettingsTab" data-settings-panel="workflow">
						<div class="field mode-field">
							<label for="executionModeSelect" data-i18n="mode">Mode</label>
							<select id="executionModeSelect" aria-label="Workflow Mode" data-i18n-aria-label="workflowMode">
								<option value="continue" data-i18n="interactiveContinue">Interactive Continue</option>
								<option value="auto" data-i18n="autoFullWorkflow">Auto Full Workflow</option>
							</select>
							<div class="field-hint" id="workflowModeHint" data-i18n="interactiveHint">Interactive mode pauses at review points and accepts edits or additional directions.</div>
						</div>
						<div class="field">
							<span data-i18n="llmProfile">LLM Profile</span>
							<div class="profile-picker-row">
								<button class="btn secondary setup-inline-btn" id="editProfileFromSetupBtn" type="button" data-i18n="configure">Configure</button>
							</div>
						</div>
						<label class="checkbox-chip" for="contextEnabledInput">
							<input id="contextEnabledInput" type="checkbox" />
							<span data-i18n="startupContext">Startup Context</span>
						</label>
						<div class="setup-alert hidden" id="profileNotice">
							<div>
								<div class="mini-heading" data-i18n="llmSetupRequired">LLM Setup Required</div>
								<div class="hint" id="profileNoticeText" data-i18n="configureProfileBeforeStart">Configure an LLM profile before starting the workflow.</div>
							</div>
							<button class="btn secondary" id="profileNoticeBtn" type="button" data-i18n="configure">Configure</button>
						</div>
					</section>
					<section class="settings-tab-panel hidden" id="profilesSettingsTab" data-settings-panel="profiles">

					<div class="form-grid">
					<div class="field span-2">
						<label for="settingsProfileSelect" data-i18n="profile">Profile</label>
						<select id="settingsProfileSelect"></select>
					</div>
					<div class="field">
						<label for="profileNameInput" data-i18n="profileName">Profile Name</label>
						<input id="profileNameInput" type="text" placeholder="Local GPT-5.4" />
					</div>
					<div class="field">
						<label for="profileProviderSelect" data-i18n="provider">Provider</label>
						<select id="profileProviderSelect">
							<option value="other">OpenAI-Compatible</option>
							<option value="openai">OpenAI</option>
							<option value="claude">Claude</option>
							<option value="ollama">Ollama</option>
							<option value="vllm">vLLM</option>
						</select>
					</div>
					<div class="field">
						<label for="profileBaseUrlInput" data-i18n="baseUrl">Base URL</label>
						<input id="profileBaseUrlInput" type="text" placeholder="https://api.openai.com/v1" />
					</div>
					<div class="field">
						<label for="profileModelInput" data-i18n="model">Model</label>
						<input id="profileModelInput" type="text" placeholder="gpt-5.4" />
					</div>
					<div class="field span-2">
						<label for="profileMaxTokensInput" data-i18n="workflowMaxTokens">Max Output Tokens</label>
						<input id="profileMaxTokensInput" type="number" min="128" max="32768" step="1" value="1024" />
						<div class="field-hint" data-i18n="workflowMaxTokensHint">Maximum output tokens for code generation in this workflow profile. Planning and test generation retain their shorter stage-specific caps.</div>
					</div>
					<div class="field span-2">
						<label for="profileApiKeyInput" data-i18n="apiKey">API Key</label>
						<input id="profileApiKeyInput" type="password" placeholder="sk-..." />
						<div class="field-hint" data-i18n="apiKeyHint">Optional for Ollama and vLLM. Required for hosted providers.</div>
					</div>
				</div>

				<div class="hint" id="profileHint" data-i18n="profileEditorHint">Create a new profile draft or edit an existing profile.</div>

				<div class="button-grid">
					<button class="btn secondary" id="newProfileBtn" type="button" data-i18n="newProfile">New Profile</button>
					<button class="btn secondary" id="openProfileConfigBtn" type="button" data-i18n="openConfig">Open Config</button>
					<button class="btn secondary" id="reloadProfilesBtn" type="button" data-i18n="reloadProfiles">Reload Profiles</button>
					<button class="btn secondary" id="deleteProfileBtn" type="button" data-i18n="deleteProfile">Delete Profile</button>
						<button class="btn" id="saveProfileBtn" type="button" data-i18n="saveProfile">Save Profile</button>
					</div>
					</section>
					<section class="settings-tab-panel hidden" id="runtimeSettingsTab" data-settings-panel="runtime">
						<div class="settings-subsection">
							<div class="mini-heading" data-i18n="inlineCompletion">Inline Completion</div>
							<div class="field-hint" data-i18n="inlineCompletionHint">These settings control the gray Python suggestions shown while typing and are separate from the workflow profile.</div>
							<label class="checkbox-chip" for="inlineCompletionEnabledInput">
								<input id="inlineCompletionEnabledInput" type="checkbox" />
								<span data-i18n="inlineCompletionEnabled">Enable inline completion</span>
							</label>
							<div class="form-grid">
								<div class="field">
									<label for="inlineCompletionProviderSelect" data-i18n="provider">Provider</label>
									<select id="inlineCompletionProviderSelect">
										<option value="vllm">vLLM</option>
										<option value="other">OpenAI-Compatible</option>
										<option value="openai">OpenAI</option>
										<option value="ollama">Ollama</option>
									</select>
								</div>
								<div class="field">
									<label for="inlineCompletionTriggerModeSelect" data-i18n="triggerMode">Trigger</label>
									<select id="inlineCompletionTriggerModeSelect">
										<option value="automatic" data-i18n="automaticTrigger">Automatic</option>
										<option value="manual" data-i18n="manualTrigger">Manual</option>
									</select>
								</div>
								<div class="field span-2">
									<label for="inlineCompletionBaseUrlInput" data-i18n="baseUrl">Base URL</label>
									<input id="inlineCompletionBaseUrlInput" type="text" placeholder="http://127.0.0.1:8004/v1" />
								</div>
								<div class="field span-2">
									<label for="inlineCompletionModelInput" data-i18n="model">Model</label>
									<input id="inlineCompletionModelInput" type="text" placeholder="deepseek-coder-6.7b-instruct" />
								</div>
								<div class="field">
									<label for="inlineCompletionDebounceInput" data-i18n="debounceMs">Debounce (ms)</label>
									<input id="inlineCompletionDebounceInput" type="number" min="250" max="5000" step="50" />
								</div>
								<div class="field">
									<label for="inlineCompletionMaxTokensInput" data-i18n="maxTokens">Max tokens</label>
									<input id="inlineCompletionMaxTokensInput" type="number" min="32" max="512" step="1" />
								</div>
							</div>
							<div class="action-row">
								<button class="btn" id="saveInlineCompletionBtn" type="button" data-i18n="saveInlineCompletion">Save inline settings</button>
								<span class="hint" id="inlineCompletionStatus"></span>
							</div>
						</div>
						<div class="field">
							<div class="mini-heading" data-i18n="pythonInterpreter">Python Interpreter</div>
							<div class="runtime-value" id="pythonInterpreterValue">Auto-detect Python</div>
							<div class="field-hint" data-i18n="pythonInterpreterHint">Choose the Python environment used to start AdaAssist's local backend.</div>
							<button class="btn secondary" id="selectPythonInterpreterBtn" type="button" data-i18n="selectPythonInterpreter">Select Python Interpreter</button>
						</div>
						<div class="environment-status checking" id="environmentStatus" aria-live="polite">
							<div class="environment-status-head">
								<div>
									<div class="mini-heading" data-i18n="environmentStatus">Environment Status</div>
									<div class="hint" id="environmentStatusSummary" data-i18n="checkingEnvironment">Checking environment...</div>
								</div>
								<button class="btn subtle setup-inline-btn" id="checkEnvironmentBtn" type="button" data-i18n="checkEnvironment">Check Environment</button>
							</div>
							<ul class="environment-check-list" id="environmentCheckList"></ul>
						</div>
					</section>
				</section>
		</main>
	</div>

		<script nonce="${nonce}" src="${markdownItUri}"></script>
		<script nonce="${nonce}" src="${highlightScriptUri}"></script>
		<script nonce="${nonce}" src="${highlightPythonUri}"></script>
		<script nonce="${nonce}" src="${highlightMarkdownUri}"></script>
		<script nonce="${nonce}" src="${scriptUri}"></script>
	</body>
	</html>`;
}
