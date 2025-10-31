import {
  Aspects,
  CfnOutput,
  Duration,
  IAspect,
  Stack,
  Tags,
} from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import * as cfo from 'aws-cdk-lib/aws-cloudfront-origins';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { NagSuppressions } from 'cdk-nag';
import { Construct, IConstruct } from 'constructs';
import { IdleMonitor } from './idle-monitor/idle-monitor';
import { Installer } from './installer/installer';
import { getAmiSSMParameterForLinuxArchitectureAndFlavor } from './mappings';
import { AwsManagedPrefixList } from './prefixlist-retriever/prefixlist-retriever';
import { SecretRetriever } from './secret-retriever/secret-retriever';
import { InstanceStateTable } from './state-table/state-table';
import { StatusCheckApi } from './status-check/status-check';

/**
 * Properties for the VSCodeServer construct
 */
export interface VSCodeServerProps {
  /**
   * UserName for VSCode Server
   *
   * @default - participant
   */
  readonly vscodeUser?: string;

  /**
   * Password for VSCode Server
   *
   * @default - empty and will then be generated
   */
  readonly vscodePassword?: string;

  /**
   * VSCode Server EC2 instance name
   *
   * @default - VSCodeServer
   */
  readonly instanceName?: string;

  /**
   * VSCode Server EC2 instance volume size in GB
   *
   * @default - 40
   */
  readonly instanceVolumeSize?: number;

  /**
   * VSCode Server EC2 instance class
   *
   * @default - m7g
   */
  readonly instanceClass?: ec2.InstanceClass;

  /**
   * VSCode Server EC2 instance size
   *
   * @default - xlarge
   */
  readonly instanceSize?: ec2.InstanceSize;

  /**
   * VSCode Server EC2 operating system
   *
   * @default - Ubuntu-22
   */
  readonly instanceOperatingSystem?: LinuxFlavorType;

  /**
   * VSCode Server EC2 cpu architecture for the operating system
   *
   * @default - arm
   */
  readonly instanceCpuArchitecture?: LinuxArchitectureType;

  /**
   * Folder to open in VS Code server
   *
   * @default - /Workshop
   */
  readonly homeFolder?: string;

  /**
   * Base path for the application to be added to Nginx sites-available list
   *
   * @default - app
   */
  readonly devServerBasePath?: string;

  /**
   * Port for the DevServer
   *
   * @default - 8081
   */
  readonly devServerPort?: number;

  /**
   * Additional instance role policies
   *
   * @default - []
   */
  readonly additionalInstanceRolePolicies?: iam.PolicyStatement[];

  /**
   * Additional tags to add to the instance
   *
   * @default - {}
   */
  readonly additionalTags?: { [key: string]: string };

  /**
   * Custom domain name for the VS Code server
   * When provided, creates a CloudFront distribution with this domain name
   * and sets up Route53 A record pointing to the distribution
   *
   * @default - uses CloudFront default domain
   */
  readonly domainName?: string;

  /**
   * Route53 hosted zone ID for the domain
   * Required when using autoCreateCertificate
   * If not provided, will attempt to lookup hosted zone from domain name
   *
   * @default - auto-discover from domain name
   */
  readonly hostedZoneId?: string;

  /**
   * ARN of existing ACM certificate for the domain
   * Certificate must be in us-east-1 region for CloudFront
   * Cannot be used together with autoCreateCertificate
   *
   * @default - auto-create certificate if autoCreateCertificate is true
   */
  readonly certificateArn?: string;

  /**
   * Auto-create ACM certificate with DNS validation in us-east-1 region
   * Requires hostedZoneId to be provided for DNS validation
   * Cannot be used together with certificateArn
   * Certificate will automatically be created in us-east-1 as required by CloudFront
   *
   * @default false
   */
  readonly autoCreateCertificate?: boolean;

  /**
   * Enable automatic instance stop when idle
   * Monitors CloudFront metrics and stops the EC2 instance after specified idle time
   *
   * @default false
   */
  readonly enableAutoStop?: boolean;

  /**
   * Minutes of inactivity before stopping the instance
   * Only applies when enableAutoStop is true
   *
   * @default 30
   */
  readonly idleTimeoutMinutes?: number;

  /**
   * How often to check for idle activity (in minutes)
   * Only applies when enableAutoStop is true
   *
   * @default 5 - Check every 5 minutes
   */
  readonly idleCheckIntervalMinutes?: number;
}

/**
 * The flavor of linux you want to run vscode server on
 */
export enum LinuxFlavorType {
  /**
   * Ubuntu 22
   */
  UBUNTU_22 = 'ubuntu22',

  /**
   * Ubuntu 24
   */
  UBUNTU_24 = 'ubuntu24',

  /**
   * Amazon Linux 2023
   */
  AMAZON_LINUX_2023 = 'al2023',
}

/**
 * The architecture of the cpu you want to run vscode server on
 */
export enum LinuxArchitectureType {
  /**
   * ARM architecture
   */
  ARM = 'arm',

  /**
   * AMD64 architecture
   */
  AMD64 = 'amd64',
}

/**
 * VSCodeServer - spin it up in under 10 minutes
 */
export class VSCodeServer extends Construct {
  /**
   * The name of the domain the server is reachable
   */
  public readonly domainName: string;

  /**
   * The password to login to the server
   */
  public readonly password: string;

  /**
   * The EC2 instance running VS Code Server
   */
  public readonly instance: ec2.IInstance;

  /**
   * The URL of the status check API (only available when enableAutoStop is true)
   */
  public readonly statusApiUrl?: string;

  constructor(scope: Construct, id: string, props?: VSCodeServerProps) {
    super(scope, id);

    // defaults
    const vsCodeUser = props?.vscodeUser ?? 'participant';
    const instanceName = props?.instanceName ?? 'VSCodeServer';
    const instanceVolumeSize = props?.instanceVolumeSize ?? 40;
    const homeFolder = props?.homeFolder ?? '/Workshop';
    const instanceClass = props?.instanceClass ?? ec2.InstanceClass.M7G;
    const instanceSize = props?.instanceSize ?? ec2.InstanceSize.XLARGE;
    const instanceType = ec2.InstanceType.of(instanceClass, instanceSize);
    const instanceOperatingSystem =
      props?.instanceOperatingSystem ?? LinuxFlavorType.UBUNTU_22;
    const instanceCpuArchitecture =
      props?.instanceCpuArchitecture ?? LinuxArchitectureType.ARM;
    const machineImageFromSsmParameter =
      getAmiSSMParameterForLinuxArchitectureAndFlavor(
        instanceCpuArchitecture,
        instanceOperatingSystem,
      );
    const additionalInstanceRolePolicies =
      props?.additionalInstanceRolePolicies ?? [];
    const additionalTags = props?.additionalTags ?? {};
    const defaultTags = { app: 'vscode-server' };

    const mergedTags = { ...defaultTags, ...additionalTags };
    Aspects.of(this).add(new NodeTagger(mergedTags), { priority: 150 });

    // Validate domain configuration
    const domainName = props?.domainName;
    const hostedZoneId = props?.hostedZoneId;
    const certificateArn = props?.certificateArn;
    const autoCreateCertificate = props?.autoCreateCertificate ?? false;

    if (domainName) {
      // Validate that either certificateArn or autoCreateCertificate is provided
      if (!certificateArn && !autoCreateCertificate) {
        throw new Error(
          'When domainName is provided, either certificateArn or autoCreateCertificate must be specified',
        );
      }

      // Validate that both certificateArn and autoCreateCertificate are not provided together
      if (certificateArn && autoCreateCertificate) {
        throw new Error(
          'Cannot specify both certificateArn and autoCreateCertificate. Choose one.',
        );
      }

      // Validate that hostedZoneId is provided when autoCreateCertificate is true
      if (autoCreateCertificate && !hostedZoneId) {
        throw new Error(
          'hostedZoneId is required when autoCreateCertificate is true',
        );
      }
    } else {
      // Validate that domain-related props are not provided without domainName
      if (hostedZoneId || certificateArn || autoCreateCertificate) {
        throw new Error(
          'hostedZoneId, certificateArn, and autoCreateCertificate can only be used with domainName',
        );
      }
    }

    let vscodePassword = props?.vscodePassword ?? '';
    if (vscodePassword == '') {
      // Create a secret which is then inject in the SSM document to install vscode server
      const secret = new secretsmanager.Secret(this, 'password-secret', {
        generateSecretString: {
          passwordLength: 16,
          secretStringTemplate: JSON.stringify({
            username: vsCodeUser,
          }),
          excludePunctuation: true,
          includeSpace: false,
          generateStringKey: 'password',
        },
      });
      NagSuppressions.addResourceSuppressions(
        [secret],
        [
          {
            id: 'AwsSolutions-SMG4',
            reason:
              'For this tmp vc code server we do not need password rotation',
          },
        ],
        true,
      );

      // Have a custom resource to pass the secret data on? -> yes because not resolvable on compile time
      const secretRetriever = SecretRetriever.new({
        secretArn: secret.secretArn,
      })._bind(this);

      vscodePassword = secretRetriever.secretPasswordPlaintext;
    }

    // Handle SSL certificate for custom domain
    let certificate: acm.ICertificate | undefined;
    let hostedZone: route53.IHostedZone | undefined;

    if (domainName) {
      // Get or create hosted zone
      if (hostedZoneId) {
        hostedZone = route53.HostedZone.fromHostedZoneAttributes(
          this,
          'hosted-zone',
          {
            hostedZoneId: hostedZoneId,
            zoneName: domainName,
          },
        );
      } else {
        // Lookup hosted zone by domain name
        hostedZone = route53.HostedZone.fromLookup(this, 'hosted-zone', {
          domainName: domainName,
        });
      }

      // Handle certificate
      if (certificateArn) {
        // Use existing certificate
        certificate = acm.Certificate.fromCertificateArn(
          this,
          'certificate',
          certificateArn,
        );
      } else if (autoCreateCertificate) {
        // Create new certificate with DNS validation
        // CloudFront requires certificates to be in us-east-1 region
        if (!hostedZone) {
          throw new Error(
            'hostedZone is required when autoCreateCertificate is true',
          );
        }

        // Note: Using DnsValidatedCertificate (deprecated but still functional)
        // This is the simplest way to create certificates in us-east-1 from any region
        // The modern approach requires multi-stack deployment with crossRegionReferences
        // which is more complex for a construct library to implement cleanly
        // @ts-ignore - DnsValidatedCertificate is deprecated but still the best option for cross-region certs
        certificate = new acm.DnsValidatedCertificate(this, 'certificate', {
          domainName: domainName,
          hostedZone: hostedZone,
          region: 'us-east-1',
          // Explicitly grant the validation Lambda permission to describe certificates
          customResourceRole: new iam.Role(this, 'certificate-validation-role', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
              iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
            ],
            inlinePolicies: {
              CertificateValidationPolicy: new iam.PolicyDocument({
                statements: [
                  new iam.PolicyStatement({
                    actions: [
                      'acm:DescribeCertificate',
                      'acm:RequestCertificate',
                      'acm:DeleteCertificate',
                    ],
                    resources: ['*'],
                  }),
                  new iam.PolicyStatement({
                    actions: [
                      'route53:GetChange',
                      'route53:ChangeResourceRecordSets',
                    ],
                    resources: ['*'],
                  }),
                ],
              }),
            },
          }),
        });

        NagSuppressions.addResourceSuppressions(
          [certificate],
          [
            {
              id: 'AwsSolutions-ACM1',
              reason:
                'Certificate is created for VS Code server with proper domain validation',
            },
            {
              id: 'AwsSolutions-IAM5',
              reason:
                'Certificate validation Lambda needs wildcard permissions for ACM and Route53',
            },
          ],
          true,
        );
      }
    }

    // Create default vpc
    const vpc = new ec2.Vpc(this, 'vpc', {
      maxAzs: 2,
      createInternetGateway: true,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });
    NagSuppressions.addResourceSuppressions(
      [vpc],
      [
        {
          id: 'AwsSolutions-VPC7',
          reason: 'For this tmp vpc we do not need flow logs',
        },
      ],
      true,
    );

    // Create a SecGroup associated withe the CF dist pList
    const secGroup = new ec2.SecurityGroup(this, 'cf-to-server-sg', {
      vpc,
      description: 'SG for VSCodeServer - only allow CloudFront ingress',
      securityGroupName: 'cloudfront-to-vscode-server',
    });

    const awsManagedPrefixList = new AwsManagedPrefixList(
      this,
      'cf-prefixlistId',
      {
        name: 'com.amazonaws.global.cloudfront.origin-facing',
      },
    );
    NagSuppressions.addResourceSuppressions(
      [awsManagedPrefixList],
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'For this provider wildcards are fine',
        },
      ],
      true,
    );

    secGroup.addIngressRule(
      ec2.Peer.prefixList(awsManagedPrefixList.prefixList.prefixListId),
      ec2.Port.tcp(80),
      'Allow HTTP from com.amazonaws.global.cloudfront.origin-facing',
    );

    // Create an EC2 instance associated with the sec group + instance profile and role
    const instanceRole = new iam.Role(this, 'server-instance-role', {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('ec2.amazonaws.com'),
        new iam.ServicePrincipal('ssm.amazonaws.com'),
      ),
      inlinePolicies: {
        VSCodeInstanceInlinePolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              sid: 'StsAccess',
              effect: iam.Effect.ALLOW,
              actions: [
                'sts:AssumeRole',
                'iam:AddRoleToInstanceProfile',
                'iam:AttachRolePolicy',
                'iam:CreateRole',
                'iam:CreateServiceLinkedRole',
                'iam:DeleteRole',
                'iam:DeleteRolePermissionsBoundary',
                'iam:DeleteRolePolicy',
                'iam:DeleteServiceLinkedRole',
                'iam:DetachRolePolicy',
                'iam:GetRole',
                'iam:GetRolePolicy',
                'iam:GetServiceLinkedRoleDeletionStatus',
                'iam:ListAttachedRolePolicies',
                'iam:ListInstanceProfilesForRole',
                'iam:ListRolePolicies',
                'iam:ListRoles',
                'iam:ListRoleTags',
                'iam:PutRolePermissionsBoundary',
                'iam:PutRolePolicy',
                'iam:RemoveRoleFromInstanceProfile',
                'iam:TagRole',
                'iam:UntagRole',
                'iam:UpdateAssumeRolePolicy',
                'iam:UpdateRole',
                'iam:UpdateRoleDescription',
              ],
              resources: [`arn:aws:iam::${Stack.of(this).account}:role/cdk-*`],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['iam:PassRole'],
              resources: [`arn:aws:iam::${Stack.of(this).account}:role/cdk-*`],
              conditions: {
                StringLike: {
                  'iam:PassedToService': 'cloudformation.amazonaws.com',
                },
              },
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['cloudformation:*'],
              resources: [
                `arn:aws:cloudformation:*:${Stack.of(this).account}:stack/CDKToolkit/*`,
              ],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'cloudformation:CreateChangeSet',
                'cloudformation:ExecuteChangeSet',
                'cloudformation:DeleteChangeSet',
              ],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              sid: 'S3Access',
              actions: ['s3:*'],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              sid: 'ECRAccess',
              effect: iam.Effect.ALLOW,
              actions: [
                'ecr:SetRepositoryPolicy',
                'ecr:GetLifecyclePolicy',
                'ecr:PutLifecyclePolicy',
                'ecr:PutImageScanningConfiguration',
                'ecr:DescribeRepositories',
                'ecr:CreateRepository',
                'ecr:DeleteRepository',
              ],
              resources: [
                `arn:aws:ecr:*:${Stack.of(this).account}:repository/cdk-*`,
              ],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'ssm:GetParameter*',
                'ssm:PutParameter*',
                'ssm:DeleteParameter*',
              ],
              resources: [
                `arn:aws:ssm:*:${Stack.of(this).account}:parameter/cdk-bootstrap/*`,
              ],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'ec2:DescribeInstances',
                'ec2:ModifyVolume',
                'ec2:DescribeVolumesModifications*',
              ],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'codepipeline:EnableStageTransition',
                'codepipeline:DisableStageTransition',
                'codepipeline:StartPipelineExecution',
                'codepipeline:StopPipelineExecution',
                'codepipeline:UpdatePipeline',
              ],
              resources: [
                `arn:aws:codepipeline:*:${Stack.of(this).account}:*/*`,
              ],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['kms:Decrypt'],
              resources: [`arn:aws:kms:*:${Stack.of(this).account}:key/*`],
            }),
            ...additionalInstanceRolePolicies,
          ],
        }),
      },
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonSSMManagedInstanceCore',
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'CloudWatchAgentServerPolicy',
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonQDeveloperAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('ReadOnlyAccess'),
      ],
    });
    NagSuppressions.addResourceSuppressions(
      [instanceRole],
      [
        {
          id: 'AwsSolutions-IAM4',
          reason:
            'For this tmp role we do not need to restrict managed policies',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'For this tmp role the wildcards are fine',
        },
      ],
      true,
    );

    this.instance = new ec2.Instance(this, 'server-instance', {
      vpc,
      instanceName,
      instanceType,
      machineImage: ec2.MachineImage.fromSsmParameter(
        machineImageFromSsmParameter,
        {
          os: ec2.OperatingSystemType.LINUX,
        },
      ),
      requireImdsv2: true,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      associatePublicIpAddress: true,
      detailedMonitoring: true,
      blockDevices: [
        {
          deviceName: '/dev/sda1',
          volume: ec2.BlockDeviceVolume.ebs(instanceVolumeSize, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
            encrypted: true,
            deleteOnTermination: true,
          }),
        },
      ],
      role: instanceRole,
      securityGroup: secGroup,
      userData: ec2.UserData.custom(`
        #cloud-config
          hostname: ${instanceName}
          runcmd:
            - mkdir -p ${homeFolder} && chown -R ${vsCodeUser}:${vsCodeUser} ${homeFolder}
      `),
    });
    NagSuppressions.addResourceSuppressions(
      [this.instance],
      [
        {
          id: 'AwsSolutions-EC29',
          reason: 'For this tmp instance we do not need an asg',
        },
      ],
      true,
    );

    // Create a CF distribution (special id) and special CachePolicy to instance
    const cfCachePolicy = new cf.CachePolicy(this, 'cf-cache-policy', {
      cachePolicyName: `cf-cache-policy-vscodeserver-${Stack.of(this).stackName}`,
      comment: 'Cache policy for VSCodeServer',
      minTtl: Duration.seconds(1),
      maxTtl: Duration.seconds(31536000),
      defaultTtl: Duration.seconds(86400),
      cookieBehavior: cf.CacheCookieBehavior.all(),
      enableAcceptEncodingGzip: false,
      headerBehavior: {
        behavior: 'whitelist',
        headers: [
          'Accept-Charset',
          'Authorization',
          'Origin',
          'Accept',
          'Referer',
          'Host',
          'Accept-Language',
          'Accept-Encoding',
          'Accept-Datetime',
        ],
      },
      queryStringBehavior: cf.CacheQueryStringBehavior.all(),
    });

    const origin = new cfo.HttpOrigin(this.instance.instancePublicDnsName, {
      protocolPolicy: cf.OriginProtocolPolicy.HTTP_ONLY,
      originId: `Cloudfront-${Stack.of(this).stackName}-${Stack.of(this).stackName}`,
    });

    // Auto-stop/resume infrastructure
    // State table and status API are shared between auto-stop and auto-resume features
    // Auto-resume is automatically enabled when auto-stop is enabled (client-side via status API)
    let stateTable: InstanceStateTable | undefined;
    let statusApi: StatusCheckApi | undefined;

    if (props?.enableAutoStop) {
      // Create state table (shared by both features)
      stateTable = new InstanceStateTable(this, 'StateTable', {
        tableName: `${instanceName}-StateTable`,
      });

      // Create status check API (shared by both features)
      // The API supports both checking status AND starting instances (for client-side resume)
      statusApi = new StatusCheckApi(this, 'StatusApi', {
        instance: this.instance,
        stateTable: stateTable.table,
      });

      // Expose the status API URL for external use (e.g., client-side resume)
      this.statusApiUrl = statusApi.apiUrl;
    }

    const distribution = new cf.Distribution(this, 'cf-distribution', {
      enabled: true,
      httpVersion: cf.HttpVersion.HTTP2_AND_3,
      // NOTE: 'Distributions that use the default CloudFront viewer certificate or use 'vip' for the 'SslSupportMethod'
      // are non-compliant with this rule, as the minimum security policy is set to TLSv1 regardless
      // of the specified 'MinimumProtocolVersion'
      // minimumProtocolVersion: cf.SecurityPolicyProtocol.TLS_V1_2_2021,
      comment: 'Distribution for VSCodeServer',
      priceClass: cf.PriceClass.PRICE_CLASS_ALL,
      // Custom domain configuration
      ...(domainName && certificate
        ? {
          domainNames: [domainName],
          certificate: certificate,
        }
        : {}),
      defaultBehavior: {
        allowedMethods: cf.AllowedMethods.ALLOW_ALL,
        cachePolicy: cfCachePolicy,
        originRequestPolicy: {
          // Managed-AllViewer - see https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html#:~:text=When%20using%20AWS,47e4%2Db989%2D5492eafa07d3
          originRequestPolicyId: '216adef6-5c7f-47e4-b989-5492eafa07d3',
        },
        viewerProtocolPolicy: cf.ViewerProtocolPolicy.ALLOW_ALL,
        origin,
      },
      additionalBehaviors: {
        '/proxy/*': {
          allowedMethods: cf.AllowedMethods.ALLOW_ALL,
          compress: false,
          // see https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html#managed-cache-policy-caching-disabled
          cachePolicy: cf.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: {
            // Managed-AllViewer - see https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html#:~:text=When%20using%20AWS,47e4%2Db989%2D5492eafa07d3
            originRequestPolicyId: '216adef6-5c7f-47e4-b989-5492eafa07d3',
          },
          viewerProtocolPolicy: cf.ViewerProtocolPolicy.ALLOW_ALL,
          origin,
        },
      },
    });
    NagSuppressions.addResourceSuppressions(
      [distribution],
      [
        {
          id: 'AwsSolutions-CFR1',
          reason: 'For this tmp distribution we do not need geo restrictions',
        },
        {
          id: 'AwsSolutions-CFR2',
          reason: 'For this tmp distribution we do not need waf integration',
        },
        {
          id: 'AwsSolutions-CFR3',
          reason:
            'For this tmp distribution we do not need access logging enabled',
        },
        {
          id: 'AwsSolutions-CFR4',
          reason:
            'For this tmp distribution we do not need limit SSL protocols as we use the default viewer cert',
        },
        {
          id: 'AwsSolutions-CFR5',
          reason:
            'For this tmp distribution we do not need limit SSL protocols as we use the default viewer cert',
        },
      ],
      true,
    );

    // Create Route53 A record for custom domain
    if (domainName && hostedZone) {
      const aRecord = new route53.ARecord(this, 'domain-record', {
        zone: hostedZone,
        recordName: domainName,
        target: route53.RecordTarget.fromAlias(
          new route53targets.CloudFrontTarget(distribution),
        ),
      });

      NagSuppressions.addResourceSuppressions(
        [aRecord],
        [
          {
            id: 'AwsSolutions-R53-1',
            reason: 'A record created for VS Code server custom domain',
          },
        ],
        true,
      );
    }

    // Use a custom resource lambda to run the SSM document on the instance
    switch (instanceOperatingSystem) {
      case LinuxFlavorType.UBUNTU_22:
      case LinuxFlavorType.UBUNTU_24:
        Installer.ubuntu({
          instanceId: this.instance.instanceId,
          vsCodeUser: vsCodeUser,
          vsCodePassword: vscodePassword,
          devServerBasePath: props?.devServerBasePath,
          devServerPort: props?.devServerPort,
          homeFolder: homeFolder,
          customDomainName: domainName,
        })._bind(this);
        break;
      case LinuxFlavorType.AMAZON_LINUX_2023:
        Installer.amazonLinux2023({
          instanceId: this.instance.instanceId,
          vsCodeUser: vsCodeUser,
          vsCodePassword: vscodePassword,
          devServerBasePath: props?.devServerBasePath,
          devServerPort: props?.devServerPort,
          homeFolder: homeFolder,
          customDomainName: domainName,
        })._bind(this);
        break;
      default:
        throw new Error(`Unsupported Linux flavor: ${instanceOperatingSystem}`);
    }
    // so we pass the outer scope of this construct through the installer

    // NOTE: maybe have a healhcheck CFN custom resource to see if the vscode server is healthy
    // atm this is achieved by the integ tests

    // Create idle monitor for auto-stop feature
    if (props?.enableAutoStop && stateTable) {
      new IdleMonitor(this, 'IdleMonitor', {
        instance: this.instance,
        distribution: distribution,
        stateTable: stateTable.table,
        idleTimeoutMinutes: props?.idleTimeoutMinutes ?? 30,
        checkIntervalMinutes: props?.idleCheckIntervalMinutes ?? 5,
      });
    }

    // Output status API URL if created
    if (statusApi) {
      new CfnOutput(this, 'statusApiUrl', {
        description: 'Status check API URL',
        value: statusApi.apiUrl,
      });
    }

    // Outputs
    const finalDomainName = domainName || distribution.domainName;
    this.domainName = `https://${finalDomainName}/?folder=${homeFolder}`;
    new CfnOutput(this, 'domainName', {
      description: 'The domain name of the distribution',
      value: this.domainName,
    });

    this.password = vscodePassword;
    new CfnOutput(this, 'password', {
      description: 'The password for the VSCode server',
      value: vscodePassword,
    });
  }
}

/**
 * Tags all the resources in the construct
 */
class NodeTagger implements IAspect {
  private readonly tags: { [key: string]: string };

  constructor(tags: { [key: string]: string }) {
    this.tags = tags;
  }

  visit(node: IConstruct) {
    // Only tag L1 constructs (CfnResource) and L2 constructs that represent AWS resources
    // This prevents infinite loops by avoiding tagging of intermediate constructs
    const nodeType = node.constructor.name;

    // Check if this is a CDK L1 construct (starts with 'Cfn') or known taggable L2 constructs
    const isTaggableConstruct =
      nodeType.startsWith('Cfn') ||
      nodeType.includes('Instance') ||
      nodeType.includes('Vpc') ||
      nodeType.includes('Subnet') ||
      nodeType.includes('SecurityGroup') ||
      nodeType.includes('Volume') ||
      nodeType.includes('Distribution') ||
      nodeType.includes('LoadBalancer') ||
      nodeType.includes('TargetGroup');

    // Skip constructs that are known to cause issues
    const isProblematicConstruct =
      nodeType.includes('Certificate') ||
      nodeType.includes('HostedZone') ||
      nodeType.includes('CustomResource') ||
      nodeType.includes('Provider') ||
      nodeType.includes('Function') ||
      nodeType.includes('Role') ||
      nodeType.includes('Policy');

    if (isTaggableConstruct && !isProblematicConstruct) {
      Object.entries(this.tags).forEach(([key, value]) => {
        try {
          Tags.of(node).add(key, value);
        } catch (error) {
          // Silently ignore tagging errors
        }
      });
    }
  }
}
