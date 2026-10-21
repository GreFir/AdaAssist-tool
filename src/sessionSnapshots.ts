import type * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';

export type WorkflowMode = 'auto' | 'continue';

export interface SavedWorkflowSession<T, R = unknown> {
	schemaVersion: 1;
	savedAt: string;
	session: T;
	workflowMode: WorkflowMode;
	interactiveState: string;
	resumeState?: R;
}

interface IdentifiedSession {
	session_id: string;
	problem_statement: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validSessionId(id: string): boolean {
	return /^[a-zA-Z0-9_-]{8,128}$/.test(id);
}

/**
 * Stores the full session independently of the short, redacted diagnostic
 * history-v1.json. Existing user-study snapshots are read without modification.
 */
export class SessionSnapshotStore<T extends IdentifiedSession, R = unknown> {
	private readonly directory: string;
	private readonly studyDirectory: string | undefined;
	private readonly known = new Set<string>();
	private readonly fingerprints = new Map<string, string>();
	private queue: Promise<void> = Promise.resolve();

	constructor(context: vscode.ExtensionContext, workspaceRoot?: string) {
		const root = (context.storageUri ?? context.globalStorageUri).fsPath;
		this.directory = path.join(root, 'session-snapshots-v1');
		this.studyDirectory = workspaceRoot
			? path.join(workspaceRoot, 'adaassist-study-logs', 'sessions')
			: undefined;
	}

	public async refreshIndex(): Promise<void> {
		const saved = await fs.promises.readdir(this.directory).catch(() => [] as string[]);
		for (const name of saved) {
			if (name.endsWith('.json')) {
				const id = name.slice(0, -5);
				if (validSessionId(id)) { this.known.add(id); }
			}
		}
		if (this.studyDirectory) {
			const study = await fs.promises.readdir(this.studyDirectory).catch(() => [] as string[]);
			for (const name of study) {
				const match = name.match(/-([a-fA-F0-9]{32})\.json$/);
				if (match) { this.known.add(match[1]); }
			}
		}
	}

	public knownSessionIds(): string[] {
		return [...this.known];
	}

	/**
	 * Lightweight search metadata for saved sessions. Diagnostic history expires,
	 * but full snapshots remain searchable by their task requirements.
	 */
	public async listSummaries(): Promise<Array<{
		sessionId: string; requirement: string; updatedAt: string; passed: boolean;
	}>> {
		const summaries = await Promise.all(this.knownSessionIds().map(async id => {
			const saved = await this.load(id);
			if (!saved) { return undefined; }
			const session = saved.session as IdentifiedSession & {
				updated_at?: string; passed?: boolean;
			};
			return {
				sessionId: id,
				requirement: session.problem_statement,
				updatedAt: session.updated_at || saved.savedAt,
				passed: session.passed === true
			};
		}));
		return summaries.filter((item): item is NonNullable<typeof item> => Boolean(item))
			.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	}

	public async save(record: SavedWorkflowSession<T, R>): Promise<void> {
		const id = record.session.session_id;
		if (!validSessionId(id) || !record.session.problem_statement.trim()) {
			throw new Error('Cannot persist a session without a valid identifier and requirement.');
		}
		const serialized = JSON.stringify({
			...record,
			schemaVersion: 1,
			savedAt: new Date().toISOString()
		});
		// Avoid writing an unchanged session just because a UI refresh occurred.
		const fingerprint = createHash('sha256').update(JSON.stringify({
			session: record.session,
			workflowMode: record.workflowMode,
			interactiveState: record.interactiveState,
			resumeState: record.resumeState
		})).digest('hex');
		if (this.fingerprints.get(id) === fingerprint) { return; }

		const destination = path.join(this.directory, id + '.json');
		this.queue = this.queue.catch(() => undefined).then(async () => {
			await fs.promises.mkdir(this.directory, { recursive: true });
			const temporary = destination + '.' + randomBytes(6).toString('hex') + '.tmp';
			try {
				await fs.promises.writeFile(temporary, serialized, { encoding: 'utf8', mode: 0o600 });
				await fs.promises.rename(temporary, destination);
				this.fingerprints.set(id, fingerprint);
				this.known.add(id);
			} finally {
				await fs.promises.rm(temporary, { force: true }).catch(() => undefined);
			}
		});
		await this.queue;
	}

	private parseSnapshot(text: string, id: string): SavedWorkflowSession<T, R> | undefined {
		const parsed: unknown = JSON.parse(text);
		if (!isRecord(parsed) || !isRecord(parsed.session)) { return undefined; }
		const session = parsed.session;
		if (session.session_id !== id
			|| typeof session.problem_statement !== 'string'
			|| !session.problem_statement.trim()) {
			return undefined;
		}
		// A study record is wrapped as { schema_version, condition, session, ... }.
		const workflowMode: WorkflowMode =
			parsed.workflowMode === 'auto' || parsed.condition === 'Auto' ? 'auto' : 'continue';
		const interactiveState = typeof parsed.interactiveState === 'string'
			? parsed.interactiveState
			: session.passed ? 'done' : 'idle';
		return {
			schemaVersion: 1,
			savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt
				: typeof parsed.saved_at === 'string' ? parsed.saved_at : '',
			session: session as unknown as T,
			workflowMode,
			interactiveState,
			...(isRecord(parsed.resumeState) ? { resumeState: parsed.resumeState as R } : {})
		};
	}

	public async load(id: string): Promise<SavedWorkflowSession<T, R> | undefined> {
		if (!validSessionId(id)) { return undefined; }
		const locations = [path.join(this.directory, id + '.json')];
		if (this.studyDirectory) {
			const filenames = await fs.promises.readdir(this.studyDirectory).catch(() => [] as string[]);
			for (const name of filenames) {
				if (name.endsWith('-' + id + '.json')) {
					locations.push(path.join(this.studyDirectory, name));
				}
			}
		}
		for (const location of locations) {
			try {
				const result = this.parseSnapshot(await fs.promises.readFile(location, 'utf8'), id);
				if (result) { return result; }
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
					// A malformed/corrupt file does not hide another valid snapshot.
					continue;
				}
			}
		}
		return undefined;
	}

	public async flush(): Promise<void> {
		await this.queue;
	}
}
