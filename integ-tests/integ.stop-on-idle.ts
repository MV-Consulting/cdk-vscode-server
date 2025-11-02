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
const constructUnderTest = new VSCodeServer(stackUnderTest, 'IntegVSCodeServer', {
  instanceClass: InstanceClass.T4G,
  instanceSize: InstanceSize.LARGE,
  instanceVolumeSize: 8,
  enableAutoStop: true, // Auto-resume is automatically enabled with auto-stop
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
  },
});

// Grant permissions to check instance status and start instances
idleTestHandler.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'ec2:DescribeInstances',
      'ec2:DescribeInstanceStatus',
      'cloudwatch:GetMetricStatistics',
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
 * Test: Verify instance stops after idle timeout
 *
 * After deployment, the instance will start running. The IdleMonitor Lambda
 * checks for activity every 1 minute. After 2 minutes of no CloudFront requests,
 * the instance should be stopped.
 *
 * This test simply verifies that the instance transitions to 'stopped' state.
 * NOTE: Resume must be done manually via AWS Console (auto-resume has been removed).
 */
integ.assertions
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
  }));
