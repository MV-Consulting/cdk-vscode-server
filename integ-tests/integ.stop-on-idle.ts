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
const constructUnderTest = new VSCodeServer(stackUnderTest, 'IntegVSCodeServer', {
  instanceVolumeSize: 20,
  enableAutoStop: true, // Enable automatic instance stop when idle
  idleTimeoutMinutes: 2, // Very short timeout for fast testing (2 minutes)
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
  timeout: Duration.minutes(2), // Max 2m from CDK IntegTest assertion timeout
  bundling: {
    esbuildArgs: {
      "--packages": "bundle",
    },
  },
  environment: {
    INSTANCE_ID: constructUnderTest.instance.instanceId,
    CLOUDFRONT_DOMAIN: constructUnderTest.domainName,
    IDLE_TIMEOUT_MINUTES: '2',
    IDLE_MONITOR_RULE_NAME: constructUnderTest.idleMonitor?.scheduleRule.ruleName ?? '',
  },
});

// Lambda function to test login functionality
const loginHandler = new NodejsFunction(stackUnderTest, 'login-handler', {
  functionName: PhysicalName.GENERATE_IF_NEEDED,
  entry: path.join(__dirname, 'functions', 'login-handler.ts'),
  runtime: lambda.Runtime.NODEJS_20_X,
  logRetention: 1,
  timeout: Duration.seconds(30),
  bundling: {
    esbuildArgs: {
      "--packages": "bundle",
    },
  },
});

// Grant permissions to check instance status, start instances, and manage EventBridge rules
idleTestHandler.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'ec2:DescribeInstances',
      'ec2:DescribeInstanceStatus',
      'ec2:StartInstances',
      'cloudwatch:GetMetricStatistics',
      'events:DisableRule',
      'events:DescribeRule',
    ],
    resources: ['*'],
  }),
);

const integ = new IntegTest(app, 'IntegStopOnIdleFunctionality', {
  testCases: [stackUnderTest],
  cdkCommandOptions: {
    destroy: {
      args: {
        force: true,
      },
    },
  },
});

/**
 * Test: Complete stop-on-idle workflow
 *
 * Test phases:
 * 1. verify-auto-stop: Wait for instance to stop after being idle (idle-test-handler)
 * 2. disable-idle-monitor: Disable EventBridge rule to prevent re-stopping (idle-test-handler)
 * 3. start-instance: Start the instance and wait for running state (idle-test-handler)
 * 4. verify-login: Check that VS Code Server is accessible via CloudFront (login-handler)
 *
 * This verifies the complete workflow including recovery after auto-stop.
 * Uses the existing login-handler.ts (same as integ.ubuntu.ts) for login verification.
 */
integ.assertions
  // Phase 1: Wait for instance to stop after idle timeout
  .invokeFunction({
    functionName: idleTestHandler.functionName,
    logType: LogType.TAIL,
    invocationType: InvocationType.REQUEST_RESPONSE,
    payload: JSON.stringify({
      testPhase: 'verify-auto-stop',
      domainName: constructUnderTest.domainName,
      instanceId: constructUnderTest.instance.instanceId,
      idleTimeoutMinutes: 2,
    }),
  })
  .expect(ExpectedResult.objectLike({
    Payload: '"STOPPED"',
  }))
  // Phase 2: Disable IdleMonitor EventBridge rule
  .next(
    integ.assertions
      .invokeFunction({
        functionName: idleTestHandler.functionName,
        logType: LogType.TAIL,
        invocationType: InvocationType.REQUEST_RESPONSE,
        payload: JSON.stringify({
          testPhase: 'disable-idle-monitor',
          idleMonitorRuleName: constructUnderTest.idleMonitor?.scheduleRule.ruleName ?? '',
        }),
      })
      .expect(ExpectedResult.objectLike({
        Payload: '"DISABLED"',
      })),
  )
  // Phase 3: Start instance and wait for running state
  .next(
    integ.assertions
      .invokeFunction({
        functionName: idleTestHandler.functionName,
        logType: LogType.TAIL,
        invocationType: InvocationType.REQUEST_RESPONSE,
        payload: JSON.stringify({
          testPhase: 'start-instance',
          instanceId: constructUnderTest.instance.instanceId,
        }),
      })
      .expect(ExpectedResult.objectLike({
        Payload: '"RUNNING"',
      })),
  )
  // Phase 4: Verify login is accessible
  .next(
    integ.assertions
      .invokeFunction({
        functionName: loginHandler.functionName,
        logType: LogType.TAIL,
        invocationType: InvocationType.REQUEST_RESPONSE,
        payload: JSON.stringify({
          domainName: constructUnderTest.domainName,
          password: constructUnderTest.password,
        }),
      })
      .expect(ExpectedResult.objectLike({
        Payload: '"OK"',
      })),
  );
