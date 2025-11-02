import { EC2Client, DescribeInstancesCommand, StartInstancesCommand } from '@aws-sdk/client-ec2';

const ec2 = new EC2Client({});

interface IdleTestEvent {
  testPhase: 'setup-instance' | 'verify-auto-stop';
  domainName?: string;
  instanceId: string;
  idleTimeoutMinutes?: number;
}

/**
 * Integration test handler for stop-on-idle functionality
 *
 * This Lambda function tests the auto-stop flow:
 * 1. setup-instance: Ensures instance is running before tests begin
 * 2. verify-auto-stop: Waits for idle timeout and verifies instance stops
 *
 * NOTE: Auto-resume has been removed. Instances must be resumed manually via AWS Console.
 */
export const handler = async (event: IdleTestEvent): Promise<string> => {
  console.log('Idle test event:', JSON.stringify(event, null, 2));

  const { testPhase, instanceId, domainName, idleTimeoutMinutes = 5 } = event;

  try {
    console.log(`Using instance ID: ${instanceId}`);

    if (testPhase === 'setup-instance') {
      return await setupInstance(instanceId);
    } else if (testPhase === 'verify-auto-stop') {
      return await verifyAutoStop(instanceId, idleTimeoutMinutes);
    } else {
      throw new Error(`Unknown test phase: ${testPhase}`);
    }
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
};

/**
 * Setup: Ensure instance is running before tests
 *
 * This prevents race conditions where the IdleMonitor may have already stopped
 * the instance between deployment and test execution.
 *
 * Flow:
 * 1. Check current instance state
 * 2. If stopped, start the instance
 * 3. Wait for instance to reach 'running' state
 */
async function setupInstance(instanceId: string): Promise<string> {
  console.log(`Setting up instance ${instanceId} for testing`);

  // Step 1: Check current state
  const currentState = await getInstanceState(instanceId);
  console.log(`Current instance state: ${currentState}`);

  // Step 2: Start instance if it's stopped or wait for transitional states
  if (currentState === 'stopped') {
    console.log('Instance is stopped, starting it...');
    await ec2.send(new StartInstancesCommand({ InstanceIds: [instanceId] }));
  } else if (currentState === 'running') {
    console.log('Instance is already running');
    return 'RUNNING';
  } else if (['pending', 'stopping', 'shutting-down'].includes(currentState || '')) {
    console.log(`Instance is in transitional state '${currentState}', waiting for stopped state...`);
    await waitForInstanceState(instanceId, 'stopped', 180); // 3 minute max wait
    console.log('Instance is now stopped, starting it...');
    await ec2.send(new StartInstancesCommand({ InstanceIds: [instanceId] }));
  }

  // Step 3: Wait for running state
  console.log('Waiting for instance to be running...');
  await waitForInstanceState(instanceId, 'running', 300); // 5 minute max wait

  // NOTE: We do NOT wait for status checks here because:
  // 1. The setup test has a 120s assertion timeout
  // 2. Instance transitions (stopping → stopped → running) can take 60-90s
  // 3. Status checks can take another 60-120s
  // 4. This would exceed the 120s timeout and fail the setup test
  //
  // Instead, we rely on skipStatusChecks=true in IdleMonitor, which allows it to
  // stop the instance immediately without waiting for status checks to pass.
  // This is a test-only shortcut that ensures tests complete within time limits.

  console.log('✅ Setup complete: instance is running (status checks will be skipped by IdleMonitor)');
  return 'RUNNING';
}

/**
 * Verify auto-stop functionality
 *
 * Test flow:
 * 1. Confirm instance is in 'running' state (should be from setup test)
 * 2. Poll for 'stopped' state
 *
 * How IdleMonitor works with skipStatusChecks=true:
 * - Runs every 1 minute (EventBridge schedule)
 * - Checks CloudFront metrics for the LAST N minutes (idleTimeoutMinutes)
 * - Since instance just started with 0 requests, it stops immediately (no status check wait)
 * - Expected stop time: 1-2 minutes (just waiting for next EventBridge cycle)
 *
 * CRITICAL: This test has 120s assertion timeout, so all waits must fit within that
 */
async function verifyAutoStop(instanceId: string, idleTimeoutMinutes: number): Promise<string> {
  console.log(`Starting auto-stop verification for instance ${instanceId}`);
  console.log(`Idle timeout: ${idleTimeoutMinutes} minutes`);

  // Step 1: Quick check that instance is running (should already be from setup test)
  console.log('Step 1: Confirming instance is running...');
  await waitForInstanceState(instanceId, 'running', 30); // 30s timeout (just a safety check)
  console.log('Instance is running');

  // Step 2: Poll for stopped state
  // With skipStatusChecks=true, IdleMonitor should stop the instance within 90 seconds:
  // - IdleMonitor runs every 1 minute
  // - No status check wait needed
  // - Instance stops immediately when IdleMonitor detects 0 requests
  console.log('Step 2: Polling for stopped state (IdleMonitor should stop it within 90s with skipStatusChecks)...');
  await waitForInstanceState(instanceId, 'stopped', 90); // 90s max (fits in 120s assertion timeout)

  console.log('✅ Auto-stop verification successful: instance stopped after idle timeout');
  return 'STOPPED';
}

/**
 * Get current instance state
 */
async function getInstanceState(instanceId: string): Promise<string> {
  const command = new DescribeInstancesCommand({
    InstanceIds: [instanceId],
  });

  const response = await ec2.send(command);
  const instance = response.Reservations?.[0]?.Instances?.[0];

  if (!instance) {
    throw new Error(`Instance ${instanceId} not found`);
  }

  const state = instance.State?.Name || 'unknown';
  console.log(`Instance ${instanceId} state: ${state}`);
  return state;
}

/**
 * Wait for instance to reach a specific state
 * Polls every 30 seconds up to maxWaitSeconds
 */
async function waitForInstanceState(
  instanceId: string,
  targetState: string,
  maxWaitSeconds: number,
): Promise<void> {
  const pollIntervalMs = 30000; // 30 seconds
  const maxAttempts = Math.ceil(maxWaitSeconds / (pollIntervalMs / 1000));

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Polling attempt ${attempt}/${maxAttempts}...`);

    const currentState = await getInstanceState(instanceId);

    if (currentState === targetState) {
      console.log(`✅ Instance reached target state: ${targetState}`);
      return;
    }

    console.log(`Instance state is ${currentState}, waiting for ${targetState}...`);

    if (attempt < maxAttempts) {
      await sleep(pollIntervalMs);
    }
  }

  throw new Error(
    `Timeout: Instance did not reach state '${targetState}' within ${maxWaitSeconds} seconds`,
  );
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
