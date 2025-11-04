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

// integ-tests/functions/idle-test-handler.ts
var idle_test_handler_exports = {};
__export(idle_test_handler_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(idle_test_handler_exports);
var import_client_ec2 = require("@aws-sdk/client-ec2");
var import_client_eventbridge = require("@aws-sdk/client-eventbridge");
var ec2 = new import_client_ec2.EC2Client({});
var eventBridge = new import_client_eventbridge.EventBridgeClient({});
var handler = async (event) => {
  console.log("Idle test event:", JSON.stringify(event, null, 2));
  const { testPhase, instanceId, idleTimeoutMinutes = 5, idleMonitorRuleName } = event;
  try {
    if (testPhase === "verify-auto-stop") {
      if (!instanceId) throw new Error("instanceId is required for verify-auto-stop");
      return await verifyAutoStop(instanceId, idleTimeoutMinutes);
    } else if (testPhase === "disable-idle-monitor") {
      if (!idleMonitorRuleName) throw new Error("idleMonitorRuleName is required for disable-idle-monitor");
      return await disableIdleMonitor(idleMonitorRuleName);
    } else if (testPhase === "start-instance") {
      if (!instanceId) throw new Error("instanceId is required for start-instance");
      return await startInstance(instanceId);
    } else {
      throw new Error(`Unknown test phase: ${testPhase}`);
    }
  } catch (error) {
    console.error("Test failed:", error);
    throw error;
  }
};
async function verifyAutoStop(instanceId, idleTimeoutMinutes) {
  console.log(`Starting auto-stop verification for instance ${instanceId}`);
  console.log(`Idle timeout: ${idleTimeoutMinutes} minutes`);
  console.log("Step 2: Polling for stopped state (IdleMonitor should stop it within 100s with skipStatusChecks)...");
  await waitForInstanceState(instanceId, "stopped", 100);
  console.log("\u2705 Auto-stop verification successful: instance stopped after idle timeout");
  return "STOPPED";
}
async function getInstanceState(instanceId) {
  const command = new import_client_ec2.DescribeInstancesCommand({
    InstanceIds: [instanceId]
  });
  const response = await ec2.send(command);
  const instance = response.Reservations?.[0]?.Instances?.[0];
  if (!instance) {
    throw new Error(`Instance ${instanceId} not found`);
  }
  const state = instance.State?.Name || "unknown";
  console.log(`Instance ${instanceId} state: ${state}`);
  return state;
}
async function waitForInstanceState(instanceId, targetState, maxWaitSeconds) {
  const pollIntervalMs = 3e4;
  const maxAttempts = Math.ceil(maxWaitSeconds / (pollIntervalMs / 1e3));
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Polling attempt ${attempt}/${maxAttempts}...`);
    const currentState = await getInstanceState(instanceId);
    if (currentState === targetState) {
      console.log(`\u2705 Instance reached target state: ${targetState}`);
      return;
    }
    console.log(`Instance state is ${currentState}, waiting for ${targetState}...`);
    if (attempt < maxAttempts) {
      await sleep(pollIntervalMs);
    }
  }
  throw new Error(
    `Timeout: Instance did not reach state '${targetState}' within ${maxWaitSeconds} seconds`
  );
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function disableIdleMonitor(ruleName) {
  console.log(`Disabling IdleMonitor EventBridge rule: ${ruleName}`);
  const command = new import_client_eventbridge.DisableRuleCommand({
    Name: ruleName
  });
  await eventBridge.send(command);
  console.log("\u2705 IdleMonitor EventBridge rule disabled successfully");
  return "DISABLED";
}
async function startInstance(instanceId) {
  console.log(`Starting instance: ${instanceId}`);
  const startCommand = new import_client_ec2.StartInstancesCommand({
    InstanceIds: [instanceId]
  });
  await ec2.send(startCommand);
  console.log("Instance start command sent");
  console.log("Waiting for instance to be running...");
  await waitForInstanceState(instanceId, "running", 120);
  console.log("\u2705 Instance started successfully and is running");
  return "RUNNING";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
