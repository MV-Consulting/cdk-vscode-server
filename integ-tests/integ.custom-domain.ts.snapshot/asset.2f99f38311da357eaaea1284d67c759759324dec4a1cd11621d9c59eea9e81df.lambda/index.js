"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/installer/installer.lambda.ts
var installer_lambda_exports = {};
__export(installer_lambda_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(installer_lambda_exports);
var import_client_ssm = require("@aws-sdk/client-ssm");
var ssm = new import_client_ssm.SSM();
var SLEEP_MS = 2900;
var handler = async (event, context) => {
  console.log("Event: %j", { ...event, ResponseURL: "..." });
  if (event.RequestType !== "Create") {
    return {};
  }
  const resourceProperties = event.ResourceProperties;
  const instanceId = event.ResourceProperties.InstanceId;
  const documentName = event.ResourceProperties.DocumentName;
  const cloudWatchLogGroupName = event.ResourceProperties.CloudWatchLogGroupName;
  console.log("ResourceProperties raw: %j", resourceProperties);
  console.log("InstanceId: %s", event.ResourceProperties.InstanceId);
  console.log("VSCodePassword: %s", event.ResourceProperties.VSCodePassword);
  const resourcePropertiesPartial = resourceProperties;
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
    resourcePropertiesPartial
  );
  const parameters = {};
  for (const [key, value] of Object.entries(resourcePropertiesPartial)) {
    parameters[key] = [value];
  }
  console.log("mapped parameters: %j", parameters);
  console.log(
    `Running SSM Document '${documentName}' on EC2 instance '${instanceId}'. Logging to '${cloudWatchLogGroupName}' with parameters: '${JSON.stringify(parameters)}'`
  );
  let commandId;
  let attemptNo = 0;
  while (true) {
    attemptNo += 1;
    const timeRemaining = context.getRemainingTimeInMillis();
    console.log(
      `Send attempt: ${attemptNo}. Time Remaining: ${timeRemaining / 1e3}s`
    );
    try {
      const response = await ssm.send(
        new import_client_ssm.SendCommandCommand({
          DocumentName: documentName,
          InstanceIds: [instanceId],
          CloudWatchOutputConfig: {
            CloudWatchLogGroupName: cloudWatchLogGroupName,
            CloudWatchOutputEnabled: true
          },
          Parameters: parameters
        })
      );
      console.log(`sendCommand response: ${JSON.stringify(response)}`);
      const command = response.Command;
      commandId = command.CommandId;
      console.log(`Command sent successfully. CommandId: ${commandId}`);
      break;
    } catch (error) {
      console.log("Error sending command:", error);
      const isUnauthorized = error.name === "UnauthorizedException" || error.name === "AccessDeniedException" || error.message && error.message.includes("not authorized");
      const isThrottled = error.name === "ThrottlingException" || error.name === "TooManyRequestsException";
      const isRetryable = isUnauthorized || isThrottled;
      const remainingTime = context.getRemainingTimeInMillis();
      if (isRetryable && remainingTime > SLEEP_MS) {
        console.log(
          `Retryable error encountered (${error.name}). Attempt ${attemptNo}. Sleeping: ${SLEEP_MS / 1e3}s before retry`
        );
        await new Promise((resolve) => setTimeout(resolve, SLEEP_MS));
      } else {
        console.log("Non-retryable error or timeout. Failing...");
        throw error;
      }
    }
  }
  let pollAttemptNo = 0;
  const responseData = { CommandId: commandId };
  while (true) {
    pollAttemptNo += 1;
    const timeRemaining = context.getRemainingTimeInMillis();
    console.log(
      `Poll attempt: ${pollAttemptNo}. Time Remaining: ${timeRemaining / 1e3}s`
    );
    try {
      const invocationResponse = await ssm.send(
        new import_client_ssm.GetCommandInvocationCommand({
          CommandId: commandId,
          InstanceId: instanceId
        })
      );
      console.log(
        `getCommandInvocation response: ${JSON.stringify(invocationResponse)}`
      );
      const status = invocationResponse.Status;
      switch (status) {
        case "Pending":
        case "InProgress":
        case "Delayed":
          if (timeRemaining > SLEEP_MS) {
            console.log(
              `Command ${commandId} status: '${status}'. Sleeping: ${SLEEP_MS / 1e3}s`
            );
            await new Promise((resolve) => setTimeout(resolve, SLEEP_MS));
            break;
          } else {
            throw new Error(
              `SSM Document ${documentName} on EC2 instance ${instanceId} timed out while lambda waiting (status: ${status})`
            );
          }
        case "Success":
          console.log(
            `Instance ${instanceId} successfully bootstrapped. Command ${commandId} completed.`
          );
          return { Data: responseData };
        case "TimedOut":
          throw new Error(
            `SSM Document ${documentName} on EC2 instance ${instanceId} timed out`
          );
        case "Cancelled":
          throw new Error(
            `SSM Document ${documentName} on EC2 instance ${instanceId} cancelled`
          );
        case "Failed":
          throw new Error(
            `SSM Document ${documentName} on EC2 instance ${instanceId} failed`
          );
        default:
          throw new Error(
            `SSM Document ${documentName} on EC2 instance ${instanceId} unknown status: ${status}`
          );
      }
    } catch (error) {
      const remainingTime = context.getRemainingTimeInMillis();
      if (error.name === "InvocationDoesNotExist" && remainingTime > SLEEP_MS) {
        console.log(
          `Invocation not yet available. Sleeping: ${SLEEP_MS / 1e3}s`
        );
        await new Promise((resolve) => setTimeout(resolve, SLEEP_MS));
      } else {
        console.log("Error checking command status:", error);
        throw error;
      }
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
