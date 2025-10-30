import * as path from 'path';
import { Duration, Stack } from 'aws-cdk-lib';
import { IDistribution } from 'aws-cdk-lib/aws-cloudfront';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { IInstance } from 'aws-cdk-lib/aws-ec2';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction as LambdaFunctionTarget } from 'aws-cdk-lib/aws-events-targets';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime, Code, Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

/**
 * Props for IdleMonitor construct
 */
export interface IdleMonitorProps {
  /**
   * The EC2 instance to monitor
   */
  readonly instance: IInstance;
  /**
   * The CloudFront distribution to monitor for activity
   */
  readonly distribution: IDistribution;
  /**
   * DynamoDB table for tracking instance state
   */
  readonly stateTable: ITable;
  /**
   * Number of minutes of inactivity before stopping the instance
   */
  readonly idleTimeoutMinutes: number;
}

/**
 * Construct that monitors CloudFront request metrics and stops the EC2 instance when idle
 */
export class IdleMonitor extends Construct {
  /**
   * The Lambda function that performs idle monitoring
   */
  public readonly function: LambdaFunction;

  constructor(scope: Construct, id: string, props: IdleMonitorProps) {
    super(scope, id);

    this.function = new LambdaFunction(this, 'Function', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromAsset(path.join(__dirname, '../../assets/idle-monitor/idle-monitor.lambda')),
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        INSTANCE_ID: props.instance.instanceId,
        DISTRIBUTION_ID: props.distribution.distributionId,
        TABLE_NAME: props.stateTable.tableName,
        IDLE_TIMEOUT_MINUTES: props.idleTimeoutMinutes.toString(),
      },
    });

    // Grant permissions
    props.stateTable.grantReadWriteData(this.function);

    this.function.addToRolePolicy(
      new PolicyStatement({
        actions: [
          'cloudwatch:GetMetricStatistics',
          'cloudwatch:GetMetricData',
        ],
        resources: ['*'],
      }),
    );

    this.function.addToRolePolicy(
      new PolicyStatement({
        actions: [
          'ec2:DescribeInstances',
          'ec2:DescribeInstanceStatus',
          'ec2:StopInstances',
        ],
        resources: [
          `arn:aws:ec2:${Stack.of(this).region}:${Stack.of(this).account}:instance/${props.instance.instanceId}`,
        ],
      }),
    );

    // Create EventBridge rule to trigger every 5 minutes
    const rule = new Rule(this, 'ScheduleRule', {
      schedule: Schedule.rate(Duration.minutes(5)),
    });

    rule.addTarget(new LambdaFunctionTarget(this.function));

    // CDK-nag suppressions
    NagSuppressions.addResourceSuppressions(
      this.function,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Managed policies acceptable for workshop Lambda functions',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'CloudWatch metrics require wildcard permissions',
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'Latest runtime not required for this function',
        },
      ],
      true,
    );
  }
}
