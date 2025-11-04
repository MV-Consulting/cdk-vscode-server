![Source](https://img.shields.io/github/stars/MV-Consulting/cdk-vscode-server?logo=github&label=GitHub%20Stars)
[![Build Status](https://github.com/MV-Consulting/cdk-vscode-server/actions/workflows/build.yml/badge.svg)](https://github.com/MV-Consulting/cdk-vscode-server/actions/workflows/build.yml)
[![ESLint Code Formatting](https://img.shields.io/badge/code_style-eslint-brightgreen.svg)](https://eslint.org)
[![Latest release](https://img.shields.io/github/release/MV-Consulting/cdk-vscode-server.svg)](https://github.com/MV-Consulting/cdk-vscode-server/releases)
![GitHub](https://img.shields.io/github/license/MV-Consulting/cdk-vscode-server)
[![npm](https://img.shields.io/npm/dt/@mavogel/cdk-vscode-server?label=npm&color=orange)](https://www.npmjs.com/package/@mavogel/cdk-vscode-server)
[![typescript](https://img.shields.io/badge/jsii-typescript-blueviolet.svg)](https://www.npmjs.com/package/@mavogel/cdk-vscode-server)

# cdk-vscode-server

Running your dev IDE vscode on AWS for development and workshop purposes.

> [!Note]
> This construct is designed for workshop purposes and does not fulfill all security and authentication best practices.

![EXPERIMENTAL](https://img.shields.io/badge/stability-experimantal-orange?style=for-the-badge)**<br>This is an early version of the package. The API will change while I
we implement new features. Therefore make sure you use an exact version in your `package.json` before it reaches 1.0.0.**

## Table of Contents

- [Features](#features)
- [Usage](#usage)
  - [Standard](#Standard)
  - [Pre-populate with Git Repository](#pre-populate-with-git-repository)
  - [Custom Domain Configuration](#custom-domain-configuration)
  - [Auto-Stop Configuration](#auto-stop-configuration)
- [Solution Design](#solution-design)
- [Inspiration](#inspiration)

## Features

- ⚡ **Quick Setup**: Spin up and configure your [vscode](https://code.visualstudio.com/) server in under 10 minutes in your AWS account
- 📏 **Best Practice Setup**: Set up with [projen](https://projen.io/) and a [single configuration file](./.projenrc.ts) to keep your changes centralized.
- 🤹‍♂️ **Pre-installed packages**: Besides the [vscode](https://code.visualstudio.com/) server, other tools and software packages such as `git`, `docker`, `awscli` `nodejs` and `python` are pre-installed on the EC2 instance.
- 🌐 **Custom Domain Support**: Use your own domain name with automatic ACM certificate creation and Route53 DNS configuration, or bring your existing certificate.
- 💰 **Auto-Stop**: Automatically stop EC2 instances after inactivity with Elastic IP retention - save up to 75% on costs for development environments.
- 🏗️ **Extensibility**: Pass in properties to the construct, which start with `additional*`. They allow you to extend the configuration to your needs. There are more to come...

## Usage
Actually we supported 2 modes:

### Standard
The following steps get you started:

1. Create a new `awscdk-app` via
```bash
npx projen new awscdk-app-ts --package-manager=npm
```
3. Add `@mavogel/cdk-vscode-server` as a dependency to your project in the `.projenrc.ts` file
4. Run `npx projen` to install it
5. Add the following to the `src/main.ts` file:
```ts
import { App, Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { 
  LinuxArchitectureType, 
  LinuxFlavorType, 
  VSCodeServer
} from '@mavogel/cdk-vscode-server';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    new VSCodeServer(this, 'vscode', {
      // for example (or simply use the defaults by not setting the properties)
      instanceVolumeSize: 8,
      instanceClass: ec2.InstanceClass.M7G,
      instanceSize: ec2.InstanceSize.LARGE,
      instanceOperatingSystem: LinuxFlavorType.UBUNTU_24,
      instanceCpuArchitecture: LinuxArchitectureType.ARM,
      
      // 👇🏽 or if you want to give the InstanceRole more permissions
      additionalInstanceRolePolicies: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'codebuild:*',
          ],
          resources: [
            `arn:aws:codebuild:*:${Stack.of(this).account}:*/*`,
          ],
        }),
      ]
      
      // and more... 💡
    });
  }
}

const env = {
  account: '123456789912',
  region: 'eu-central-1',
};

const app = new App();
new MyStack(app, 'vscode-server', { env });
app.synth();
```

and deploy it
```bash
npx projen build
npx projen deploy
```

with the output
```console
✨  Deployment time: 509.87s

Outputs:
dev.vscodedomainName6729AA39 = https://d1foo65bar4baz.cloudfront.net/?folder=/Workshop
dev.vscodepassword64FBCA12 = foobarbaz
```

See the [examples](./examples) folder for more inspiration.

### Pre-populate with Git Repository

Clone a git repository into the VS Code Server's home folder during instance setup - perfect for workshops or development environments with starter code:

```ts
new VSCodeServer(this, 'vscode', {
  // Clone a git repository into the home folder
  repoUrl: 'https://github.com/aws-samples/my-workshop-repo.git',

  // Optional: customize the home folder path (default: /Workshop)
  homeFolder: '/MyWorkshop',

  // Optional: specify VS Code user (default: vscode-user)
  vscodeUser: 'workshop-user',
});
```

**What happens:**
1. During instance setup, the specified git repository is cloned into the user's home folder
2. VS Code Server opens with the repository already loaded and ready to use
3. Participants can start coding immediately without manual git clone steps

**Use cases:**
- Workshop environments with pre-configured starter code
- Development environments with boilerplate projects
- Training sessions with example applications
- Code review sessions with pre-loaded repositories

**Repository requirements:**
- Must be publicly accessible (no authentication required)
- HTTPS URLs only (SSH git URLs are not supported)
- Repository will be cloned using `git clone` during instance initialization

For complete examples, see [examples/](./examples).

### Custom Domain Configuration

You can configure your VS Code Server with a custom domain name instead of using the default CloudFront domain. The construct supports three different configuration options:

#### Option 1: Auto-create Certificate with DNS Validation
```ts
new VSCodeServer(this, 'vscode', {
  domainName: 'vscode.example.com',
  hostedZoneId: 'Z123EXAMPLE456',  // optional - will auto-discover if not provided
  autoCreateCertificate: true,
});
```

This will:
- Create an ACM certificate in us-east-1 (required for CloudFront)
- Validate the certificate using DNS validation
- Create a Route53 A record pointing to the CloudFront distribution
- Configure the CloudFront distribution with the custom domain

#### Option 2: Use Existing Certificate
```ts
new VSCodeServer(this, 'vscode', {
  domainName: 'vscode.example.com',
  hostedZoneId: 'Z123EXAMPLE456',
  certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012',
});
```

**Requirements:**
- Certificate must be in us-east-1 region
- Certificate must be validated and ready to use
- Certificate must include the domain name

#### Option 3: Default (No Custom Domain)
```ts
new VSCodeServer(this, 'vscode', {
  // No domain configuration - uses CloudFront default domain
});
```

For complete examples, see [examples/custom-domain/main.ts](./examples/custom-domain/main.ts).

6. Then open the domain name in your favorite browser and you'd see the following login screen:
![vscode-server-ui-login](docs/img/vscode-server-ui-login-min.png)

7. After entering the password, you are logged into VSCode and can start coding :tada:

![vscode-server-ui](docs/img/vscode-server-ui-min.png)

> [!Important]
> There are issues with copy pasting into the VSCode terminal within the Firefox browser (2025-01-12)

### Auto-Stop Configuration

Save up to 75% on costs by automatically stopping EC2 instances when idle:

```ts
new VSCodeServer(this, 'vscode', {
  enableAutoStop: true,              // Enable auto-stop feature
  idleTimeoutMinutes: 30,            // Stop after 30 minutes of no activity (default)
  idleCheckIntervalMinutes: 5,       // Check for idle activity every 5 minutes (default)
});
```

**How it works:**
1. **Idle Detection**: Monitors CloudFront request metrics at configured intervals (default: every 5 minutes)
2. **Auto-Stop**: Stops the EC2 instance after the configured idle timeout when no requests are detected
3. **Static IP**: Allocates an Elastic IP to maintain a consistent public IP address across stop/start cycles
4. **Manual Resume**: Users can manually start the instance via AWS Console or CLI when needed

**Cost Savings Example:**
- **Without auto-stop**: m7g.xlarge running 24/7 = ~$120/month
- **With auto-stop** (8 hours/day, 5 days/week): ~$30/month
- **Savings**: ~$90/month (75% reduction)

**Additional costs:**
- Elastic IP (allocated): ~$3.65/month
- Lambda function (IdleMonitor): ~$0.10/month
- EventBridge rule: Negligible
- **Net savings**: ~$86/month per instance

**Architecture Components:**
- Elastic IP for consistent public addressing
- EventBridge rule triggering idle monitoring at configured intervals
- IdleMonitor Lambda function checking CloudWatch metrics for request activity
- IdleMonitorEnabler custom resource ensuring monitoring only starts after installation completes
- CloudWatch metrics from CloudFront distribution

**Integration Testing:**

The stop-on-idle functionality includes comprehensive integration tests (`integ-tests/integ.stop-on-idle.ts`) that verify the complete workflow:

1. **Phase 1 - Verify Auto-Stop**: Waits for the instance to automatically stop after the configured idle timeout
2. **Phase 2 - Disable IdleMonitor**: Disables the EventBridge rule to prevent the instance from being stopped again during testing
3. **Phase 3 - Start Instance**: Starts the stopped instance and waits for it to reach the running state
4. **Phase 4 - Verify Login**: Confirms that VS Code Server is accessible through CloudFront after the instance has been restarted

This 4-phase test ensures that:
- Idle detection works correctly based on CloudWatch metrics
- Instance stops automatically when no activity is detected
- Instance can be successfully restarted after being stopped
- VS Code Server remains accessible after stop/start cycles
- Elastic IP maintains connectivity across state changes

Run integration tests with:
```bash
npm run integ-test
```

## Solution Design

<details>
  <summary>... if you're curious about click here for the details</summary>

![vscode-server-solution-design](docs/img/vscode-server.drawio-min.png)

</details>

## Inspiration
This project was created based on the following inspiration

- [vscode-on-ec2-for-prototyping](https://github.com/aws-samples/vscode-on-ec2-for-prototyping): as baseline, which unfortunately was outdated
- [aws-terraform-dev-container](https://github.com/awslabs/aws-terraform-dev-container): as baseline for terraform, but unfortunately also outdated
- [java-on-aws-workshop-ide-only.yaml](https://github.com/aws-samples/java-on-aws/blob/main/labs/unicorn-store/infrastructure/cfn/java-on-aws-workshop-ide-only.yaml): an already synthesized cloudformation stack, which used mostly python as the custom resources
- [fleet-workshop-team-stack-self.json](https://static.us-east-1.prod.workshops.aws/public/cc4aa67e-5b7a-4df1-abf7-c42502899a25/assets/fleet-workshop-team-stack-self.json): also an already synthesized cloudformation stack, which did much more as I currently implemented here. 
- [eks-workshop-vscode-cfn.yaml](https://github.com/aws-samples/eks-workshop-v2/blob/main/lab/cfn/eks-workshop-vscode-cfn.yaml): another great baseline


## 🚀 Unlock the Full Potential of Your AWS Cloud Infrastructure  

Hi, I’m Manuel, an AWS expert passionate about empowering businesses with **scalable, resilient, and cost-optimized cloud solutions**. With **MV Consulting**, I specialize in crafting **tailored AWS architectures** and **DevOps-driven workflows** that not only meet your current needs but grow with you.  

---

### 🌟 Why Work With Me?  

✔️ **Tailored AWS Solutions:** Every business is unique, so I design custom solutions that fit your goals and challenges.  
✔️ **Well-Architected Designs:** From scalability to security, my solutions align with AWS Well-Architected Framework.  
✔️ **Cloud-Native Focus:** I specialize in modern, cloud-native systems that embrace the full potential of AWS.  
✔️ **Business-Driven Tech:** Technology should serve your business, not the other way around.  

---

### 🛠 What I Bring to the Table  

🔑 **12x AWS Certifications**  
I’m **AWS Certified Solutions Architect and DevOps – Professional** and hold numerous additional certifications, so you can trust I’ll bring industry best practices to your projects. Feel free to explose by [badges](https://www.credly.com/users/manuel-vogel)

⚙️ **Infrastructure as Code (IaC)**  
With deep expertise in **AWS CDK** and **Terraform**, I ensure your infrastructure is automated, maintainable, and scalable.  

📦 **DevOps Expertise**  
From CI/CD pipelines with **GitHub Actions** and **GitLab CI** to container orchestration **Kubernetes** and others, I deliver workflows that are smooth and efficient.  

🌐 **Hands-On Experience**  
With over **7 years of AWS experience** and a decade in the tech world, I’ve delivered solutions for companies large and small. My open-source contributions showcase my commitment to transparency and innovation. Feel free to explore my [GitHub profile](https://github.com/mavogel)

---

### 💼 Let’s Build Something Great Together  

I know that choosing the right partner is critical to your success. When you work with me, you’re not just contracting an engineer – you’re gaining a trusted advisor and hands-on expert who cares about your business as much as you do.  

✔️ **Direct Collaboration**: No middlemen or red tape – you work with me directly.  
✔️ **Transparent Process**: Expect open communication, clear timelines, and visible results.  
✔️ **Real Value**: My solutions focus on delivering measurable impact for your business.  


<a href="https://tinyurl.com/mvc-15min"><img alt="Schedule your call" src="https://img.shields.io/badge/schedule%20your%20call-success.svg?style=for-the-badge"/></a>  

---

## 🙌 Acknowledgements

Big shoutout to the amazing team behind [Projen](https://github.com/projen/projen)!  
Their groundbreaking work simplifies cloud infrastructure projects and inspires us every day. 💡

## Author

[Manuel Vogel](https://manuel-vogel.de/about/)

[![](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/manuel-vogel)
[![](https://img.shields.io/badge/GitHub-2b3137?style=for-the-badge&logo=github&logoColor=white)](https://github.com/mavogel)