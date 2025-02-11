import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { CustomResource, Duration, IResource } from 'aws-cdk-lib/core';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { SecretRetrieverFunction } from './secret-retriever-function';

export interface Secret {
  username: string;
  password: string;
}

export interface SecretRetrieverOptionsBase {
  readonly secretArn: string;
}

export interface SecretRetrieverOptions extends SecretRetrieverOptionsBase {}

export abstract class SecretRetriever {
  public static new(options: SecretRetrieverOptions): SecretRetriever {
    return new (class extends SecretRetriever {
      public _bind(scope: Construct): SecretRetriever {
        const secretRetriever = new CustomResourceSecretRetriever(scope, {
          secretArn: options.secretArn,
        });

        return secretRetriever;
      }
    })();
  }

  public secretArn!: string;

  /**
   * The ARN of the secretRetriever in SSM.
   */
  public secretRetrieverArn!: string;

  /**
   * The plaintext secret
   */
  public secretPlaintext!: Secret;
  public secretPasswordPlaintext!: string;
  public customResource!: IResource;

  /**
   * @internal
   */
  protected constructor() {}

  /**
   * @internal
   */
  public abstract _bind(scope: Construct): any;
}

interface CustomResourceSecretRetrieverOptions extends SecretRetrieverOptions {}

class CustomResourceSecretRetriever extends SecretRetriever {
  constructor(scope: Construct, options: CustomResourceSecretRetrieverOptions) {
    super();

    this.secretArn = options.secretArn;

    const onEvent: Function = new SecretRetrieverFunction(
      scope,
      'SecretRetrieverOnEventHandler',
      {
        timeout: Duration.seconds(10),
        memorySize: 128,
      },
    );
    NagSuppressions.addResourceSuppressions(
      [onEvent],
      [
        {
          id: 'AwsSolutions-IAM4',
          reason:
            'For this event handler we do not need to restrict managed policies',
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'For this lambda the latest runtime is not needed',
        },
      ],
      true,
    );

    onEvent.addToRolePolicy(
      new PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [this.secretArn],
      }),
    );

    const provider = new Provider(scope, 'SecretRetrieveProvider', {
      onEventHandler: onEvent,
    });
    NagSuppressions.addResourceSuppressions(
      [provider],
      [
        {
          id: 'AwsSolutions-IAM4',
          reason:
            'For this provider we do not need to restrict managed policies',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'For this provider wildcards are fine',
        },
        {
          id: 'AwsSolutions-L1',
          reason: 'For this provider the latest runtime is not needed',
        },
      ],
      true,
    );

    const resource = new CustomResource(
      scope,
      'SecretRetrieverCustomResource',
      {
        serviceToken: provider.serviceToken,
        properties: {
          SecretArn: options.secretArn,
          ServiceTimeout: 305,
        },
      },
    );

    this.secretPlaintext = resource.getAtt('secretValue').toJSON() as Secret;
    this.secretPasswordPlaintext = resource.getAttString('secretPasswordValue');
    this.customResource = resource;
  }

  public _bind() {}
}
