import * as path from 'path';
import { Duration, Stack } from 'aws-cdk-lib';
import { IDistribution } from 'aws-cdk-lib/aws-cloudfront';
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
   * Number of minutes of inactivity before stopping the instance
   */
  readonly idleTimeoutMinutes: number;
  /**
   * How often to check for idle activity (in minutes)
   * @default 5 - Check every 5 minutes
   */
  readonly checkIntervalMinutes?: number;
  /**
   * Skip instance status checks before stopping
   * When true, IdleMonitor will stop idle instances even if status checks haven't passed
   * This is useful for integration tests where status check initialization time
   * exceeds test timeout limits
   *
   * WARNING: For testing only - in production, you should wait for status checks
   * to pass before stopping instances
   *
   * @default false
   */
  readonly skipStatusChecks?: boolean;
}

/**
 * Construct that monitors CloudFront request metrics and stops the EC2 instance when idle
 */
export class IdleMonitor extends Construct {
  /**
   * The Lambda function that performs idle monitoring
   */
  public readonly function: LambdaFunction;

  /**
   * The EventBridge rule that triggers idle monitoring checks
   */
  public readonly scheduleRule: Rule;

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
        IDLE_TIMEOUT_MINUTES: props.idleTimeoutMinutes.toString(),
        SKIP_STATUS_CHECKS: props.skipStatusChecks ? 'true' : 'false',
      },
    });

    this.function.addToRolePolicy(
      new PolicyStatement({
        actions: [
          'cloudwatch:GetMetricStatistics',
          'cloudwatch:GetMetricData',
        ],
        resources: ['*'],
      }),
    );

    // DescribeInstances and DescribeInstanceStatus don't support resource-level permissions
    // They require wildcard resources
    this.function.addToRolePolicy(
      new PolicyStatement({
        actions: [
          'ec2:DescribeInstances',
          'ec2:DescribeInstanceStatus',
        ],
        resources: ['*'],
      }),
    );

    // StopInstances supports resource-level permissions, so we can restrict it
    this.function.addToRolePolicy(
      new PolicyStatement({
        actions: [
          'ec2:StopInstances',
        ],
        resources: [
          `arn:aws:ec2:${Stack.of(this).region}:${Stack.of(this).account}:instance/${props.instance.instanceId}`,
        ],
      }),
    );

    // Create EventBridge rule to trigger at specified interval
    // NOTE: Rule is created in DISABLED state and must be explicitly enabled
    // after installation completes to prevent stopping the instance during setup
    const checkInterval = props.checkIntervalMinutes ?? 5;
    this.scheduleRule = new Rule(this, 'ScheduleRule', {
      schedule: Schedule.rate(Duration.minutes(checkInterval)),
      enabled: false, // Start disabled, will be enabled after installation
    });

    this.scheduleRule.addTarget(new LambdaFunctionTarget(this.function));

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
