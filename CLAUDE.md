# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a JSII-enabled CDK construct library published to npm, PyPI, and Go that deploys VS Code Server on AWS. It's designed for workshop/development purposes and creates infrastructure for running a cloud-based VS Code instance accessible through CloudFront.

**Key Characteristics**:
- **Projen-managed**: All project configuration is in `.projenrc.ts` - run `npx projen` after modifying it
- **Multi-language**: TypeScript source published to Python and Go via JSII
- **Not production-ready**: Intentionally permissive for workshop scenarios

## Development Commands

### Build and Test
```bash
# Build project (compiles TS, bundles Lambdas, generates API docs)
npx projen build

# Run unit tests
npx projen test

# Run single test file
npx jest test/vscode-server.test.ts

# Run tests in watch mode
npx projen test:watch

# Integration tests (deploys to eu-west-1, eu-west-2, eu-north-1)
npm run integ-test
```

### Code Quality
```bash
# ESLint
npx projen eslint

# AWS CDK-specific linting (awslint rules)
npm run awslint
```

### Lambda Development
```bash
# Bundle specific Lambda
npx projen bundle:installer/installer.lambda
npx projen bundle:secret-retriever/secret-retriever.lambda

# Watch mode for development
npx projen bundle:installer/installer.lambda:watch
```

### Publishing
```bash
# Package for all targets (JS, Python, Go)
npx projen package-all

# Package specific target
npx projen package:js
npx projen package:python
npx projen package:go
```

## Architecture

### Main Construct (`VSCodeServer`)
Located in `src/vscode-server.ts`, orchestrates:
- VPC with single public subnet
- EC2 instance (default: m7g.xlarge Graviton3 ARM)
- CloudFront distribution with custom cache policies for VS Code Server
- Security groups (CloudFront prefix list restriction only)
- IAM role with CDK permissions for workshop use
- Optional Route53 + ACM certificate integration via `domainName` prop

### Custom Resources Pattern
Uses Lambda-backed custom resources via CDK Provider construct:
- **Installer** (`src/installer/`): OS-specific VS Code Server installation via SSM documents
- **SecretRetriever** (`src/secret-retriever/`): Extracts generated password from Secrets Manager
- **PrefixListRetriever** (`src/prefixlist-retriever/`): Fetches AWS-managed CloudFront prefix lists

### AMI Selection
`src/mappings.ts` contains SSM parameter paths for:
- Ubuntu 22/24 (ARM + x86_64)
- Amazon Linux 2023 (ARM + x86_64)

Function `getAmiSSMParameterForLinuxArchitectureAndFlavor()` returns region-specific SSM parameter for latest AMI.

### Key Props
`VSCodeServerProps` in `src/vscode-server.ts:27-155`:
- **Instance**: `instanceClass`, `instanceSize`, `instanceVolumeSize`
- **OS**: `instanceOperatingSystem` (LinuxFlavorType enum), `instanceCpuArchitecture` (LinuxArchitectureType enum)
- **VS Code**: `vscodeUser`, `vscodePassword`, `homeFolder`, `devServerPort`, `devServerBasePath`
- **Domain**: `domainName`, `hostedZoneId`, `certificateArn`, `autoCreateCertificate`
- **Extensions**: `additionalInstanceRolePolicies`, `additionalTags`

## Important Patterns

### Projen Workflow
1. Edit `.projenrc.ts` for project changes (dependencies, build config, etc.)
2. Run `npx projen` to regenerate managed files
3. Never manually edit `package.json`, task definitions, or GitHub workflows

### JSII Constraints
- All public APIs must be JSII-compatible (no TS-specific types)
- Bundled dependencies (like `node-html-parser`) in Lambda code must be listed in `.projenrc.ts` `bundledDeps`
- Lambda functions use esbuild bundling configured via Projen

### CDK-nag Integration
- `src/suppress-nags.ts` contains suppression patterns
- Suppressions are applied via `NagSuppressions.addResourceSuppressions()` throughout construct code
- Necessary because workshop design intentionally violates production best practices (e.g., broad IAM permissions)

### Integration Tests
- Located in `integ-tests/`
- Use `@aws-cdk/integ-tests-alpha` framework
- Deploy actual stacks to 3 regions in parallel
- Include assertion tests (e.g., login test via Lambda in `integ-tests/functions/`)
- Run with `npm run integ-test` (requires AWS credentials)

## Domain/Certificate Feature (feat/route53-domain branch)
When `domainName` prop is provided:
- Creates Route53 A record pointing to CloudFront distribution
- Supports `autoCreateCertificate` flag to create ACM cert in us-east-1 with DNS validation
- Alternatively accepts existing `certificateArn`
- Auto-discovers hosted zone if `hostedZoneId` not provided