import { Worker } from '@temporalio/worker';
import { createNativeConnection, type WorkerEnv, getEnv } from './lib/temporal';
import * as activities from './activities';

/**
 * Run a Worker with an mTLS connection, configuration is provided via environment variables.
 * Note that serverNameOverride and serverRootCACertificate are optional.
 */
async function run({
  address,
  namespace,
  clientCertPath,
  clientKeyPath,
  serverNameOverride,
  serverRootCACertificatePath,
  taskQueue,
}: WorkerEnv) {
  const connection = await createNativeConnection({ address, clientCertPath, clientKeyPath, serverNameOverride, serverRootCACertificatePath });

  const worker = await Worker.create({
    connection,
    namespace,
    workflowsPath: require.resolve('./workflows'),
    taskQueue,
    activities,
  });

  await worker.run();
  await connection.close();
}

run(getEnv() as WorkerEnv).then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);