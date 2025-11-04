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

// src/idle-monitor-enabler/idle-monitor-enabler.lambda.ts
var idle_monitor_enabler_lambda_exports = {};
__export(idle_monitor_enabler_lambda_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(idle_monitor_enabler_lambda_exports);
var import_client_eventbridge = require("@aws-sdk/client-eventbridge");
var eventBridge = new import_client_eventbridge.EventBridge();
var handler = async (event) => {
  console.log("Event: %j", { ...event, ResponseURL: "..." });
  const ruleName = event.ResourceProperties.RuleName;
  if (!ruleName) {
    throw new Error("RuleName is required in ResourceProperties");
  }
  switch (event.RequestType) {
    case "Create":
    case "Update":
      console.log(`Enabling EventBridge rule: ${ruleName}`);
      await eventBridge.send(
        new import_client_eventbridge.EnableRuleCommand({
          Name: ruleName
        })
      );
      console.log(`Successfully enabled rule: ${ruleName}`);
      return {
        PhysicalResourceId: `idle-monitor-enabler-${ruleName}`
      };
    case "Delete":
      console.log(`Disabling EventBridge rule on deletion: ${ruleName}`);
      try {
        await eventBridge.send(
          new import_client_eventbridge.DisableRuleCommand({
            Name: ruleName
          })
        );
        console.log(`Successfully disabled rule: ${ruleName}`);
      } catch (error) {
        console.log(`Error disabling rule (ignoring): ${error.message}`);
      }
      return {};
    default:
      throw new Error(`Unsupported RequestType: ${event.RequestType}`);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
