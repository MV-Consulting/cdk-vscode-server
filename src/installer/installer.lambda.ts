import { Command, SSM } from "@aws-sdk/client-ssm";
// @ts-ignore
import type {
  OnEventRequest,
  OnEventResponse,
} from "aws-cdk-lib/custom-resources/lib/provider-framework/types";
import { Context } from "aws-lambda";
import { CloudFormationCustomResourceResourcePropertiesCommon } from "aws-lambda/trigger/cloudformation-custom-resource";

const ssm = new SSM();
const SLEEP_MS = 2900;

export const handler = async (
  event: OnEventRequest,
  context: Context,
): Promise<OnEventResponse> => {
  console.log("Event: %j", { ...event, ResponseURL: "..." });

  if (event.RequestType !== "Create") {
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
  console.log("ResourceProperties raw: %j", resourceProperties);
  console.log("InstanceId: %s", event.ResourceProperties.InstanceId);
  console.log("VSCodePassword: %s", event.ResourceProperties.VSCodePassword);

  // to be able to modify them
  const resourcePropertiesPartial =
    resourceProperties as Partial<CloudFormationCustomResourceResourcePropertiesCommon>;
  console.log("ResourceProperties before: %j", resourcePropertiesPartial);
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
    "ResourceProperties filtered after: %j",
    resourcePropertiesPartial,
  );

  const parameters: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(resourcePropertiesPartial)) {
    parameters[key] = [value];
  }
  console.log("mapped parameters: %j", parameters);

  let attemptNo: number = 0;
  let timeRemaining: number = context.getRemainingTimeInMillis();

  console.log(
    `Running SSM Document '${documentName}' on EC2 instance '${instanceId}'. Logging to '${cloudWatchLogGroupName}' with parameters: '${JSON.stringify(parameters)}'`,
  );

  while (true) {
    attemptNo += 1;
    console.log(
      `Attempt: ${attemptNo}. Time Remaining: ${timeRemaining / 1000}s`,
    );

    try {
      const response = await ssm.sendCommand({
        DocumentName: documentName,
        InstanceIds: [instanceId],
        CloudWatchOutputConfig: {
          CloudWatchLogGroupName: cloudWatchLogGroupName,
          CloudWatchOutputEnabled: true,
        },
        Parameters: parameters,
      });

      console.log(`response: ${JSON.stringify(response)}`);
      const command: Command = response.Command!;
      const commandId: string = command.CommandId!;
      const responseData: any = { CommandId: commandId };

      switch (command.Status!) {
        case "Pending":
        case "InProgress":
          timeRemaining = context.getRemainingTimeInMillis();
          if (timeRemaining > SLEEP_MS) {
            console.log(
              `Instance ${instanceId} not ready: 'InProgress'. Sleeping: ${SLEEP_MS / 1000}s`,
            );
            await new Promise((resolve) => setTimeout(resolve, SLEEP_MS));
            break;
          } else {
            throw new Error(
              `SSM Document ${documentName} on EC2 instance ${instanceId} timed out while lambda in progress`,
            );
          }
        case "Success":
          console.log(`Instance ${instanceId} successfully bootstrapped`);
          return { Data: responseData };
        case "TimedOut":
          throw new Error(
            `SSM Document ${documentName} on EC2 instance ${instanceId} timed out`,
          );
        case "Cancelled":
          throw new Error(
            `SSM Document ${documentName} on EC2 instance ${instanceId} cancelled`,
          );
        case "Failed":
          throw new Error(
            `SSM Document ${documentName} on EC2 instance ${instanceId} failed`,
          );
        default:
          throw new Error(
            `SSM Document ${documentName} on EC2 instance ${instanceId} status ${command.Status!}`,
          );
      }

      return { Data: responseData };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
};
