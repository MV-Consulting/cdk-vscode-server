import { App, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { VSCodeServer } from '../../src/index'

export class MyStack extends Stack {
    constructor(scope: Construct, id: string, props: StackProps = {}) {
        super(scope, id, props);

        new VSCodeServer(this, 'vscode', {
            // Clone a git repository into the home folder during instance setup
            // Perfect for workshops, training sessions, or development environments
            repoUrl: 'https://github.com/aws-samples/aws-cdk-examples.git',

            // Optional: customize the home folder path (default: /Workshop)
            homeFolder: '/CdkWorkshop',

            // Optional: specify VS Code user (default: vscode-user)
            vscodeUser: 'workshop-user',
        });
    }
}

const env = {
    account: '123456789912',
    region: 'eu-central-1',
};

const app = new App();
new MyStack(app, 'vscode-server-git-repo', { env });
app.synth();
