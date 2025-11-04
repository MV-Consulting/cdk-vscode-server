import {
  EventBridge,
  EnableRuleCommand,
  DisableRuleCommand,
} from '@aws-sdk/client-eventbridge';
// @ts-ignore
import type {
  OnEventRequest,
  OnEventResponse,
} from 'aws-cdk-lib/custom-resources/lib/provider-framework/types';

const eventBridge = new EventBridge();

/**
 * Custom Resource handler that enables the IdleMonitor EventBridge rule
 * after the installer custom resource has completed successfully.
 *
 * This prevents the IdleMonitor from stopping the EC2 instance while
 * VS Code Server is still being installed.
 */
export const handler = async (
  event: OnEventRequest,
): Promise<OnEventResponse> => {
  console.log('Event: %j', { ...event, ResponseURL: '...' });

  const ruleName = event.ResourceProperties.RuleName;

  if (!ruleName) {
    throw new Error('RuleName is required in ResourceProperties');
  }

  switch (event.RequestType) {
    case 'Create':
    case 'Update':
      console.log(`Enabling EventBridge rule: ${ruleName}`);
      await eventBridge.send(
        new EnableRuleCommand({
          Name: ruleName,
        }),
      );
      console.log(`Successfully enabled rule: ${ruleName}`);
      return {
        PhysicalResourceId: `idle-monitor-enabler-${ruleName}`,
      };

    case 'Delete':
      console.log(`Disabling EventBridge rule on deletion: ${ruleName}`);
      try {
        await eventBridge.send(
          new DisableRuleCommand({
            Name: ruleName,
          }),
        );
        console.log(`Successfully disabled rule: ${ruleName}`);
      } catch (error: any) {
        // Ignore errors on delete - rule might already be deleted
        console.log(`Error disabling rule (ignoring): ${error.message}`);
      }
      return {};

    default:
      throw new Error(`Unsupported RequestType: ${event.RequestType}`);
  }
};
