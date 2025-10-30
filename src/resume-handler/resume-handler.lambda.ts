import * as fs from 'fs';
import * as path from 'path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { EC2Client, StartInstancesCommand, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { CloudFrontRequestEvent, CloudFrontRequestResult } from 'aws-lambda';

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);
const ec2 = new EC2Client({});

const TABLE_NAME = process.env.TABLE_NAME!;
const INSTANCE_ID = process.env.INSTANCE_ID!;
const STATUS_API_URL = process.env.STATUS_API_URL!;

// Load HTML template at cold start
const htmlTemplate = fs.readFileSync(
  path.join(__dirname, 'starting-page.html'),
  'utf-8',
);

export const handler = async (
  event: CloudFrontRequestEvent,
): Promise<CloudFrontRequestResult> => {
  console.log('ResumeHandler triggered', { event });

  const request = event.Records[0].cf.request;

  try {
    // 1. Get instance state from DynamoDB
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: { instanceId: INSTANCE_ID },
    });

    const getResponse = await ddb.send(getCommand);
    let instanceState = getResponse.Item?.instanceState;

    console.log('Instance state from DynamoDB:', instanceState);

    // 2. If no state in DynamoDB, check EC2 directly
    if (!instanceState) {
      const describeCommand = new DescribeInstancesCommand({
        InstanceIds: [INSTANCE_ID],
      });
      const describeResponse = await ec2.send(describeCommand);
      instanceState = describeResponse.Reservations?.[0]?.Instances?.[0]?.State?.Name;

      console.log('Instance state from EC2:', instanceState);

      // Initialize DynamoDB record
      if (instanceState) {
        await ddb.send(new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { instanceId: INSTANCE_ID },
          UpdateExpression: 'SET instanceState = :state, lastActivityTime = :time',
          ExpressionAttributeValues: {
            ':state': instanceState,
            ':time': new Date().toISOString(),
          },
        }));
      }
    }

    // 3. Handle based on state
    switch (instanceState) {
      case 'running':
        // Instance is running, pass request through
        console.log('Instance running, passing request through');
        return request;

      case 'stopped': {
        // Start the instance
        console.log('Instance stopped, starting it');

        const startCommand = new StartInstancesCommand({
          InstanceIds: [INSTANCE_ID],
        });
        await ec2.send(startCommand);

        // Update DynamoDB
        await ddb.send(new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { instanceId: INSTANCE_ID },
          UpdateExpression: 'SET instanceState = :state, lastActivityTime = :time',
          ExpressionAttributeValues: {
            ':state': 'starting',
            ':time': new Date().toISOString(),
          },
        }));

        // Return starting page
        const htmlStopped = htmlTemplate
          .replace('{{INSTANCE_ID}}', INSTANCE_ID)
          .replace('{{STATUS_API_URL}}', STATUS_API_URL);

        return {
          status: '503',
          statusDescription: 'Service Starting',
          headers: {
            'content-type': [{ key: 'Content-Type', value: 'text/html; charset=utf-8' }],
            'cache-control': [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
            'pragma': [{ key: 'Pragma', value: 'no-cache' }],
            'expires': [{ key: 'Expires', value: '0' }],
          },
          body: htmlStopped,
        };
      }

      case 'starting':
      case 'pending': {
        // Return "Starting" page
        console.log('Instance starting, returning loading page');

        const html = htmlTemplate
          .replace('{{INSTANCE_ID}}', INSTANCE_ID)
          .replace('{{STATUS_API_URL}}', STATUS_API_URL);

        return {
          status: '503',
          statusDescription: 'Service Starting',
          headers: {
            'content-type': [{ key: 'Content-Type', value: 'text/html; charset=utf-8' }],
            'cache-control': [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
            'pragma': [{ key: 'Pragma', value: 'no-cache' }],
            'expires': [{ key: 'Expires', value: '0' }],
          },
          body: html,
        };
      }

      case 'stopping':
        // Return "Shutting down" message
        console.log('Instance stopping');

        return {
          status: '503',
          statusDescription: 'Service Unavailable',
          headers: {
            'content-type': [{ key: 'Content-Type', value: 'text/html; charset=utf-8' }],
            'cache-control': [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
          },
          body: '<html><body><h1>VS Code Server is shutting down</h1><p>Please try again in a few minutes.</p></body></html>',
        };

      default:
        // Unknown state, pass through
        console.log('Unknown instance state, passing through');
        return request;
    }
  } catch (error) {
    console.error('Error in ResumeHandler:', error);
    // On error, pass request through to avoid breaking the site
    return request;
  }
};
