import { App, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { VSCodeServer } from '../../src/index'

export class MyStack extends Stack {
    constructor(scope: Construct, id: string, props: StackProps = {}) {
        super(scope, id, props);

        new VSCodeServer(this, 'vscode', {});
    }
}

const env = {
    account: '123456789912',
    region: 'eu-central-1',
};

const app = new App();
new MyStack(app, 'vscode-server', { env });
app.synth();