import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { EC2Client, DescribeInstanceStatusCommand } from '@aws-sdk/client-ec2';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const ec2 = new EC2Client({});
const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  console.log('StatusCheck triggered', { event });

  const instanceId = event.pathParameters?.instanceId;

  if (!instanceId) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Missing instanceId' }),
    };
  }

  try {
    // Check EC2 instance status
    const statusCommand = new DescribeInstanceStatusCommand({
      InstanceIds: [instanceId],
      IncludeAllInstances: true,
    });

    const statusResponse = await ec2.send(statusCommand);
    const instanceStatus = statusResponse.InstanceStatuses?.[0];
    const state = instanceStatus?.InstanceState?.Name || 'unknown';

    console.log('Instance state:', state);

    // If running, update DynamoDB
    if (state === 'running') {
      await ddb.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { instanceId },
        UpdateExpression: 'SET instanceState = :state, lastActivityTime = :time',
        ExpressionAttributeValues: {
          ':state': 'running',
          ':time': new Date().toISOString(),
        },
      }));
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      body: JSON.stringify({
        state,
        ready: state === 'running',
        instanceId,
      }),
    };
  } catch (error) {
    console.error('Error checking instance status:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
