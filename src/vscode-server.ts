import { CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import * as cfo from 'aws-cdk-lib/aws-cloudfront-origins';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { Installer } from './installer/installer';
import { getAmiSSMParameterForLinuxArchitectureAndFlavor } from './mappings';
import { AwsManagedPrefixList } from './prefixlist-retriever/prefixlist-retriever';
import { SecretRetriever } from './secret-retriever/secret-retriever';

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
    const instanceOperatingSystem = props?.instanceOperatingSystem ?? LinuxFlavorType.UBUNTU_22;
    const instanceCpuArchitecture = props?.instanceCpuArchitecture ?? LinuxArchitectureType.ARM;
    const machineImageFromSsmParameter = getAmiSSMParameterForLinuxArchitectureAndFlavor(instanceCpuArchitecture, instanceOperatingSystem);
    const additionalInstanceRolePolicies = props?.additionalInstanceRolePolicies ?? [];

    let vscodePassword = props?.vscodePassword ?? '';
    if ((vscodePassword == '')) {
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
      NagSuppressions.addResourceSuppressions([
        secret,
      ], [
        { id: 'AwsSolutions-SMG4', reason: 'For this tmp vc code server we do not need password rotation' },
      ], true);

      // Have a custom resource to pass the secret data on? -> yes because not resolvable on compile time
      const secretRetriever = SecretRetriever.new({
        secretArn: secret.secretArn,
      })._bind(this);

      vscodePassword = secretRetriever.secretPasswordPlaintext;
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
    NagSuppressions.addResourceSuppressions([
      vpc,
    ], [
      { id: 'AwsSolutions-VPC7', reason: 'For this tmp vpc we do not need flow logs' },
    ], true);


    // Create a SecGroup associated withe the CF dist pList
    const secGroup = new ec2.SecurityGroup(this, 'cf-to-server-sg', {
      vpc,
      description: 'SG for VSCodeServer - only allow CloudFront ingress',
      securityGroupName: 'cloudfront-to-vscode-server',
    });

    const awsManagedPrefixList = new AwsManagedPrefixList(this, 'cf-prefixlistId', {
      name: 'com.amazonaws.global.cloudfront.origin-facing',
    });
    NagSuppressions.addResourceSuppressions([
      awsManagedPrefixList,
    ], [
      { id: 'AwsSolutions-IAM5', reason: 'For this provider wildcards are fine' },
    ], true);

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
              resources: [
                `arn:aws:iam::${Stack.of(this).account}:role/cdk-*`,
              ],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'iam:PassRole',
              ],
              resources: [
                `arn:aws:iam::${Stack.of(this).account}:role/cdk-*`,
              ],
              conditions: {
                StringLike: {
                  'iam:PassedToService': 'cloudformation.amazonaws.com',
                },
              },
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'cloudformation:*',
              ],
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
              actions: [
                's3:*',
              ],
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
              actions: [
                'kms:Decrypt',
              ],
              resources: [
                `arn:aws:kms:*:${Stack.of(this).account}:key/*`,
              ],
            }),
            ...additionalInstanceRolePolicies,
          ],
        }),
      },
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonQDeveloperAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('ReadOnlyAccess'),
      ],
    });
    NagSuppressions.addResourceSuppressions([
      instanceRole,
    ], [
      { id: 'AwsSolutions-IAM4', reason: 'For this tmp role we do not need to restrict managed policies' },
      { id: 'AwsSolutions-IAM5', reason: 'For this tmp role the wildcards are fine' },
    ], true);

    const instance = new ec2.Instance(this, 'server-instance', {
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
    NagSuppressions.addResourceSuppressions([
      instance,
    ], [
      { id: 'AwsSolutions-EC29', reason: 'For this tmp instance we do not need an asg' },
    ], true);

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

    const origin = new cfo.HttpOrigin(instance.instancePublicDnsName, {
      protocolPolicy: cf.OriginProtocolPolicy.HTTP_ONLY,
      originId: `Cloudfront-${Stack.of(this).stackName}-${Stack.of(this).stackName}`,
    });

    const distribution = new cf.Distribution(this, 'cf-distribution', {
      enabled: true,
      httpVersion: cf.HttpVersion.HTTP2_AND_3,
      // NOTE: 'Distributions that use the default CloudFront viewer certificate or use 'vip' for the 'SslSupportMethod'
      // are non-compliant with this rule, as the minimum security policy is set to TLSv1 regardless
      // of the specified 'MinimumProtocolVersion'
      // minimumProtocolVersion: cf.SecurityPolicyProtocol.TLS_V1_2_2021,
      comment: 'Distribution for VSCodeServer',
      priceClass: cf.PriceClass.PRICE_CLASS_ALL,
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
    NagSuppressions.addResourceSuppressions([
      distribution,
    ], [
      { id: 'AwsSolutions-CFR1', reason: 'For this tmp distribution we do not need geo restrictions' },
      { id: 'AwsSolutions-CFR2', reason: 'For this tmp distribution we do not need waf integration' },
      { id: 'AwsSolutions-CFR3', reason: 'For this tmp distribution we do not need access logging enabled' },
      { id: 'AwsSolutions-CFR4', reason: 'For this tmp distribution we do not need limit SSL protocols as we use the default viewer cert' },
      { id: 'AwsSolutions-CFR5', reason: 'For this tmp distribution we do not need limit SSL protocols as we use the default viewer cert' },
    ], true);

    // Use a custom resource lambda to run the SSM document on the instance
    switch (instanceOperatingSystem) {
      case LinuxFlavorType.UBUNTU_22:
      case LinuxFlavorType.UBUNTU_24:
        Installer.ubuntu({
          instanceId: instance.instanceId,
          vsCodeUser: vsCodeUser,
          vsCodePassword: vscodePassword,
          devServerBasePath: props?.devServerBasePath,
          devServerPort: props?.devServerPort,
          homeFolder: homeFolder,
        })._bind(this);
        break;
      case LinuxFlavorType.AMAZON_LINUX_2023:
        Installer.amazonLinux2023({
          instanceId: instance.instanceId,
          vsCodeUser: vsCodeUser,
          vsCodePassword: vscodePassword,
          devServerBasePath: props?.devServerBasePath,
          devServerPort: props?.devServerPort,
          homeFolder: homeFolder,
        })._bind(this);
        break;
      default:
        throw new Error(`Unsupported Linux flavor: ${instanceOperatingSystem}`);
    }
    // so we pass the outer scope of this construct through the installer

    // NOTE: maybe have a healhcheck CFN custom resource to see if the vscode server is healthy
    // atm this is achieved by the integ tests

    // Outputs
    this.domainName = `https://${distribution.domainName}/?folder=${homeFolder}`;
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
