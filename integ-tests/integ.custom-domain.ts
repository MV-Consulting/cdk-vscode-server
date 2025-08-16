import * as path from 'path';
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  IntegTest,
  LogType,
  InvocationType,
  ExpectedResult,
} from '@aws-cdk/integ-tests-alpha';
import {
  App,
  Duration,
  PhysicalName,
  Stack,
  aws_lambda as lambda,
} from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { VSCodeServer } from '../src/vscode-server';

// CDK App for Integration Tests
const app = new App();

// Stack under test
const stackUnderTest = new Stack(app, 'IntegTestStackCustomDomain', {
  description:
    "This stack includes the application's resources for integration testing with custom domain.",
});

const constructUnderTest = new VSCodeServer(
  stackUnderTest,
  'IntegVSCodeServer',
  {
    domainName: 'vscode-server-test.mavogel.xyz',
    hostedZoneId: 'Z03751551EDMO1J40VL58',
    autoCreateCertificate: true,
    additionalTags: {
      IntegTest: 'True',
      Environment: 'IntegTestCustomDomain',
    },
  },
);

const integ = new IntegTest(app, 'IntegSetupVSCodeOnCustomDomain', {
  testCases: [stackUnderTest], // Define a list of cases for this test
  cdkCommandOptions: {
    destroy: {
      args: {
        force: true,
      },
    },
  },
  regions: [stackUnderTest.region],
});

const loginHandler = new NodejsFunction(stackUnderTest, 'login-handler', {
  functionName: PhysicalName.GENERATE_IF_NEEDED,
  entry: path.join(__dirname, 'functions', 'login-handler.ts'),
  runtime: lambda.Runtime.NODEJS_20_X,
  logRetention: 1,
  timeout: Duration.seconds(30),
  bundling: {
    esbuildArgs: {
      '--packages': 'bundle',
    },
  },
});

/**
 * Assertion:
 * Should find the vscode server login page at the custom domain
 */
const sendTestLoginAssertion = integ.assertions
  .invokeFunction({
    functionName: loginHandler.functionName,
    logType: LogType.TAIL,
    invocationType: InvocationType.REQUEST_RESPONSE, // to run it synchronously
    payload: JSON.stringify({
      domainName: constructUnderTest.domainName,
      password: constructUnderTest.password,
    }),
  })
  .expect(ExpectedResult.objectLike({ Payload: '"OK"' }));

/**
 * Main test case
 */
// Attempt a login at the custom domain with the given password
sendTestLoginAssertion;
