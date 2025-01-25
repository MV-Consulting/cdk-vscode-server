import { awscdk, ReleasableCommits } from "projen";
import { LambdaRuntime } from "projen/lib/awscdk";
import { DependabotScheduleInterval } from "projen/lib/github";
import { JobStep } from "projen/lib/github/workflows-model";
import { NpmAccess } from "projen/lib/javascript";
const project = new awscdk.AwsCdkConstructLibrary({
  author: "Manuel Vogel",
  authorAddress: "info@manuel-vogel.de",
  cdkVersion: "2.177.0", // Find the latest CDK version here: https://www.npmjs.com/package/aws-cdk-lib
  defaultReleaseBranch: "main",
  jsiiVersion: "~5.5.0",
  name: "cdk-vscode-server",
  packageName: "@mavogel/cdk-vscode-server",
  projenVersion: "0.91.6", // Find the latest projen version here: https://www.npmjs.com/package/projen
  projenrcTs: true,
  repositoryUrl: "https://github.com/MV-Consulting/cdk-vscode-server.git",
  npmAccess:
    NpmAccess.PUBLIC /* The npm access level to use when releasing this module. */,
  keywords: ["aws", "cdk", "vscode", "construct", "server"],
  lambdaOptions: {
    runtime: new LambdaRuntime("nodejs22.x", "node22"),
    awsSdkConnectionReuse: false, // doesn't exist in AWS SDK JS v3
  },
  autoApproveOptions: {
    allowedUsernames: [
      "dependabot",
      "dependabot[bot]",
      "github-bot",
      "github-actions[bot]",
    ],
    /**
     * The name of the secret that has the GitHub PAT for auto-approving PRs with permissions repo, workflow, write:packages
     * Generate a new PAT (https://github.com/settings/tokens/new) and add it to your repo's secrets
     */
    secret: "PROJEN_GITHUB_TOKEN",
  },
  dependabot: true,
  dependabotOptions: {
    scheduleInterval: DependabotScheduleInterval.WEEKLY,
    labels: ["dependencies", "auto-approve"],
    groups: {
      default: {
        patterns: ["*"],
        excludePatterns: ["aws-cdk*", "projen"],
      },
    },
    ignore: [{ dependencyName: "aws-cdk-lib" }, { dependencyName: "aws-cdk" }],
  },
  // See https://github.com/projen/projen/discussions/4040#discussioncomment-11905628
  releasableCommits: ReleasableCommits.ofType([
    "feat",
    "fix",
    "chore",
    "refactor",
    "perf",
  ]),
  githubOptions: {
    pullRequestLintOptions: {
      semanticTitleOptions: {
        // see commit types here: https://www.conventionalcommits.org/en/v1.0.0/#summary
        types: [
          "feat",
          "fix",
          "chore",
          "refactor",
          "perf",
          "docs",
          "style",
          "test",
          "build",
          "ci",
        ],
      },
    },
  },
  versionrcOptions: {
    types: [
      { type: "feat", section: "Features" },
      { type: "fix", section: "Bug Fixes" },
      { type: "chore", section: "Chores" },
      { type: "docs", section: "Docs" },
      { type: "style", hidden: true },
      { type: "refactor", hidden: true },
      { type: "perf", section: "Performance" },
      { type: "test", hidden: true },
    ],
  },
  eslintOptions: {
    prettier: true,
    dirs: ["src"],
    ignorePatterns: ["**/*-function.ts", "examples/"],
  },
  gitignore: ["tmp", ".codegpt"],
  deps: ["cdk-nag"],
  // If this module is not jsii-enabled, it must also be declared under bundledDependencie
  bundledDeps: ["node-html-parser"],
  description: "Running VS Code Server on AWS",
  devDeps: [
    "@aws-sdk/client-ssm",
    "@aws-sdk/client-secrets-manager",
    "@aws-cdk/integ-runner@^2.177.0-alpha.0",
    "@aws-cdk/integ-tests-alpha@^2.177.0-alpha.0",
    "@commitlint/cli",
    "@commitlint/config-conventional",
    "@types/aws-lambda",
    "@types/jsdom",
    "awslint",
    "husky",
  ],
  // experimentalIntegRunner: true,
  // manual integ test setup
  tsconfigDev: {
    compilerOptions: {},
    include: ["integ-tests/**/*.ts"],
  },
  // see details for each: https://github.com/cdklabs/publib
  // Go
  publishToGo: {
    moduleName: "github.com/MV-Consulting/cdk-vscode-server",
    githubTokenSecret: "PROJEN_GITHUB_TOKEN",
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
    distName: "cdk-vscode-server",
    module: "cdk-vscode-server",
  },
  pullRequestTemplateContents: [
    `
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
  `,
  ],
  // NOTE: issue templates are not supported yet. See https://github.com/projen/projen/pull/3648
  // issueTemplates: {}
});

project.package.setScript("prepare", "husky");
project.package.setScript("awslint", "awslint");
project.package.setScript(
  "integ-test",
  "integ-runner --directory ./integ-tests --parallel-regions eu-west-1 --parallel-regions eu-west-2 --update-on-failed",
);
updateGitHubWorkflows();
project.synth();


function updateGitHubWorkflows() {
  // .github/workflows/build.yml
  const buildWorkflow = project.github?.tryFindWorkflow("build");
  if (!buildWorkflow) return;
  const buildJob = buildWorkflow.getJob("build");
  if (!buildJob || !("steps" in buildJob)) return;
  // TODO: figure out why wrong types
  const getBuildSteps = buildJob.steps as unknown as () => JobStep[];
  const buildJobSteps = getBuildSteps();
  buildWorkflow.updateJob("build", {
    ...buildJob,
    steps: [
      ...buildJobSteps.slice(0, 4),
      {
        name: "Run awslint",
        run: "yarn awslint",
      },
      ...buildJobSteps.slice(4),
    ],
  });
}