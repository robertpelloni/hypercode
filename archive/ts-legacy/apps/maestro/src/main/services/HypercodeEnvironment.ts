import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';

const LOG_CONTEXT = 'HypercodeEnvironment';

export interface HypercodeEnvInfo {
	isHypercodeProject: boolean;
	isSandboxed: boolean;
	sandboxId?: string;
	handoffDirExists: boolean;
}

export class HypercodeEnvironment {
	/**
	 * Detects the current Hypercode environment state.
	 */
	static async detect(workspaceRoot: string = process.cwd()): Promise<HypercodeEnvInfo> {
		const hypercodeDir = path.join(workspaceRoot, '.hypercode');
		const sandboxDir = path.join(hypercodeDir, 'sandbox');
		const handoffDir = path.join(hypercodeDir, 'handoffs');

		let isHypercodeProject = false;
		let isSandboxed = false;
		let sandboxId: string | undefined;
		let handoffDirExists = false;

		try {
			const stats = await fs.stat(hypercodeDir);
			isHypercodeProject = stats.isDirectory();
		} catch {
			// Not a hypercode project
		}

		try {
			const stats = await fs.stat(handoffDir);
			handoffDirExists = stats.isDirectory();
		} catch {
			// No handoff dir
		}

		// Detect sandbox via specific metadata file or env var
		if (process.env.HYPERCODE_SANDBOX_ID) {
			isSandboxed = true;
			sandboxId = process.env.HYPERCODE_SANDBOX_ID;
		} else {
			try {
				const activeSandboxPath = path.join(sandboxDir, 'active.json');
				const content = await fs.readFile(activeSandboxPath, 'utf-8');
				const data = JSON.parse(content);
				isSandboxed = true;
				sandboxId = data.id;
			} catch {
				// Not explicitly sandboxed via local file
			}
		}

		const info = {
			isHypercodeProject,
			isSandboxed,
			sandboxId,
			handoffDirExists,
		};

		logger.debug('Hypercode environment detected', LOG_CONTEXT, info);
		return info;
	}
}
