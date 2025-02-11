import { MvcCdkConstructLibrary } from '@mavogel/mvc-projen';
import { javascript } from 'projen';
const project = new MvcCdkConstructLibrary({
  author: 'Manuel Vogel',
  authorAddress: 'info@manuel-vogel.de',
  cdkVersion: '2.177.0', // Find the latest CDK version here: https://www.npmjs.com/package/aws-cdk-lib
  defaultReleaseBranch: 'main',
  jsiiVersion: '~5.7.0',
  name: 'cdk-vscode-server',
  packageName: '@mavogel/cdk-vscode-server',
  projenVersion: '0.91.8', // Find the latest projen version here: https://www.npmjs.com/package/projen
  packageManager: javascript.NodePackageManager.NPM,
  projenrcTs: true,
  repositoryUrl: 'https://github.com/MV-Consulting/cdk-vscode-server.git',
  keywords: ['aws', 'cdk', 'vscode', 'construct', 'server'],
  deps: [
    '@mavogel/mvc-projen',
    'constructs@^10.4.2',
    'cdk-nag',
  ],
  // If this module is not jsii-enabled, it must also be declared under bundledDependencie
  bundledDeps: ['node-html-parser'],
  description: 'Running VS Code Server on AWS',
  devDeps: [
    '@aws-sdk/client-ssm',
    '@aws-sdk/client-secrets-manager',
    '@types/aws-lambda',
    '@types/jsdom',
  ],
  // see details for each: https://github.com/cdklabs/publib
  // // Go
  // publishToGo: {
  //   moduleName: 'github.com/MV-Consulting/cdk-vscode-server',
  //   githubTokenSecret: 'PROJEN_GITHUB_TOKEN',
  // },
  // // see https://github.com/cdklabs/publib/issues/1305
  // // Java
  // // publishToMaven: {
  // //   javaPackage: 'io.github.mv-consulting.cdk.vscode.server',
  // //   mavenGroupId: 'io.github.mv-consulting',
  // //   mavenArtifactId: 'cdkvscodeserver',
  // // },

  // // Note: Microsoft Account needed
  // // C# and F# for .NET
  // // publishToNuget: {
  // //   dotNetNamespace: 'MvConsulting',
  // //   packageId: 'CdkVscodeServer',
  // // },
  // // Python
  // publishToPypi: {
  //   distName: 'cdk-vscode-server',
  //   module: 'cdk-vscode-server',
  // },
});

project.synth();