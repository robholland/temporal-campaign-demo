import { sveltekit } from '@sveltejs/kit/vite';
import { type ViteDevServer, defineConfig } from 'vite';
import { Server } from 'socket.io';
import { createConnection, getEnv } from './src/lib/server/temporal';
import { Client } from '@temporalio/client';
import type { EmailMsg, NewsletterInput, RetryLevel, RetryLevelMsg, ToggleEmailServiceMsg } from './src/lib/types';

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
		globalThis.io = io;
		const clientEnv = getEnv();
		const temporal = new Client({
			namespace: clientEnv.namespace,
			connection: createConnection(clientEnv)
		});

		io.on('connection', (socket) => {
			socket.on('register', async ({ email }: { email: string }, cb) => {
				temporal.workflow.start(
					'Newsletter',
					{
						workflowId: `newsletter:${email}`,
						taskQueue: 'demo',
						args: [{ email, skipRetry: retryLevel !== 'temporal' } as NewsletterInput],
						retry: retryLevel === 'workflow' ? WORKFLOW_RETRY : undefined
					}
				)
				.then((handle) => {
					console.log('Campaign started');
					socket.emit('campaign:started');
					cb({});

					handle.result()
					.then(() => {
						console.log('Campaign completed');
						socket.emit('campaign:completed');
					})
					.catch((err) => {
						console.log('Campaign failed', err);
						socket.emit('campaign:failed');
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
				console.log('Retry level', retryLevel);
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
