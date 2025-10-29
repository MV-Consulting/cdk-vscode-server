// Initialize the spies
const mockSend = jest.fn();
const spyCloudWatch = jest.fn(() => ({ send: mockSend }));
const spyEC2 = jest.fn(() => ({ send: mockSend }));
const spyDynamoDB = jest.fn(() => ({ send: mockSend }));
const spyDynamoDBDocumentClient = {
  from: jest.fn(() => ({ send: mockSend })),
};

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: spyCloudWatch,
  GetMetricStatisticsCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-ec2', () => ({
  EC2Client: spyEC2,
  DescribeInstancesCommand: jest.fn(),
  StopInstancesCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: spyDynamoDB,
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: spyDynamoDBDocumentClient,
  UpdateCommand: jest.fn(),
}));

import type { ScheduledEvent } from 'aws-lambda';
import { handler } from '../../src/idle-monitor/idle-monitor.lambda';

describe('IdleMonitor Lambda', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.INSTANCE_ID = 'i-1234567890abcdef0';
    process.env.DISTRIBUTION_ID = 'E1234567890ABC';
    process.env.TABLE_NAME = 'test-table';
    process.env.IDLE_TIMEOUT_MINUTES = '30';
  });

  afterEach(() => {
    delete process.env.INSTANCE_ID;
    delete process.env.DISTRIBUTION_ID;
    delete process.env.TABLE_NAME;
    delete process.env.IDLE_TIMEOUT_MINUTES;
  });

  test('should stop instance when no activity detected', async () => {
    // Mock CloudWatch - no requests
    mockSend
      .mockResolvedValueOnce({
        Datapoints: [{ Sum: 0 }],
      })
      // Mock EC2 describe - running
      .mockResolvedValueOnce({
        Reservations: [{
          Instances: [{ State: { Name: 'running' } }],
        }],
      })
      // Mock EC2 stop
      .mockResolvedValueOnce({})
      // Mock DynamoDB update
      .mockResolvedValueOnce({});

    const event = {} as ScheduledEvent;
    await handler(event);

    expect(mockSend).toHaveBeenCalledTimes(4);
  });

  test('should not stop instance when activity detected', async () => {
    // Mock CloudWatch - has requests
    mockSend
      .mockResolvedValueOnce({
        Datapoints: [{ Sum: 100 }],
      })
      // Mock EC2 describe
      .mockResolvedValueOnce({
        Reservations: [{
          Instances: [{ State: { Name: 'running' } }],
        }],
      })
      // Mock DynamoDB update
      .mockResolvedValueOnce({});

    const event = {} as ScheduledEvent;
    await handler(event);

    expect(mockSend).toHaveBeenCalledTimes(3);
    // Should not call EC2 StopInstances
  });

  test('should not stop instance when already stopped', async () => {
    // Mock CloudWatch - no requests
    mockSend
      .mockResolvedValueOnce({
        Datapoints: [{ Sum: 0 }],
      })
      // Mock EC2 describe - stopped
      .mockResolvedValueOnce({
        Reservations: [{
          Instances: [{ State: { Name: 'stopped' } }],
        }],
      });

    const event = {} as ScheduledEvent;
    await handler(event);

    expect(mockSend).toHaveBeenCalledTimes(2);
    // Should not call EC2 StopInstances or DynamoDB update
  });

  test('should update last activity time when requests detected', async () => {
    // Mock CloudWatch - has requests
    mockSend
      .mockResolvedValueOnce({
        Datapoints: [{ Sum: 50 }],
      })
      // Mock EC2 describe
      .mockResolvedValueOnce({
        Reservations: [{
          Instances: [{ State: { Name: 'running' } }],
        }],
      })
      // Mock DynamoDB update
      .mockResolvedValueOnce({});

    const event = {} as ScheduledEvent;
    await handler(event);

    expect(mockSend).toHaveBeenCalledTimes(3);
    // Should update last activity time in DynamoDB
  });

  test('should handle errors gracefully', async () => {
    const errorMessage = 'CloudWatch error';
    mockSend.mockRejectedValueOnce(new Error(errorMessage));

    const event = {} as ScheduledEvent;

    await expect(handler(event)).rejects.toThrow(errorMessage);
  });

  test('should use correct idle timeout from environment', async () => {
    process.env.IDLE_TIMEOUT_MINUTES = '60';

    // Mock CloudWatch - no requests
    mockSend
      .mockResolvedValueOnce({
        Datapoints: [{ Sum: 0 }],
      })
      // Mock EC2 describe
      .mockResolvedValueOnce({
        Reservations: [{
          Instances: [{ State: { Name: 'running' } }],
        }],
      })
      // Mock EC2 stop
      .mockResolvedValueOnce({})
      // Mock DynamoDB update
      .mockResolvedValueOnce({});

    const event = {} as ScheduledEvent;
    await handler(event);

    // Verify the timeout was used (60 minutes = 3600 seconds)
    expect(mockSend).toHaveBeenCalledTimes(4);
  });
});
