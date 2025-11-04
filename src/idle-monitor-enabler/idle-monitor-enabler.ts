import { Duration, Stack, CustomResource } from 'aws-cdk-lib';
import { Rule } from 'aws-cdk-lib/aws-events';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { IdleMonitorEnablerFunction } from './idle-monitor-enabler-function';

/**
 * Props for IdleMonitorEnabler construct
 */
export interface IdleMonitorEnablerProps {
  /**
   * The EventBridge rule to enable after installation completes
   */
  readonly scheduleRule: Rule;
}

/**
 * Custom Resource that enables the IdleMonitor EventBridge rule
 * after the installer custom resource has completed.
 *
 * This prevents the race condition where IdleMonitor stops the instance
 * while VS Code Server is still being installed.
 */
export class IdleMonitorEnabler extends Construct {
  /**
   * The custom resource that triggers the enabler Lambda
   */
  public readonly customResource: any;

  constructor(scope: Construct, id: string, props: IdleMonitorEnablerProps) {
    super(scope, id);

    // Create the Lambda function that enables the rule
    const enablerFunction = new IdleMonitorEnablerFunction(this, 'Function', {
      timeout: Duration.seconds(30),
      memorySize: 128,
    });

    // Grant permissions to enable/disable the EventBridge rule
    enablerFunction.addToRolePolicy(
      new PolicyStatement({
        actions: [
          'events:EnableRule',
          'events:DisableRule',
          'events:DescribeRule',
        ],
        resources: [
          `arn:aws:events:${Stack.of(this).region}:${Stack.of(this).account}:rule/${props.scheduleRule.ruleName}`,
        ],
      }),
    );

    // Create the custom resource provider
    const provider = new Provider(this, 'Provider', {
      onEventHandler: enablerFunction,
      logRetention: 1, // 1 day retention for logs
    });

    // Create the custom resource
    this.customResource = new Construct(this, 'Resource');
    const cfnResource = new CustomResource(this.customResource, 'Default', {
      serviceToken: provider.serviceToken,
      properties: {
        RuleName: props.scheduleRule.ruleName,
      },
    });

    // Ensure the custom resource depends on the rule existing
    cfnResource.node.addDependency(props.scheduleRule);

    // CDK-nag suppressions
    NagSuppressions.addResourceSuppressions(
      enablerFunction,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Managed policies acceptable for custom resource Lambda functions',
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'Latest runtime not required for this function',
        },
      ],
      true,
    );

    // Suppress for the provider framework
    NagSuppressions.addResourceSuppressions(
      provider,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Provider framework uses managed policies',
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'Provider framework runtime managed by CDK',
        },
      ],
      true,
    );
  }
}
