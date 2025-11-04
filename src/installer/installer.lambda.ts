import {
  Command,
  GetCommandInvocationCommand,
  SendCommandCommand,
  SSM,
} from '@aws-sdk/client-ssm';
// @ts-ignore
import type {
  OnEventRequest,
  OnEventResponse,
} from 'aws-cdk-lib/custom-resources/lib/provider-framework/types';
import { Context } from 'aws-lambda';
import { CloudFormationCustomResourceResourcePropertiesCommon } from 'aws-lambda/trigger/cloudformation-custom-resource';

const ssm = new SSM();
const SLEEP_MS = 2900;

export const handler = async (
  event: OnEventRequest,
  context: Context,
): Promise<OnEventResponse> => {
  console.log('Event: %j', { ...event, ResponseURL: '...' });

  if (event.RequestType !== 'Create') {
    // do nothing
    return {};
  }

  // only Create case
  const resourceProperties = event.ResourceProperties;
  const instanceId = event.ResourceProperties.InstanceId;
  const documentName = event.ResourceProperties.DocumentName;
  const cloudWatchLogGroupName =
    event.ResourceProperties.CloudWatchLogGroupName;

  // debug
  console.log('ResourceProperties raw: %j', resourceProperties);
  console.log('InstanceId: %s', event.ResourceProperties.InstanceId);
  console.log('VSCodePassword: %s', event.ResourceProperties.VSCodePassword);

  // to be able to modify them
  const resourcePropertiesPartial =
    resourceProperties as Partial<CloudFormationCustomResourceResourcePropertiesCommon>;
  console.log('ResourceProperties before: %j', resourcePropertiesPartial);
  delete resourcePropertiesPartial.ServiceToken;
  if (resourcePropertiesPartial.ServiceTimeout) {
    delete resourcePropertiesPartial.ServiceTimeout;
  }
  delete resourcePropertiesPartial.InstanceId;
  delete resourcePropertiesPartial.DocumentName;
  delete resourcePropertiesPartial.CloudWatchLogGroupName;
  if (resourcePropertiesPartial.PhysicalResourceId) {
    delete resourcePropertiesPartial.PhysicalResourceId;
  }

  console.log(
    'ResourceProperties filtered after: %j',
    resourcePropertiesPartial,
  );

  const parameters: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(resourcePropertiesPartial)) {
    parameters[key] = [value];
  }
  console.log('mapped parameters: %j', parameters);

  console.log(
    `Running SSM Document '${documentName}' on EC2 instance '${instanceId}'. Logging to '${cloudWatchLogGroupName}' with parameters: '${JSON.stringify(parameters)}'`,
  );

  // Step 1: Send the SSM command once and get the CommandId
  let commandId: string;
  let attemptNo = 0;

  // Retry loop for sending the command (handles IAM propagation issues)
  while (true) {
    attemptNo += 1;
    const timeRemaining = context.getRemainingTimeInMillis();
    console.log(
      `Send attempt: ${attemptNo}. Time Remaining: ${timeRemaining / 1000}s`,
    );

    try {
      const response = await ssm.send(
        new SendCommandCommand({
          DocumentName: documentName,
          InstanceIds: [instanceId],
          CloudWatchOutputConfig: {
            CloudWatchLogGroupName: cloudWatchLogGroupName,
            CloudWatchOutputEnabled: true,
          },
          Parameters: parameters,
        }),
      );

      console.log(`sendCommand response: ${JSON.stringify(response)}`);
      const command: Command = response.Command!;
      commandId = command.CommandId!;
      console.log(`Command sent successfully. CommandId: ${commandId}`);
      break; // Successfully sent command, exit retry loop
    } catch (error: any) {
      console.log('Error sending command:', error);

      // Check if this is a retryable error (IAM propagation, throttling, etc.)
      const isUnauthorized =
        error.name === 'UnauthorizedException' ||
        error.name === 'AccessDeniedException' ||
        (error.message && error.message.includes('not authorized'));
      const isThrottled =
        error.name === 'ThrottlingException' ||
        error.name === 'TooManyRequestsException';
      const isRetryable = isUnauthorized || isThrottled;

      const remainingTime = context.getRemainingTimeInMillis();

      if (isRetryable && remainingTime > SLEEP_MS) {
        console.log(
          `Retryable error encountered (${error.name}). Attempt ${attemptNo}. Sleeping: ${SLEEP_MS / 1000}s before retry`,
        );
        await new Promise((resolve) => setTimeout(resolve, SLEEP_MS));
        // Continue to next iteration of while loop
      } else {
        // Non-retryable error or out of time
        console.log('Non-retryable error or timeout. Failing...');
        throw error;
      }
    }
  }

  // Step 2: Poll for command completion using getCommandInvocation
  let pollAttemptNo = 0;
  const responseData: any = { CommandId: commandId };

  while (true) {
    pollAttemptNo += 1;
    const timeRemaining = context.getRemainingTimeInMillis();
    console.log(
      `Poll attempt: ${pollAttemptNo}. Time Remaining: ${timeRemaining / 1000}s`,
    );

    try {
      const invocationResponse = await ssm.send(
        new GetCommandInvocationCommand({
          CommandId: commandId,
          InstanceId: instanceId,
        }),
      );

      console.log(
        `getCommandInvocation response: ${JSON.stringify(invocationResponse)}`,
      );
      const status = invocationResponse.Status!;

      switch (status) {
        case 'Pending':
        case 'InProgress':
        case 'Delayed':
          if (timeRemaining > SLEEP_MS) {
            console.log(
              `Command ${commandId} status: '${status}'. Sleeping: ${SLEEP_MS / 1000}s`,
            );
            await new Promise((resolve) => setTimeout(resolve, SLEEP_MS));
            break; // Continue polling
          } else {
            throw new Error(
              `SSM Document ${documentName} on EC2 instance ${instanceId} timed out while lambda waiting (status: ${status})`,
            );
          }
        case 'Success':
          console.log(
            `Instance ${instanceId} successfully bootstrapped. Command ${commandId} completed.`,
          );
          return { Data: responseData };
        case 'TimedOut':
          throw new Error(
            `SSM Document ${documentName} on EC2 instance ${instanceId} timed out`,
          );
        case 'Cancelled':
          throw new Error(
            `SSM Document ${documentName} on EC2 instance ${instanceId} cancelled`,
          );
        case 'Failed':
          throw new Error(
            `SSM Document ${documentName} on EC2 instance ${instanceId} failed`,
          );
        default:
          throw new Error(
            `SSM Document ${documentName} on EC2 instance ${instanceId} unknown status: ${status}`,
          );
      }
    } catch (error: any) {
      // Check if this is an invocation not available yet error
      const remainingTime = context.getRemainingTimeInMillis();

      if (
        error.name === 'InvocationDoesNotExist' &&
        remainingTime > SLEEP_MS
      ) {
        console.log(
          `Invocation not yet available. Sleeping: ${SLEEP_MS / 1000}s`,
        );
        await new Promise((resolve) => setTimeout(resolve, SLEEP_MS));
        // Continue polling
      } else {
        // Non-retryable error or out of time
        console.log('Error checking command status:', error);
        throw error;
      }
    }
  }
};
