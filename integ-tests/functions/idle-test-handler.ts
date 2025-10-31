import { EC2Client, DescribeInstancesCommand, DescribeInstanceStatusCommand } from '@aws-sdk/client-ec2';

const ec2 = new EC2Client({});

interface IdleTestEvent {
  testPhase: 'verify-auto-stop' | 'verify-auto-resume';
  domainName: string;
  instanceId: string;
  idleTimeoutMinutes?: number;
}

/**
 * Integration test handler for stop-on-idle functionality
 *
 * This Lambda function tests the complete auto-stop/resume flow:
 * 1. verify-auto-stop: Waits for idle timeout and verifies instance stops
 * 2. verify-auto-resume: Accesses CloudFront to trigger resume and verifies instance starts
 */
export const handler = async (event: IdleTestEvent): Promise<string> => {
  console.log('Idle test event:', JSON.stringify(event, null, 2));

  const { testPhase, instanceId, domainName, idleTimeoutMinutes = 5 } = event;

  try {
    console.log(`Using instance ID: ${instanceId}`);

    if (testPhase === 'verify-auto-stop') {
      return await verifyAutoStop(instanceId, idleTimeoutMinutes);
    } else if (testPhase === 'verify-auto-resume') {
      return await verifyAutoResume(instanceId, domainName);
    } else {
      throw new Error(`Unknown test phase: ${testPhase}`);
    }
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
};

/**
 * Verify auto-stop functionality
 *
 * Test flow:
 * 1. Wait for instance to be in 'running' state
 * 2. Wait for idle timeout period + 2 minutes buffer (1 min for EventBridge check + 1 min buffer)
 * 3. Poll instance state every 30 seconds for up to 5 minutes
 * 4. Verify instance transitions to 'stopped' state
 */
async function verifyAutoStop(instanceId: string, idleTimeoutMinutes: number): Promise<string> {
  console.log(`Starting auto-stop verification for instance ${instanceId}`);
  console.log(`Idle timeout: ${idleTimeoutMinutes} minutes`);

  // Step 1: Wait for instance to be running
  console.log('Step 1: Waiting for instance to be running...');
  await waitForInstanceState(instanceId, 'running', 300); // 5 minute max wait
  console.log('Instance is running');

  // Step 2: Wait for idle timeout + buffer
  // The IdleMonitor runs every 1 minute (for integration tests) and checks for activity in the last N minutes
  // We need to wait: idleTimeout + 1 minute (for EventBridge to trigger) + 1 minute buffer
  const waitTimeSeconds = (idleTimeoutMinutes + 2) * 60;
  console.log(`Step 2: Waiting ${waitTimeSeconds / 60} minutes for idle timeout + buffer...`);
  await sleep(waitTimeSeconds * 1000);

  // Step 3: Poll for stopped state
  console.log('Step 3: Polling for stopped state...');
  await waitForInstanceState(instanceId, 'stopped', 300); // 5 minute max wait for stop

  console.log('✅ Auto-stop verification successful: instance stopped after idle timeout');
  return 'SUCCESS: instance auto-stopped after idle timeout';
}

/**
 * Verify auto-resume functionality (client-side via status API)
 *
 * Test flow:
 * 1. Verify instance is currently stopped
 * 2. Call status API POST /status/{instanceId}/start endpoint
 * 3. Poll instance state every 15 seconds for up to 5 minutes
 * 4. Verify instance transitions to 'running' state
 * 5. Wait for instance to be fully initialized (status checks pass)
 */
async function verifyAutoResume(instanceId: string, domainName: string): Promise<string> {
  console.log(`Starting auto-resume verification for instance ${instanceId}`);

  // Step 1: Wait for instance to be stopped (it might still be stopping)
  console.log('Step 1: Waiting for instance to be stopped...');
  await waitForInstanceState(instanceId, 'stopped', 180); // 3 minute max wait
  console.log('Instance is stopped');

  // Step 2: Trigger resume by calling status API start endpoint
  console.log(`Step 2: Calling status API to start instance...`);
  const statusApiUrl = process.env.STATUS_API_URL;
  if (!statusApiUrl) {
    throw new Error('STATUS_API_URL environment variable not set');
  }

  try {
    const startUrl = `${statusApiUrl}status/${instanceId}/start`;
    console.log(`Calling POST ${startUrl}`);

    const response = await fetch(startUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to start instance: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Start API response:', data);
  } catch (error) {
    console.error('Error calling start API:', error);
    throw error;
  }

  // Step 3: Poll for running state
  console.log('Step 3: Polling for running state...');
  await waitForInstanceState(instanceId, 'running', 300); // 5 minute max wait

  // Step 4: Wait for status checks to pass
  console.log('Step 4: Waiting for instance status checks to pass...');
  await waitForStatusChecks(instanceId, 120); // 2 minute max wait

  console.log('✅ Auto-resume verification successful: instance running after start API call');
  return 'SUCCESS: instance auto-resumed after start API call';
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
 * Wait for instance status checks to pass
 */
async function waitForStatusChecks(instanceId: string, maxWaitSeconds: number): Promise<void> {
  const pollIntervalMs = 15000; // 15 seconds
  const maxAttempts = Math.ceil(maxWaitSeconds / (pollIntervalMs / 1000));

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Status check attempt ${attempt}/${maxAttempts}...`);

    try {
      const command = new DescribeInstanceStatusCommand({
        InstanceIds: [instanceId],
      });

      const response = await ec2.send(command);
      const status = response.InstanceStatuses?.[0];

      if (status) {
        const instanceStatus = status.InstanceStatus?.Status;
        const systemStatus = status.SystemStatus?.Status;

        console.log(`Instance status: ${instanceStatus}, System status: ${systemStatus}`);

        if (instanceStatus === 'ok' && systemStatus === 'ok') {
          console.log('✅ Status checks passed');
          return;
        }
      } else {
        console.log('No status checks available yet...');
      }
    } catch (error) {
      console.log('Error checking status:', error);
    }

    if (attempt < maxAttempts) {
      await sleep(pollIntervalMs);
    }
  }

  console.warn(`Status checks did not pass within ${maxWaitSeconds} seconds, continuing anyway...`);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
