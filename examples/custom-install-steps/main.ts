import { App, Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import {
  CustomInstallStep,
  LinuxArchitectureType,
  LinuxFlavorType,
  VSCodeServer,
} from '../../src/index';

/**
 * Example: VS Code Server with Custom Installation Steps
 *
 * This example demonstrates how to extend the standard VS Code Server installation
 * with custom shell commands. Perfect for:
 * - Installing workshop-specific tools
 * - Configuring development environments
 * - Running setup scripts
 * - Preparing datasets or assets
 * - Setting up databases or services
 *
 * All custom steps execute with root privileges after the standard installation completes.
 */
export class CustomInstallStepsExampleStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // Define custom installation steps
    const customSteps: CustomInstallStep[] = [
      // Step 1: Install additional development tools
      {
        name: 'InstallDevelopmentTools',
        commands: [
          '#!/bin/bash',
          'set -e', // Exit on error
          'echo "Installing development tools..."',

          // Install Docker (if not already installed)
          'if ! command -v docker &> /dev/null; then',
          '  curl -fsSL https://get.docker.com | sh',
          '  usermod -aG docker ubuntu',
          '  systemctl enable docker',
          '  systemctl start docker',
          'fi',

          // Install kubectl
          'curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/arm64/kubectl"',
          'install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl',
          'rm kubectl',

          // Install terraform
          'wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg',
          'echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/hashicorp.list',
          'apt-get update && apt-get install -y terraform',

          'echo "Development tools installed successfully"',
        ],
      },

      // Step 2: Configure workshop environment
      {
        name: 'ConfigureWorkshopEnvironment',
        commands: [
          '#!/bin/bash',
          'set -e',
          'echo "Configuring workshop environment..."',

          // Set environment variables
          'cat >> /home/ubuntu/.bashrc << EOF',
          '',
          '# Workshop environment variables',
          'export WORKSHOP_NAME="AWS CDK Workshop"',
          'export WORKSHOP_VERSION="2.0"',
          'export AWS_REGION="${AWS::Region}"',
          'export AWS_ACCOUNT_ID="${AWS::AccountId}"',
          '',
          '# Custom aliases',
          'alias k="kubectl"',
          'alias tf="terraform"',
          'alias ll="ls -la"',
          'EOF',

          // Create workshop directories
          'mkdir -p /home/ubuntu/workshop',
          'mkdir -p /home/ubuntu/workshop/code',
          'mkdir -p /home/ubuntu/workshop/data',

          // Set proper ownership
          'chown -R ubuntu:ubuntu /home/ubuntu/workshop',
          'chown ubuntu:ubuntu /home/ubuntu/.bashrc',

          'echo "Workshop environment configured successfully"',
        ],
      },

      // Step 3: Clone and prepare workshop starter code
      {
        name: 'PrepareWorkshopCode',
        commands: [
          '#!/bin/bash',
          'set -e',
          'echo "Preparing workshop starter code..."',

          // Clone workshop repository
          'cd /home/ubuntu/workshop/code',
          'git clone https://github.com/aws-samples/aws-cdk-examples.git',

          // Download sample datasets
          'cd /home/ubuntu/workshop/data',
          'curl -o sample-data.json https://raw.githubusercontent.com/aws-samples/aws-cdk-examples/main/package.json',

          // Create a README for participants
          'cat > /home/ubuntu/workshop/README.md << EOF',
          '# Welcome to the AWS CDK Workshop!',
          '',
          '## Getting Started',
          '',
          '1. Navigate to the code directory: `cd ~/workshop/code`',
          '2. Explore the examples: `ls -la aws-cdk-examples`',
          '3. Run your first CDK app',
          '',
          '## Resources',
          '',
          '- AWS CDK Documentation: https://docs.aws.amazon.com/cdk',
          '- Workshop Guide: [TBD]',
          '',
          '## Installed Tools',
          '',
          '- Node.js $(node --version)',
          '- Python $(python3 --version)',
          '- Docker $(docker --version)',
          '- kubectl $(kubectl version --client --short 2>/dev/null || echo "installed")',
          '- Terraform $(terraform version | head -n1)',
          'EOF',

          // Set ownership
          'chown -R ubuntu:ubuntu /home/ubuntu/workshop',

          'echo "Workshop code prepared successfully"',
        ],
      },

      // Step 4: Install VS Code extensions
      {
        name: 'InstallVSCodeExtensions',
        commands: [
          '#!/bin/bash',
          'set -e',
          'echo "Installing VS Code extensions..."',

          // Switch to ubuntu user to install extensions
          'sudo -u ubuntu bash << EOF',
          'export HOME=/home/ubuntu',

          // Wait for code-server to be ready
          'sleep 5',

          // Install useful extensions (examples - adjust based on your needs)
          '# Note: Extension installation via CLI requires code-server to be running',
          '# These would typically be installed through the VS Code UI after first login',

          'echo "VS Code extensions configured successfully"',
          'EOF',
        ],
      },
    ];

    // Create VS Code Server with custom installation steps
    new VSCodeServer(this, 'vscode-custom-install', {
      // Instance configuration
      instanceClass: ec2.InstanceClass.M7G,
      instanceSize: ec2.InstanceSize.XLARGE,
      instanceVolumeSize: 50, // Larger volume for additional tools
      instanceOperatingSystem: LinuxFlavorType.UBUNTU_24, // Supports UBUNTU_22, UBUNTU_24, UBUNTU_25, AMAZON_LINUX_2023
      instanceCpuArchitecture: LinuxArchitectureType.ARM,

      // VS Code configuration
      homeFolder: '/workshop',
      vscodeUser: 'ubuntu',

      // 🔧 Custom installation steps
      customInstallSteps: customSteps,

      // Additional configuration
      additionalTags: {
        Workshop: 'AWS-CDK-Workshop',
        Environment: 'Training',
        CustomInstallSteps: 'Enabled',
      },
    });
  }
}

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || '123456789012',
  region: process.env.CDK_DEFAULT_REGION || 'eu-west-1',
};

const app = new App();
new CustomInstallStepsExampleStack(app, 'vscode-custom-install-example', { env });
app.synth();
