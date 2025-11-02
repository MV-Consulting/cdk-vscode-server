import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { EC2Client, DescribeInstanceStatusCommand, StartInstancesCommand } from '@aws-sdk/client-ec2';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const ec2 = new EC2Client({});
const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  console.log('StatusCheck/Start triggered', { event });

  const instanceId = event.pathParameters?.instanceId;
  const isStartRequest = event.resource?.includes('/start') && event.httpMethod === 'POST';

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
    // Handle POST /status/{instanceId}/start - Start instance
    if (isStartRequest) {
      console.log('Starting instance:', instanceId);

      const startCommand = new StartInstancesCommand({
        InstanceIds: [instanceId],
      });

      await ec2.send(startCommand);

      // Update DynamoDB state
      await ddb.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { instanceId },
        UpdateExpression: 'SET instanceState = :state, lastActivityTime = :time',
        ExpressionAttributeValues: {
          ':state': 'starting',
          ':time': new Date().toISOString(),
        },
      }));

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'Instance start initiated',
          state: 'starting',
          instanceId,
        }),
      };
    }

    // Handle GET /status/{instanceId} - Check status
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
    console.error('Error in status check/start:', error);

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
