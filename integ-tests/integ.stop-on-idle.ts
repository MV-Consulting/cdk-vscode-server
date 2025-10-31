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

// Create VSCodeServer with optimized parameters for fast testing:
// - Smallest ARM instance (t4g.nano) for minimal cost and fast provisioning
// - Minimal volume size (8 GB)
// - Very short idle timeout (2 minutes instead of default 30)
// - Check every 1 minute (instead of default 5 minutes)
// - Auto-stop and auto-resume enabled
const constructUnderTest = new VSCodeServer(stackUnderTest, 'IntegVSCodeServer', {
  instanceClass: InstanceClass.T4G,
  instanceSize: InstanceSize.NANO,
  instanceVolumeSize: 8,
  enableAutoStop: true, // Auto-resume is automatically enabled with auto-stop
  idleTimeoutMinutes: 2, // Very short timeout for fast testing (2 minutes)
  idleCheckIntervalMinutes: 1, // Check every 1 minute for fast testing
  additionalTags: {
    'IntegTest': 'True',
    'TestType': 'StopOnIdle',
  },
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
    IDLE_TIMEOUT_MINUTES: '2',
    STATUS_API_URL: constructUnderTest.statusApiUrl || '',
  },
});

// Grant permissions to check instance status and access CloudFront metrics
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

/**
 * Assertion 1: Initial login works
 * Verify the VS Code Server is accessible after deployment
 */
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

/**
 * Test execution order (must be defined in reverse order due to .next() chaining):
 * 1. initialLoginAssertion - Verify initial deployment works
 * 2. stopOnIdleAssertion - Wait for idle timeout and verify stop
 * 3. autoResumeAssertion - Call status API and verify resume
 */

/**
 * Assertion 1: Initial login to VS Code Server
 */
const initialLoginAssertion = integ.assertions
  .invokeFunction({
    functionName: loginHandler.functionName,
    logType: LogType.TAIL,
    invocationType: InvocationType.REQUEST_RESPONSE,
    payload: JSON.stringify({
      domainName: constructUnderTest.domainName,
      password: constructUnderTest.password,
    }),
  }).expect(ExpectedResult.objectLike({ Payload: '"OK"' }));

/**
 * Assertion 2: Instance stops after idle timeout
 * This test:
 * 1. Waits for initial instance to be running
 * 2. Waits for idle timeout period (2 minutes + buffer)
 * 3. Verifies instance transitions to 'stopped' state
 */
const stopOnIdleAssertion = initialLoginAssertion.next(
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
      Payload: ExpectedResult.stringLikeRegexp('.*instance.*stopped.*'),
    })),
);

/**
 * Assertion 3: Instance resumes via status API
 * This test:
 * 1. Waits for instance to be stopped (from previous test)
 * 2. Calls the status API start endpoint to resume the instance
 * 3. Waits for instance to be running
 * 4. Verifies VS Code Server is accessible again
 *
 * NOTE: Uses client-side resume via POST /status/{instanceId}/start API endpoint
 */
const autoResumeAssertion = stopOnIdleAssertion.next(
  integ.assertions
    .invokeFunction({
      functionName: idleTestHandler.functionName,
      logType: LogType.TAIL,
      invocationType: InvocationType.REQUEST_RESPONSE,
      payload: JSON.stringify({
        testPhase: 'verify-auto-resume',
        domainName: constructUnderTest.domainName,
        instanceId: constructUnderTest.instance.instanceId,
      }),
    })
    .expect(ExpectedResult.objectLike({
      Payload: ExpectedResult.stringLikeRegexp('.*instance.*running.*'),
    })),
);

// Export the final assertion to ensure test execution
autoResumeAssertion;
