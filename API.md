# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

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
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServer.property.password">password</a></code> | <code>string</code> | The password to login to the server. |

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

##### `password`<sup>Required</sup> <a name="password" id="@mavogel/cdk-vscode-server.VSCodeServer.property.password"></a>

```typescript
public readonly password: string;
```

- *Type:* string

The password to login to the server.

---


## Structs <a name="Structs" id="Structs"></a>

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
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.autoCreateCertificate">autoCreateCertificate</a></code> | <code>boolean</code> | Auto-create ACM certificate with DNS validation in us-east-1 region Requires hostedZoneId to be provided for DNS validation Cannot be used together with certificateArn Certificate will automatically be created in us-east-1 as required by CloudFront. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.certificateArn">certificateArn</a></code> | <code>string</code> | ARN of existing ACM certificate for the domain Certificate must be in us-east-1 region for CloudFront Cannot be used together with autoCreateCertificate. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.devServerBasePath">devServerBasePath</a></code> | <code>string</code> | Base path for the application to be added to Nginx sites-available list. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.devServerPort">devServerPort</a></code> | <code>number</code> | Port for the DevServer. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.domainName">domainName</a></code> | <code>string</code> | Custom domain name for the VS Code server When provided, creates a CloudFront distribution with this domain name and sets up Route53 A record pointing to the distribution. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.homeFolder">homeFolder</a></code> | <code>string</code> | Folder to open in VS Code server. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.hostedZoneId">hostedZoneId</a></code> | <code>string</code> | Route53 hosted zone ID for the domain Required when using autoCreateCertificate If not provided, will attempt to lookup hosted zone from domain name. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.instanceClass">instanceClass</a></code> | <code>aws-cdk-lib.aws_ec2.InstanceClass</code> | VSCode Server EC2 instance class. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.instanceCpuArchitecture">instanceCpuArchitecture</a></code> | <code><a href="#@mavogel/cdk-vscode-server.LinuxArchitectureType">LinuxArchitectureType</a></code> | VSCode Server EC2 cpu architecture for the operating system. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.instanceName">instanceName</a></code> | <code>string</code> | VSCode Server EC2 instance name. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.instanceOperatingSystem">instanceOperatingSystem</a></code> | <code><a href="#@mavogel/cdk-vscode-server.LinuxFlavorType">LinuxFlavorType</a></code> | VSCode Server EC2 operating system. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.instanceSize">instanceSize</a></code> | <code>aws-cdk-lib.aws_ec2.InstanceSize</code> | VSCode Server EC2 instance size. |
| <code><a href="#@mavogel/cdk-vscode-server.VSCodeServerProps.property.instanceVolumeSize">instanceVolumeSize</a></code> | <code>number</code> | VSCode Server EC2 instance volume size in GB. |
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

##### `autoCreateCertificate`<sup>Optional</sup> <a name="autoCreateCertificate" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.autoCreateCertificate"></a>

```typescript
public readonly autoCreateCertificate: boolean;
```

- *Type:* boolean
- *Default:* false

Auto-create ACM certificate with DNS validation in us-east-1 region Requires hostedZoneId to be provided for DNS validation Cannot be used together with certificateArn Certificate will automatically be created in us-east-1 as required by CloudFront.

---

##### `certificateArn`<sup>Optional</sup> <a name="certificateArn" id="@mavogel/cdk-vscode-server.VSCodeServerProps.property.certificateArn"></a>

```typescript
public readonly certificateArn: string;
```

- *Type:* string
- *Default:* auto-create certificate if autoCreateCertificate is true

ARN of existing ACM certificate for the domain Certificate must be in us-east-1 region for CloudFront Cannot be used together with autoCreateCertificate.

---

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
- *Default:* Ubuntu-22

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
| <code><a href="#@mavogel/cdk-vscode-server.LinuxFlavorType.AMAZON_LINUX_2023">AMAZON_LINUX_2023</a></code> | Amazon Linux 2023. |

---

##### `UBUNTU_22` <a name="UBUNTU_22" id="@mavogel/cdk-vscode-server.LinuxFlavorType.UBUNTU_22"></a>

Ubuntu 22.

---


##### `UBUNTU_24` <a name="UBUNTU_24" id="@mavogel/cdk-vscode-server.LinuxFlavorType.UBUNTU_24"></a>

Ubuntu 24.

---


##### `AMAZON_LINUX_2023` <a name="AMAZON_LINUX_2023" id="@mavogel/cdk-vscode-server.LinuxFlavorType.AMAZON_LINUX_2023"></a>

Amazon Linux 2023.

---

