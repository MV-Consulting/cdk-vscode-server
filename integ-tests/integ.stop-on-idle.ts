import * as path from 'path';
// eslint-disable-next-line import/no-extraneous-dependencies
import { IntegTest, LogType, InvocationType, ExpectedResult } from '@aws-cdk/integ-tests-alpha';
import {
  App,
  Duration,
  PhysicalName,
  Stack,
  aws_lambda as lambda,
} from 'aws-cdk-lib';
import { InstanceClass, InstanceSize } from 'aws-cdk-lib/aws-ec2';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { VSCodeServer } from '../src/vscode-server';

// CDK App for Integration Tests
const app = new App();

// Stack under test
const stackUnderTest = new Stack(app, 'IntegTestStackStopOnIdle', {
  description: "Integration test for stop-on-idle functionality with fast execution parameters.",
});

// Create VSCodeServer with skipStatusChecks to work around 120s assertion timeout:
//
// PROBLEM: The CDK IntegTest assertion handler has a hardcoded 120s timeout, but:
// - Instance transitions (stopping → stopped → running) can take 60-90s
// - Status checks can take another 60-120s
// - Total: 120-210s, which exceeds the timeout
//
// SOLUTION: Set skipStatusChecks=true in IdleMonitor
// - IdleMonitor will stop idle instances immediately without waiting for status checks
// - This ensures verify-auto-stop test completes within the 120s timeout
// - Setup test only waits for 'running' state, not for status checks to pass
// - WARNING: This is test-specific behavior - production should wait for status checks
//
// Instance Configuration:
// - T4G.LARGE instance (chosen for consistency, though size doesn't matter with skipStatusChecks)
// - Minimal volume size (8 GB)
// - Very short idle timeout (3 minutes)
// - Check every 1 minute (instead of default 5 minutes)
const constructUnderTest = new VSCodeServer(stackUnderTest, 'IntegVSCodeServer', {
  instanceClass: InstanceClass.T4G,
  instanceSize: InstanceSize.LARGE,
  instanceVolumeSize: 8,
  enableAutoStop: true, // Auto-resume is automatically enabled with auto-stop
  idleTimeoutMinutes: 3, // Very short timeout for fast testing (3 minutes)
  idleCheckIntervalMinutes: 1, // Check every 1 minute for fast testing
  skipStatusChecks: true, // Skip status checks for integration tests (Option 2 fallback)
  additionalTags: {
    'IntegTest': 'True',
    'TestType': 'StopOnIdle',
  },
});

// Lambda function to test the stop-on-idle flow
const idleTestHandler = new NodejsFunction(stackUnderTest, 'idle-test-handler', {
  functionName: PhysicalName.GENERATE_IF_NEEDED,
  entry: path.join(__dirname, 'functions', 'idle-test-handler.ts'),
  runtime: lambda.Runtime.NODEJS_20_X,
  logRetention: 1,
  timeout: Duration.minutes(15), // Long timeout to wait for idle detection
  bundling: {
    esbuildArgs: {
      "--packages": "bundle",
    },
  },
  environment: {
    INSTANCE_ID: constructUnderTest.instance.instanceId,
    CLOUDFRONT_DOMAIN: constructUnderTest.domainName,
    IDLE_TIMEOUT_MINUTES: '3',
  },
});

// Grant permissions to check instance status and start instances
idleTestHandler.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'ec2:DescribeInstances',
      'ec2:DescribeInstanceStatus',
      'ec2:StartInstances',
      'cloudwatch:GetMetricStatistics',
    ],
    resources: ['*'],
  }),
});

const integ = new IntegTest(app, 'IntegStopOnIdleFunctionality', {
  testCases: [stackUnderTest],
  cdkCommandOptions: {
    destroy: {
      args: {
        force: true,
      },
    },
  },
  // Note: The CDK IntegTest assertion handler has a hardcoded 120s timeout.
  // The test Lambda itself has 15min timeout, but the assertion wrapper times out after 2 minutes.
  //
  // Our approach with skipStatusChecks=true:
  // - Setup test: Start instance, wait for 'running' state (~60-90s)
  // - verify-auto-stop: Poll for 'stopped' state
  // - IdleMonitor runs every 1 minute, sees 0 requests, stops instance immediately (no status check wait)
  // - Total time: ~90-120 seconds (fits within assertion timeout)
  //
  // Expected timeline:
  // T+0s:   Setup starts
  // T+60s:  Instance reaches 'running', setup completes
  // T+70s:  IdleMonitor runs, skips status checks, stops instance
  // T+90s:  verify-auto-stop detects 'stopped' state, test passes ✅
});

/**
 * Test execution order:
 * 1. Setup instance (ensure running state)
 * 2. Verify auto-stop (instance stops after idle)
 *
 * NOTE: Resume must be done manually via AWS Console (auto-resume has been removed).
 * Assertions must be inlined in .next() chain to ensure CDK IntegTest
 * creates CloudFormation resources for all of them.
 */
integ.assertions
  // Assertion 1: Setup - Start instance before tests
  // Ensures instance is in 'running' state before the stop test begins
  // Prevents race condition where IdleMonitor stops the instance between deployment and test execution
  .invokeFunction({
    functionName: idleTestHandler.functionName,
    logType: LogType.TAIL,
    invocationType: InvocationType.REQUEST_RESPONSE,
    payload: JSON.stringify({
      testPhase: 'setup-instance',
      instanceId: constructUnderTest.instance.instanceId,
    }),
  })
  .expect(ExpectedResult.objectLike({
    Payload: '"RUNNING"',
  }))
  // Assertion 2: Instance stops after idle timeout
  // Assumes instance is running (from setup step)
  // Polls for 'stopped' state (IdleMonitor will stop it within 90s with skipStatusChecks)
  .next(
    integ.assertions
      .invokeFunction({
        functionName: idleTestHandler.functionName,
        logType: LogType.TAIL,
        invocationType: InvocationType.REQUEST_RESPONSE,
        payload: JSON.stringify({
          testPhase: 'verify-auto-stop',
          domainName: constructUnderTest.domainName,
          instanceId: constructUnderTest.instance.instanceId,
          idleTimeoutMinutes: 3,
        }),
      })
      .expect(ExpectedResult.objectLike({
        Payload: '"STOPPED"',
      })),
  );
