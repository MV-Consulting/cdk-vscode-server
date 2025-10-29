// Initialize the spies
const mockSend = jest.fn();
const spyEC2 = jest.fn(() => ({ send: mockSend }));
const spyDynamoDB = jest.fn(() => ({ send: mockSend }));
const spyDynamoDBDocumentClient = {
  from: jest.fn(() => ({ send: mockSend })),
};

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-ec2', () => ({
  EC2Client: spyEC2,
  DescribeInstanceStatusCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: spyDynamoDB,
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: spyDynamoDBDocumentClient,
  UpdateCommand: jest.fn(),
}));

import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../src/status-check/status-check.lambda';

describe('StatusCheck Lambda', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.TABLE_NAME = 'test-table';
  });

  afterEach(() => {
    delete process.env.TABLE_NAME;
  });

  test('should return ready when instance is running', async () => {
    mockSend
      .mockResolvedValueOnce({
        InstanceStatuses: [{
          InstanceState: { Name: 'running' },
        }],
      })
      .mockResolvedValueOnce({});

    const event = {
      pathParameters: { instanceId: 'i-123' },
    } as any as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.ready).toBe(true);
    expect(body.state).toBe('running');
    expect(body.instanceId).toBe('i-123');
  });

  test('should return not ready when instance is starting', async () => {
    mockSend.mockResolvedValueOnce({
      InstanceStatuses: [{
        InstanceState: { Name: 'pending' },
      }],
    });

    const event = {
      pathParameters: { instanceId: 'i-123' },
    } as any as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.ready).toBe(false);
    expect(body.state).toBe('pending');
  });

  test('should return not ready when instance is stopped', async () => {
    mockSend.mockResolvedValueOnce({
      InstanceStatuses: [{
        InstanceState: { Name: 'stopped' },
      }],
    });

    const event = {
      pathParameters: { instanceId: 'i-123' },
    } as any as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.ready).toBe(false);
    expect(body.state).toBe('stopped');
  });

  test('should return 400 when instanceId is missing', async () => {
    const event = {
      pathParameters: null,
    } as any as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Missing instanceId');
  });

  test('should return 400 when pathParameters is empty', async () => {
    const event = {
      pathParameters: {},
    } as any as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
  });

  test('should handle EC2 errors gracefully', async () => {
    mockSend.mockRejectedValueOnce(new Error('EC2 error'));

    const event = {
      pathParameters: { instanceId: 'i-123' },
    } as any as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Internal server error');
  });

  test('should update DynamoDB when instance is running', async () => {
    mockSend
      .mockResolvedValueOnce({
        InstanceStatuses: [{
          InstanceState: { Name: 'running' },
        }],
      })
      .mockResolvedValueOnce({});

    const event = {
      pathParameters: { instanceId: 'i-123' },
    } as any as APIGatewayProxyEvent;

    await handler(event);

    expect(mockSend).toHaveBeenCalledTimes(2);
    // Second call should be DynamoDB update
  });

  test('should have correct CORS headers', async () => {
    mockSend.mockResolvedValueOnce({
      InstanceStatuses: [{
        InstanceState: { Name: 'running' },
      }],
    }).mockResolvedValueOnce({});

    const event = {
      pathParameters: { instanceId: 'i-123' },
    } as any as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
    expect(result.headers).toHaveProperty('Content-Type', 'application/json');
    expect(result.headers).toHaveProperty('Cache-Control', 'no-cache, no-store, must-revalidate');
  });
});
