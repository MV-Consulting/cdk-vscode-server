import {
  App,
  Aspects,
  Stack,
} from 'aws-cdk-lib';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks } from 'cdk-nag';
import { VSCodeServer, VSCodeServerProps } from '../src';
import { suppressCommonNags } from '../src/suppress-nags';

describe('vscode-server', () => {
  test('vscode-server-default-props', () => {
    const app = new App();
    const stack = new Stack(app, 'testStack', {
      env: {
        region: 'us-east-1',
        account: '1234',
      },
    });

    const testProps: VSCodeServerProps = {};

    new VSCodeServer(stack, 'testVSCodeServer', testProps);

    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });
});

describe('vscode-server-cdk-nag-AwsSolutions-Pack', () => {
  let stack: Stack;
  let app: App;
  // In this case we can use beforeAll() over beforeEach() since our tests
  // do not modify the state of the application
  beforeAll(() => {
    // GIVEN
    app = new App();
    stack = new Stack(app, 'testStack', {
      env: {
        region: 'us-east-1',
        account: '1234',
      },
    });

    new VSCodeServer(stack, 'VSCodeServer', {});
    suppressCommonNags(stack);

    // WHEN
    Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));
  });

  // THEN
  test('No unsuppressed Warnings', () => {
    const warnings = Annotations.fromStack(stack).findWarning(
      '*',
      Match.stringLikeRegexp('AwsSolutions-.*'),
    );
    expect(warnings).toHaveLength(0);
  });

  test('No unsuppressed Errors', () => {
    const errors = Annotations.fromStack(stack).findError(
      '*',
      Match.stringLikeRegexp('AwsSolutions-.*'),
    );
    if (errors.length > 0) {
      for (const error of errors) {
        console.log(`id: '${error.id}': ${error.entry.data}`);
      }
    }
    expect(errors).toHaveLength(0);
  });
});