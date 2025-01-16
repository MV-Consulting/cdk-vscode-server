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
            instanceOperatingSystem: LinuxFlavorType.UBUNTU_22,
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
            ]

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