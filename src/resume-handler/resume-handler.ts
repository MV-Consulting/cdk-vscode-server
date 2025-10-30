import * as path from 'path';
import { Duration, Stack } from 'aws-cdk-lib';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { IInstance } from 'aws-cdk-lib/aws-ec2';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime, Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

/**
 * Props for ResumeHandler construct
 */
export interface ResumeHandlerProps {
  /**
   * The EC2 instance to resume
   */
  readonly instance: IInstance;
  /**
   * DynamoDB table for tracking instance state
   */
  readonly stateTable: ITable;
  /**
   * URL of the status check API endpoint
   */
  readonly statusApiUrl: string;
}

/**
 * Lambda@Edge function that intercepts CloudFront requests and resumes stopped instances
 */
export class ResumeHandler extends Construct {
  /**
   * The Lambda@Edge function that handles resume logic
   */
  public readonly function: LambdaFunction;

  constructor(scope: Construct, id: string, props: ResumeHandlerProps) {
    super(scope, id);

    // Lambda@Edge requires specific configuration
    this.function = new LambdaFunction(this, 'Function', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromAsset(path.join(__dirname, '../../assets/resume-handler/resume-handler.lambda')),
      timeout: Duration.seconds(5), // Lambda@Edge viewer request max
      memorySize: 128, // Lambda@Edge minimum
      environment: {
        TABLE_NAME: props.stateTable.tableName,
        INSTANCE_ID: props.instance.instanceId,
        STATUS_API_URL: props.statusApiUrl,
      },
    });

    // Grant permissions
    props.stateTable.grantReadWriteData(this.function);

    // DescribeInstances doesn't support resource-level permissions, requires wildcard
    this.function.addToRolePolicy(
      new PolicyStatement({
        actions: [
          'ec2:DescribeInstances',
        ],
        resources: ['*'],
      }),
    );

    // StartInstances supports resource-level permissions, so we can restrict it
    this.function.addToRolePolicy(
      new PolicyStatement({
        actions: [
          'ec2:StartInstances',
        ],
        resources: [
          `arn:aws:ec2:${Stack.of(this).region}:${Stack.of(this).account}:instance/${props.instance.instanceId}`,
        ],
      }),
    );

    // CDK-nag suppressions
    NagSuppressions.addResourceSuppressions(
      this.function,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Managed policies acceptable for Lambda@Edge functions',
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'Runtime version compatible with Lambda@Edge',
        },
      ],
      true,
    );
  }
}
