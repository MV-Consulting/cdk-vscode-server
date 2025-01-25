import { awscdk } from 'projen';
import { NpmAccess } from 'projen/lib/javascript';
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Manuel Vogel',
  authorAddress: 'info@manuel-vogel.de',
  cdkVersion: '2.165.0',
  defaultReleaseBranch: 'main',
  jsiiVersion: '~5.5.0',
  name: 'cdk-vscode-server',
  packageName: '@mavogel/cdk-vscode-server',
  projenrcTs: true,
  repositoryUrl: 'https://github.com/MV-Consulting/cdk-vscode-server.git',
  npmAccess: NpmAccess.PUBLIC, /* The npm access level to use when releasing this module. */
  keywords: ['aws', 'cdk', 'vscode', 'construct', 'server'],
  autoApproveOptions: {
    allowedUsernames: ['mavogel'],
  },
  autoApproveUpgrades: true,
  depsUpgradeOptions: {
    workflowOptions: {
      labels: ['auto-approve'],
    },
  },
  gitignore: [
    'tmp',
    '.codegpt',
  ],
  deps: [
    'cdk-nag',
  ],
  // If this module is not jsii-enabled, it must also be declared under bundledDependencie
  bundledDeps: [
    'node-html-parser',
  ],
  description: 'Running VS Code Server on AWS',
  devDeps: [
    '@aws-sdk/client-ssm',
    '@aws-sdk/client-secrets-manager',
    '@types/aws-lambda',
    '@aws-cdk/integ-runner@^2.165.0-alpha.0',
    '@aws-cdk/integ-tests-alpha@^2.165.0-alpha.0',
    '@types/jsdom',
  ],
  // experimentalIntegRunner: true,
  // manual integ test setup
  tsconfigDev: {
    compilerOptions: {
    },
    include: [
      'integ-tests/**/*.ts',
    ],
  },
  // see details for each: https://github.com/cdklabs/publib
  // Go
  publishToGo: {
    moduleName: 'github.com/MV-Consulting/cdk-vscode-server',
    githubTokenSecret: 'PROJEN_GITHUB_TOKEN',
  },
  // see https://github.com/cdklabs/publib/issues/1305
  // Java
  // publishToMaven: {
  //   javaPackage: 'io.github.mv-consulting.cdk.vscode.server',
  //   mavenGroupId: 'io.github.mv-consulting',
  //   mavenArtifactId: 'cdkvscodeserver',
  // },

  // Note: Microsoft Account needed
  // C# and F# for .NET
  // publishToNuget: {
  //   dotNetNamespace: 'MvConsulting',
  //   packageId: 'CdkVscodeServer',
  // },
  // Python
  publishToPypi: {
    distName: 'cdk-vscode-server',
    module: 'cdk-vscode-server',
  },
  pullRequestTemplateContents: [`
**Please check if the PR fulfills these requirements**
- [ ] The commit message describes your change
- [ ] Tests for the changes have been added if possible (for bug fixes / features)
- [ ] Docs have been added / updated (for bug fixes / features)

**What kind of change does this PR introduce? (Bug fix, feature, documentation, performance ...)**
> add here...

**What is the current behaviour? (You can also link to an open issue here)**
> add here...

**What is the new behaviour (if this is a feature change)?**
> add here...

**Does this PR introduce a breaking change? (What changes might users need to make in their setup due to this PR?)**
> add here...

**Environment**
- \`node --version\`:
- \`npx cdk --version\`:
- version of the construct: \`x.x.x\`
  `],
  // NOTE: issue templates are not supported yet. See https://github.com/projen/projen/pull/3648
});

project.package.setScript('integ-test', 'integ-runner --directory ./integ-tests --parallel-regions eu-west-1 --parallel-regions eu-west-2 --update-on-failed');
project.synth();