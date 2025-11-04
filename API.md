# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### IdleMonitor <a name="IdleMonitor" id="@mavogel/cdk-vscode-server.IdleMonitor"></a>

Construct that monitors CloudFront request metrics and stops the EC2 instance when idle.

#### Initializers <a name="Initializers" id="@mavogel/cdk-vscode-server.IdleMonitor.Initializer"></a>

```typescript
import { IdleMonitor } from '@mavogel/cdk-vscode-server'

new IdleMonitor(scope: Construct, id: string, props: IdleMonitorProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@mavogel/cdk-vscode-server.IdleMonitor.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#@mavogel/cdk-vscode-server.IdleMonitor.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@mavogel/cdk-vscode-server.IdleMonitor.Initializer.parameter.props">props</a></code> | <code><a href="#@mavogel/cdk-vscode-server.IdleMonitorProps">IdleMonitorProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@mavogel/cdk-vscode-server.IdleMonitor.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="@mavogel/cdk-vscode-server.IdleMonitor.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="@mavogel/cdk-vscode-server.IdleMonitor.Initializer.parameter.props"></a>

- *Type:* <a href="#@mavogel/cdk-vscode-server.IdleMonitorProps">IdleMonitorProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@mavogel/cdk-vscode-server.IdleMonitor.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="@mavogel/cdk-vscode-server.IdleMonitor.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@mavogel/cdk-vscode-server.IdleMonitor.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="@mavogel/cdk-vscode-server.IdleMonitor.isConstruct"></a>

```typescript
import { IdleMonitor } from '@mavogel/cdk-vscode-server'

IdleMonitor.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@mavogel/cdk-vscode-server.IdleMonitor.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@mavogel/cdk-vscode-server.IdleMonitor.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@mavogel/cdk-vscode-server.IdleMonitor.property.function">function</a></code> | <code>aws-cdk-lib.aws_lambda.Function</code> | The Lambda function that performs idle monitoring. |
| <code><a href="#@mavogel/cdk-vscode-server.IdleMonitor.property.scheduleRule">scheduleRule</a></code> | <code>aws-cdk-lib.aws_events.Rule</code> | The EventBridge rule that triggers idle monitoring checks. |

---

##### `node`<sup>Required</sup> <a name="node" id="@mavogel/cdk-vscode-server.IdleMonitor.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `function`<sup>Required</sup> <a name="function" id="@mavogel/cdk-vscode-server.IdleMonitor.property.function"></a>

```typescript
public readonly function: Function;
```

- *Type:* aws-cdk-lib.aws_lambda.Function

The Lambda function that performs idle monitoring.

---

##### `scheduleRule`<sup>Required</sup> <a name="scheduleRule" id="@mavogel/cdk-vscode-server.IdleMonitor.property.scheduleRule"></a>

```typescript
public readonly scheduleRule: Rule;
```

- *Type:* aws-cdk-lib.aws_events.Rule

The EventBridge rule that triggers idle monitoring checks.

---


### VSCodeServer <a name="VSCodeServer" id="@mavogel/cdk-vscode-server.VSCodeServer"></a>

VSCodeServer - spin it up in under 10 minutes.

#### Initializers <a name="Initializers" id="@mavogel/cdk-vscode-server.VSCodeServer.Initializer"></a>

```typescript
import { VSCodeServer } from '@mavogel/cdk-vscode-server'

new VSCodeServer(scope: Construct, id: string, props?: VSCodeServerProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServer.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServer.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServer.Initializer.parameter.props">props</a></code> | <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps">VSCodeServerProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@mavogel/cdk-vscode-server.VSCodeServer.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="@mavogel/cdk-vscode-server.VSCodeServer.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Optional</sup> <a name="props" id="@mavogel/cdk-vscode-server.VSCodeServer.Initializer.parameter.props"></a>

- *Type:* <a href="#@mavogel/cdk-vscode-server.VSCodeServerProps">VSCodeServerProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServer.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="@mavogel/cdk-vscode-server.VSCodeServer.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServer.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="@mavogel/cdk-vscode-server.VSCodeServer.isConstruct"></a>

```typescript
import { VSCodeServer } from '@mavogel/cdk-vscode-server'

VSCodeServer.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@mavogel/cdk-vscode-server.VSCodeServer.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServer.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServer.property.domainName">domainName</a></code> | <code>string</code> | The name of the domain the server is reachable. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServer.property.instance">instance</a></code> | <code>aws-cdk-lib.aws_ec2.IInstance</code> | The EC2 instance running VS Code Server. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServer.property.password">password</a></code> | <code>string</code> | The password to login to the server. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServer.property.idleMonitor">idleMonitor</a></code> | <code><a href="#@mavogel/cdk-vscode-server.IdleMonitor">IdleMonitor</a></code> | The IdleMonitor construct (only present if enableAutoStop is true). |

---

##### `node`<sup>Required</sup> <a name="node" id="@mavogel/cdk-vscode-server.VSCodeServer.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `domainName`<sup>Required</sup> <a name="domainName" id="@mavogel/cdk-vscode-server.VSCodeServer.property.domainName"></a>

```typescript
public readonly domainName: string;
```

- *Type:* string

The name of the domain the server is reachable.

---

##### `instance`<sup>Required</sup> <a name="instance" id="@mavogel/cdk-vscode-server.VSCodeServer.property.instance"></a>

```typescript
public readonly instance: IInstance;
```

- *Type:* aws-cdk-lib.aws_ec2.IInstance

The EC2 instance running VS Code Server.

---

##### `password`<sup>Required</sup> <a name="password" id="@mavogel/cdk-vscode-server.VSCodeServer.property.password"></a>

```typescript
public readonly password: string;
```

- *Type:* string

The password to login to the server.

---

##### `idleMonitor`<sup>Optional</sup> <a name="idleMonitor" id="@mavogel/cdk-vscode-server.VSCodeServer.property.idleMonitor"></a>

```typescript
public readonly idleMonitor: IdleMonitor;
```

- *Type:* <a href="#@mavogel/cdk-vscode-server.IdleMonitor">IdleMonitor</a>

The IdleMonitor construct (only present if enableAutoStop is true).

---


## Structs <a name="Structs" id="Structs"></a>

### CustomInstallStep <a name="CustomInstallStep" id="@mavogel/cdk-vscode-server.CustomInstallStep"></a>

Custom installation step for SSM document Allows users to extend the installer with additional shell commands.

#### Initializer <a name="Initializer" id="@mavogel/cdk-vscode-server.CustomInstallStep.Initializer"></a>

```typescript
import { CustomInstallStep } from '@mavogel/cdk-vscode-server'

const customInstallStep: CustomInstallStep = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@mavogel/cdk-vscode-server.CustomInstallStep.property.commands">commands</a></code> | <code>string[]</code> | Shell commands to run for this step Each command will be executed in sequence. |
| <code><a href="#@mavogel/cdk-vscode-server.CustomInstallStep.property.name">name</a></code> | <code>string</code> | Name of the installation step Must be unique within the SSM document. |

---

##### `commands`<sup>Required</sup> <a name="commands" id="@mavogel/cdk-vscode-server.CustomInstallStep.property.commands"></a>

```typescript
public readonly commands: string[];
```

- *Type:* string[]

Shell commands to run for this step Each command will be executed in sequence.

---

*Example*

```typescript
['#!/bin/bash', 'echo "Installing custom tool"', 'apt-get install -y my-tool']
```


##### `name`<sup>Required</sup> <a name="name" id="@mavogel/cdk-vscode-server.CustomInstallStep.property.name"></a>

```typescript
public readonly name: string;
```

- *Type:* string

Name of the installation step Must be unique within the SSM document.

---

*Example*

```typescript
'InstallCustomTool'
```


### IdleMonitorProps <a name="IdleMonitorProps" id="@mavogel/cdk-vscode-server.IdleMonitorProps"></a>

Props for IdleMonitor construct.

#### Initializer <a name="Initializer" id="@mavogel/cdk-vscode-server.IdleMonitorProps.Initializer"></a>

```typescript
import { IdleMonitorProps } from '@mavogel/cdk-vscode-server'

const idleMonitorProps: IdleMonitorProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@mavogel/cdk-vscode-server.IdleMonitorProps.property.distribution">distribution</a></code> | <code>aws-cdk-lib.aws_cloudfront.IDistribution</code> | The CloudFront distribution to monitor for activity. |
| <code><a href="#@mavogel/cdk-vscode-server.IdleMonitorProps.property.idleTimeoutMinutes">idleTimeoutMinutes</a></code> | <code>number</code> | Number of minutes of inactivity before stopping the instance. |
| <code><a href="#@mavogel/cdk-vscode-server.IdleMonitorProps.property.instance">instance</a></code> | <code>aws-cdk-lib.aws_ec2.IInstance</code> | The EC2 instance to monitor. |
| <code><a href="#@mavogel/cdk-vscode-server.IdleMonitorProps.property.checkIntervalMinutes">checkIntervalMinutes</a></code> | <code>number</code> | How often to check for idle activity (in minutes). |
| <code><a href="#@mavogel/cdk-vscode-server.IdleMonitorProps.property.skipStatusChecks">skipStatusChecks</a></code> | <code>boolean</code> | Skip instance status checks before stopping When true, IdleMonitor will stop idle instances even if status checks haven't passed This is useful for integration tests where status check initialization time exceeds test timeout limits. |

---

##### `distribution`<sup>Required</sup> <a name="distribution" id="@mavogel/cdk-vscode-server.IdleMonitorProps.property.distribution"></a>

```typescript
public readonly distribution: IDistribution;
```

- *Type:* aws-cdk-lib.aws_cloudfront.IDistribution

The CloudFront distribution to monitor for activity.

---

##### `idleTimeoutMinutes`<sup>Required</sup> <a name="idleTimeoutMinutes" id="@mavogel/cdk-vscode-server.IdleMonitorProps.property.idleTimeoutMinutes"></a>

```typescript
public readonly idleTimeoutMinutes: number;
```

- *Type:* number

Number of minutes of inactivity before stopping the instance.

---

##### `instance`<sup>Required</sup> <a name="instance" id="@mavogel/cdk-vscode-server.IdleMonitorProps.property.instance"></a>

```typescript
public readonly instance: IInstance;
```

- *Type:* aws-cdk-lib.aws_ec2.IInstance

The EC2 instance to monitor.

---

##### `checkIntervalMinutes`<sup>Optional</sup> <a name="checkIntervalMinutes" id="@mavogel/cdk-vscode-server.IdleMonitorProps.property.checkIntervalMinutes"></a>

```typescript
public readonly checkIntervalMinutes: number;
```

- *Type:* number
- *Default:* 5 - Check every 5 minutes

How often to check for idle activity (in minutes).

---

##### `skipStatusChecks`<sup>Optional</sup> <a name="skipStatusChecks" id="@mavogel/cdk-vscode-server.IdleMonitorProps.property.skipStatusChecks"></a>

```typescript
public readonly skipStatusChecks: boolean;
```

- *Type:* boolean
- *Default:* false

Skip instance status checks before stopping When true, IdleMonitor will stop idle instances even if status checks haven't passed This is useful for integration tests where status check initialization time exceeds test timeout limits.

WARNING: For testing only - in production, you should wait for status checks
to pass before stopping instances

---

### VSCodeServerProps <a name="VSCodeServerProps" id="@mavogel/cdk-vscode-server.VSCodeServerProps"></a>

Properties for the VSCodeServer construct.

#### Initializer <a name="Initializer" id="@mavogel/cdk-vscode-server.VSCodeServerProps.Initializer"></a>

```typescript
import { VSCodeServerProps } from '@mavogel/cdk-vscode-server'

const vSCodeServerProps: VSCodeServerProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.additionalInstanceRolePolicies">additionalInstanceRolePolicies</a></code> | <code>aws-cdk-lib.aws_iam.PolicyStatement[]</code> | Additional instance role policies. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.additionalTags">additionalTags</a></code> | <code>{[ key: string ]: string}</code> | Additional tags to add to the instance. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.assetZipS3Path">assetZipS3Path</a></code> | <code>string</code> | S3 path to a zip file containing assets to extract into the home folder. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.autoCreateCertificate">autoCreateCertificate</a></code> | <code>boolean</code> | Auto-create ACM certificate with DNS validation in us-east-1 region Requires hostedZoneId to be provided for DNS validation Cannot be used together with certificateArn Certificate will automatically be created in us-east-1 as required by CloudFront. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.branchZipS3Path">branchZipS3Path</a></code> | <code>string</code> | S3 path to a zip file containing git branches to create in the home folder repository. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.certificateArn">certificateArn</a></code> | <code>string</code> | ARN of existing ACM certificate for the domain Certificate must be in us-east-1 region for CloudFront Cannot be used together with autoCreateCertificate. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.customInstallSteps">customInstallSteps</a></code> | <code><a href="#@mavogel/cdk-vscode-server.CustomInstallStep">CustomInstallStep</a>[]</code> | Custom installation steps to extend the SSM document. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.devServerBasePath">devServerBasePath</a></code> | <code>string</code> | Base path for the application to be added to Nginx sites-available list. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.devServerPort">devServerPort</a></code> | <code>number</code> | Port for the DevServer. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.domainName">domainName</a></code> | <code>string</code> | Custom domain name for the VS Code server When provided, creates a CloudFront distribution with this domain name and sets up Route53 A record pointing to the distribution. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.enableAutoStop">enableAutoStop</a></code> | <code>boolean</code> | Enable automatic instance stop when idle Monitors CloudFront metrics and stops the EC2 instance after specified idle time. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.folderZipS3Path">folderZipS3Path</a></code> | <code>string</code> | S3 path to a zip file containing multiple folders to create as separate git repositories. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.homeFolder">homeFolder</a></code> | <code>string</code> | Folder to open in VS Code server. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.hostedZoneId">hostedZoneId</a></code> | <code>string</code> | Route53 hosted zone ID for the domain Required when using autoCreateCertificate If not provided, will attempt to lookup hosted zone from domain name. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.idleCheckIntervalMinutes">idleCheckIntervalMinutes</a></code> | <code>number</code> | How often to check for idle activity (in minutes) Only applies when enableAutoStop is true. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.idleTimeoutMinutes">idleTimeoutMinutes</a></code> | <code>number</code> | Minutes of inactivity before stopping the instance Only applies when enableAutoStop is true. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.instanceClass">instanceClass</a></code> | <code>aws-cdk-lib.aws_ec2.InstanceClass</code> | VSCode Server EC2 instance class. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.instanceCpuArchitecture">instanceCpuArchitecture</a></code> | <code><a href="#@mavogel/cdk-vscode-server.LinuxArchitectureType">LinuxArchitectureType</a></code> | VSCode Server EC2 cpu architecture for the operating system. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.instanceName">instanceName</a></code> | <code>string</code> | VSCode Server EC2 instance name. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.instanceOperatingSystem">instanceOperatingSystem</a></code> | <code><a href="#@mavogel/cdk-vscode-server.LinuxFlavorType">LinuxFlavorType</a></code> | VSCode Server EC2 operating system. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.instanceSize">instanceSize</a></code> | <code>aws-cdk-lib.aws_ec2.InstanceSize</code> | VSCode Server EC2 instance size. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.instanceVolumeSize">instanceVolumeSize</a></code> | <code>number</code> | VSCode Server EC2 instance volume size in GB. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.repoUrl">repoUrl</a></code> | <code>string</code> | Remote git repository URL to clone into the home folder. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.skipStatusChecks">skipStatusChecks</a></code> | <code>boolean</code> | Skip instance status checks in IdleMonitor When true, IdleMonitor will stop idle instances even if status checks haven't passed This is useful for integration tests where status check initialization time exceeds the test timeout limits. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.vscodePassword">vscodePassword</a></code> | <code>string</code> | Password for VSCode Server. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.vscodeUser">vscodeUser</a></code> | <code>string</code> | UserName for VSCode Server. |

---

##### `additionalInstanceRolePolicies`<sup>Optional</sup> <a name="additionalInstanceRolePolicies" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.additionalInstanceRolePolicies"></a>

```typescript
public readonly additionalInstanceRolePolicies: PolicyStatement[];
```

- *Type:* aws-cdk-lib.aws_iam.PolicyStatement[]
- *Default:* []

Additional instance role policies.

---

##### `additionalTags`<sup>Optional</sup> <a name="additionalTags" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.additionalTags"></a>

```typescript
public readonly additionalTags: {[ key: string ]: string};
```

- *Type:* {[ key: string ]: string}
- *Default:* {}

Additional tags to add to the instance.

---

##### `assetZipS3Path`<sup>Optional</sup> <a name="assetZipS3Path" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.assetZipS3Path"></a>

```typescript
public readonly assetZipS3Path: string;
```

- *Type:* string
- *Default:* no assets downloaded

S3 path to a zip file containing assets to extract into the home folder.

The zip contents will be extracted to the user's home folder and committed to git.
Use this to provide workshop materials, sample data, or configuration files.

---

*Example*

```typescript
'my-workshop-bucket/assets/workshop-materials.zip'
```


##### `autoCreateCertificate`<sup>Optional</sup> <a name="autoCreateCertificate" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.autoCreateCertificate"></a>

```typescript
public readonly autoCreateCertificate: boolean;
```

- *Type:* boolean
- *Default:* false

Auto-create ACM certificate with DNS validation in us-east-1 region Requires hostedZoneId to be provided for DNS validation Cannot be used together with certificateArn Certificate will automatically be created in us-east-1 as required by CloudFront.

---

##### `branchZipS3Path`<sup>Optional</sup> <a name="branchZipS3Path" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.branchZipS3Path"></a>

```typescript
public readonly branchZipS3Path: string;
```

- *Type:* string
- *Default:* no branches created

S3 path to a zip file containing git branches to create in the home folder repository.

Each top-level folder in the zip becomes a separate git branch with that folder's contents.
Ideal for creating step-by-step workshop branches (e.g., step-1, step-2, solution).

---

*Example*

```typescript
'my-workshop-bucket/branches/lab-branches.zip' (containing folders: step-1/, step-2/, solution/)
```


##### `certificateArn`<sup>Optional</sup> <a name="certificateArn" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.certificateArn"></a>

```typescript
public readonly certificateArn: string;
```

- *Type:* string
- *Default:* auto-create certificate if autoCreateCertificate is true

ARN of existing ACM certificate for the domain Certificate must be in us-east-1 region for CloudFront Cannot be used together with autoCreateCertificate.

---

##### `customInstallSteps`<sup>Optional</sup> <a name="customInstallSteps" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.customInstallSteps"></a>

```typescript
public readonly customInstallSteps: CustomInstallStep[];
```

- *Type:* <a href="#@mavogel/cdk-vscode-server.CustomInstallStep">CustomInstallStep</a>[]
- *Default:* no custom installation steps

Custom installation steps to extend the SSM document.

Allows you to add additional shell commands that run after the standard installation steps.
Useful for installing workshop-specific tools, configuring custom environments, or running
setup scripts.

Each step will be executed in the order provided, after all standard installation steps complete.

---

*Example*

```typescript
customInstallSteps: [
  {
    name: 'InstallCustomTool',
    commands: [
      '#!/bin/bash',
      'echo "Installing my custom tool"',
      'curl -O https://example.com/tool.sh',
      'bash tool.sh',
    ],
  },
  {
    name: 'ConfigureWorkshopEnv',
    commands: [
      '#!/bin/bash',
      'echo "export MY_VAR=value" >> /home/participant/.bashrc',
    ],
  },
]
```


##### `devServerBasePath`<sup>Optional</sup> <a name="devServerBasePath" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.devServerBasePath"></a>

```typescript
public readonly devServerBasePath: string;
```

- *Type:* string
- *Default:* app

Base path for the application to be added to Nginx sites-available list.

---

##### `devServerPort`<sup>Optional</sup> <a name="devServerPort" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.devServerPort"></a>

```typescript
public readonly devServerPort: number;
```

- *Type:* number
- *Default:* 8081

Port for the DevServer.

---

##### `domainName`<sup>Optional</sup> <a name="domainName" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.domainName"></a>

```typescript
public readonly domainName: string;
```

- *Type:* string
- *Default:* uses CloudFront default domain

Custom domain name for the VS Code server When provided, creates a CloudFront distribution with this domain name and sets up Route53 A record pointing to the distribution.

---

##### `enableAutoStop`<sup>Optional</sup> <a name="enableAutoStop" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.enableAutoStop"></a>

```typescript
public readonly enableAutoStop: boolean;
```

- *Type:* boolean
- *Default:* false

Enable automatic instance stop when idle Monitors CloudFront metrics and stops the EC2 instance after specified idle time.

---

##### `folderZipS3Path`<sup>Optional</sup> <a name="folderZipS3Path" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.folderZipS3Path"></a>

```typescript
public readonly folderZipS3Path: string;
```

- *Type:* string
- *Default:* no folders created

S3 path to a zip file containing multiple folders to create as separate git repositories.

Each top-level folder in the zip becomes a separate subfolder in the parent directory,
initialized as its own git repository. Useful for multi-project workshops.

---

*Example*

```typescript
'my-workshop-bucket/folders/workshop-projects.zip' (containing folders: frontend/, backend/, infrastructure/)
```


##### `homeFolder`<sup>Optional</sup> <a name="homeFolder" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.homeFolder"></a>

```typescript
public readonly homeFolder: string;
```

- *Type:* string
- *Default:* /Workshop

Folder to open in VS Code server.

---

##### `hostedZoneId`<sup>Optional</sup> <a name="hostedZoneId" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.hostedZoneId"></a>

```typescript
public readonly hostedZoneId: string;
```

- *Type:* string
- *Default:* auto-discover from domain name

Route53 hosted zone ID for the domain Required when using autoCreateCertificate If not provided, will attempt to lookup hosted zone from domain name.

---

##### `idleCheckIntervalMinutes`<sup>Optional</sup> <a name="idleCheckIntervalMinutes" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.idleCheckIntervalMinutes"></a>

```typescript
public readonly idleCheckIntervalMinutes: number;
```

- *Type:* number
- *Default:* 5 - Check every 5 minutes

How often to check for idle activity (in minutes) Only applies when enableAutoStop is true.

---

##### `idleTimeoutMinutes`<sup>Optional</sup> <a name="idleTimeoutMinutes" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.idleTimeoutMinutes"></a>

```typescript
public readonly idleTimeoutMinutes: number;
```

- *Type:* number
- *Default:* 30

Minutes of inactivity before stopping the instance Only applies when enableAutoStop is true.

---

##### `instanceClass`<sup>Optional</sup> <a name="instanceClass" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.instanceClass"></a>

```typescript
public readonly instanceClass: InstanceClass;
```

- *Type:* aws-cdk-lib.aws_ec2.InstanceClass
- *Default:* m7g

VSCode Server EC2 instance class.

---

##### `instanceCpuArchitecture`<sup>Optional</sup> <a name="instanceCpuArchitecture" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.instanceCpuArchitecture"></a>

```typescript
public readonly instanceCpuArchitecture: LinuxArchitectureType;
```

- *Type:* <a href="#@mavogel/cdk-vscode-server.LinuxArchitectureType">LinuxArchitectureType</a>
- *Default:* arm

VSCode Server EC2 cpu architecture for the operating system.

---

##### `instanceName`<sup>Optional</sup> <a name="instanceName" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.instanceName"></a>

```typescript
public readonly instanceName: string;
```

- *Type:* string
- *Default:* VSCodeServer

VSCode Server EC2 instance name.

---

##### `instanceOperatingSystem`<sup>Optional</sup> <a name="instanceOperatingSystem" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.instanceOperatingSystem"></a>

```typescript
public readonly instanceOperatingSystem: LinuxFlavorType;
```

- *Type:* <a href="#@mavogel/cdk-vscode-server.LinuxFlavorType">LinuxFlavorType</a>
- *Default:* Ubuntu-24

VSCode Server EC2 operating system.

---

##### `instanceSize`<sup>Optional</sup> <a name="instanceSize" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.instanceSize"></a>

```typescript
public readonly instanceSize: InstanceSize;
```

- *Type:* aws-cdk-lib.aws_ec2.InstanceSize
- *Default:* xlarge

VSCode Server EC2 instance size.

---

##### `instanceVolumeSize`<sup>Optional</sup> <a name="instanceVolumeSize" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.instanceVolumeSize"></a>

```typescript
public readonly instanceVolumeSize: number;
```

- *Type:* number
- *Default:* 40

VSCode Server EC2 instance volume size in GB.

---

##### `repoUrl`<sup>Optional</sup> <a name="repoUrl" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.repoUrl"></a>

```typescript
public readonly repoUrl: string;
```

- *Type:* string
- *Default:* no repo cloned

Remote git repository URL to clone into the home folder.

If provided, the repository will be cloned into the user's home folder during instance setup.
Useful for pre-populating workshop environments with starter code.

---

*Example*

```typescript
'https://github.com/aws-samples/my-workshop-repo.git'
```


##### `skipStatusChecks`<sup>Optional</sup> <a name="skipStatusChecks" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.skipStatusChecks"></a>

```typescript
public readonly skipStatusChecks: boolean;
```

- *Type:* boolean
- *Default:* false

Skip instance status checks in IdleMonitor When true, IdleMonitor will stop idle instances even if status checks haven't passed This is useful for integration tests where status check initialization time exceeds the test timeout limits.

WARNING: For testing only - in production, you should wait for status checks
to pass before stopping instances to avoid stopping unhealthy instances

---

##### `vscodePassword`<sup>Optional</sup> <a name="vscodePassword" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.vscodePassword"></a>

```typescript
public readonly vscodePassword: string;
```

- *Type:* string
- *Default:* empty and will then be generated

Password for VSCode Server.

---

##### `vscodeUser`<sup>Optional</sup> <a name="vscodeUser" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.vscodeUser"></a>

```typescript
public readonly vscodeUser: string;
```

- *Type:* string
- *Default:* participant

UserName for VSCode Server.

---



## Enums <a name="Enums" id="Enums"></a>

### LinuxArchitectureType <a name="LinuxArchitectureType" id="@mavogel/cdk-vscode-server.LinuxArchitectureType"></a>

The architecture of the cpu you want to run vscode server on.

#### Members <a name="Members" id="Members"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@mavogel/cdk-vscode-server.LinuxArchitectureType.ARM">ARM</a></code> | ARM architecture. |
| <code><a href="#@mavogel/cdk-vscode-server.LinuxArchitectureType.AMD64">AMD64</a></code> | AMD64 architecture. |

---

##### `ARM` <a name="ARM" id="@mavogel/cdk-vscode-server.LinuxArchitectureType.ARM"></a>

ARM architecture.

---


##### `AMD64` <a name="AMD64" id="@mavogel/cdk-vscode-server.LinuxArchitectureType.AMD64"></a>

AMD64 architecture.

---


### LinuxFlavorType <a name="LinuxFlavorType" id="@mavogel/cdk-vscode-server.LinuxFlavorType"></a>

The flavor of linux you want to run vscode server on.

#### Members <a name="Members" id="Members"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@mavogel/cdk-vscode-server.LinuxFlavorType.UBUNTU_22">UBUNTU_22</a></code> | Ubuntu 22. |
| <code><a href="#@mavogel/cdk-vscode-server.LinuxFlavorType.UBUNTU_24">UBUNTU_24</a></code> | Ubuntu 24. |
| <code><a href="#@mavogel/cdk-vscode-server.LinuxFlavorType.UBUNTU_25">UBUNTU_25</a></code> | Ubuntu 25. |
| <code><a href="#@mavogel/cdk-vscode-server.LinuxFlavorType.AMAZON_LINUX_2023">AMAZON_LINUX_2023</a></code> | Amazon Linux 2023. |

---

##### `UBUNTU_22` <a name="UBUNTU_22" id="@mavogel/cdk-vscode-server.LinuxFlavorType.UBUNTU_22"></a>

Ubuntu 22.

---


##### `UBUNTU_24` <a name="UBUNTU_24" id="@mavogel/cdk-vscode-server.LinuxFlavorType.UBUNTU_24"></a>

Ubuntu 24.

---


##### `UBUNTU_25` <a name="UBUNTU_25" id="@mavogel/cdk-vscode-server.LinuxFlavorType.UBUNTU_25"></a>

Ubuntu 25.

---


##### `AMAZON_LINUX_2023` <a name="AMAZON_LINUX_2023" id="@mavogel/cdk-vscode-server.LinuxFlavorType.AMAZON_LINUX_2023"></a>

Amazon Linux 2023.

---

