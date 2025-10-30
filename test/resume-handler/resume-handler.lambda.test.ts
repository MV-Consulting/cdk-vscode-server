// Set environment variables BEFORE importing the handler
process.env.TABLE_NAME = 'test-table';
process.env.INSTANCE_ID = 'i-123';
process.env.STATUS_API_URL = 'https://api.example.com';

// Initialize the spies
const mockSend = jest.fn();
const spyDynamoDB = jest.fn(() => ({ send: mockSend }));
const spyEC2 = jest.fn(() => ({ send: mockSend }));
const spyDynamoDBDocumentClient = {
  from: jest.fn(() => ({ send: mockSend })),
};

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: spyDynamoDB,
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: spyDynamoDBDocumentClient,
  GetCommand: jest.fn(),
  UpdateCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-ec2', () => ({
  EC2Client: spyEC2,
  StartInstancesCommand: jest.fn(),
  DescribeInstancesCommand: jest.fn(),
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn(() => '<html>{{INSTANCE_ID}} {{STATUS_API_URL}}</html>'),
}));

import type { CloudFrontRequestEvent } from 'aws-lambda';
import { handler } from '../../src/resume-handler/resume-handler.lambda';

describe('ResumeHandler Lambda@Edge', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Keep environment variables set for module-level constants
  });

  test('should pass through request when instance is running', async () => {
    mockSend.mockResolvedValueOnce({
      Item: { instanceState: 'running' },
    });

    const event = {
      Records: [{
        cf: {
          request: {
            uri: '/',
            headers: {},
          },
        },
      }],
    } as any as CloudFrontRequestEvent;

    const result = await handler(event);

    expect(result).toEqual(event.Records[0].cf.request);
  });

  test('should start instance and return loading page when stopped', async () => {
    mockSend
      .mockResolvedValueOnce({
        Item: { instanceState: 'stopped' },
      })
      .mockResolvedValueOnce({}) // StartInstances
      .mockResolvedValueOnce({}); // UpdateCommand

    const event = {
      Records: [{
        cf: {
          request: {
            uri: '/',
            headers: {},
          },
        },
      }],
    } as any as CloudFrontRequestEvent;

    const result = await handler(event);

    expect(result).toHaveProperty('status', '503');
    expect(result).toHaveProperty('body');
    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  test('should return loading page when instance is starting', async () => {
    mockSend.mockResolvedValueOnce({
      Item: { instanceState: 'starting' },
    });

    const event = {
      Records: [{
        cf: {
          request: {
            uri: '/',
            headers: {},
          },
        },
      }],
    } as any as CloudFrontRequestEvent;

    const result = await handler(event);

    expect(result).toHaveProperty('status', '503');
    expect(result).toHaveProperty('statusDescription', 'Service Starting');
    expect(result).toHaveProperty('body');
  });

  test('should return loading page when instance is pending', async () => {
    mockSend.mockResolvedValueOnce({
      Item: { instanceState: 'pending' },
    });

    const event = {
      Records: [{
        cf: {
          request: {
            uri: '/',
            headers: {},
          },
        },
      }],
    } as any as CloudFrontRequestEvent;

    const result = await handler(event);

    expect(result).toHaveProperty('status', '503');
    expect(result).toHaveProperty('body');
  });

  test('should return shutting down message when stopping', async () => {
    mockSend.mockResolvedValueOnce({
      Item: { instanceState: 'stopping' },
    });

    const event = {
      Records: [{
        cf: {
          request: {
            uri: '/',
            headers: {},
          },
        },
      }],
    } as any as CloudFrontRequestEvent;

    const result = await handler(event);

    expect(result).toHaveProperty('status', '503');
    expect(result).toHaveProperty('statusDescription', 'Service Unavailable');
    expect(result).toHaveProperty('body');
    expect((result as any).body).toContain('shutting down');
  });

  test('should check EC2 directly when no state in DynamoDB', async () => {
    mockSend
      .mockResolvedValueOnce({
        Item: undefined,
      })
      .mockResolvedValueOnce({
        Reservations: [{
          Instances: [{ State: { Name: 'running' } }],
        }],
      })
      .mockResolvedValueOnce({}); // UpdateCommand

    const event = {
      Records: [{
        cf: {
          request: {
            uri: '/',
            headers: {},
          },
        },
      }],
    } as any as CloudFrontRequestEvent;

    const result = await handler(event);

    expect(result).toEqual(event.Records[0].cf.request);
    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  test('should pass through request on error', async () => {
    mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));

    const event = {
      Records: [{
        cf: {
          request: {
            uri: '/',
            headers: {},
          },
        },
      }],
    } as any as CloudFrontRequestEvent;

    const result = await handler(event);

    // Should pass through to avoid breaking the site
    expect(result).toEqual(event.Records[0].cf.request);
  });

  test('should replace placeholders in HTML template', async () => {
    mockSend.mockResolvedValueOnce({
      Item: { instanceState: 'starting' },
    });

    const event = {
      Records: [{
        cf: {
          request: {
            uri: '/',
            headers: {},
          },
        },
      }],
    } as any as CloudFrontRequestEvent;

    const result = await handler(event);

    expect((result as any).body).toContain('i-123');
    expect((result as any).body).toContain('https://api.example.com');
  });

  test('should have correct cache control headers', async () => {
    mockSend.mockResolvedValueOnce({
      Item: { instanceState: 'starting' },
    });

    const event = {
      Records: [{
        cf: {
          request: {
            uri: '/',
            headers: {},
          },
        },
      }],
    } as any as CloudFrontRequestEvent;

    const result = await handler(event);

    expect((result as any).headers['cache-control']).toBeDefined();
    expect((result as any).headers['cache-control'][0].value).toContain('no-cache');
  });
});
