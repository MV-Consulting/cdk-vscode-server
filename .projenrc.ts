import { MvcCdkConstructLibrary } from '@mavogel/mvc-projen';
import { javascript } from 'projen';
const project = new MvcCdkConstructLibrary({
  author: 'Manuel Vogel',
  authorAddress: 'info@manuel-vogel.de',
  cdkVersion: '2.269.0', // Find the latest CDK version here: https://www.npmjs.com/package/aws-cdk-lib + https://www.npmjs.com/package/@aws-cdk/integ-runner
  defaultReleaseBranch: 'main',
  name: 'cdk-vscode-server',
  packageName: '@mavogel/cdk-vscode-server',
  packageManager: javascript.NodePackageManager.NPM,
  projenrcTs: true,
  npmTrustedPublishing: true,
  sampleCode: false,
  repositoryUrl: 'https://github.com/mavogel/cdk-vscode-server.git',
  keywords: ['aws', 'cdk', 'vscode', 'construct', 'server'],
  deps: [
    '@mavogel/mvc-projen@^0.0.35',
    'constructs@^10.5.1',
  ],
  // `@mavogel/mvc-projen` pins its own `projen` dependency (currently ^0.103.20).
  // The default UpgradeDependencies task bumps this project's top-level `projen`
  // devDependency independently (e.g. to 0.101.x), which drifts out of that range:
  // npm then installs a second, nested `projen` for mvc-projen's synthesis, so the
  // generated release workflow's builtin task names (from the nested version) no
  // longer match what the top-level `projen` CLI can resolve at runtime, breaking
  // `npx projen release` with "Cannot find module '.../bump-version.task.js'".
  // Exclude `projen` from auto-upgrade so it stays aligned with mvc-projen's pin;
  // bump it deliberately alongside a `@mavogel/mvc-projen` version bump instead.
  depsUpgradeOptions: {
    exclude: ['projen'],
  },
  // If this module is not jsii-enabled, it must also be declared under bundledDependencie
  bundledDeps: ['node-html-parser'],
  description: 'Running VS Code Server on AWS',
  devDeps: [
    '@aws-sdk/client-ssm',
    '@aws-sdk/client-secrets-manager',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/lib-dynamodb',
    '@aws-sdk/client-cloudwatch',
    '@aws-sdk/client-ec2',
    '@aws-sdk/client-eventbridge',
    '@types/aws-lambda',
    '@types/jsdom',
  ],
  integTestRegions: ['eu-west-1', 'eu-west-2', 'eu-north-1', 'eu-west-3'],
  // Switch from Dependabot to Renovate so the code-server version pinned in
  // src/installer/installer.ts can be tracked via a `# renovate:` annotation.
  dependabot: false,
  renovatebot: true,
  renovatebotOptions: {
    labels: ['dependencies', 'auto-approve'],
    ignore: ['aws-cdk-lib', 'aws-cdk', 'projen'],
    overrideConfig: {
      extends: ['config:recommended', ':preserveSemverRanges'],
      platformAutomerge: true,
      packageRules: [
        {
          matchManagers: ['npm'],
          groupName: 'default',
          matchPackageNames: ['*', '!aws-cdk*', '!projen'],
          automerge: true,
        },
      ],
      customManagers: [
        {
          customType: 'regex',
          managerFilePatterns: ['/(^|/)src/.+\\.ts$/'],
          matchStrings: [
            '// renovate: datasource=(?<datasource>[\\w-]+) depName=(?<depName>[^\\s]+)(?: versioning=(?<versioning>[\\w-]+))?\\s+.*?(?<currentValue>v?\\d+\\.\\d+\\.\\d+[\\w.+-]*)',
          ],
        },
      ],
    },
  },
  // see details for each: https://github.com/cdklabs/publib
  // Go
  // publishToGo: {
  //   moduleName: 'github.com/mavogel/cdk-vscode-server',
  //   githubTokenSecret: 'PROJEN_GITHUB_TOKEN',
  // },
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
    module: 'cdk_vscode_server',
  },
  gitignore: ['settings.local.json'],
});

// Verify CLAUDE.md/AGENTS.md and .claude/.agents skill mirrors stay in sync
// (installed by /setup-rules; see scripts/sync-agent-assets.mjs).
const buildWorkflow = project.github?.tryFindWorkflow('build');
if (buildWorkflow) {
  const buildJob = buildWorkflow.getJob('build');
  if (buildJob && 'steps' in buildJob) {
    buildWorkflow.updateJob('build', {
      ...buildJob,
      steps: [
        ...buildJob.steps,
        {
          name: 'Verify agent asset sync',
          run: 'node scripts/sync-agent-assets.mjs --check',
        },
      ],
    });
  }
}

project.synth();
