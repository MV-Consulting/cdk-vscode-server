"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/resume-handler/resume-handler.lambda.ts
var resume_handler_lambda_exports = {};
__export(resume_handler_lambda_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(resume_handler_lambda_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_client_ec2 = require("@aws-sdk/client-ec2");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var ddbClient = new import_client_dynamodb.DynamoDBClient({});
var ddb = import_lib_dynamodb.DynamoDBDocumentClient.from(ddbClient);
var ec2 = new import_client_ec2.EC2Client({});
var TABLE_NAME_FALLBACK = process.env.TABLE_NAME;
var INSTANCE_ID_FALLBACK = process.env.INSTANCE_ID;
var STATUS_API_URL_FALLBACK = process.env.STATUS_API_URL;
var htmlTemplate = fs.readFileSync(
  path.join(__dirname, "starting-page.html"),
  "utf-8"
);
var handler = async (event) => {
  console.log("ResumeHandler triggered", { event });
  const request = event.Records[0].cf.request;
  try {
    let TABLE_NAME = TABLE_NAME_FALLBACK;
    let INSTANCE_ID = INSTANCE_ID_FALLBACK;
    let STATUS_API_URL = STATUS_API_URL_FALLBACK;
    if (!TABLE_NAME || !INSTANCE_ID || !STATUS_API_URL) {
      console.log("Environment variables not available (Lambda@Edge mode), reading config from DynamoDB");
      throw new Error("Lambda@Edge configuration not yet implemented. Use environment variables for testing.");
    }
    console.log("Using configuration:", { TABLE_NAME, INSTANCE_ID, STATUS_API_URL });
    const getCommand = new import_lib_dynamodb.GetCommand({
      TableName: TABLE_NAME,
      Key: { instanceId: INSTANCE_ID }
    });
    const getResponse = await ddb.send(getCommand);
    let instanceState = getResponse.Item?.instanceState;
    console.log("Instance state from DynamoDB:", instanceState);
    if (!instanceState) {
      const describeCommand = new import_client_ec2.DescribeInstancesCommand({
        InstanceIds: [INSTANCE_ID]
      });
      const describeResponse = await ec2.send(describeCommand);
      instanceState = describeResponse.Reservations?.[0]?.Instances?.[0]?.State?.Name;
      console.log("Instance state from EC2:", instanceState);
      if (instanceState) {
        await ddb.send(new import_lib_dynamodb.UpdateCommand({
          TableName: TABLE_NAME,
          Key: { instanceId: INSTANCE_ID },
          UpdateExpression: "SET instanceState = :state, lastActivityTime = :time",
          ExpressionAttributeValues: {
            ":state": instanceState,
            ":time": (/* @__PURE__ */ new Date()).toISOString()
          }
        }));
      }
    }
    switch (instanceState) {
      case "running":
        console.log("Instance running, passing request through");
        return request;
      case "stopped": {
        console.log("Instance stopped, starting it");
        const startCommand = new import_client_ec2.StartInstancesCommand({
          InstanceIds: [INSTANCE_ID]
        });
        await ec2.send(startCommand);
        await ddb.send(new import_lib_dynamodb.UpdateCommand({
          TableName: TABLE_NAME,
          Key: { instanceId: INSTANCE_ID },
          UpdateExpression: "SET instanceState = :state, lastActivityTime = :time",
          ExpressionAttributeValues: {
            ":state": "starting",
            ":time": (/* @__PURE__ */ new Date()).toISOString()
          }
        }));
        const htmlStopped = htmlTemplate.replace("{{INSTANCE_ID}}", INSTANCE_ID).replace("{{STATUS_API_URL}}", STATUS_API_URL);
        return {
          status: "503",
          statusDescription: "Service Starting",
          headers: {
            "content-type": [{ key: "Content-Type", value: "text/html; charset=utf-8" }],
            "cache-control": [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
            "pragma": [{ key: "Pragma", value: "no-cache" }],
            "expires": [{ key: "Expires", value: "0" }]
          },
          body: htmlStopped
        };
      }
      case "starting":
      case "pending": {
        console.log("Instance starting, returning loading page");
        const html = htmlTemplate.replace("{{INSTANCE_ID}}", INSTANCE_ID).replace("{{STATUS_API_URL}}", STATUS_API_URL);
        return {
          status: "503",
          statusDescription: "Service Starting",
          headers: {
            "content-type": [{ key: "Content-Type", value: "text/html; charset=utf-8" }],
            "cache-control": [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
            "pragma": [{ key: "Pragma", value: "no-cache" }],
            "expires": [{ key: "Expires", value: "0" }]
          },
          body: html
        };
      }
      case "stopping":
        console.log("Instance stopping");
        return {
          status: "503",
          statusDescription: "Service Unavailable",
          headers: {
            "content-type": [{ key: "Content-Type", value: "text/html; charset=utf-8" }],
            "cache-control": [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }]
          },
          body: "<html><body><h1>VS Code Server is shutting down</h1><p>Please try again in a few minutes.</p></body></html>"
        };
      default:
        console.log("Unknown instance state, passing through");
        return request;
    }
  } catch (error) {
    console.error("Error in ResumeHandler:", error);
    return request;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
