# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### VSCodeServer <a name="VSCodeServer" id="cdk-vscode-server.VSCodeServer"></a>

#### Initializers <a name="Initializers" id="cdk-vscode-server.VSCodeServer.Initializer"></a>

```typescript
import { VSCodeServer } from 'cdk-vscode-server'

new VSCodeServer(scope: Construct, id: string, props?: VSCodeServerProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-vscode-server.VSCodeServer.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#cdk-vscode-server.VSCodeServer.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#cdk-vscode-server.VSCodeServer.Initializer.parameter.props">props</a></code> | <code><a href="#cdk-vscode-server.VSCodeServerProps">VSCodeServerProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="cdk-vscode-server.VSCodeServer.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="cdk-vscode-server.VSCodeServer.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Optional</sup> <a name="props" id="cdk-vscode-server.VSCodeServer.Initializer.parameter.props"></a>

- *Type:* <a href="#cdk-vscode-server.VSCodeServerProps">VSCodeServerProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#cdk-vscode-server.VSCodeServer.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="cdk-vscode-server.VSCodeServer.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#cdk-vscode-server.VSCodeServer.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### ~~`isConstruct`~~ <a name="isConstruct" id="cdk-vscode-server.VSCodeServer.isConstruct"></a>

```typescript
import { VSCodeServer } from 'cdk-vscode-server'

VSCodeServer.isConstruct(x: any)
```

Checks if `x` is a construct.

###### `x`<sup>Required</sup> <a name="x" id="cdk-vscode-server.VSCodeServer.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-vscode-server.VSCodeServer.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#cdk-vscode-server.VSCodeServer.property.domainName">domainName</a></code> | <code>string</code> | *No description.* |
| <code><a href="#cdk-vscode-server.VSCodeServer.property.password">password</a></code> | <code>string</code> | *No description.* |

---

##### `node`<sup>Required</sup> <a name="node" id="cdk-vscode-server.VSCodeServer.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `domainName`<sup>Required</sup> <a name="domainName" id="cdk-vscode-server.VSCodeServer.property.domainName"></a>

```typescript
public readonly domainName: string;
```

- *Type:* string

---

##### `password`<sup>Required</sup> <a name="password" id="cdk-vscode-server.VSCodeServer.property.password"></a>

```typescript
public readonly password: string;
```

- *Type:* string

---


## Structs <a name="Structs" id="Structs"></a>

### VSCodeServerProps <a name="VSCodeServerProps" id="cdk-vscode-server.VSCodeServerProps"></a>

#### Initializer <a name="Initializer" id="cdk-vscode-server.VSCodeServerProps.Initializer"></a>

```typescript
import { VSCodeServerProps } from 'cdk-vscode-server'

const vSCodeServerProps: VSCodeServerProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#cdk-vscode-server.VSCodeServerProps.property.additionalInstanceRolePolicies">additionalInstanceRolePolicies</a></code> | <code>aws-cdk-lib.aws_iam.PolicyStatement[]</code> | Additional instance role policies. |
| <code><a href="#cdk-vscode-server.VSCodeServerProps.property.devServerBasePath">devServerBasePath</a></code> | <code>string</code> | Base path for the application to be added to Nginx sites-available list. |
| <code><a href="#cdk-vscode-server.VSCodeServerProps.property.devServerPort">devServerPort</a></code> | <code>number</code> | Port for the DevServer. |
| <code><a href="#cdk-vscode-server.VSCodeServerProps.property.homeFolder">homeFolder</a></code> | <code>string</code> | Folder to open in VS Code server. |
| <code><a href="#cdk-vscode-server.VSCodeServerProps.property.instanceClass">instanceClass</a></code> | <code>aws-cdk-lib.aws_ec2.InstanceClass</code> | VSCode Server EC2 instance class. |
| <code><a href="#cdk-vscode-server.VSCodeServerProps.property.instanceCpuArchitecture">instanceCpuArchitecture</a></code> | <code><a href="#cdk-vscode-server.LinuxArchitectureType">LinuxArchitectureType</a></code> | VSCode Server EC2 cpu architecture for the operating system. |
| <code><a href="#cdk-vscode-server.VSCodeServerProps.property.instanceName">instanceName</a></code> | <code>string</code> | VSCode Server EC2 instance name. |
| <code><a href="#cdk-vscode-server.VSCodeServerProps.property.instanceOperatingSystem">instanceOperatingSystem</a></code> | <code><a href="#cdk-vscode-server.LinuxFlavorType">LinuxFlavorType</a></code> | VSCode Server EC2 operating system. |
| <code><a href="#cdk-vscode-server.VSCodeServerProps.property.instanceSize">instanceSize</a></code> | <code>aws-cdk-lib.aws_ec2.InstanceSize</code> | VSCode Server EC2 instance size. |
| <code><a href="#cdk-vscode-server.VSCodeServerProps.property.instanceVolumeSize">instanceVolumeSize</a></code> | <code>number</code> | VSCode Server EC2 instance volume size in GB. |
| <code><a href="#cdk-vscode-server.VSCodeServerProps.property.vscodePassword">vscodePassword</a></code> | <code>string</code> | Password for VSCode Server. |
| <code><a href="#cdk-vscode-server.VSCodeServerProps.property.vscodeUser">vscodeUser</a></code> | <code>string</code> | UserName for VSCode Server. |

---

##### `additionalInstanceRolePolicies`<sup>Optional</sup> <a name="additionalInstanceRolePolicies" id="cdk-vscode-server.VSCodeServerProps.property.additionalInstanceRolePolicies"></a>

```typescript
public readonly additionalInstanceRolePolicies: PolicyStatement[];
```

- *Type:* aws-cdk-lib.aws_iam.PolicyStatement[]
- *Default:* []

Additional instance role policies.

---

##### `devServerBasePath`<sup>Optional</sup> <a name="devServerBasePath" id="cdk-vscode-server.VSCodeServerProps.property.devServerBasePath"></a>

```typescript
public readonly devServerBasePath: string;
```

- *Type:* string
- *Default:* app

Base path for the application to be added to Nginx sites-available list.

---

##### `devServerPort`<sup>Optional</sup> <a name="devServerPort" id="cdk-vscode-server.VSCodeServerProps.property.devServerPort"></a>

```typescript
public readonly devServerPort: number;
```

- *Type:* number
- *Default:* 8081

Port for the DevServer.

---

##### `homeFolder`<sup>Optional</sup> <a name="homeFolder" id="cdk-vscode-server.VSCodeServerProps.property.homeFolder"></a>

```typescript
public readonly homeFolder: string;
```

- *Type:* string
- *Default:* /Workshop

Folder to open in VS Code server.

---

##### `instanceClass`<sup>Optional</sup> <a name="instanceClass" id="cdk-vscode-server.VSCodeServerProps.property.instanceClass"></a>

```typescript
public readonly instanceClass: InstanceClass;
```

- *Type:* aws-cdk-lib.aws_ec2.InstanceClass
- *Default:* m7g

VSCode Server EC2 instance class.

---

##### `instanceCpuArchitecture`<sup>Optional</sup> <a name="instanceCpuArchitecture" id="cdk-vscode-server.VSCodeServerProps.property.instanceCpuArchitecture"></a>

```typescript
public readonly instanceCpuArchitecture: LinuxArchitectureType;
```

- *Type:* <a href="#cdk-vscode-server.LinuxArchitectureType">LinuxArchitectureType</a>
- *Default:* arm

VSCode Server EC2 cpu architecture for the operating system.

---

##### `instanceName`<sup>Optional</sup> <a name="instanceName" id="cdk-vscode-server.VSCodeServerProps.property.instanceName"></a>

```typescript
public readonly instanceName: string;
```

- *Type:* string
- *Default:* VSCodeServer

VSCode Server EC2 instance name.

---

##### `instanceOperatingSystem`<sup>Optional</sup> <a name="instanceOperatingSystem" id="cdk-vscode-server.VSCodeServerProps.property.instanceOperatingSystem"></a>

```typescript
public readonly instanceOperatingSystem: LinuxFlavorType;
```

- *Type:* <a href="#cdk-vscode-server.LinuxFlavorType">LinuxFlavorType</a>
- *Default:* Ubuntu-22

VSCode Server EC2 operating system.

---

##### `instanceSize`<sup>Optional</sup> <a name="instanceSize" id="cdk-vscode-server.VSCodeServerProps.property.instanceSize"></a>

```typescript
public readonly instanceSize: InstanceSize;
```

- *Type:* aws-cdk-lib.aws_ec2.InstanceSize
- *Default:* xlarge

VSCode Server EC2 instance size.

---

##### `instanceVolumeSize`<sup>Optional</sup> <a name="instanceVolumeSize" id="cdk-vscode-server.VSCodeServerProps.property.instanceVolumeSize"></a>

```typescript
public readonly instanceVolumeSize: number;
```

- *Type:* number
- *Default:* 40

VSCode Server EC2 instance volume size in GB.

---

##### `vscodePassword`<sup>Optional</sup> <a name="vscodePassword" id="cdk-vscode-server.VSCodeServerProps.property.vscodePassword"></a>

```typescript
public readonly vscodePassword: string;
```

- *Type:* string
- *Default:* empty and will then be generated

Password for VSCode Server.

---

##### `vscodeUser`<sup>Optional</sup> <a name="vscodeUser" id="cdk-vscode-server.VSCodeServerProps.property.vscodeUser"></a>

```typescript
public readonly vscodeUser: string;
```

- *Type:* string
- *Default:* participant

UserName for VSCode Server.

---



## Enums <a name="Enums" id="Enums"></a>

### LinuxArchitectureType <a name="LinuxArchitectureType" id="cdk-vscode-server.LinuxArchitectureType"></a>

The architecture of the cpu you want to run vscode server on.

#### Members <a name="Members" id="Members"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#cdk-vscode-server.LinuxArchitectureType.ARM">ARM</a></code> | *No description.* |
| <code><a href="#cdk-vscode-server.LinuxArchitectureType.AMD64">AMD64</a></code> | *No description.* |

---

##### `ARM` <a name="ARM" id="cdk-vscode-server.LinuxArchitectureType.ARM"></a>

---


##### `AMD64` <a name="AMD64" id="cdk-vscode-server.LinuxArchitectureType.AMD64"></a>

---


### LinuxFlavorType <a name="LinuxFlavorType" id="cdk-vscode-server.LinuxFlavorType"></a>

The flavor of linux you want to run vscode server on.

#### Members <a name="Members" id="Members"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#cdk-vscode-server.LinuxFlavorType.UBUNTU_22">UBUNTU_22</a></code> | *No description.* |
| <code><a href="#cdk-vscode-server.LinuxFlavorType.UBUNTU_24">UBUNTU_24</a></code> | *No description.* |
| <code><a href="#cdk-vscode-server.LinuxFlavorType.AMAZON_LINUX_2023">AMAZON_LINUX_2023</a></code> | *No description.* |

---

##### `UBUNTU_22` <a name="UBUNTU_22" id="cdk-vscode-server.LinuxFlavorType.UBUNTU_22"></a>

---


##### `UBUNTU_24` <a name="UBUNTU_24" id="cdk-vscode-server.LinuxFlavorType.UBUNTU_24"></a>

---


##### `AMAZON_LINUX_2023` <a name="AMAZON_LINUX_2023" id="cdk-vscode-server.LinuxFlavorType.AMAZON_LINUX_2023"></a>

---

