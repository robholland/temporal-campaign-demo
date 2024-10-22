import { sveltekit } from '@sveltejs/kit/vite';
import { type ViteDevServer, defineConfig } from 'vite';
import { Server } from 'socket.io';
import { createConnection, getEnv } from './src/lib/server/temporal';
import { Client } from '@temporalio/client';
import type { DeployMsg, EmailMsg, NewsletterInput, RetryLevel, RetryLevelMsg, ToggleEmailServiceMsg, WorkflowCodeMsg } from './src/lib/types';
import fs from 'fs';
import proto from '@temporalio/proto';
const { temporal } = proto;
import Long from 'long';
import workflow from '@temporalio/workflow';

const WORKFLOW_RETRY = {
	maximumAttempts: Infinity,
	backoffCoefficient: 1,
	initialInterval: '5 seconds',
}

const webSocketServer = {
	name: 'websocket',
	configureServer(server: ViteDevServer) {
		if (!server.httpServer) return;

		let emailServiceStatus: boolean = true;
		let retryLevel: RetryLevel = 'temporal';

		const io = new Server(server.httpServer);
		const clientEnv = getEnv();
		const sdkClient = new Client({
			namespace: clientEnv.namespace,
			connection: createConnection(clientEnv)
		});

		let poller: NodeJS.Timeout | undefined = undefined;

		const fetchEnhancedStackTrace = async (workflowId: string): Promise<workflow.EnhancedStackTrace> => {
			return sdkClient.workflow.getHandle(workflowId).query('__enhanced_stack_trace');
		}

		const resetWorkflowExecution = async (workflowId: string) => {
			try {
				console.log('Resetting workflow execution:', workflowId);
				const resetWorkflowExecutionRequest = temporal.api.workflowservice.v1.ResetWorkflowExecutionRequest.create({
					namespace: clientEnv.namespace,
					workflowExecution: { workflowId: workflowId, runId: '' },
					resetReapplyType: temporal.api.enums.v1.ResetReapplyType.RESET_REAPPLY_TYPE_NONE,
					workflowTaskFinishEventId: new Long(3),
					requestId: new Date().toISOString(),
				})
				await sdkClient.workflowService.resetWorkflowExecution(resetWorkflowExecutionRequest);
			} catch (err) {
				console.error('Failed to reset workflow execution', err);
			}
		}

		io.on('connection', (socket) => {
			socket.on('register', async ({ email }: { email: string }, cb) => {
				const wfId = `newsletter-${email}`;

				sdkClient.workflow.start(
					'Newsletter',
					{
						workflowId: wfId,
						taskQueue: 'demo',
						args: [{ email } as NewsletterInput],
						retry: retryLevel === 'workflow' ? WORKFLOW_RETRY : undefined
					}
				)
				.then((handle) => {
					console.log('Campaign started');
					socket.emit('campaign:started');
					cb({});

					poller = setInterval(async () => {
						try {
							const trace = await fetchEnhancedStackTrace(wfId);
							const location = trace.stacks[0].locations[0];
							const workflowPath = location.file_path;
							if (workflowPath) {
								socket.emit('workflow:code', {
									name: location.function_name,
									code: fs.readFileSync(workflowPath, 'utf-8'),
									line: location.line,
								} as WorkflowCodeMsg);
							}
							console.dir(trace, { depth: null });
						} catch (err) {
							console.error('Failed to fetch enhanced stack trace', err);
						}
					}, 250);

					handle.result()
					.then(() => {
						console.log('Campaign completed');
						socket.emit('campaign:completed');

						clearInterval(poller);
						poller = undefined;
					})
					.catch((err) => {
						console.log('Campaign failed', err);
						socket.emit('campaign:failed');

						clearInterval(poller);
						poller = undefined;
					});
				})
				.catch((err) => { cb({ error: err }); });
			});

			socket.on('getEmailServiceStatus', async () => {
				socket.emit('emailServiceStatus', emailServiceStatus);
			});

			socket.on('toggleEmailService', async (msg: ToggleEmailServiceMsg) => {
				emailServiceStatus = msg.status;
				console.log('Email service status', emailServiceStatus ? 'up' : 'down');
			});

			socket.on('getRetryLevel', async () => {
				socket.emit('retryLevel', { level: retryLevel });
			});

			socket.on('toggleRetryLevel', async (msg: RetryLevelMsg) => {
				retryLevel = msg.level;
				if (retryLevel === 'none' || retryLevel === 'workflow') {
					fs.copyFileSync('../workflows/src/workflows-without-retry.ts', '../workflows/src/workflows.ts');
				} else {
					fs.copyFileSync('../workflows/src/workflows-with-retry.ts', '../workflows/src/workflows.ts');
				}
				console.log('Retry level', retryLevel);
			});

			socket.on('deploy', async (msg: DeployMsg) => {
				if (msg.email !== '' && retryLevel !== 'temporal') {
					resetWorkflowExecution(`newsletter-${msg.email}`);
				}
				if (retryLevel === 'none' || retryLevel === 'workflow') {
					fs.copyFileSync('../workflows/src/workflows-without-retry.ts', '../workflows/src/workflows.ts');
				} else {
					fs.copyFileSync('../workflows/src/workflows-with-retry.ts', '../workflows/src/workflows.ts');
				}
				console.log('Deploy');
			});

			socket.on('email', async (msg: EmailMsg, cb) => {
				if (emailServiceStatus) {
					console.log('Email completed', msg);
					io.emit('email:completed', msg);
					cb({});
				} else {
					console.log('Email failed', msg);
					io.emit('email:failed', msg);
					cb({ error: 'Email service is down' });
				}
			});
		});
	}
}

export default defineConfig({
	plugins: [sveltekit(), webSocketServer]
});
