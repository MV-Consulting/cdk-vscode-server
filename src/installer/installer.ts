import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Function } from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Arn, CustomResource, Duration, Stack } from 'aws-cdk-lib/core';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { InstallerFunction } from './installer-function';
import { LinuxFlavorType } from '../vscode-server';

interface InstallerOptionsBase {
  /**
   * The ec2 instance id to install the ssm document on
   */
  readonly instanceId: string;

  /**
   * The name of the custom ssm document to install.
   *
   * @default the ssm document of the construct
   */
  readonly documentName?: string;

  /**
   * The name of the cloudwatch log group for the install logs
   *
   * @default /aws/ssm/${documentName}
   */
  readonly cloudWatchLogGroupName?: string;

  /**
   * The name of the user under which the vscode server runs
   */
  readonly vsCodeUser: string;

  /**
   * The password of the user under which the vscode server runs
   */
  readonly vsCodePassword: string;

  /**
   * The home folder of the user under which the vscode server runs
   */
  readonly homeFolder: string;

  /**
   * The base rest path vs code server will run
   *
   * @default app
   */
  readonly devServerBasePath?: string;

  /**
   * The port vscoder server will be served in the instance
   *
   * @default 8081
   */
  readonly devServerPort?: number;
};

export interface InstallerOptions extends InstallerOptionsBase {}

export abstract class Installer {
  public static ubuntu(options: InstallerOptions): Installer {
    return new (class extends Installer {
      public _bind(scope: Construct): Installer {
        let documentName;
        const devServerBasePath = options.devServerBasePath ?? 'app';
        const devServerPort = options.devServerPort ?? 8081;
        if (options.documentName && options.documentName != '') {
          documentName = options.documentName;
        } else {
          const document = this.createSSMDocument(
            scope,
            devServerBasePath,
            devServerPort,
            options.vsCodeUser,
            options.homeFolder,
            LinuxFlavorType.UBUNTU_22,
          );
          documentName = document.name!;
        }

        const cloudWatchLogGroupName = options.cloudWatchLogGroupName ?? `/aws/ssm/${documentName}`;

        const installer = new CustomResourceInstaller(scope, {
          instanceId: options.instanceId,
          documentName: documentName,
          cloudWatchLogGroupName: cloudWatchLogGroupName,
          vsCodeUser: options.vsCodeUser,
          vsCodePassword: options.vsCodePassword,
          homeFolder: options.homeFolder,
        });

        return installer;
      }
    })();
  }

  public static amazonLinux2023(options: InstallerOptions): Installer {
    return new (class extends Installer {
      public _bind(scope: Construct): Installer {
        let documentName;
        const devServerBasePath = options.devServerBasePath ?? 'app';
        const devServerPort = options.devServerPort ?? 8081;
        if (options.documentName && options.documentName != '') {
          documentName = options.documentName;
        } else {
          const document = this.createSSMDocument(
            scope,
            devServerBasePath,
            devServerPort,
            options.vsCodeUser,
            options.homeFolder,
            LinuxFlavorType.AMAZON_LINUX_2023,
          );
          documentName = document.name!;
        }

        const cloudWatchLogGroupName = options.cloudWatchLogGroupName ?? `/aws/ssm/${documentName}`;

        const installer = new CustomResourceInstaller(scope, {
          instanceId: options.instanceId,
          documentName: documentName,
          cloudWatchLogGroupName: cloudWatchLogGroupName,
          vsCodeUser: options.vsCodeUser,
          vsCodePassword: options.vsCodePassword,
          homeFolder: options.homeFolder,
        });


        return installer;
      }
    })();
  }

  public instanceId!: string;
  public documentName!: string;
  public cloudWatchLogGroupName!: string;
  public vsCodePassword!: string;
  public vsCodePasswordTest!: string;

  /**
   * @internal
   */
  protected constructor() { }

  /**
   * @internal
   */
  public abstract _bind(scope: Construct): any;

  private createSSMDocument(
    scope: Construct,
    devServerBasePath: string,
    devServerPort: number,
    vsCodeUser: string,
    homeFolder: string,
    linuxFlavor: LinuxFlavorType,
  ): ssm.CfnDocument {
    let ssmDocument: ssm.CfnDocument;
    switch (linuxFlavor) {
      case LinuxFlavorType.UBUNTU_22:
      case LinuxFlavorType.UBUNTU_24:
        // Create an SSM document with multiple actions to install the software
        ssmDocument = new ssm.CfnDocument(scope, 'ssm-document-ubuntu', {
          name: `vscode-server-ubuntu-${Stack.of(scope).stackName}`,
          documentType: 'Command',
          content: {
            schemaVersion: '2.2',
            description: 'Bootstrap VSCode code-server instance',
            parameters: {
              VSCodePassword: {
                type: 'String',
                default: Stack.of(scope).stackId,
              },
              NodeVersion: {
                type: 'String',
                default: '20',
                allowedValues: [
                  '22',
                  '20',
                  '18',
                ],
              },
              DotNetVersion: {
                type: 'String',
                default: '8.0',
                allowedValues: [
                  '8.0',
                  '7.0',
                ],
              },
            },
            // all mainSteps scripts are in in /var/lib/amazon/ssm/<instanceid>/document/orchestration/<uuid>/<StepName>/_script.sh
            mainSteps: [
              {
                action: 'aws:configurePackage',
                name: 'InstallCloudWatchAgent',
                inputs: {
                  name: 'AmazonCloudWatchAgent',
                  action: 'Install',
                },
              },
              {
                action: 'aws:runDocument',
                name: 'ConfigureCloudWatchAgent',
                inputs: {
                  documentType: 'SSMDocument',
                  documentPath: 'AmazonCloudWatch-ManageAgent',
                  documentParameters: {
                    action: 'configure',
                    mode: 'ec2',
                    optionalConfigurationSource: 'default',
                    optionalRestart: 'yes',
                  },
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'InstallAptPackagesApt',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'apt-get -q update && DEBIAN_FRONTEND=noninteractive apt-get install -y -q apt-utils',
                    'apt-get -q update && DEBIAN_FRONTEND=noninteractive apt-get install -y -q needrestart unattended-upgrades',
                    'sed -i \'s/#$nrconf{kernelhints} = -1;/$nrconf{kernelhints} = 0;/\' /etc/needrestart/needrestart.conf',
                    'sed -i \'s/#$nrconf{verbosity} = 2;/$nrconf{verbosity} = 0;/\' /etc/needrestart/needrestart.conf',
                    'sed -i "s/#\$nrconf{restart} = \'i\';/\$nrconf{restart} = \'a\';/" /etc/needrestart/needrestart.conf',
                    'echo "Apt helper packages added. Checking configuration"',
                    'cat /etc/needrestart/needrestart.conf',
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'InstallBasePackagesApt',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'apt-get -q update && DEBIAN_FRONTEND=noninteractive apt-get install -y -q curl gnupg whois argon2 openssl locales locales-all unzip apt-transport-https ca-certificates software-properties-common nginx',
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'AddUserApt',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'echo \'Adding user: ${VSCodeUser}\'',
                    `adduser --disabled-password --gecos '' ${vsCodeUser}`,
                    `echo "${vsCodeUser}:{{ VSCodePassword }}" | chpasswd`,
                    `usermod -aG sudo ${vsCodeUser}`,
                    `tee /etc/sudoers.d/91-vscode-user <<EOF
${vsCodeUser} ALL=(ALL) NOPASSWD:ALL
EOF`,
                    `mkdir -p /home/${vsCodeUser} && chown -R ${vsCodeUser}:${vsCodeUser} /home/${vsCodeUser}`,
                    'echo "User added. Checking configuration"',
                    `getent passwd ${vsCodeUser}`,
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'InstallNodeApt',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /usr/share/keyrings/nodesource.gpg',
                    'echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/nodesource.gpg] https://deb.nodesource.com/node_{{ NodeVersion }}.x nodistro main" > /etc/apt/sources.list.d/nodesource.list',
                    'apt-get -q update && DEBIAN_FRONTEND=noninteractive apt-get install -y -q nodejs',
                    'npm install -g npm@latest',
                    'echo "Node and npm installed. Checking configuration"',
                    'node -v',
                    'npm -v',
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'InstallDockerApt',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg',
                    'echo "deb [signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release --codename --short) stable" > /etc/apt/sources.list.d/docker.list',
                    'apt-get -q update && DEBIAN_FRONTEND=noninteractive apt-get install -y -q docker-ce docker-ce-cli containerd.io',
                    `systemctl restart code-server@${vsCodeUser}.service`,
                    'systemctl start docker.service',
                    'echo "Docker installed. Checking configuration"',
                    'docker --version',
                    'systemctl status docker.service',
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'InstallGitApt',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'add-apt-repository ppa:git-core/ppa',
                    'apt-get -q update && DEBIAN_FRONTEND=noninteractive apt-get install -y -q git',
                    `sudo -u ${vsCodeUser} git config --global user.email "${vsCodeUser}@example.com"`,
                    `sudo -u ${vsCodeUser} git config --global user.name "Workshop ${vsCodeUser}"`,
                    `sudo -u ${vsCodeUser} git config --global init.defaultBranch "main"`,
                    'echo "Git installed. Checking configuration"',
                    'git --version',
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'InstallPythonApt',
                inputs: {
                  runCommand: [
                    // Ubuntu 22 default is Python 3.10
                    // Ubuntu 24 default is Python 3.12
                    // The default installed Python version will map to Python3
                    '#!/bin/bash',
                    'apt-get -q update && DEBIAN_FRONTEND=noninteractive apt-get install -y -q python3-pip python3-venv python3-boto3 python3-pytest',
                    `echo 'alias pytest=pytest-3' >> /home/${vsCodeUser}/.bashrc`,
                    `systemctl restart code-server@${vsCodeUser}.service`,
                    'systemctl start multipathd.service packagekit.service',
                    'systemctl restart unattended-upgrades.service',
                    'echo "Python and Pip installed. Checking configuration"',
                    'python3 --version',
                    'pip3 --version',
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'InstallAWSCLI',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'curl -fsSL https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip -o /tmp/aws-cli.zip',
                    'unzip -q -d /tmp /tmp/aws-cli.zip',
                    'sudo /tmp/aws/install',
                    'rm -rf /tmp/aws',
                    'echo "AWS CLI installed. Checking configuration"',
                    'aws --version',
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'ConfigureCodeServer',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    `export HOME=/home/${vsCodeUser}`,
                    'curl -fsSL https://code-server.dev/install.sh | bash -s -- 2>&1',
                    `systemctl enable --now code-server@${vsCodeUser} 2>&1`,
                    `tee /etc/nginx/conf.d/code-server.conf <<EOF
server {
    listen 80;
    listen [::]:80;
    # server_name distribution.distributionDomainName;
    server_name *.cloudfront.net;
    location / {
      proxy_pass http://localhost:8080/;
      proxy_set_header Host \\$host;
      proxy_set_header Upgrade \\$http_upgrade;
      proxy_set_header Connection upgrade;
      proxy_set_header Accept-Encoding gzip;
    }
    location /${devServerBasePath} {
      proxy_pass http://localhost:${devServerPort}/${devServerBasePath};
      proxy_set_header Host \\$host;
      proxy_set_header Upgrade \\$http_upgrade;
      proxy_set_header Connection upgrade;
      proxy_set_header Accept-Encoding gzip;
    }
}
EOF`,
                    `mkdir -p /home/${vsCodeUser}/.config/code-server`,
                    `tee /home/${vsCodeUser}/.config/code-server/config.yaml <<EOF
cert: false
auth: password
hashed-password: "$(echo -n {{ VSCodePassword }} | argon2 $(openssl rand -base64 12) -e)"
EOF`,
                    `mkdir -p /home/${vsCodeUser}/.local/share/code-server/User/`,
                    `touch /home/${vsCodeUser}/.hushlogin`,
                    `mkdir -p ${homeFolder} && chown -R ${vsCodeUser}:${vsCodeUser} ${homeFolder}`,
                    `tee /home/${vsCodeUser}/.local/share/code-server/User/settings.json <<EOF
{
  "extensions.autoUpdate": false,
  "extensions.autoCheckUpdates": false,
  "telemetry.telemetryLevel": "off",
  "security.workspace.trust.startupPrompt": "never",
  "security.workspace.trust.enabled": false,
  "security.workspace.trust.banner": "never",
  "security.workspace.trust.emptyWindow": false,
  "python.testing.pytestEnabled": true,
  "auto-run-command.rules": [
    {
      "command": "workbench.action.terminal.new"
    }
  ]
}
EOF`,
                    `chown -R ${vsCodeUser}:${vsCodeUser} /home/${vsCodeUser}`,
                    `systemctl restart code-server@${vsCodeUser}`,
                    'systemctl restart nginx',
                    `sudo -u ${vsCodeUser} --login code-server --install-extension AmazonWebServices.aws-toolkit-vscode --force`,
                    `sudo -u ${vsCodeUser} --login code-server --install-extension AmazonWebServices.amazon-q-vscode --force`,
                    `sudo -u ${vsCodeUser} --login code-server --install-extension synedra.auto-run-command --force`,
                    `sudo -u ${vsCodeUser} --login code-server --install-extension vscjava.vscode-java-pack --force`,
                    `sudo -u ${vsCodeUser} --login code-server --install-extension ms-vscode.live-server --force`,
                    `chown -R ${vsCodeUser}:${vsCodeUser} /home/${vsCodeUser}`,
                    'echo "Nginx installed. Checking configuration"',
                    'nginx -t 2>&1',
                    'systemctl status nginx',
                    'echo "CodeServer installed. Checking configuration"',
                    'code-server -v',
                    `systemctl status code-server@${vsCodeUser}`,
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'UpdateProfile',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'echo LANG=en_US.utf-8 >> /etc/environment',
                    'echo LC_ALL=en_US.UTF-8 >> /etc/environment',
                    `echo 'PATH=$PATH:/home/${vsCodeUser}/.local/bin' >> /home/${vsCodeUser}/.bashrc`,
                    `echo 'export PATH' >> /home/${vsCodeUser}/.bashrc`,
                    `echo 'export AWS_REGION=${Stack.of(scope).region}' >> /home/${vsCodeUser}/.bashrc`,
                    `echo 'export AWS_ACCOUNTID=${Stack.of(scope).account}' >> /home/${vsCodeUser}/.bashrc`,
                    `echo 'export NEXT_TELEMETRY_DISABLED=1' >> /home/${vsCodeUser}/.bashrc`,
                    `echo "export PS1='\\[\\033[01;32m\\]\\u:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ '" >> /home/${vsCodeUser}/.bashrc`,
                    `chown -R ${vsCodeUser}:${vsCodeUser} /home/${vsCodeUser}`,
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'InstallCDK',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'npm install -g aws-cdk',
                    'echo "AWS CDK installed. Checking configuration"',
                    'cdk --version',
                  ],
                },
              },
            ],
          },
        });
        break;
      case LinuxFlavorType.AMAZON_LINUX_2023:
        ssmDocument = new ssm.CfnDocument(scope, 'ssm-document-al2023', {
          name: `vscode-server-al2023-${Stack.of(scope).stackName}`,
          documentType: 'Command',
          content: {
            schemaVersion: '2.2',
            description: 'Bootstrap VSCode code-server instance',
            parameters: {
              VSCodePassword: {
                type: 'String',
                default: Stack.of(scope).stackId,
              },
              NodeVersion: {
                type: 'String',
                default: '20',
                allowedValues: [
                  '22',
                  '20',
                  '18',
                ],
              },
              DotNetVersion: {
                type: 'String',
                default: '8.0',
                allowedValues: [
                  '8.0',
                  '7.0',
                ],
              },
            },
            // all mainSteps scripts are in in /var/lib/amazon/ssm/<instanceid>/document/orchestration/<uuid>/<StepName>/_script.sh
            mainSteps: [
              {
                action: 'aws:configurePackage',
                name: 'InstallCloudWatchAgent',
                inputs: {
                  name: 'AmazonCloudWatchAgent',
                  action: 'Install',
                },
              },
              {
                action: 'aws:runDocument',
                name: 'ConfigureCloudWatchAgent',
                inputs: {
                  documentType: 'SSMDocument',
                  documentPath: 'AmazonCloudWatch-ManageAgent',
                  documentParameters: {
                    action: 'configure',
                    mode: 'ec2',
                    optionalConfigurationSource: 'default',
                    optionalRestart: 'yes',
                  },
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'InstallBasePackagesDnf',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'dnf install -y --allowerasing whois argon2 unzip nginx curl gnupg openssl',
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'AddUserDnf',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    `echo 'Adding user: ${vsCodeUser}'`,
                    `adduser -c '' ${vsCodeUser}`,
                    `passwd -l ${vsCodeUser}`,
                    `echo "${vsCodeUser}:{{ VSCodePassword }}" | chpasswd`,
                    `usermod -aG wheel ${vsCodeUser}`,
                    'echo "User added. Checking configuration"',
                    `getent passwd ${vsCodeUser}`,
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'InstallNodeDnf',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'dnf install -y nodejs20 npm',
                    'ln -s -f /usr/bin/node-20 /usr/bin/node',
                    'npm install -g npm@latest',
                    'echo "Node and npm installed. Checking configuration"',
                    'node -v',
                    'npm -v',
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'InstallDockerDnf',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'dnf install -y docker',
                    `usermod -aG docker ${vsCodeUser}`,
                    `systemctl restart code-server@${vsCodeUser}.service`,
                    'systemctl start docker.service',
                    'echo "Docker installed. Checking configuration"',
                    'docker --version',
                    'systemctl status docker.service',
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'InstallGitDnf',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'dnf install -y git',
                    `sudo -u ${vsCodeUser} git config --global user.email "${vsCodeUser}@example.com"`,
                    `sudo -u ${vsCodeUser} git config --global user.name "Workshop ${vsCodeUser}"`,
                    `sudo -u ${vsCodeUser} git config --global init.defaultBranch "main"`,
                    'echo "Git installed. Checking configuration"',
                    'git --version',
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'InstallPythonDnf',
                inputs: {
                  runCommand: [
                    // AL2023 currently ships with Python 3.9 preinstalled, but 3.11 is available in the repository
                    // Install 3.11 alongside 3.9 and setup some alias so that 3.11 is loaded when participant runs Python3
                    // If Python 3.12 become available, update below
                    '#!/bin/bash',
                    'dnf install -y python3.11 python3.11-pip python3-virtualenv python3-pytest python3-boto3',
                    `echo 'alias pytest=pytest-3' >> /home/${vsCodeUser}/.bashrc`,
                    `echo 'alias python3=python3.11' >> /home/${vsCodeUser}/.bashrc`,
                    `echo 'alias pip3=pip3.11' >> /home/${vsCodeUser}/.bashrc`,
                    'echo \'alias=python3=python3.11\' >> ~/.bashrc',
                    'echo \'alias pip3=pip3.11\' >> ~/.bashrc',
                    'python3.11 -m pip install --upgrade pip 2>&1',
                    'echo "Python and Pip installed. Checking configuration"',
                    'python3.11 --version',
                    'python3.11 -m pip --version 2>&1',
                  ],
                },
              },
              // add go, dotnet
              {
                action: 'aws:runShellScript',
                name: 'InstallAWSCLI',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'curl -fsSL https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip -o /tmp/aws-cli.zip',
                    'unzip -q -d /tmp /tmp/aws-cli.zip',
                    'sudo /tmp/aws/install',
                    'rm -rf /tmp/aws',
                    'echo "AWS CLI installed. Checking configuration"',
                    'aws --version',
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'ConfigureCodeServer',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    `export HOME=/home/${vsCodeUser}`,
                    'curl -fsSL https://code-server.dev/install.sh | bash -s -- 2>&1',
                    `systemctl enable --now code-server@${vsCodeUser} 2>&1`,
                    `tee /etc/nginx/conf.d/code-server.conf <<EOF
server {
    listen 80;
    listen [::]:80;
    # server_name distribution.distributionDomainName;
    server_name *.cloudfront.net;
    location / {
      proxy_pass http://localhost:8080/;
      proxy_set_header Host \\$host;
      proxy_set_header Upgrade \\$http_upgrade;
      proxy_set_header Connection upgrade;
      proxy_set_header Accept-Encoding gzip;
    }
    location /${devServerBasePath} {
      proxy_pass http://localhost:${devServerPort}/${devServerBasePath};
      proxy_set_header Host \\$host;
      proxy_set_header Upgrade \\$http_upgrade;
      proxy_set_header Connection upgrade;
      proxy_set_header Accept-Encoding gzip;
    }
}
EOF`,
                    `mkdir -p /home/${vsCodeUser}/.config/code-server`,
                    `tee /home/${vsCodeUser}/.config/code-server/config.yaml <<EOF
cert: false
auth: password
hashed-password: "$(echo -n {{ VSCodePassword }} | argon2 $(openssl rand -base64 12) -e)"
EOF`,
                    `mkdir -p /home/${vsCodeUser}/.local/share/code-server/User/`,
                    `touch /home/${vsCodeUser}/.hushlogin`,
                    `mkdir -p ${homeFolder} && chown -R ${vsCodeUser}:${vsCodeUser} ${homeFolder}`,
                    `tee /home/${vsCodeUser}/.local/share/code-server/User/settings.json <<EOF
{
  "extensions.autoUpdate": false,
  "extensions.autoCheckUpdates": false,
  "telemetry.telemetryLevel": "off",
  "security.workspace.trust.startupPrompt": "never",
  "security.workspace.trust.enabled": false,
  "security.workspace.trust.banner": "never",
  "security.workspace.trust.emptyWindow": false,
  "python.testing.pytestEnabled": true,
  "auto-run-command.rules": [
    {
      "command": "workbench.action.terminal.new"
    }
  ]
}
EOF`,
                    `chown -R ${vsCodeUser}:${vsCodeUser} /home/${vsCodeUser}`,
                    `systemctl restart code-server@${vsCodeUser}`,
                    'systemctl restart nginx',
                    `sudo -u ${vsCodeUser} --login code-server --install-extension AmazonWebServices.aws-toolkit-vscode --force`,
                    `sudo -u ${vsCodeUser} --login code-server --install-extension AmazonWebServices.amazon-q-vscode --force`,
                    `sudo -u ${vsCodeUser} --login code-server --install-extension synedra.auto-run-command --force`,
                    `sudo -u ${vsCodeUser} --login code-server --install-extension vscjava.vscode-java-pack --force`,
                    `sudo -u ${vsCodeUser} --login code-server --install-extension ms-vscode.live-server --force`,
                    `chown -R ${vsCodeUser}:${vsCodeUser} /home/${vsCodeUser}`,
                    'echo "Nginx installed. Checking configuration"',
                    'nginx -t 2>&1',
                    'systemctl status nginx',
                    'echo "CodeServer installed. Checking configuration"',
                    'code-server -v',
                    `systemctl status code-server@${vsCodeUser}`,
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'UpdateProfile',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'echo LANG=en_US.utf-8 >> /etc/environment',
                    'echo LC_ALL=en_US.UTF-8 >> /etc/environment',
                    `echo 'PATH=$PATH:/home/${vsCodeUser}/.local/bin' >> /home/${vsCodeUser}/.bashrc`,
                    `echo 'export PATH' >> /home/${vsCodeUser}/.bashrc`,
                    `echo 'export AWS_REGION=${Stack.of(scope).region}' >> /home/${vsCodeUser}/.bashrc`,
                    `echo 'export AWS_ACCOUNTID=${Stack.of(scope).account}' >> /home/${vsCodeUser}/.bashrc`,
                    `echo 'export NEXT_TELEMETRY_DISABLED=1' >> /home/${vsCodeUser}/.bashrc`,
                    `echo "export PS1='\\[\\033[01;32m\\]\\u:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ '" >> /home/${vsCodeUser}/.bashrc`,
                    `chown -R ${vsCodeUser}:${vsCodeUser} /home/${vsCodeUser}`,
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'InstallCDK',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'npm install -g aws-cdk',
                    'echo "AWS CDK installed. Checking configuration"',
                    'cdk --version',
                  ],
                },
              },
            ],
          },
        });
        break;
      default:
        throw new Error(`Unsupported Linux flavor: ${linuxFlavor}`);
    }

    return ssmDocument;
  }
}

interface CustomResourceInstallerOptions extends InstallerOptions {}

class CustomResourceInstaller extends Installer {
  constructor(scope: Construct, options: CustomResourceInstallerOptions) {
    super();

    const onEvent: Function = new InstallerFunction(scope, 'InstallerOnEventHandler', {
      timeout: Duration.seconds(300), // TODO configurable
      memorySize: 512, // TODO configurable
    });
    NagSuppressions.addResourceSuppressions([
      onEvent,
    ], [
      { id: 'AwsSolutions-IAM4', reason: 'For this event handler we do not need to restrict managed policies' },
      { id: 'AwsSolutions-L1', reason: 'For this lambda the latest runtime is not needed' },
    ], true);

    const documentArn = Arn.format({
      service: 'ssm',
      resource: 'document',
      resourceName: options.documentName,
    }, Stack.of(scope));

    const cwManageAgentArn = Arn.format({
      service: 'ssm',
      resource: 'document',
      resourceName: 'AmazonCloudWatch-ManageAgent',
    }, Stack.of(scope));

    const targetEc2InstanceArn = Arn.format({
      service: 'ec2',
      resource: 'instance',
      resourceName: options.instanceId,
    }, Stack.of(scope));

    onEvent.addToRolePolicy(new PolicyStatement({
      actions: [
        'ssm:SendCommand',
      ],
      resources: [
        documentArn,
        cwManageAgentArn,
        targetEc2InstanceArn,
      ],
    }));

    const provider = new Provider(scope, 'InstallerProvider', {
      onEventHandler: onEvent,
    });
    NagSuppressions.addResourceSuppressions([
      provider,
    ], [
      { id: 'AwsSolutions-IAM4', reason: 'For this provider we do not need to restrict managed policies' },
      { id: 'AwsSolutions-IAM5', reason: 'For this provider wildcards are fine' },
      { id: 'AwsSolutions-L1', reason: 'For this provider the latest runtime is not needed' },
    ], true);

    new CustomResource(scope, 'SSMInstallerCustomResource', {
      serviceToken: provider.serviceToken,
      properties: {
        ServiceTimeout: 305, // TODO configurable
        InstanceId: options.instanceId,
        DocumentName: options.documentName,
        CloudWatchLogGroupName: options.cloudWatchLogGroupName,
        VSCodePassword: options.vsCodePassword,
      },
    });
  }


  public _bind() { }
}