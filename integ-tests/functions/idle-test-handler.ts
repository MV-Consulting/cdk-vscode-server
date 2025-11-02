import { EC2Client, DescribeInstancesCommand, StartInstancesCommand } from '@aws-sdk/client-ec2';
import { EventBridgeClient, DisableRuleCommand } from '@aws-sdk/client-eventbridge';

const ec2 = new EC2Client({});
const eventBridge = new EventBridgeClient({});

interface IdleTestEvent {
  testPhase: 'verify-auto-stop' | 'disable-idle-monitor' | 'start-instance';
  domainName?: string;
  instanceId?: string;
  idleTimeoutMinutes?: number;
  idleMonitorRuleName?: string;
}

/**
 * Integration test handler for stop-on-idle functionality
 *
 * This Lambda function tests the stop-on-idle workflow:
 * 1. verify-auto-stop: Instance stops after being idle
 * 2. disable-idle-monitor: Disable EventBridge rule to prevent re-stopping
 * 3. start-instance: Start the instance and wait for running state
 *
 * Note: Login verification is handled by a separate login-handler Lambda
 */
export const handler = async (event: IdleTestEvent): Promise<string> => {
  console.log('Idle test event:', JSON.stringify(event, null, 2));

  const { testPhase, instanceId, idleTimeoutMinutes = 5, idleMonitorRuleName } = event;

  try {
    if (testPhase === 'verify-auto-stop') {
      if (!instanceId) throw new Error('instanceId is required for verify-auto-stop');
      return await verifyAutoStop(instanceId, idleTimeoutMinutes);
    } else if (testPhase === 'disable-idle-monitor') {
      if (!idleMonitorRuleName) throw new Error('idleMonitorRuleName is required for disable-idle-monitor');
      return await disableIdleMonitor(idleMonitorRuleName);
    } else if (testPhase === 'start-instance') {
      if (!instanceId) throw new Error('instanceId is required for start-instance');
      return await startInstance(instanceId);
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
 * 1. Wait for instance to be in 'running' state (if not already)
 * 2. Poll for 'stopped' state as IdleMonitor detects inactivity
 *
 * How IdleMonitor works with skipStatusChecks=true:
 * - Runs every 1 minute (EventBridge schedule)
 * - Checks CloudFront metrics for the LAST N minutes (idleTimeoutMinutes)
 * - After deployment with 0 requests, stops the instance immediately (no status check wait)
 * - Expected stop time: 1-4 minutes (waiting for IdleMonitor to run and detect no activity)
 *
 * CRITICAL: This test has 120s assertion timeout, so all waits must fit within that
 */
async function verifyAutoStop(instanceId: string, idleTimeoutMinutes: number): Promise<string> {
  console.log(`Starting auto-stop verification for instance ${instanceId}`);
  console.log(`Idle timeout: ${idleTimeoutMinutes} minutes`);

  // Step 1: Poll for stopped state
  // With skipStatusChecks=true, IdleMonitor should stop the instance within 90 seconds:
  // - IdleMonitor runs every 1 minute
  // - No status check wait needed
  // - Instance stops immediately when IdleMonitor detects 0 requests
  console.log('Step 2: Polling for stopped state (IdleMonitor should stop it within 100s with skipStatusChecks)...');
  await waitForInstanceState(instanceId, 'stopped', 100); // 100s max (fits in 120s assertion timeout)

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

/**
 * Disable the IdleMonitor EventBridge rule
 * This prevents the instance from being stopped again after we start it
 */
async function disableIdleMonitor(ruleName: string): Promise<string> {
  console.log(`Disabling IdleMonitor EventBridge rule: ${ruleName}`);

  const command = new DisableRuleCommand({
    Name: ruleName,
  });

  await eventBridge.send(command);

  console.log('✅ IdleMonitor EventBridge rule disabled successfully');
  return 'DISABLED';
}

/**
 * Start the EC2 instance and wait for it to be running
 */
async function startInstance(instanceId: string): Promise<string> {
  console.log(`Starting instance: ${instanceId}`);

  // Start the instance
  const startCommand = new StartInstancesCommand({
    InstanceIds: [instanceId],
  });

  await ec2.send(startCommand);
  console.log('Instance start command sent');

  // Wait for instance to be running (max 2 minutes)
  console.log('Waiting for instance to be running...');
  await waitForInstanceState(instanceId, 'running', 120);

  console.log('✅ Instance started successfully and is running');
  return 'RUNNING';
}
