// Initialize the spies
const spySend = jest.fn();
const spySSM = jest.fn(() => ({
  send: spySend,
}));

// Mock the SSM client
jest.mock('@aws-sdk/client-ssm', () => ({
  SSM: spySSM,
  SendCommandCommand: jest.fn((params) => params),
  GetCommandInvocationCommand: jest.fn((params) => params),
}));

// eslint-disable-next-line import/no-unresolved
import type { OnEventRequest } from 'aws-cdk-lib/custom-resources/lib/provider-framework/types';
import { Context } from 'aws-lambda';
import { handler } from '../../src/installer/installer.lambda';

// Mock setTimeout to execute immediately for tests
jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
  fn();
  return 0 as any;
});

describe('installer lambda', () => {
  let mockContext: Context;

  beforeEach(() => {
    // Reset mocks before each test
    jest.resetModules();
    jest.clearAllMocks();

    // Mock Lambda context
    mockContext = {
      getRemainingTimeInMillis: jest.fn().mockReturnValue(300000),
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

    // Mock sendCommand and getCommandInvocation calls
    spySend
      .mockResolvedValueOnce({
        // SendCommandCommand response
        Command: {
          CommandId: mockCommandId,
          Status: 'Pending',
        },
      })
      .mockResolvedValueOnce({
        // GetCommandInvocationCommand response
        Status: 'Success',
        CommandId: mockCommandId,
      });

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

    // Verify sendCommand was called
    expect(spySend).toHaveBeenNthCalledWith(1, {
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

    // Verify getCommandInvocation was called
    expect(spySend).toHaveBeenNthCalledWith(2, {
      CommandId: mockCommandId,
      InstanceId: 'i-1234567890',
    });

    expect(result).toEqual({
      Data: { CommandId: mockCommandId },
    });
  });

  test('should throw error for failed SSM command', async () => {
    const mockCommandId = 'test-cmd-id';

    // Mock sendCommand success, then getCommandInvocation returns Failed
    spySend
      .mockResolvedValueOnce({
        // SendCommandCommand response
        Command: {
          CommandId: mockCommandId,
          Status: 'Pending',
        },
      })
      .mockResolvedValueOnce({
        // GetCommandInvocationCommand response
        Status: 'Failed',
        CommandId: mockCommandId,
      });

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
    const mockCommandId = 'test-cmd-id';

    // Mock sendCommand success
    spySend.mockResolvedValueOnce({
      Command: {
        CommandId: mockCommandId,
        Status: 'Pending',
      },
    });

    // Mock getCommandInvocation to return InProgress
    spySend.mockResolvedValue({
      Status: 'InProgress',
      CommandId: mockCommandId,
    });

    // Mock context to simulate timeout
    mockContext.getRemainingTimeInMillis = jest
      .fn()
      .mockReturnValueOnce(5000) // First call for sendCommand
      .mockReturnValueOnce(2000); // Second call for getCommandInvocation (less than SLEEP_MS)

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
      'SSM Document test-document on EC2 instance i-1234567890 timed out while lambda waiting (status: InProgress)',
    );
  });

  test('should poll multiple times and eventually succeed', async () => {
    const mockCommandId = 'test-cmd-id';

    // Mock sendCommand success
    spySend.mockResolvedValueOnce({
      Command: {
        CommandId: mockCommandId,
        Status: 'Pending',
      },
    });

    // Mock getCommandInvocation to return InProgress twice, then Success
    spySend
      .mockResolvedValueOnce({
        Status: 'InProgress',
        CommandId: mockCommandId,
      })
      .mockResolvedValueOnce({
        Status: 'InProgress',
        CommandId: mockCommandId,
      })
      .mockResolvedValueOnce({
        Status: 'Success',
        CommandId: mockCommandId,
      });

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

    expect(result).toEqual({
      Data: { CommandId: mockCommandId },
    });

    // Verify we made multiple getCommandInvocation calls
    expect(spySend).toHaveBeenCalledTimes(4); // 1 send + 3 get
  });
});
