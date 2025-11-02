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
  StartInstancesCommand: jest.fn(),
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

  test('should handle POST /start request and start instance', async () => {
    mockSend
      .mockResolvedValueOnce({}) // StartInstancesCommand
      .mockResolvedValueOnce({}); // DynamoDB UpdateCommand

    const event = {
      pathParameters: { instanceId: 'i-123' },
      resource: '/status/{instanceId}/start',
      httpMethod: 'POST',
    } as any as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Instance start initiated');
    expect(body.state).toBe('starting');
    expect(body.instanceId).toBe('i-123');
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  test('should have correct headers for POST /start request', async () => {
    mockSend
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const event = {
      pathParameters: { instanceId: 'i-123' },
      resource: '/status/{instanceId}/start',
      httpMethod: 'POST',
    } as any as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
    expect(result.headers).toHaveProperty('Content-Type', 'application/json');
    expect(result.headers).not.toHaveProperty('Cache-Control');
  });

  test('should handle errors when starting instance', async () => {
    mockSend.mockRejectedValueOnce(new Error('Failed to start instance'));

    const event = {
      pathParameters: { instanceId: 'i-123' },
      resource: '/status/{instanceId}/start',
      httpMethod: 'POST',
    } as any as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Internal server error');
  });

  test('should return not ready when instance is stopping', async () => {
    mockSend.mockResolvedValueOnce({
      InstanceStatuses: [{
        InstanceState: { Name: 'stopping' },
      }],
    });

    const event = {
      pathParameters: { instanceId: 'i-123' },
    } as any as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.ready).toBe(false);
    expect(body.state).toBe('stopping');
  });

  test('should return not ready when instance is shutting-down', async () => {
    mockSend.mockResolvedValueOnce({
      InstanceStatuses: [{
        InstanceState: { Name: 'shutting-down' },
      }],
    });

    const event = {
      pathParameters: { instanceId: 'i-123' },
    } as any as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.ready).toBe(false);
    expect(body.state).toBe('shutting-down');
  });

  test('should return not ready when instance is terminated', async () => {
    mockSend.mockResolvedValueOnce({
      InstanceStatuses: [{
        InstanceState: { Name: 'terminated' },
      }],
    });

    const event = {
      pathParameters: { instanceId: 'i-123' },
    } as any as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.ready).toBe(false);
    expect(body.state).toBe('terminated');
  });

  test('should return unknown state when InstanceStatuses is empty', async () => {
    mockSend.mockResolvedValueOnce({
      InstanceStatuses: [],
    });

    const event = {
      pathParameters: { instanceId: 'i-123' },
    } as any as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.ready).toBe(false);
    expect(body.state).toBe('unknown');
  });

  test('should return unknown state when InstanceStatuses is undefined', async () => {
    mockSend.mockResolvedValueOnce({});

    const event = {
      pathParameters: { instanceId: 'i-123' },
    } as any as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.ready).toBe(false);
    expect(body.state).toBe('unknown');
  });

  test('should not update DynamoDB when instance is not running', async () => {
    mockSend.mockResolvedValueOnce({
      InstanceStatuses: [{
        InstanceState: { Name: 'stopped' },
      }],
    });

    const event = {
      pathParameters: { instanceId: 'i-123' },
    } as any as APIGatewayProxyEvent;

    await handler(event);

    // Only DescribeInstanceStatusCommand should be called, no DynamoDB update
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  test('should handle DynamoDB update errors gracefully', async () => {
    mockSend
      .mockResolvedValueOnce({
        InstanceStatuses: [{
          InstanceState: { Name: 'running' },
        }],
      })
      .mockRejectedValueOnce(new Error('DynamoDB error'));

    const event = {
      pathParameters: { instanceId: 'i-123' },
    } as any as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Internal server error');
  });

  test('should handle DynamoDB errors during POST /start', async () => {
    mockSend
      .mockResolvedValueOnce({}) // StartInstancesCommand succeeds
      .mockRejectedValueOnce(new Error('DynamoDB error')); // UpdateCommand fails

    const event = {
      pathParameters: { instanceId: 'i-123' },
      resource: '/status/{instanceId}/start',
      httpMethod: 'POST',
    } as any as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Internal server error');
  });
});
