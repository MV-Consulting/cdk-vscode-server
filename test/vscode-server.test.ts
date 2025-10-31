import { App, Aspects, Stack } from 'aws-cdk-lib';
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

  test('vscode-server-custom-props', () => {
    const app = new App();
    const stack = new Stack(app, 'testStack', {
      env: {
        region: 'us-east-1',
        account: '1234',
      },
    });

    const testProps: VSCodeServerProps = {
      additionalTags: {
        'unit-test': 'True',
      },
    };

    new VSCodeServer(stack, 'testVSCodeServer', testProps);

    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });
});

describe('vscode-server-custom-domain', () => {
  test('should create Route53 record when custom domain provided', () => {
    const app = new App();
    const stack = new Stack(app, 'testStack', {
      env: {
        region: 'us-east-1',
        account: '1234',
      },
    });

    const testProps: VSCodeServerProps = {
      domainName: 'vscode.example.com',
      hostedZoneId: 'Z123EXAMPLE',
      certificateArn: 'arn:aws:acm:us-east-1:1234:certificate/test-cert-id',
    };

    new VSCodeServer(stack, 'testVSCodeServer', testProps);

    const template = Template.fromStack(stack);

    // Should create Route53 A record
    template.hasResourceProperties('AWS::Route53::RecordSet', {
      Type: 'A',
      Name: 'vscode.example.com.',
      HostedZoneId: 'Z123EXAMPLE',
    });
  });

  test('should configure CloudFront with custom domain name', () => {
    const app = new App();
    const stack = new Stack(app, 'testStack', {
      env: {
        region: 'us-east-1',
        account: '1234',
      },
    });

    const testProps: VSCodeServerProps = {
      domainName: 'vscode.example.com',
      certificateArn: 'arn:aws:acm:us-east-1:1234:certificate/test-cert-id',
    };

    new VSCodeServer(stack, 'testVSCodeServer', testProps);

    const template = Template.fromStack(stack);

    // Should configure CloudFront with custom domain
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        Aliases: ['vscode.example.com'],
        ViewerCertificate: {
          AcmCertificateArn:
            'arn:aws:acm:us-east-1:1234:certificate/test-cert-id',
          SslSupportMethod: 'sni-only',
        },
      },
    });
  });

  test('should use existing certificate when certificateArn provided', () => {
    const app = new App();
    const stack = new Stack(app, 'testStack', {
      env: {
        region: 'us-east-1',
        account: '1234',
      },
    });

    const testProps: VSCodeServerProps = {
      domainName: 'vscode.example.com',
      certificateArn: 'arn:aws:acm:us-east-1:1234:certificate/existing-cert',
    };

    new VSCodeServer(stack, 'testVSCodeServer', testProps);

    const template = Template.fromStack(stack);

    // Should NOT create ACM certificate
    template.resourceCountIs('AWS::CertificateManager::Certificate', 0);

    // Should use provided certificate ARN
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        ViewerCertificate: {
          AcmCertificateArn:
            'arn:aws:acm:us-east-1:1234:certificate/existing-cert',
        },
      },
    });
  });

  test.skip('should auto-create certificate when autoCreateCertificate is true', () => {
    const app = new App();
    const stack = new Stack(app, 'testStack', {
      env: {
        region: 'us-east-1',
        account: '1234',
      },
    });

    const testProps: VSCodeServerProps = {
      domainName: 'vscode.example.com',
      hostedZoneId: 'Z123EXAMPLE',
      autoCreateCertificate: true,
    };

    new VSCodeServer(stack, 'testVSCodeServer', testProps);

    const template = Template.fromStack(stack);

    // Should create DNS validated certificate (uses custom resource)
    // DnsValidatedCertificate creates a custom resource that manages the certificate
    template.resourceCountIs('AWS::CloudFormation::CustomResource', 1);

    // Should create Route53 record for the domain
    template.hasResourceProperties('AWS::Route53::RecordSet', {
      Name: 'vscode.example.com.',
      Type: 'A',
    });

    // Should configure CloudFront with custom domain
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        Aliases: ['vscode.example.com'],
      },
    });
  });

  test('should throw error when autoCreateCertificate is true but hostedZoneId not provided', () => {
    const app = new App();
    const stack = new Stack(app, 'testStack', {
      env: {
        region: 'us-east-1',
        account: '1234',
      },
    });

    expect(() => {
      new VSCodeServer(stack, 'testVSCodeServer', {
        domainName: 'vscode.example.com',
        autoCreateCertificate: true,
        // No hostedZoneId provided
      });
    }).toThrow('hostedZoneId is required when autoCreateCertificate is true');
  });

  test('should use custom domain in output when provided', () => {
    const app = new App();
    const stack = new Stack(app, 'testStack', {
      env: {
        region: 'us-east-1',
        account: '1234',
      },
    });

    const testProps: VSCodeServerProps = {
      domainName: 'vscode.example.com',
      certificateArn: 'arn:aws:acm:us-east-1:1234:certificate/test-cert-id',
    };

    const vsCodeServer = new VSCodeServer(stack, 'testVSCodeServer', testProps);

    // Domain name should use custom domain
    expect(vsCodeServer.domainName).toContain('vscode.example.com');
    expect(vsCodeServer.domainName).not.toContain('cloudfront.net');
  });

  test('should maintain backward compatibility without custom domain', () => {
    const app = new App();
    const stack = new Stack(app, 'testStack', {
      env: {
        region: 'us-east-1',
        account: '1234',
      },
    });

    const testProps: VSCodeServerProps = {};

    const vsCodeServer = new VSCodeServer(stack, 'testVSCodeServer', testProps);

    const template = Template.fromStack(stack);

    // Should NOT create Route53 resources
    template.resourceCountIs('AWS::Route53::RecordSet', 0);
    template.resourceCountIs('AWS::CertificateManager::Certificate', 0);

    // Should NOT have custom domain in CloudFront
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.not({
        Aliases: Match.anyValue(),
      }),
    });

    // Domain name should use CloudFront default domain (token in tests)
    expect(vsCodeServer.domainName).toMatch(/https:\/\/.*\?folder=\/Workshop/);
  });

  test('should throw error for invalid domain configurations', () => {
    const app = new App();
    const stack = new Stack(app, 'testStack', {
      env: {
        region: 'us-east-1',
        account: '1234',
      },
    });

    expect(() => {
      new VSCodeServer(stack, 'testVSCodeServer', {
        domainName: 'vscode.example.com',
        // No certificate configuration provided
      });
    }).toThrow();
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

describe('VSCodeServer Tagging', () => {
  let app: App;
  let stack: Stack;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
  });

  test('Should apply custom tags without infinite loop', () => {
    // GIVEN
    const customTags = {
      Environment: 'test',
      Project: 'vscode-server',
      Owner: 'test-user',
    };

    // WHEN - This should complete without throwing infinite loop error
    expect(() => {
      new VSCodeServer(stack, 'VSCodeServer', {
        additionalTags: customTags,
      });
    }).not.toThrow();

    // THEN - Verify the stack can be synthesized (proves no infinite loop)
    expect(() => {
      app.synth();
    }).not.toThrow();
  });

  test('Should apply tags to taggable resources', () => {
    // GIVEN
    const customTags = {
      Environment: 'production',
      CostCenter: '12345',
    };

    // WHEN
    new VSCodeServer(stack, 'VSCodeServer', {
      additionalTags: customTags,
    });

    // THEN - Verify stack synthesizes successfully (proves no infinite loop)
    expect(() => {
      const template = Template.fromStack(stack);

      // Verify at least the EC2 instance has the Environment tag
      template.hasResourceProperties('AWS::EC2::Instance', {
        Tags: Match.arrayWith([{ Key: 'Environment', Value: 'production' }]),
      });
    }).not.toThrow();
  });

  test('Should handle empty additional tags', () => {
    // WHEN - No additional tags provided
    expect(() => {
      new VSCodeServer(stack, 'VSCodeServer', {
        additionalTags: {},
      });
      app.synth();
    }).not.toThrow();
  });

  test('Should handle undefined additional tags', () => {
    // WHEN - additionalTags not provided
    expect(() => {
      new VSCodeServer(stack, 'VSCodeServer', {});
      app.synth();
    }).not.toThrow();
  });
});

describe('vscode-server-auto-stop', () => {
  test('should create auto-stop resources when enabled', () => {
    const app = new App();
    const stack = new Stack(app, 'testStack', {
      env: {
        region: 'us-east-1',
        account: '1234',
      },
    });

    const testProps: VSCodeServerProps = {
      enableAutoStop: true,
      idleTimeoutMinutes: 30,
    };

    new VSCodeServer(stack, 'testVSCodeServer', testProps);

    const template = Template.fromStack(stack);

    // Verify DynamoDB table
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      BillingMode: 'PAY_PER_REQUEST',
      KeySchema: [
        {
          AttributeName: 'instanceId',
          KeyType: 'HASH',
        },
      ],
    });

    // Verify IdleMonitor Lambda
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: Match.objectLike({
        Variables: Match.objectLike({
          IDLE_TIMEOUT_MINUTES: '30',
        }),
      }),
    });

    // Verify EventBridge rule
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: 'rate(5 minutes)',
    });

    // Verify API Gateway with start endpoint
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: 'VSCodeStatusCheckApi',
    });

    // Note: ResumeHandler Lambda@Edge has been replaced with client-side resume
    // via POST /status/{instanceId}/start API endpoint
  });

  test('should not create auto-stop resources when disabled', () => {
    const app = new App();
    const stack = new Stack(app, 'testStack', {
      env: {
        region: 'us-east-1',
        account: '1234',
      },
    });

    const testProps: VSCodeServerProps = {
      enableAutoStop: false,
    };

    new VSCodeServer(stack, 'testVSCodeServer', testProps);

    const template = Template.fromStack(stack);

    // Should NOT have API Gateway (auto-stop disabled, so no auto-resume either)
    template.resourceCountIs('AWS::ApiGateway::RestApi', 0);

    // Should NOT have EventBridge rule with 5 minutes schedule
    const rules = template.findResources('AWS::Events::Rule');
    const hasIdleMonitorRule = Object.values(rules).some(
      (rule: any) => rule.Properties?.ScheduleExpression === 'rate(5 minutes)',
    );
    expect(hasIdleMonitorRule).toBe(false);
  });

  test('should use default idle timeout when not specified', () => {
    const app = new App();
    const stack = new Stack(app, 'testStack', {
      env: {
        region: 'us-east-1',
        account: '1234',
      },
    });

    const testProps: VSCodeServerProps = {
      enableAutoStop: true,
    };

    new VSCodeServer(stack, 'testVSCodeServer', testProps);

    const template = Template.fromStack(stack);

    // Should use default 30 minutes
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: Match.objectLike({
        Variables: Match.objectLike({
          IDLE_TIMEOUT_MINUTES: '30',
        }),
      }),
    });
  });

  test('should use custom idle timeout when specified', () => {
    const app = new App();
    const stack = new Stack(app, 'testStack', {
      env: {
        region: 'us-east-1',
        account: '1234',
      },
    });

    const testProps: VSCodeServerProps = {
      enableAutoStop: true,
      idleTimeoutMinutes: 60,
    };

    new VSCodeServer(stack, 'testVSCodeServer', testProps);

    const template = Template.fromStack(stack);

    // Should use custom 60 minutes
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: Match.objectLike({
        Variables: Match.objectLike({
          IDLE_TIMEOUT_MINUTES: '60',
        }),
      }),
    });
  });

  test('should maintain backward compatibility when auto-stop not specified', () => {
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

    // Without enableAutoStop, no auto-stop/resume resources should be created
    template.resourceCountIs('AWS::ApiGateway::RestApi', 0);

    // Should NOT have IdleMonitor (EventBridge rule)
    template.resourceCountIs('AWS::Events::Rule', 0);
  });

  test('should expose statusApiUrl when enableAutoStop is true', () => {
    const app = new App();
    const stack = new Stack(app, 'testStack', {
      env: {
        region: 'us-east-1',
        account: '1234',
      },
    });

    const testProps: VSCodeServerProps = {
      enableAutoStop: true,
    };

    const construct = new VSCodeServer(stack, 'testVSCodeServer', testProps);

    // Should expose statusApiUrl for client-side resume functionality
    expect(construct.statusApiUrl).toBeDefined();
  });

  test('should create outputs for auto-stop resources', () => {
    const app = new App();
    const stack = new Stack(app, 'testStack', {
      env: {
        region: 'us-east-1',
        account: '1234',
      },
    });

    const testProps: VSCodeServerProps = {
      enableAutoStop: true,
    };

    new VSCodeServer(stack, 'testVSCodeServer', testProps);

    const template = Template.fromStack(stack);

    // Should have status API URL output
    template.hasOutput('*', {
      Description: 'Status check API URL',
    });

    // Note: Auto-resume is now client-side via POST /status/{instanceId}/start
    // No Lambda@Edge functions are created
  });
});
