import { CloudWatchClient, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch';
import { EC2Client, DescribeInstancesCommand, DescribeInstanceStatusCommand, StopInstancesCommand } from '@aws-sdk/client-ec2';
import type { ScheduledEvent } from 'aws-lambda';

const cloudwatch = new CloudWatchClient({});
const ec2 = new EC2Client({});

const INSTANCE_ID = process.env.INSTANCE_ID!;
const DISTRIBUTION_ID = process.env.DISTRIBUTION_ID!;
const IDLE_TIMEOUT_MINUTES = parseInt(process.env.IDLE_TIMEOUT_MINUTES || '30');

export const handler = async (event: ScheduledEvent): Promise<void> => {
  console.log('IdleMonitor triggered', { event, INSTANCE_ID, DISTRIBUTION_ID, IDLE_TIMEOUT_MINUTES });

  try {
    // 1. Get CloudFront request count for the idle timeout period
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - IDLE_TIMEOUT_MINUTES * 60 * 1000);

    const metricsCommand = new GetMetricStatisticsCommand({
      Namespace: 'AWS/CloudFront',
      MetricName: 'Requests',
      Dimensions: [
        {
          Name: 'DistributionId',
          Value: DISTRIBUTION_ID,
        },
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: IDLE_TIMEOUT_MINUTES * 60,
      Statistics: ['Sum'],
    });

    const metricsResponse = await cloudwatch.send(metricsCommand);
    const requestCount = metricsResponse.Datapoints?.[0]?.Sum || 0;

    console.log('CloudFront request count:', requestCount);

    // 2. Get current instance state
    const describeCommand = new DescribeInstancesCommand({
      InstanceIds: [INSTANCE_ID],
    });
    const describeResponse = await ec2.send(describeCommand);
    const instanceState = describeResponse.Reservations?.[0]?.Instances?.[0]?.State?.Name;

    console.log('Current instance state:', instanceState);

    // 3. Skip if instance is in a transitional state (starting, stopping, pending)
    const transitionalStates = ['pending', 'stopping', 'shutting-down', 'rebooting'];
    if (transitionalStates.includes(instanceState || '')) {
      console.log(`Instance is in transitional state '${instanceState}', skipping idle check`);
      return;
    }

    // 3.1 Skip if instance status checks are failing or initializing
    // Can be disabled for integration tests via SKIP_STATUS_CHECKS env var
    if (instanceState === 'running' && process.env.SKIP_STATUS_CHECKS !== 'true') {
      const statusCommand = new DescribeInstanceStatusCommand({
        InstanceIds: [INSTANCE_ID],
        IncludeAllInstances: false, // Only return running instances with status info
      });
      const statusResponse = await ec2.send(statusCommand);
      const instanceStatus = statusResponse.InstanceStatuses?.[0];

      if (instanceStatus) {
        const systemStatus = instanceStatus.SystemStatus?.Status;
        const instanceCheckStatus = instanceStatus.InstanceStatus?.Status;

        console.log('Instance status checks:', {
          systemStatus,
          instanceCheckStatus,
        });

        // Skip if any status check is not 'ok'
        if (systemStatus !== 'ok' || instanceCheckStatus !== 'ok') {
          console.log('Instance status checks are not passing, skipping idle check');
          return;
        }
      } else {
        // No status information available yet (instance just started)
        console.log('Instance status information not available yet, skipping idle check');
        return;
      }
    } else if (process.env.SKIP_STATUS_CHECKS === 'true' && instanceState === 'running') {
      console.log('Status check verification skipped (SKIP_STATUS_CHECKS=true)');
    }

    // 4. If no requests and instance is running, stop it
    if (requestCount === 0 && instanceState === 'running') {
      console.log('No activity detected, stopping instance');

      const stopCommand = new StopInstancesCommand({
        InstanceIds: [INSTANCE_ID],
      });
      await ec2.send(stopCommand);

      console.log('Instance stopped successfully');
    } else if (requestCount > 0) {
      console.log('Activity detected, instance will remain running');
    }
  } catch (error) {
    console.error('Error in IdleMonitor:', error);
    throw error;
  }
};
