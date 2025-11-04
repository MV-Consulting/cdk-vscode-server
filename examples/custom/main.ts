import { App, Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import {
    LinuxArchitectureType,
    LinuxFlavorType,
    VSCodeServer
} from '../../src/index'

export class MyStack extends Stack {
    constructor(scope: Construct, id: string, props: StackProps = {}) {
        super(scope, id, props);

        new VSCodeServer(this, 'vscode', {
            // for example (or simply use the defaults by not setting the properties)
            instanceVolumeSize: 8,
            instanceClass: ec2.InstanceClass.M7G,
            instanceSize: ec2.InstanceSize.LARGE,
            instanceOperatingSystem: LinuxFlavorType.UBUNTU_24, // Supports UBUNTU_22, UBUNTU_24, UBUNTU_25, AMAZON_LINUX_2023
            instanceCpuArchitecture: LinuxArchitectureType.ARM,

            // 👇🏽 or if you want to give the InstanceRole more permissions
            additionalInstanceRolePolicies: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'codebuild:*',
                    ],
                    resources: [
                        `arn:aws:codebuild:*:${Stack.of(this).account}:*/*`,
                    ],
                }),
            ],

            // 👇🏽 Add custom installation steps to extend the standard setup
            customInstallSteps: [
                {
                    name: 'InstallCodeBuildTools',
                    commands: [
                        '#!/bin/bash',
                        'echo "Installing CodeBuild-related tools..."',
                        // Install AWS CodeBuild local agent for testing
                        'docker pull public.ecr.aws/codebuild/local-builds:latest',
                        // Create helper script
                        'cat > /usr/local/bin/codebuild-local << EOF',
                        '#!/bin/bash',
                        'docker run -it --rm -v /var/run/docker.sock:/var/run/docker.sock \\',
                        '  -e "IMAGE_NAME=public.ecr.aws/codebuild/local-builds:latest" \\',
                        '  public.ecr.aws/codebuild/local-builds:latest',
                        'EOF',
                        'chmod +x /usr/local/bin/codebuild-local',
                        'echo "CodeBuild tools installed successfully"',
                    ],
                },
            ],

            // and more... 💡
        });
    }
}

const env = {
    account: '123456789912',
    region: 'eu-central-1',
};

const app = new App();
new MyStack(app, 'vscode-server', { env });
app.synth();