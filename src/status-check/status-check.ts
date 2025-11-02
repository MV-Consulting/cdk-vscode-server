import * as path from 'path';
import { Duration, Stack } from 'aws-cdk-lib';
import { RestApi, LambdaIntegration, Cors } from 'aws-cdk-lib/aws-apigateway';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { IInstance } from 'aws-cdk-lib/aws-ec2';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime, Code, Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

/**
 * Props for StatusCheckApi construct
 */
export interface StatusCheckApiProps {
  /**
   * The EC2 instance to check status for
   */
  readonly instance: IInstance;
  /**
   * DynamoDB table for tracking instance state
   */
  readonly stateTable: ITable;
}

/**
 * API Gateway endpoint for checking instance status, used by resume page for polling
 */
export class StatusCheckApi extends Construct {
  /**
   * The API Gateway REST API
   */
  public readonly api: RestApi;
  /**
   * The URL of the status check API endpoint
   */
  public readonly apiUrl: string;
  /**
   * The Lambda function that handles status check requests
   */
  public readonly function: LambdaFunction;

  constructor(scope: Construct, id: string, props: StatusCheckApiProps) {
    super(scope, id);

    this.function = new LambdaFunction(this, 'Function', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromAsset(path.join(__dirname, '../../assets/status-check/status-check.lambda')),
      timeout: Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: props.stateTable.tableName,
      },
    });

    // Grant permissions
    props.stateTable.grantReadWriteData(this.function);

    this.function.addToRolePolicy(
      new PolicyStatement({
        actions: [
          'ec2:DescribeInstanceStatus',
          'ec2:DescribeInstances',
          'ec2:StartInstances', // Allow starting instances for resume functionality
        ],
        resources: [
          `arn:aws:ec2:${Stack.of(this).region}:${Stack.of(this).account}:instance/${props.instance.instanceId}`,
        ],
      }),
    );

    // Create API Gateway
    this.api = new RestApi(this, 'Api', {
      restApiName: 'VSCodeStatusCheckApi',
      description: 'API for checking VS Code Server instance status',
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
    });

    const statusResource = this.api.root.addResource('status');
    const instanceResource = statusResource.addResource('{instanceId}');

    // GET /status/{instanceId} - Check instance status
    instanceResource.addMethod('GET', new LambdaIntegration(this.function));

    // POST /status/{instanceId}/start - Start stopped instance
    const startResource = instanceResource.addResource('start');
    startResource.addMethod('POST', new LambdaIntegration(this.function));

    this.apiUrl = this.api.url;

    // CDK-nag suppressions
    NagSuppressions.addResourceSuppressions(
      this.function,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Managed policies acceptable for workshop Lambda functions',
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'Latest runtime not required for this function',
        },
      ],
      true,
    );

    NagSuppressions.addResourceSuppressions(
      this.api,
      [
        {
          id: 'AwsSolutions-APIG2',
          reason: 'Request validation not required for this simple API',
        },
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Managed policies acceptable for workshop API Gateway',
        },
        {
          id: 'AwsSolutions-APIG4',
          reason: 'Authorization not required for status check endpoint',
        },
        {
          id: 'AwsSolutions-COG4',
          reason: 'Cognito not required for this workshop API',
        },
        {
          id: 'AwsSolutions-APIG1',
          reason: 'Access logging not required for workshop environment',
        },
        {
          id: 'AwsSolutions-APIG3',
          reason: 'WAF not required for this workshop API',
        },
        {
          id: 'AwsSolutions-APIG6',
          reason: 'CloudWatch logging not required for workshop environment',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard permissions acceptable for workshop API Gateway execution role',
          appliesTo: ['Resource::*'],
        },
      ],
      true,
    );
  }
}
