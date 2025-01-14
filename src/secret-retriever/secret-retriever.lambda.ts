import { SecretsManager } from '@aws-sdk/client-secrets-manager';
// @ts-ignore
import type { OnEventRequest, OnEventResponse } from 'aws-cdk-lib/custom-resources/lib/provider-framework/types';
import { Secret } from './secret-retriever';

const secretsManager = new SecretsManager();

export const handler = async (event: OnEventRequest): Promise<OnEventResponse> => {
  console.log('Event: %j', { ...event, ResponseURL: '...' });

  if (event.RequestType === 'Delete') {
    // do nothing
    return {};
  }

  // Create and update case
  const secretArn = event.ResourceProperties.SecretArn;
  console.log('secretArn: %j', secretArn);

  try {
    const secret = await secretsManager.getSecretValue({
      SecretId: secretArn,
    });

    const secretValue = secret.SecretString!;
    console.log('secretValue: %j', secretValue);

    const parsedSecretValue: Secret = JSON.parse(secretValue);
    console.log('secretValue is JSON: %j', parsedSecretValue);

    return {
      Data: {
        secretValue: parsedSecretValue,
        secretPasswordValue: parsedSecretValue.password,
      },
    };

  } catch (error) {
    console.error(error);
    throw error;
  }
};