import { Stack } from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';

// Here we store the nags which we can only directly
// address to resource and not with the common pattern.
// This mostly happens with custom resources, with a lot
// of generated code under the hood.
export function suppressCommonNags(stack: Stack) {
  NagSuppressions.addResourceSuppressionsByPath(
    stack,
    `/${stack.stackName}/AWS679f53fac002430cb0da5b7982bd2287/Resource`,
    [
      {
        id: 'AwsSolutions-L1',
        reason:
          'We manage runtime for AwsSdkCall Custom Resource and will update when necessary',
      },
    ],
  );
}
