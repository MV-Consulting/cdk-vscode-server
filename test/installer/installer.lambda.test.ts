// Initialize the spies
const spySendCommand = jest.fn();
const spySSM = jest.fn(() => ({
  sendCommand: spySendCommand,
}));

// Mock the SSM client
jest.mock('@aws-sdk/client-ssm', () => ({
  SSM: spySSM,
}));

// eslint-disable-next-line import/no-unresolved
import type { OnEventRequest } from 'aws-cdk-lib/custom-resources/lib/provider-framework/types';
import { Context } from 'aws-lambda';
import { handler } from '../../src/installer/installer.lambda';

describe('installer lambda', () => {
  let mockContext: Context;

  beforeEach(() => {
    // Reset mocks before each test
    jest.resetModules();
    jest.clearAllMocks();

    // Mock Lambda context
    mockContext = {
      getRemainingTimeInMillis: jest.fn().mockReturnValue(3000),
    } as unknown as Context;
  });

  afterEach(() => {});

  test('should do nothing for non-Create requests', async () => {
    const event = {
      RequestType: 'Update',
      ResourceProperties: {
        ServiceToken: 'dummyToken',
      },
    } as unknown as OnEventRequest;

    const result = await handler(event, mockContext);
    expect(result).toEqual({});
  });

  test('should handle successful SSM command execution', async () => {
    const mockCommandId = 'test-command-id';

    spySendCommand.mockImplementation(() => ({
      Command: {
        CommandId: mockCommandId,
        Status: 'Success',
      },
    }));

    const event = {
      RequestType: 'Create',
      ResourceProperties: {
        ServiceToken: 'dummyToken',
        InstanceId: 'i-1234567890',
        DocumentName: 'test-document',
        CloudWatchLogGroupName: '/test/log/group',
        VSCodePassword: 's3cr3t-password',
        LinuxFlavor: 'ubuntu',
      },
    } as unknown as OnEventRequest;

    const result = await handler(event, mockContext);

    expect(spySendCommand).toHaveBeenCalledWith({
      DocumentName: 'test-document',
      InstanceIds: ['i-1234567890'],
      CloudWatchOutputConfig: {
        CloudWatchLogGroupName: '/test/log/group',
        CloudWatchOutputEnabled: true,
      },
      Parameters: {
        VSCodePassword: ['s3cr3t-password'],
        LinuxFlavor: ['ubuntu'],
      },
    });

    expect(result).toEqual({
      Data: { CommandId: mockCommandId },
    });
  });

  test('should throw error for failed SSM command', async () => {
    spySendCommand.mockImplementation(() => ({
      Command: {
        CommandId: 'test-cmd-it',
        Status: 'Failed',
      },
    }));

    const event = {
      RequestType: 'Create',
      ResourceProperties: {
        ServiceToken: 'dummyToken',
        InstanceId: 'i-1234567890',
        DocumentName: 'test-document',
        CloudWatchLogGroupName: '/test/log/group',
        VSCodePassword: 's3cr3t-password',
        LinuxFlavor: 'ubuntu',
      },
    } as unknown as OnEventRequest;

    await expect(handler(event, mockContext)).rejects.toThrow(
      'SSM Document test-document on EC2 instance i-1234567890 failed',
    );
  });

  test('should handle command in progress and timeout', async () => {
    spySendCommand.mockImplementation(() => ({
      Command: {
        CommandId: 'test-cmd-it',
        Status: 'InProgress',
      },
    }));

    // Mock context to simulate timeout
    mockContext.getRemainingTimeInMillis = jest
      .fn()
      .mockReturnValueOnce(2000) // Less than SLEEP_MS
      .mockReturnValueOnce(1000);

    const event = {
      RequestType: 'Create',
      ResourceProperties: {
        ServiceToken: 'dummyToken',
        InstanceId: 'i-1234567890',
        DocumentName: 'test-document',
        CloudWatchLogGroupName: '/test/log/group',
        VSCodePassword: 's3cr3t-password',
        LinuxFlavor: 'ubuntu',
      },
    } as unknown as OnEventRequest;

    await expect(handler(event, mockContext)).rejects.toThrow(
      'SSM Document test-document on EC2 instance i-1234567890 timed out while lambda in progress',
    );
  });
});
