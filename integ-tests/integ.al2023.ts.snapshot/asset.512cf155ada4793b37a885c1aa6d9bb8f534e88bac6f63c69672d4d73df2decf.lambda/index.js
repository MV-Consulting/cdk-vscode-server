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
  console.log("ResourceProperties filtered after: %j", resourcePropertiesPartial);
  const parameters = {};
  for (const [key, value] of Object.entries(resourcePropertiesPartial)) {
    parameters[key] = [value];
  }
  console.log("mapped parameters: %j", parameters);
  let attemptNo = 0;
  let timeRemaining = context.getRemainingTimeInMillis();
  console.log(`Running SSM Document '${documentName}' on EC2 instance '${instanceId}'. Logging to '${cloudWatchLogGroupName}' with parameters: '${JSON.stringify(parameters)}'`);
  while (true) {
    attemptNo += 1;
    console.log(`Attempt: ${attemptNo}. Time Remaining: ${timeRemaining / 1e3}s`);
    try {
      const response = await ssm.sendCommand({
        DocumentName: documentName,
        InstanceIds: [instanceId],
        CloudWatchOutputConfig: {
          CloudWatchLogGroupName: cloudWatchLogGroupName,
          CloudWatchOutputEnabled: true
        },
        Parameters: parameters
      });
      console.log(`response: ${JSON.stringify(response)}`);
      const command = response.Command;
      const commandId = command.CommandId;
      const responseData = { CommandId: commandId };
      switch (command.Status) {
        case "Pending":
        case "InProgress":
          timeRemaining = context.getRemainingTimeInMillis();
          if (timeRemaining > SLEEP_MS) {
            console.log(`Instance ${instanceId} not ready: 'InProgress'. Sleeping: ${SLEEP_MS / 1e3}s`);
            await new Promise((resolve) => setTimeout(resolve, SLEEP_MS));
            break;
          } else {
            throw new Error(`SSM Document ${documentName} on EC2 instance ${instanceId} timed out while lambda in progress`);
          }
        case "Success":
          console.log(`Instance ${instanceId} successfully bootstrapped`);
          return { Data: responseData };
        case "TimedOut":
          throw new Error(`SSM Document ${documentName} on EC2 instance ${instanceId} timed out`);
        case "Cancelled":
          throw new Error(`SSM Document ${documentName} on EC2 instance ${instanceId} cancelled`);
        case "Failed":
          throw new Error(`SSM Document ${documentName} on EC2 instance ${instanceId} failed`);
        default:
          throw new Error(`SSM Document ${documentName} on EC2 instance ${instanceId} status ${command.Status}`);
      }
      return { Data: responseData };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
