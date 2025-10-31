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
var ec2 = new import_client_ec2.EC2Client({});
var handler = async (event) => {
  console.log("Idle test event:", JSON.stringify(event, null, 2));
  const { testPhase, instanceId, domainName, idleTimeoutMinutes = 5 } = event;
  try {
    console.log(`Using instance ID: ${instanceId}`);
    if (testPhase === "verify-auto-stop") {
      return await verifyAutoStop(instanceId, idleTimeoutMinutes);
    } else if (testPhase === "verify-auto-resume") {
      return await verifyAutoResume(instanceId, domainName);
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
  console.log("Step 1: Waiting for instance to be running...");
  await waitForInstanceState(instanceId, "running", 300);
  console.log("Instance is running");
  const waitTimeSeconds = (idleTimeoutMinutes + 2) * 60;
  console.log(`Step 2: Waiting ${waitTimeSeconds / 60} minutes for idle timeout + buffer...`);
  await sleep(waitTimeSeconds * 1e3);
  console.log("Step 3: Polling for stopped state...");
  await waitForInstanceState(instanceId, "stopped", 300);
  console.log("\u2705 Auto-stop verification successful: instance stopped after idle timeout");
  return "SUCCESS: instance auto-stopped after idle timeout";
}
async function verifyAutoResume(instanceId, domainName) {
  console.log(`Starting auto-resume verification for instance ${instanceId}`);
  console.log("Step 1: Verifying instance is stopped...");
  const initialState = await getInstanceState(instanceId);
  if (initialState !== "stopped") {
    throw new Error(`Expected instance to be stopped, but was: ${initialState}`);
  }
  console.log("Instance is stopped");
  console.log(`Step 2: Accessing CloudFront domain ${domainName} to trigger resume...`);
  try {
    const response = await fetch(domainName, {
      method: "GET",
      redirect: "manual"
      // Don't follow redirects
    });
    console.log(`CloudFront response status: ${response.status}`);
    console.log(`CloudFront response headers:`, Object.fromEntries(response.headers.entries()));
    if (response.status !== 200 && response.status !== 503) {
      console.warn(`Unexpected status code: ${response.status}`);
    }
  } catch (error) {
    console.log("CloudFront request completed (error expected if resume page served):", error);
  }
  console.log("Step 3: Polling for running state...");
  await waitForInstanceState(instanceId, "running", 300);
  console.log("Step 4: Waiting for instance status checks to pass...");
  await waitForStatusChecks(instanceId, 120);
  console.log("\u2705 Auto-resume verification successful: instance running after CloudFront access");
  return "SUCCESS: instance auto-resumed after CloudFront access";
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
async function waitForStatusChecks(instanceId, maxWaitSeconds) {
  const pollIntervalMs = 15e3;
  const maxAttempts = Math.ceil(maxWaitSeconds / (pollIntervalMs / 1e3));
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Status check attempt ${attempt}/${maxAttempts}...`);
    try {
      const command = new import_client_ec2.DescribeInstanceStatusCommand({
        InstanceIds: [instanceId]
      });
      const response = await ec2.send(command);
      const status = response.InstanceStatuses?.[0];
      if (status) {
        const instanceStatus = status.InstanceStatus?.Status;
        const systemStatus = status.SystemStatus?.Status;
        console.log(`Instance status: ${instanceStatus}, System status: ${systemStatus}`);
        if (instanceStatus === "ok" && systemStatus === "ok") {
          console.log("\u2705 Status checks passed");
          return;
        }
      } else {
        console.log("No status checks available yet...");
      }
    } catch (error) {
      console.log("Error checking status:", error);
    }
    if (attempt < maxAttempts) {
      await sleep(pollIntervalMs);
    }
  }
  console.warn(`Status checks did not pass within ${maxWaitSeconds} seconds, continuing anyway...`);
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
