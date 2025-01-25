// ~~ Generated by projen. To modify, edit .projenrc.ts and run "npx projen".
import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

/**
 * Props for SecretRetrieverFunction
 */
export interface SecretRetrieverFunctionProps extends lambda.FunctionOptions {
}

/**
 * An AWS Lambda function which executes src/secret-retriever/secret-retriever.
 */
export class SecretRetrieverFunction extends lambda.Function {
  constructor(scope: Construct, id: string, props?: SecretRetrieverFunctionProps) {
    super(scope, id, {
      description: 'src/secret-retriever/secret-retriever.lambda.ts',
      ...props,
      runtime: new lambda.Runtime('nodejs22.x', lambda.RuntimeFamily.NODEJS),
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../assets/secret-retriever/secret-retriever.lambda')),
    });
  }
}