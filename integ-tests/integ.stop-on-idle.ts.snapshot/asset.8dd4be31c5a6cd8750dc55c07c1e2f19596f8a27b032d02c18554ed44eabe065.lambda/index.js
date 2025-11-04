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

// src/idle-monitor/idle-monitor.lambda.ts
var idle_monitor_lambda_exports = {};
__export(idle_monitor_lambda_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(idle_monitor_lambda_exports);
var import_client_cloudwatch = require("@aws-sdk/client-cloudwatch");
var import_client_ec2 = require("@aws-sdk/client-ec2");
var cloudwatch = new import_client_cloudwatch.CloudWatchClient({});
var ec2 = new import_client_ec2.EC2Client({});
var INSTANCE_ID = process.env.INSTANCE_ID;
var DISTRIBUTION_ID = process.env.DISTRIBUTION_ID;
var IDLE_TIMEOUT_MINUTES = parseInt(process.env.IDLE_TIMEOUT_MINUTES || "30");
var handler = async (event) => {
  console.log("IdleMonitor triggered", { event, INSTANCE_ID, DISTRIBUTION_ID, IDLE_TIMEOUT_MINUTES });
  try {
    const endTime = /* @__PURE__ */ new Date();
    const startTime = new Date(endTime.getTime() - IDLE_TIMEOUT_MINUTES * 60 * 1e3);
    const metricsCommand = new import_client_cloudwatch.GetMetricStatisticsCommand({
      Namespace: "AWS/CloudFront",
      MetricName: "Requests",
      Dimensions: [
        {
          Name: "DistributionId",
          Value: DISTRIBUTION_ID
        }
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: IDLE_TIMEOUT_MINUTES * 60,
      Statistics: ["Sum"]
    });
    const metricsResponse = await cloudwatch.send(metricsCommand);
    const requestCount = metricsResponse.Datapoints?.[0]?.Sum || 0;
    console.log("CloudFront request count:", requestCount);
    const describeCommand = new import_client_ec2.DescribeInstancesCommand({
      InstanceIds: [INSTANCE_ID]
    });
    const describeResponse = await ec2.send(describeCommand);
    const instanceState = describeResponse.Reservations?.[0]?.Instances?.[0]?.State?.Name;
    console.log("Current instance state:", instanceState);
    const transitionalStates = ["pending", "stopping", "shutting-down", "rebooting"];
    if (transitionalStates.includes(instanceState || "")) {
      console.log(`Instance is in transitional state '${instanceState}', skipping idle check`);
      return;
    }
    if (instanceState === "running" && process.env.SKIP_STATUS_CHECKS !== "true") {
      const statusCommand = new import_client_ec2.DescribeInstanceStatusCommand({
        InstanceIds: [INSTANCE_ID],
        IncludeAllInstances: false
        // Only return running instances with status info
      });
      const statusResponse = await ec2.send(statusCommand);
      const instanceStatus = statusResponse.InstanceStatuses?.[0];
      if (instanceStatus) {
        const systemStatus = instanceStatus.SystemStatus?.Status;
        const instanceCheckStatus = instanceStatus.InstanceStatus?.Status;
        console.log("Instance status checks:", {
          systemStatus,
          instanceCheckStatus
        });
        if (systemStatus !== "ok" || instanceCheckStatus !== "ok") {
          console.log("Instance status checks are not passing, skipping idle check");
          return;
        }
      } else {
        console.log("Instance status information not available yet, skipping idle check");
        return;
      }
    } else if (process.env.SKIP_STATUS_CHECKS === "true" && instanceState === "running") {
      console.log("Status check verification skipped (SKIP_STATUS_CHECKS=true)");
    }
    if (requestCount === 0 && instanceState === "running") {
      console.log("No activity detected, stopping instance");
      const stopCommand = new import_client_ec2.StopInstancesCommand({
        InstanceIds: [INSTANCE_ID]
      });
      await ec2.send(stopCommand);
      console.log("Instance stopped successfully");
    } else if (requestCount > 0) {
      console.log("Activity detected, instance will remain running");
    }
  } catch (error) {
    console.error("Error in IdleMonitor:", error);
    throw error;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
