import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { SessionSnapshotStore } from '../sessionSnapshots';

interface TestSession {
	session_id: string;
	problem_statement: string;
	current_code: string;
	passed: boolean;
}

suite('Session snapshots', () => {
	test('saves a complete session and reloads it across extension restarts', async () => {
		const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'adaassist-snapshot-'));
		try {
			const context = { storageUri: vscode.Uri.file(path.join(root, 'extension-data')),
				globalStorageUri: vscode.Uri.file(path.join(root, 'fallback')) } as vscode.ExtensionContext;
			const session: TestSession = {
				session_id: 'a'.repeat(32), problem_statement: 'Implement add(a, b)',
				current_code: 'def add(a,b): return a+b', passed: true
			};
			const store = new SessionSnapshotStore<TestSession>(context, root);
			await store.save({
				schemaVersion: 1, savedAt: '', workflowMode: 'continue',
				interactiveState: 'done', session,
				resumeState: { kind: 'code-review', request: { useErrorFeedback: true } }
			});
			const restarted = new SessionSnapshotStore<TestSession>(context, root);
			await restarted.refreshIndex();
			assert.ok(restarted.knownSessionIds().includes(session.session_id));
			const loaded = await restarted.load(session.session_id);
			assert.deepEqual(loaded?.session, session);
			assert.equal(loaded?.interactiveState, 'done');
			assert.deepEqual(loaded?.resumeState,
				{ kind: 'code-review', request: { useErrorFeedback: true } });
		} finally {
			await fs.promises.rm(root, { recursive: true, force: true });
		}
	});

	test('discovers and reads original user-study sessions JSON', async () => {
		const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'adaassist-study-'));
		try {
			const context = { storageUri: vscode.Uri.file(path.join(root, 'data')),
				globalStorageUri: vscode.Uri.file(path.join(root, 'fallback')) } as vscode.ExtensionContext;
			const id = 'b'.repeat(32);
			const studyDir = path.join(root, 'adaassist-study-logs', 'sessions');
			await fs.promises.mkdir(studyDir, { recursive: true });
			await fs.promises.writeFile(path.join(studyDir, `P01-T1-${id}.json`),
				JSON.stringify({
					schema_version: 1, condition: 'Auto', session_id: id,
					session: { session_id: id, problem_statement: 'Sort a list',
						current_code: 'def sort(x): return sorted(x)', passed: true }
				}), 'utf8');
			const store = new SessionSnapshotStore<TestSession>(context, root);
			await store.refreshIndex();
			assert.ok(store.knownSessionIds().includes(id));
			const loaded = await store.load(id);
			assert.equal(loaded?.workflowMode, 'auto');
			assert.equal(loaded?.session.current_code, 'def sort(x): return sorted(x)');
		} finally {
			await fs.promises.rm(root, { recursive: true, force: true });
		}
	});
});
