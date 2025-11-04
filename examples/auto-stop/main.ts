import { App, Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import {
  LinuxArchitectureType,
  LinuxFlavorType,
  VSCodeServer,
} from '../../src/index';

/**
 * Example: VS Code Server with Auto-Stop Functionality
 *
 * This example demonstrates how to configure automatic instance stopping
 * to save costs when the VS Code Server is idle.
 *
 * Cost Savings:
 * - Without auto-stop: m7g.xlarge running 24/7 = ~$120/month
 * - With auto-stop (8 hours/day, 5 days/week): ~$30/month
 * - Savings: ~$90/month (75% reduction)
 *
 * How it works:
 * 1. CloudWatch monitors request metrics from CloudFront
 * 2. EventBridge triggers IdleMonitor Lambda every 5 minutes (configurable)
 * 3. If no requests detected for 30 minutes (configurable), instance stops
 * 4. Elastic IP ensures consistent addressing across stop/start cycles
 * 5. Manual restart via AWS Console or CLI when needed
 *
 * Note: This is ideal for development and workshop environments where
 * the server is not actively used 24/7.
 */
export class AutoStopExampleStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    new VSCodeServer(this, 'vscode-auto-stop', {
      // Instance configuration
      instanceClass: ec2.InstanceClass.M7G,
      instanceSize: ec2.InstanceSize.XLARGE,
      instanceVolumeSize: 40,
      instanceOperatingSystem: LinuxFlavorType.UBUNTU_24,
      instanceCpuArchitecture: LinuxArchitectureType.ARM,

      // 🔥 Auto-Stop Configuration
      enableAutoStop: true, // Enable automatic instance stop when idle

      // Stop instance after 30 minutes of no activity (default)
      // Adjust based on your usage patterns:
      // - Development: 15-30 minutes
      // - Workshops: 30-60 minutes
      // - Demo environments: 60-120 minutes
      idleTimeoutMinutes: 30,

      // Check for idle activity every 5 minutes (default)
      // Lower values = faster detection but more Lambda invocations
      // Higher values = slower detection but fewer Lambda invocations
      idleCheckIntervalMinutes: 5,

      // Additional configuration
      additionalTags: {
        Environment: 'Development',
        CostCenter: 'Engineering',
        AutoStop: 'Enabled',
      },
    });
  }
}

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || '123456789012',
  region: process.env.CDK_DEFAULT_REGION || 'eu-west-1',
};

const app = new App();
new AutoStopExampleStack(app, 'vscode-auto-stop-example', { env });
app.synth();
