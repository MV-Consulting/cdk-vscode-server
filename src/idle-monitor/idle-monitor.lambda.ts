import { CloudWatchClient, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { EC2Client, DescribeInstancesCommand, StopInstancesCommand } from '@aws-sdk/client-ec2';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { ScheduledEvent } from 'aws-lambda';

const cloudwatch = new CloudWatchClient({});
const ec2 = new EC2Client({});
const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

const INSTANCE_ID = process.env.INSTANCE_ID!;
const DISTRIBUTION_ID = process.env.DISTRIBUTION_ID!;
const TABLE_NAME = process.env.TABLE_NAME!;
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

    // 4. If no requests and instance is running, stop it
    if (requestCount === 0 && instanceState === 'running') {
      console.log('No activity detected, stopping instance');

      const stopCommand = new StopInstancesCommand({
        InstanceIds: [INSTANCE_ID],
      });
      await ec2.send(stopCommand);

      // Update DynamoDB
      await ddb.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { instanceId: INSTANCE_ID },
        UpdateExpression: 'SET instanceState = :state, lastActivityTime = :time',
        ExpressionAttributeValues: {
          ':state': 'stopping',
          ':time': new Date().toISOString(),
        },
      }));

      console.log('Instance stopped successfully');
    } else if (requestCount > 0) {
      // Update last activity time
      console.log('Activity detected, updating timestamp');

      await ddb.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { instanceId: INSTANCE_ID },
        UpdateExpression: 'SET lastActivityTime = :time, instanceState = :state',
        ExpressionAttributeValues: {
          ':time': new Date().toISOString(),
          ':state': instanceState || 'unknown',
        },
      }));
    }
  } catch (error) {
    console.error('Error in IdleMonitor:', error);
    throw error;
  }
};
