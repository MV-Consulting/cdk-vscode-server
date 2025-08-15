# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a CDK construct library for deploying VS Code Server on AWS, designed for development and workshop purposes. The project creates a complete infrastructure setup that allows users to run a cloud-based VS Code instance accessible through CloudFront.

## Development Commands

### Build and Test
```bash
# Build the project (TypeScript compilation, bundling, etc.)
npx projen build

# Run tests
npx projen test

# Run tests in watch mode
npx projen test:watch

# Run a single test file
npx jest test/vscode-server.test.ts

# Run integration tests (deploys to AWS)
npm run integ-test
```

### Code Quality
```bash
# Run ESLint
npx projen eslint

# AWS CDK linting
npm run awslint
```

### Package Management
```bash
# Install dependencies and update projen
npx projen

# Build and package for all targets (JS, Python, Go)
npx projen package-all

# Package for specific target
npx projen package:js
npx projen package:python
npx projen package:go
```

### Lambda Functions
```bash
# Bundle installer Lambda
npx projen bundle:installer/installer.lambda

# Bundle secret retriever Lambda
npx projen bundle:secret-retriever/secret-retriever.lambda

# Watch mode for development
npx projen bundle:installer/installer.lambda:watch
```

## Architecture Overview

### Core Components

**Main Construct (`src/vscode-server.ts`)**:
- `VSCodeServer` - Primary construct that orchestrates the entire solution
- Creates VPC, EC2 instance, CloudFront distribution, security groups
- Supports Ubuntu 22/24 and Amazon Linux 2023
- Configurable instance types, storage, and additional permissions

**Infrastructure Components**:
- **VPC**: Single AZ public subnet configuration
- **EC2 Instance**: Configurable instance with pre-installed development tools
- **CloudFront**: Distribution for secure access with cache policies
- **Security Groups**: Restricted to CloudFront prefix lists only
- **IAM**: Comprehensive role for CDK operations and AWS service access

**Lambda Functions** (`src/installer/`, `src/secret-retriever/`):
- **Installer**: Custom resource for OS-specific VS Code server installation
- **Secret Retriever**: Custom resource for extracting generated passwords

**Utility Modules**:
- `src/mappings.ts` - AMI mappings for different OS/architecture combinations  
- `src/prefixlist-retriever/` - AWS managed prefix list retrieval
- `src/suppress-nags.ts` - CDK-nag suppression patterns

### Supported Configurations

**Operating Systems**:
- Ubuntu 22.04 LTS (`LinuxFlavorType.UBUNTU_22`)
- Ubuntu 24.04 LTS (`LinuxFlavorType.UBUNTU_24`) 
- Amazon Linux 2023 (`LinuxFlavorType.AMAZON_LINUX_2023`)

**Architectures**:
- ARM64 (`LinuxArchitectureType.ARM`)
- x86_64 (`LinuxArchitectureType.AMD64`)

**Default Instance**: m7g.xlarge (ARM-based Graviton3)

## Project Structure

```
src/
├── index.ts                    # Main export
├── vscode-server.ts           # Core VSCodeServer construct
├── mappings.ts                # AMI mappings
├── installer/                 # Installation Lambda functions
├── secret-retriever/          # Password generation utilities  
└── prefixlist-retriever/      # AWS prefix list utilities

test/
├── vscode-server.test.ts      # Unit tests
└── installer/                 # Lambda function tests

integ-tests/
├── integ.ubuntu.ts           # Ubuntu integration tests
└── integ.al2023.ts           # Amazon Linux integration tests

examples/
├── simple/                   # Basic usage example
└── custom/                   # Advanced configuration example
```

## Key Properties and Customization

The `VSCodeServerProps` interface allows extensive customization:

- **Instance Configuration**: `instanceClass`, `instanceSize`, `instanceVolumeSize`
- **Operating System**: `instanceOperatingSystem`, `instanceCpuArchitecture`  
- **VS Code Settings**: `vscodeUser`, `vscodePassword`, `homeFolder`
- **Development Server**: `devServerBasePath`, `devServerPort`
- **Extensions**: `additionalInstanceRolePolicies`, `additionalTags`

## Important Development Notes

- This is a **Projen-managed project** - all configuration changes should be made in `.projenrc.ts` (not found in current structure, likely generated)
- The project uses **JSII** for multi-language support (TypeScript, Python, Go)
- **CDK-nag** is integrated for security compliance checking
- Integration tests deploy real AWS resources and require valid AWS credentials
- Lambda functions are bundled using esbuild for optimal performance
- CloudFront distribution includes custom cache policies for VS Code Server compatibility

## Security Considerations

- Security groups restrict access to CloudFront IPs only
- Instance role includes broad permissions for workshop scenarios (not production-ready)
- Secrets Manager integration for password generation
- EBS encryption enabled by default
- IMDSv2 required on EC2 instances

## Testing Strategy

- **Unit Tests**: Mock-based testing of construct logic
- **Integration Tests**: Full deployment testing in multiple regions (eu-west-1, eu-west-2)
- **Coverage Reports**: Generated in `coverage/` directory with multiple formats
- **Jest Configuration**: Includes JUnit reporter for CI/CD integration