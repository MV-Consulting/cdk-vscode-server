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

  /**
   * The custom domain name for the VS Code server
   * Used to configure nginx server_name directive
   *
   * @default - uses *.cloudfront.net only
   */
  readonly customDomainName?: string;

  /**
   * Remote git repository URL to clone into the home folder.
   *
   * If provided, the repository will be cloned into the user's home folder during instance setup.
   * Useful for pre-populating workshop environments with starter code.
   *
   * @example 'https://github.com/aws-samples/my-workshop-repo.git'
   * @default - no repo cloned
   */
  readonly repoUrl?: string;

  /**
   * S3 path to a zip file containing assets to extract into the home folder.
   *
   * The zip contents will be extracted to the user's home folder and committed to git.
   * Use this to provide workshop materials, sample data, or configuration files.
   *
   * @example 'my-workshop-bucket/assets/workshop-materials.zip'
   * @default - no assets downloaded
   */
  readonly assetZipS3Path?: string;

  /**
   * S3 path to a zip file containing git branches to create in the home folder repository.
   *
   * Each top-level folder in the zip becomes a separate git branch with that folder's contents.
   * Ideal for creating step-by-step workshop branches (e.g., step-1, step-2, solution).
   *
   * @example 'my-workshop-bucket/branches/lab-branches.zip' (containing folders: step-1/, step-2/, solution/)
   * @default - no branches created
   */
  readonly branchZipS3Path?: string;

  /**
   * S3 path to a zip file containing multiple folders to create as separate git repositories.
   *
   * Each top-level folder in the zip becomes a separate subfolder in the parent directory,
   * initialized as its own git repository. Useful for multi-project workshops.
   *
   * @example 'my-workshop-bucket/folders/workshop-projects.zip' (containing folders: frontend/, backend/, infrastructure/)
   * @default - no folders created
   */
  readonly folderZipS3Path?: string;
}

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
            options.customDomainName,
            options.repoUrl,
            options.assetZipS3Path,
            options.branchZipS3Path,
            options.folderZipS3Path,
          );
          documentName = document.name!;
        }

        const cloudWatchLogGroupName =
          options.cloudWatchLogGroupName ?? `/aws/ssm/${documentName}`;

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
            options.customDomainName,
            options.repoUrl,
            options.assetZipS3Path,
            options.branchZipS3Path,
            options.folderZipS3Path,
          );
          documentName = document.name!;
        }

        const cloudWatchLogGroupName =
          options.cloudWatchLogGroupName ?? `/aws/ssm/${documentName}`;

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
  protected constructor() {}

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
    customDomainName?: string,
    repoUrl?: string,
    assetZipS3Path?: string,
    branchZipS3Path?: string,
    folderZipS3Path?: string,
  ): ssm.CfnDocument {
    // Generate nginx server_name directive based on custom domain
    const serverNameDirective = customDomainName
      ? `server_name *.cloudfront.net ${customDomainName};`
      : 'server_name *.cloudfront.net;';

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
                default: '22',
                allowedValues: ['24', '22', '20', '18'],
              },
              RepoUrl: {
                type: 'String',
                default: repoUrl ?? '',
              },
              AssetZipS3Path: {
                type: 'String',
                default: assetZipS3Path ?? '',
              },
              BranchZipS3Path: {
                type: 'String',
                default: branchZipS3Path ?? '',
              },
              FolderZipS3Path: {
                type: 'String',
                default: folderZipS3Path ?? '',
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
                    'dpkg --configure -a',
                    'apt-get -q update && DEBIAN_FRONTEND=noninteractive apt-get install -y -q apt-utils',
                    'apt-get -q update && DEBIAN_FRONTEND=noninteractive apt-get install -y -q needrestart unattended-upgrades',
                    "sed -i 's/#$nrconf{kernelhints} = -1;/$nrconf{kernelhints} = 0;/' /etc/needrestart/needrestart.conf",
                    "sed -i 's/#$nrconf{verbosity} = 2;/$nrconf{verbosity} = 0;/' /etc/needrestart/needrestart.conf",
                    "sed -i \"s/#\$nrconf{restart} = 'i';/\$nrconf{restart} = 'a';/\" /etc/needrestart/needrestart.conf",
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
                    'dpkg --configure -a',
                    'apt-get -q update && DEBIAN_FRONTEND=noninteractive apt-get install -y -q curl gnupg whois argon2 unzip nginx openssl locales locales-all apt-transport-https ca-certificates software-properties-common',
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'AddUserApt',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'dpkg --configure -a',
                    `if [[ "${vsCodeUser}" == "ubuntu" ]]
then
  echo 'Using existing user: ${vsCodeUser}'
else
  echo 'Adding user: ${vsCodeUser}'
  adduser --disabled-password --gecos '' ${vsCodeUser}
  echo "${vsCodeUser}:{{ VSCodePassword }}" | chpasswd
  usermod -aG sudo ${vsCodeUser}
fi`,
                    `tee /etc/sudoers.d/91-vscode-user <<EOF
${vsCodeUser} ALL=(ALL) NOPASSWD:ALL
EOF`,
                    `mkdir -p /home/${vsCodeUser} && chown -R ${vsCodeUser}:${vsCodeUser} /home/${vsCodeUser}`,
                    `mkdir -p /home/${vsCodeUser}/.local/bin && chown -R ${vsCodeUser}:${vsCodeUser} /home/${vsCodeUser}`,
                    'echo "User added. Checking configuration"',
                    `getent passwd ${vsCodeUser}`,
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
                name: 'InstallAWSCLI',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'mkdir -p /tmp',
                    'curl -fsSL https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip -o /tmp/aws-cli.zip',
                    `chown -R ${vsCodeUser}:${vsCodeUser} /tmp/aws-cli.zip`,
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
                name: 'InstallGitApt',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'dpkg --configure -a',
                    'add-apt-repository ppa:git-core/ppa',
                    'apt-get -q update && DEBIAN_FRONTEND=noninteractive apt-get install -y -q git',
                    `sudo -u ${vsCodeUser} git config --global user.email "participant@example.com"`,
                    `sudo -u ${vsCodeUser} git config --global user.name "Workshop Participant"`,
                    `sudo -u ${vsCodeUser} git config --global init.defaultBranch "main"`,
                    'echo "Git installed. Checking configuration"',
                    'git --version',
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'CloneRepo',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    `if [[ -z "{{ RepoUrl }}" ]]
then
  echo "No Repo"
else
  mkdir -p ${homeFolder} && chown -R ${vsCodeUser}:${vsCodeUser} ${homeFolder}
  sudo -u ${vsCodeUser} git clone {{ RepoUrl }} ${homeFolder}
  echo "Repo {{ RepoUrl }} cloned. Checking configuration"
  ls -la ${homeFolder}
  sudo -u ${vsCodeUser} git -C ${homeFolder} remote -v
fi`,
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'DownloadAssets',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    `if [[ -z "{{ AssetZipS3Path }}" ]]
then
  echo "No assets"
else
  mkdir -p ${homeFolder} && chown -R ${vsCodeUser}:${vsCodeUser} ${homeFolder}
  mkdir -p /tmp
  aws s3 cp s3://{{ AssetZipS3Path }} /tmp/asset.zip
  chown -R ${vsCodeUser}:${vsCodeUser} /tmp/asset.zip
  unzip -o /tmp/asset.zip -d ${homeFolder}
  chown -R ${vsCodeUser}:${vsCodeUser} ${homeFolder}
  if  [[ -d ${homeFolder}/.git ]]
  then
    sudo -u ${vsCodeUser} git -C ${homeFolder} add .
    sudo -u ${vsCodeUser} git -C ${homeFolder} commit -m 'chore: workshop commit'
  else
    sudo -u ${vsCodeUser} git -C ${homeFolder} init
    sudo -u ${vsCodeUser} git -C ${homeFolder} add .
    sudo -u ${vsCodeUser} git -C ${homeFolder} commit -m 'chore: nitial commit'
  fi
  echo "Assets downloaded. Checking configuration: ${homeFolder}"
  ls -la ${homeFolder}
  sudo -u ${vsCodeUser} git -C ${homeFolder} branch
fi`,
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'DownloadFolders',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    `if [[ -z "{{ FolderZipS3Path }}" ]]
then
  echo "No folders"
else
  rm -rf /tmp/folder
  mkdir -p /tmp/folder && chown -R ${vsCodeUser}:${vsCodeUser} /tmp/folder
  aws s3 cp s3://{{ FolderZipS3Path }} /tmp/asset-folder.zip
  chown -R ${vsCodeUser}:${vsCodeUser} /tmp/asset-folder.zip
  unzip -o /tmp/asset-folder.zip -d /tmp/folder
  chown -R ${vsCodeUser}:${vsCodeUser} /tmp/folder
  mkdir -p ${homeFolder} && chown -R ${vsCodeUser}:${vsCodeUser} ${homeFolder}
  cd "${homeFolder}" && cd ..
  if [[ $(pwd) ==  "/" ]]
  then
    targetRootFolder=""
  else
    targetRootFolder=$(pwd)
    chown -R ${vsCodeUser}:${vsCodeUser} .
  fi
  find "/tmp/folder" -maxdepth 1 -mindepth 1 -type d | while read sourceFolder; do
    folder="$(basename $sourceFolder)"
    echo "Processing folder: $folder"
    targetFolder=$targetRootFolder/$folder
    if [[ $targetRootFolder == "" ]]
    then
      mv $sourceFolder /
    else
      mv $sourceFolder $targetRootFolder
    fi
    chown -R ${vsCodeUser}:${vsCodeUser} $targetFolder
    sudo -u ${vsCodeUser} git -C $targetFolder init
    sudo -u ${vsCodeUser} git -C $targetFolder add .
    sudo -u ${vsCodeUser} git -C $targetFolder commit -m "chore: initial commit"
    echo "Folder downloaded. Checking configuration: $targetFolder"
    ls -la $targetFolder
  done
  rm -rf /tmp/folder
fi`,
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'DownloadBranches',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    `if [[ -z "{{ BranchZipS3Path }}" ]]
then
  echo "No branches"
else
  rm -rf /tmp/branch
  rm -rf /tmp/git
  mkdir -p /tmp/branch && chown -R ${vsCodeUser}:${vsCodeUser} /tmp/branch
  mkdir -p /tmp/git && chown -R ${vsCodeUser}:${vsCodeUser} /tmp/git
  aws s3 cp s3://{{ BranchZipS3Path }} /tmp/asset-branch.zip
  chown -R ${vsCodeUser}:${vsCodeUser} /tmp/asset-branch.zip
  unzip -o /tmp/asset-branch.zip -d /tmp/branch
  chown -R ${vsCodeUser}:${vsCodeUser} /tmp/branch
  mkdir -p ${homeFolder} && chown -R ${vsCodeUser}:${vsCodeUser} ${homeFolder}
  sudo -u ${vsCodeUser} git -C ${homeFolder} init
  mv ${homeFolder}/.git /tmp/git
  rm -rf ${homeFolder}
  mkdir -p ${homeFolder} && chown -R ${vsCodeUser}:${vsCodeUser} ${homeFolder}
  mv /tmp/git/.git ${homeFolder}
  find /tmp/branch -maxdepth 1 -mindepth 1 -type d | while read sourceFolder; do
    branch="$(basename $sourceFolder)"
    echo "Processing branch: $branch"
    sudo -u ${vsCodeUser} git -C ${homeFolder} checkout -b $branch 2>&1
    cp -a $sourceFolder/. ${homeFolder}
    sudo -u ${vsCodeUser} git -C ${homeFolder} add .
    sudo -u ${vsCodeUser} git -C ${homeFolder} commit -m "chore: initial commit $branch"
    mv ${homeFolder}/.git /tmp/git
    rm -rf ${homeFolder}
    mkdir ${homeFolder} && chown -R ${vsCodeUser}:${vsCodeUser} ${homeFolder}
    mv /tmp/git/.git ${homeFolder}
  done
  sudo -u ${vsCodeUser} git -C ${homeFolder} checkout main 2>&1
  sudo -u ${vsCodeUser} git -C ${homeFolder} restore .
  rm -rf /tmp/branch
  rm -rf /tmp/git
  echo "Branches downloaded. Checking configuration: ${homeFolder}"
  sudo -u ${vsCodeUser} git -C ${homeFolder} branch
  ls -la ${homeFolder}
fi`,
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
                    'curl -fsSL https://code-server.dev/install.sh | sh -s -- --version 4.100.3',
                    `systemctl enable --now code-server@${vsCodeUser} 2>&1`,
                    `tee /etc/nginx/conf.d/code-server.conf <<EOF
server {
    listen 80;
    listen [::]:80;
    # server_name \\$\\{CloudFrontDistribution.DomainName\\};
    ${serverNameDirective}
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
                    `sudo -u ${vsCodeUser} --login code-server --install-extension ms-vscode.live-server --force`,
                    `sudo -u ${vsCodeUser} --login code-server --install-extension synedra.auto-run-command --force`,
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
              {
                action: 'aws:runShellScript',
                name: 'InstallQCLI',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'curl --proto \'=https\' --tlsv1.2 -sSf "https://desktop-release.q.us-east-1.amazonaws.com/latest/q-$(uname -m)-linux.zip" -o /tmp/q.zip',
                    `chown -R ${vsCodeUser}:${vsCodeUser} /tmp/q.zip`,
                    'unzip -q -d /tmp /tmp/q.zip',
                    `chown -R ${vsCodeUser}:${vsCodeUser} /tmp/q`,
                    'chmod +x /tmp/q/install.sh',
                    `sudo -u ${vsCodeUser} /tmp/q/install.sh --no-confirm`,
                    'rm -rf /tmp/q',
                    'q --version',
                    'echo "Amazon Q CLI installed"',
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'Installuv',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    `sudo -u ${vsCodeUser} --login curl -fsSL https://astral.sh/uv/install.sh -o /tmp/uv_install.sh`,
                    `sudo -u ${vsCodeUser} --login bash /tmp/uv_install.sh`,
                    `if uv generate-shell-completion bash &>/dev/null; then
  echo 'eval "$(uv generate-shell-completion bash)"' >> /home/${vsCodeUser}/.bashrc
fi`,
                    `if uvx generate-shell-completion bash &>/dev/null; then
  echo 'eval "$(uvx generate-shell-completion bash)"' >> /home/${vsCodeUser}/.bashrc
fi`,
                    'echo "uv installed. Checking configuration"',
                    `sudo -u ${vsCodeUser} --login uv --version`,
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
                    'dpkg --configure -a',
                    'apt-get -q update && DEBIAN_FRONTEND=noninteractive apt-get install -y -q python3-pip python3-venv python3-boto3 python3-pytest',
                    `echo 'alias pytest=pytest-3' >> /home/${vsCodeUser}/.bashrc`,
                    'systemctl start multipathd.service packagekit.service',
                    'systemctl restart unattended-upgrades.service',
                    'systemctl restart networkd-dispatcher.service',
                    `sudo -u ${vsCodeUser} --login code-server --install-extension ms-python.python --force`,
                    `if [ -f /home/${vsCodeUser}/.local/share/code-server/User/settings.json ]; then
  sed -i "2i\\\\  \\"python.testing.pytestEnabled\\": true," /home/${vsCodeUser}/.local/share/code-server/User/settings.json
else
  echo '{
    "python.testing.pytestEnabled": true
  }' > /home/${vsCodeUser}/.local/share/code-server/User/settings.json
fi`,
                    'echo "Python and Pip installed. Checking configuration"',
                    'python3 --version',
                    'pip3 --version',
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'InstallJavaApt',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'dpkg --configure -a',
                    'curl -fsSL https://apt.corretto.aws/corretto.key | gpg --dearmor -o /usr/share/keyrings/corretto-keyring.gpg',
                    'echo "deb [signed-by=/usr/share/keyrings/corretto-keyring.gpg] https://apt.corretto.aws stable main" > /etc/apt/sources.list.d/corretto.list',
                    'DEBIAN_FRONTEND=noninteractive apt-get update',
                    'DEBIAN_FRONTEND=noninteractive apt-get install -y -q java-21-amazon-corretto-jdk java-17-amazon-corretto-jdk java-1.8.0-amazon-corretto-jdk maven',
                    `echo 'export JAVA_8_HOME=$(update-alternatives --list java | grep "java-1.8.0-amazon-corretto" | head -1)' >> /home/${vsCodeUser}/.bashrc`,
                    `echo 'export JAVA_8_PATH=$(update-alternatives --list java | grep "java-1.8.0-amazon-corretto" | head -1)' >> /home/${vsCodeUser}/.bashrc`,
                    `echo 'export JAVA_17_PATH=$(update-alternatives --list java | grep "java-17-amazon-corretto" | head -1)' >> /home/${vsCodeUser}/.bashrc`,
                    `echo 'export JAVA_17_HOME=$(update-alternatives --list java | grep "java-17-amazon-corretto" | head -1)' >> /home/${vsCodeUser}/.bashrc`,
                    `echo 'export JAVA_21_PATH=$(update-alternatives --list java | grep "java-21-amazon-corretto" | head -1)' >> /home/${vsCodeUser}/.bashrc`,
                    `echo 'export JAVA_21_HOME=$(update-alternatives --list java | grep "java-21-amazon-corretto" | head -1)' >> /home/${vsCodeUser}/.bashrc`,
                    `echo 'export JAVA_HOME=$(update-alternatives --list java | grep "java-21-amazon-corretto" | head -1)' >> /home/${vsCodeUser}/.bashrc`,
                    `echo 'export PATH=$PATH:$JAVA_HOME/bin:/usr/share/maven/bin' >> /home/${vsCodeUser}/.bashrc`,
                    `sudo -u ${vsCodeUser} --login code-server --install-extension vscjava.vscode-java-pack --force`,
                    'echo "Java and Maven installed. Checking configuration"',
                    'java -version 2>&1',
                    'mvn --version',
                    'update-alternatives --list java',
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'InstallDotnetApt',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'dpkg --configure -a',
                    'apt-get -q update && DEBIAN_FRONTEND=noninteractive apt-get install -y -q dotnet-sdk-8.0',
                    'dotnet tool install -g Microsoft.Web.LibraryManager.Cli',
                    `echo 'PATH=$PATH:/home/${vsCodeUser}/.dotnet/tools' >> /home/${vsCodeUser}/.bashrc`,
                    `chown -R ${vsCodeUser}:${vsCodeUser} /home/${vsCodeUser}`,
                    'echo "Dotnet installed. Checking configuration"',
                    'dotnet --list-sdks',
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
                name: 'InstallGolangApt',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'apt-get -q update && DEBIAN_FRONTEND=noninteractive apt-get install -y -q golang',
                    `echo 'PATH=$PATH:/home/${vsCodeUser}/go/bin' >> /home/${vsCodeUser}/.bashrc`,
                    'echo "Golang installed. Checking configuration"',
                    'go version',
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
                default: '22',
                allowedValues: ['24', '22', '20', '18'],
              },
              RepoUrl: {
                type: 'String',
                default: repoUrl ?? '',
              },
              AssetZipS3Path: {
                type: 'String',
                default: assetZipS3Path ?? '',
              },
              BranchZipS3Path: {
                type: 'String',
                default: branchZipS3Path ?? '',
              },
              FolderZipS3Path: {
                type: 'String',
                default: folderZipS3Path ?? '',
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
                    `if [[ "${vsCodeUser}" == "ec2-user" ]]
then
  echo 'Using existing user: ${vsCodeUser}'
else
  echo 'Adding user: ${vsCodeUser}'
  adduser -c '' ${vsCodeUser}
  passwd -l ${vsCodeUser}
  echo "${vsCodeUser}:{{ VSCodePassword }}" | chpasswd
  usermod -aG wheel ${vsCodeUser}
fi`,
                    `tee /etc/sudoers.d/91-vscode-user <<EOF
${vsCodeUser} ALL=(ALL) NOPASSWD:ALL
EOF`,
                    `mkdir -p /home/${vsCodeUser} && chown -R ${vsCodeUser}:${vsCodeUser} /home/${vsCodeUser}`,
                    `mkdir -p /home/${vsCodeUser}/.local/bin && chown -R ${vsCodeUser}:${vsCodeUser} /home/${vsCodeUser}`,
                    'echo "User added. Checking configuration"',
                    `getent passwd ${vsCodeUser}`,
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
                name: 'InstallAWSCLI',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'mkdir -p /tmp',
                    'curl -fsSL https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip -o /tmp/aws-cli.zip',
                    `chown -R ${vsCodeUser}:${vsCodeUser} /tmp/aws-cli.zip`,
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
                name: 'InstallGitDnf',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'dnf install -y git',
                    `sudo -u ${vsCodeUser} git config --global user.email "participant@example.com"`,
                    `sudo -u ${vsCodeUser} git config --global user.name "Workshop Participant"`,
                    `sudo -u ${vsCodeUser} git config --global init.defaultBranch "main"`,
                    'echo "Git installed. Checking configuration"',
                    'git --version',
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'CloneRepo',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    `if [[ -z "{{ RepoUrl }}" ]]
then
  echo "No Repo"
else
  mkdir -p ${homeFolder} && chown -R ${vsCodeUser}:${vsCodeUser} ${homeFolder}
  sudo -u ${vsCodeUser} git clone {{ RepoUrl }} ${homeFolder}
  echo "Repo {{ RepoUrl }} cloned. Checking configuration"
  ls -la ${homeFolder}
  sudo -u ${vsCodeUser} git -C ${homeFolder} remote -v
fi`,
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'DownloadAssets',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    `if [[ -z "{{ AssetZipS3Path }}" ]]
then
  echo "No assets"
else
  mkdir -p ${homeFolder} && chown -R ${vsCodeUser}:${vsCodeUser} ${homeFolder}
  mkdir -p /tmp
  aws s3 cp s3://{{ AssetZipS3Path }} /tmp/asset.zip
  chown -R ${vsCodeUser}:${vsCodeUser} /tmp/asset.zip
  unzip -o /tmp/asset.zip -d ${homeFolder}
  chown -R ${vsCodeUser}:${vsCodeUser} ${homeFolder}
  if  [[ -d ${homeFolder}/.git ]]
  then
    sudo -u ${vsCodeUser} git -C ${homeFolder} add .
    sudo -u ${vsCodeUser} git -C ${homeFolder} commit -m 'chore: workshop commit'
  else
    sudo -u ${vsCodeUser} git -C ${homeFolder} init
    sudo -u ${vsCodeUser} git -C ${homeFolder} add .
    sudo -u ${vsCodeUser} git -C ${homeFolder} commit -m 'chore: initial commit'
  fi
  echo "Assets downloaded. Checking configuration: ${homeFolder}"
  ls -la ${homeFolder}
  sudo -u ${vsCodeUser} git -C ${homeFolder} branch
fi`,
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'DownloadFolders',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    `if [[ -z "{{ FolderZipS3Path }}" ]]
then
  echo "No folders"
else
  rm -rf /tmp/folder
  mkdir -p /tmp/folder && chown -R ${vsCodeUser}:${vsCodeUser} /tmp/folder
  aws s3 cp s3://{{ FolderZipS3Path }} /tmp/asset-folder.zip
  chown -R ${vsCodeUser}:${vsCodeUser} /tmp/asset-folder.zip
  unzip -o /tmp/asset-folder.zip -d /tmp/folder
  chown -R ${vsCodeUser}:${vsCodeUser} /tmp/folder
  mkdir -p ${homeFolder} && chown -R ${vsCodeUser}:${vsCodeUser} ${homeFolder}
  cd "${homeFolder}" && cd ..
  if [[ $(pwd) ==  "/" ]]
  then
    targetRootFolder=""
  else
    targetRootFolder=$(pwd)
    chown -R ${vsCodeUser}:${vsCodeUser} .
  fi
  find "/tmp/folder" -maxdepth 1 -mindepth 1 -type d | while read sourceFolder; do
    folder="$(basename $sourceFolder)"
    echo "Processing folder: $folder"
    targetFolder=$targetRootFolder/$folder
    if [[ $targetRootFolder == "" ]]
    then
      mv $sourceFolder /
    else
      mv $sourceFolder $targetRootFolder
    fi
    chown -R ${vsCodeUser}:${vsCodeUser} $targetFolder
    sudo -u ${vsCodeUser} git -C $targetFolder init
    sudo -u ${vsCodeUser} git -C $targetFolder add .
    sudo -u ${vsCodeUser} git -C $targetFolder commit -m "chore: initial commit"
    echo "Folder downloaded. Checking configuration: $targetFolder"
    ls -la $targetFolder
  done
  rm -rf /tmp/folder
fi`,
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'DownloadBranches',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    `if [[ -z "{{ BranchZipS3Path }}" ]]
then
  echo "No branches"
else
  rm -rf /tmp/branch
  rm -rf /tmp/git
  mkdir -p /tmp/branch && chown -R ${vsCodeUser}:${vsCodeUser} /tmp/branch
  mkdir -p /tmp/git && chown -R ${vsCodeUser}:${vsCodeUser} /tmp/git
  aws s3 cp s3://{{ BranchZipS3Path }} /tmp/asset-branch.zip
  chown -R ${vsCodeUser}:${vsCodeUser} /tmp/asset-branch.zip
  unzip -o /tmp/asset-branch.zip -d /tmp/branch
  chown -R ${vsCodeUser}:${vsCodeUser} /tmp/branch
  mkdir -p ${homeFolder} && chown -R ${vsCodeUser}:${vsCodeUser} ${homeFolder}
  sudo -u ${vsCodeUser} git -C ${homeFolder} init
  mv ${homeFolder}/.git /tmp/git
  rm -rf ${homeFolder}
  mkdir -p ${homeFolder} && chown -R ${vsCodeUser}:${vsCodeUser} ${homeFolder}
  mv /tmp/git/.git ${homeFolder}
  find /tmp/branch -maxdepth 1 -mindepth 1 -type d | while read sourceFolder; do
    branch="$(basename $sourceFolder)"
    echo "Processing branch: $branch"
    sudo -u ${vsCodeUser} git -C ${homeFolder} checkout -b $branch 2>&1
    cp -a $sourceFolder/. ${homeFolder}
    sudo -u ${vsCodeUser} git -C ${homeFolder} add .
    sudo -u ${vsCodeUser} git -C ${homeFolder} commit -m "chore: initial commit $branch"
    mv ${homeFolder}/.git /tmp/git
    rm -rf ${homeFolder}
    mkdir ${homeFolder} && chown -R ${vsCodeUser}:${vsCodeUser} ${homeFolder}
    mv /tmp/git/.git ${homeFolder}
  done
  sudo -u ${vsCodeUser} git -C ${homeFolder} checkout main 2>&1
  sudo -u ${vsCodeUser} git -C ${homeFolder} restore .
  rm -rf /tmp/branch
  rm -rf /tmp/git
  echo "Branches downloaded. Checking configuration: ${homeFolder}"
  sudo -u ${vsCodeUser} git -C ${homeFolder} branch
  ls -la ${homeFolder}
fi`,
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
                    'curl -fsSL https://code-server.dev/install.sh | sh -s -- --version 4.100.3',
                    `systemctl enable --now code-server@${vsCodeUser} 2>&1`,
                    `tee /etc/nginx/conf.d/code-server.conf <<EOF
server {
    listen 80;
    listen [::]:80;
    # server_name \\$\\{CloudFrontDistribution.DomainName\\};
    ${serverNameDirective}
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
                    `sudo -u ${vsCodeUser} --login code-server --install-extension ms-vscode.live-server --force`,
                    `sudo -u ${vsCodeUser} --login code-server --install-extension synedra.auto-run-command --force`,
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
                name: 'InstallNodeDnf',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'dnf install -y nodejs npm',
                    'npm install -g npm@latest',
                    'echo "Node and npm installed. Checking configuration"',
                    'node -v',
                    'npm -v',
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
              {
                action: 'aws:runShellScript',
                name: 'InstallQCLI',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'curl --proto \'=https\' --tlsv1.2 -sSf "https://desktop-release.q.us-east-1.amazonaws.com/latest/q-$(uname -m)-linux.zip" -o /tmp/q.zip',
                    `chown -R ${vsCodeUser}:${vsCodeUser} /tmp/q.zip`,
                    'unzip -q -d /tmp /tmp/q.zip',
                    `chown -R ${vsCodeUser}:${vsCodeUser} /tmp/q`,
                    'chmod +x /tmp/q/install.sh',
                    `sudo -u ${vsCodeUser} /tmp/q/install.sh --no-confirm`,
                    'rm -rf /tmp/q',
                    'echo "Amazon Q CLI installed"',
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'Installuv',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    `sudo -u ${vsCodeUser} --login curl -fsSL https://astral.sh/uv/install.sh -o /tmp/uv_install.sh`,
                    `sudo -u ${vsCodeUser} --login bash /tmp/uv_install.sh`,
                    `if uv generate-shell-completion bash &>/dev/null; then
  echo 'eval "$(uv generate-shell-completion bash)"' >> /home/${vsCodeUser}/.bashrc
fi`,
                    `if uvx generate-shell-completion bash &>/dev/null; then
  echo 'eval "$(uvx generate-shell-completion bash)"' >> /home/${vsCodeUser}/.bashrc
fi`,
                    'echo "uv installed. Checking configuration"',
                    `sudo -u ${vsCodeUser} --login uv --version`,
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
                    "echo 'alias=python3=python3.11' >> ~/.bashrc",
                    "echo 'alias pip3=pip3.11' >> ~/.bashrc",
                    'python3.11 -m pip install --upgrade pip 2>&1',
                    `sudo -u ${vsCodeUser} --login code-server --install-extension ms-python.python --force`,
                    `if [ -f /home/${vsCodeUser}/.local/share/code-server/User/settings.json ]; then
  sed -i "2i\\\\  \\"python.testing.pytestEnabled\\": true," /home/${vsCodeUser}/.local/share/code-server/User/settings.json
else
  echo '{
    "python.testing.pytestEnabled": true
  }' > /home/${vsCodeUser}/.local/share/code-server/User/settings.json
fi`,
                    'echo "Python and Pip installed. Checking configuration"',
                    'python3.11 --version',
                    'python3.11 -m pip --version 2>&1',
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'InstallJavaDnf',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'dnf install -y java-21-amazon-corretto java-17-amazon-corretto java-1.8.0-amazon-corretto maven',
                    `echo 'export JAVA_8_HOME=/usr/lib/jvm/java-1.8.0-amazon-corretto' >> /home/${vsCodeUser}/.bashrc`,
                    `echo 'export JAVA_8_PATH=/usr/lib/jvm/java-1.8.0-amazon-corretto' >> /home/${vsCodeUser}/.bashrc`,
                    `echo 'export JAVA_17_PATH=/usr/lib/jvm/java-17-amazon-corretto' >> /home/${vsCodeUser}/.bashrc`,
                    `echo 'export JAVA_17_HOME=/usr/lib/jvm/java-17-amazon-corretto' >> /home/${vsCodeUser}/.bashrc`,
                    `echo 'export JAVA_21_PATH=/usr/lib/jvm/java-21-amazon-corretto' >> /home/${vsCodeUser}/.bashrc`,
                    `echo 'export JAVA_21_HOME=/usr/lib/jvm/java-21-amazon-corretto' >> /home/${vsCodeUser}/.bashrc`,
                    `echo 'export JAVA_HOME=/usr/lib/jvm/java-21-amazon-corretto' >> /home/${vsCodeUser}/.bashrc`,
                    `echo 'export PATH=$PATH:$JAVA_HOME/bin:/usr/share/maven/bin' >> /home/${vsCodeUser}/.bashrc`,
                    `sudo -u ${vsCodeUser} --login code-server --install-extension vscjava.vscode-java-pack --force`,
                    'echo "Java and Maven installed. Checking configuration"',
                    'java -version 2>&1',
                    'mvn --version',
                  ],
                },
              },
              {
                action: 'aws:runShellScript',
                name: 'InstallDotnetDnf',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'dnf install -y dotnet-sdk-8.0',
                    'dotnet tool install -g Microsoft.Web.LibraryManager.Cli',
                    `echo 'PATH=$PATH:/home/${vsCodeUser}/.dotnet/tools' >> /home/${vsCodeUser}/.bashrc`,
                    `chown -R ${vsCodeUser}:${vsCodeUser} /home/${vsCodeUser}`,
                    'echo "Dotnet installed. Checking configuration"',
                    'dotnet --list-sdks',
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
                name: 'InstallGolangDnf',
                inputs: {
                  runCommand: [
                    '#!/bin/bash',
                    'dnf install -y golang',
                    `echo 'PATH=$PATH:/home/${vsCodeUser}/go/bin' >> /home/${vsCodeUser}/.bashrc`,
                    'echo "Golang installed. Checking configuration"',
                    'go version',
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

    const onEvent: Function = new InstallerFunction(
      scope,
      'InstallerOnEventHandler',
      {
        timeout: Duration.minutes(15), // 15 minutes to allow for VS Code Server installation
        memorySize: 512, // TODO configurable
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

    const documentArn = Arn.format(
      {
        service: 'ssm',
        resource: 'document',
        resourceName: options.documentName,
      },
      Stack.of(scope),
    );

    const cwManageAgentArn = Arn.format(
      {
        service: 'ssm',
        resource: 'document',
        resourceName: 'AmazonCloudWatch-ManageAgent',
      },
      Stack.of(scope),
    );

    const targetEc2InstanceArn = Arn.format(
      {
        service: 'ec2',
        resource: 'instance',
        resourceName: options.instanceId,
      },
      Stack.of(scope),
    );

    // SendCommand supports resource-level permissions
    onEvent.addToRolePolicy(
      new PolicyStatement({
        actions: ['ssm:SendCommand'],
        resources: [documentArn, cwManageAgentArn, targetEc2InstanceArn],
      }),
    );

    // GetCommandInvocation and ListCommandInvocations require wildcard resources
    // They don't support resource-level permissions
    onEvent.addToRolePolicy(
      new PolicyStatement({
        actions: ['ssm:GetCommandInvocation', 'ssm:ListCommandInvocations'],
        resources: ['*'],
      }),
    );

    // Suppress cdk-nag warning for wildcard permissions on GetCommandInvocation
    // These SSM actions don't support resource-level permissions per AWS documentation
    NagSuppressions.addResourceSuppressions(
      onEvent,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'ssm:GetCommandInvocation and ssm:ListCommandInvocations do not support resource-level permissions and require wildcard resources',
          appliesTo: ['Resource::*'],
        },
      ],
      true,
    );

    const provider = new Provider(scope, 'InstallerProvider', {
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

    new CustomResource(scope, 'SSMInstallerCustomResource', {
      serviceToken: provider.serviceToken,
      properties: {
        ServiceTimeout: Duration.minutes(15).toSeconds() + 5, // Lambda timeout + 5 seconds buffer
        InstanceId: options.instanceId,
        DocumentName: options.documentName,
        CloudWatchLogGroupName: options.cloudWatchLogGroupName,
        VSCodePassword: options.vsCodePassword,
      },
    });
  }

  public _bind() {}
}
