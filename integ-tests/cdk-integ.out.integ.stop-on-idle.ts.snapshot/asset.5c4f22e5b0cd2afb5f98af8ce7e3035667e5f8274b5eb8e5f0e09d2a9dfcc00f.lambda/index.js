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

// src/status-check/status-check.lambda.ts
var status_check_lambda_exports = {};
__export(status_check_lambda_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(status_check_lambda_exports);
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_client_ec2 = require("@aws-sdk/client-ec2");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var ec2 = new import_client_ec2.EC2Client({});
var ddbClient = new import_client_dynamodb.DynamoDBClient({});
var ddb = import_lib_dynamodb.DynamoDBDocumentClient.from(ddbClient);
var TABLE_NAME = process.env.TABLE_NAME;
var handler = async (event) => {
  console.log("StatusCheck triggered", { event });
  const instanceId = event.pathParameters?.instanceId;
  if (!instanceId) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ error: "Missing instanceId" })
    };
  }
  try {
    const statusCommand = new import_client_ec2.DescribeInstanceStatusCommand({
      InstanceIds: [instanceId],
      IncludeAllInstances: true
    });
    const statusResponse = await ec2.send(statusCommand);
    const instanceStatus = statusResponse.InstanceStatuses?.[0];
    const state = instanceStatus?.InstanceState?.Name || "unknown";
    console.log("Instance state:", state);
    if (state === "running") {
      await ddb.send(new import_lib_dynamodb.UpdateCommand({
        TableName: TABLE_NAME,
        Key: { instanceId },
        UpdateExpression: "SET instanceState = :state, lastActivityTime = :time",
        ExpressionAttributeValues: {
          ":state": "running",
          ":time": (/* @__PURE__ */ new Date()).toISOString()
        }
      }));
    }
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      },
      body: JSON.stringify({
        state,
        ready: state === "running",
        instanceId
      })
    };
  } catch (error) {
    console.error("Error checking instance status:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ error: "Internal server error" })
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
