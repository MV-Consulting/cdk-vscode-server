// Set env vars before importing the module so constants are initialized correctly
process.env.INSTANCE_ID = 'i-1234567890abcdef0';
process.env.DISTRIBUTION_ID = 'E1234567890ABC';
process.env.IDLE_TIMEOUT_MINUTES = '30';
process.env.SKIP_STATUS_CHECKS = 'true';

// Initialize the spies
const mockSend = jest.fn();
const spyCloudWatch = jest.fn(() => ({ send: mockSend }));
const spyEC2 = jest.fn(() => ({ send: mockSend }));

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: spyCloudWatch,
  GetMetricStatisticsCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-ec2', () => ({
  EC2Client: spyEC2,
  DescribeInstancesCommand: jest.fn(),
  DescribeInstanceStatusCommand: jest.fn(),
  StopInstancesCommand: jest.fn(),
}));

import type { ScheduledEvent } from 'aws-lambda';
import { handler } from '../../src/idle-monitor/idle-monitor.lambda';

describe('IdleMonitor Lambda', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.INSTANCE_ID = 'i-1234567890abcdef0';
    process.env.DISTRIBUTION_ID = 'E1234567890ABC';
    process.env.IDLE_TIMEOUT_MINUTES = '30';
    process.env.SKIP_STATUS_CHECKS = 'true'; // Skip status checks for faster tests
  });

  afterEach(() => {
    delete process.env.INSTANCE_ID;
    delete process.env.DISTRIBUTION_ID;
    delete process.env.IDLE_TIMEOUT_MINUTES;
    delete process.env.SKIP_STATUS_CHECKS;
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
      .mockResolvedValueOnce({});

    const event = {} as ScheduledEvent;
    await handler(event);

    // With SKIP_STATUS_CHECKS=true: CloudWatch, EC2 describe, EC2 stop
    expect(mockSend).toHaveBeenCalledTimes(3);
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
      });

    const event = {} as ScheduledEvent;
    await handler(event);

    // With SKIP_STATUS_CHECKS=true: CloudWatch, EC2 describe (no DynamoDB calls)
    expect(mockSend).toHaveBeenCalledTimes(2);
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

  test('should log activity when requests detected', async () => {
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
      });

    const event = {} as ScheduledEvent;
    await handler(event);

    // With SKIP_STATUS_CHECKS=true: CloudWatch, EC2 describe (no DynamoDB)
    expect(mockSend).toHaveBeenCalledTimes(2);
    // Should not stop instance
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
      .mockResolvedValueOnce({});

    const event = {} as ScheduledEvent;
    await handler(event);

    // With SKIP_STATUS_CHECKS=true: CloudWatch, EC2 describe, EC2 stop (no DynamoDB)
    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  test('should skip stopping when instance status checks are failing', async () => {
    // Override to enable status checks for this test
    process.env.SKIP_STATUS_CHECKS = 'false';

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
      // Mock EC2 describe instance status - system status failing
      .mockResolvedValueOnce({
        InstanceStatuses: [{
          SystemStatus: { Status: 'impaired' },
          InstanceStatus: { Status: 'ok' },
        }],
      });

    const event = {} as ScheduledEvent;
    await handler(event);

    // CloudWatch, EC2 describe, EC2 status check (then skip due to failed status)
    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  test('should skip stopping when instance status information not available', async () => {
    // Override to enable status checks for this test
    process.env.SKIP_STATUS_CHECKS = 'false';

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
      // Mock EC2 describe instance status - no status info (instance just started)
      .mockResolvedValueOnce({
        InstanceStatuses: [],
      });

    const event = {} as ScheduledEvent;
    await handler(event);

    // CloudWatch, EC2 describe, EC2 status check (then skip due to no status info)
    expect(mockSend).toHaveBeenCalledTimes(3);
  });
});
