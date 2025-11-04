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
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LinuxFlavorType, VSCodeServer } from '../src/vscode-server';
// CDK App for Integration Tests
const app = new App();
// Stack under test
const stackUnderTest = new Stack(app, 'IntegTestStackUbuntu24', {
  description: "This stack includes the application's resources for integration testing.",
});

const constructUnderTest = new VSCodeServer(stackUnderTest, 'IntegVSCodeServer', {
  repoUrl: 'https://github.com/aws-samples/fleet-management-on-amazon-eks-workshop.git',
  instanceOperatingSystem: LinuxFlavorType.UBUNTU_24,
})

const integ = new IntegTest(app, 'IntegSetupVSCodeOnUbuntu', {
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
      "--packages": "bundle",
    },
  },
});

/**
 * Assertion:
 * Should find the vscode server login page
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
  }).expect(ExpectedResult.objectLike({ Payload: '"OK"' }));

/**
 * Main test case
 */
// Attempt a login at the domain with the given password
sendTestLoginAssertion