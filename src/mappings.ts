import { LinuxArchitectureType, LinuxFlavorType } from './vscode-server';
/**
 * SSM Parameters for the Architecture and Flavor of the Linux system.
 *
 * aws ssm get-parameters-by-path --path "/aws/service/canonical/ubuntu/" --recursive --query "Parameters[*].Name" --region us-east-1 > canonical-ami.txt
 * aws ssm get-parameters-by-path --path "/aws/service/ami-amazon-linux-latest/" --recursive --query "Parameters[*].Name" --region us-east-1 > amazon-ami.txt
 */
const AmiSSMParameterForLinuxArchitectureAndFlavor = new Map<string, string>([
  // key, value
  [
    'arm-ubuntu22',
    '/aws/service/canonical/ubuntu/server/jammy/stable/current/arm64/hvm/ebs-gp2/ami-id',
  ],
  [
    'arm-ubuntu24',
    '/aws/service/canonical/ubuntu/server/noble/stable/current/arm64/hvm/ebs-gp3/ami-id',
  ],
  [
    'arm-ubuntu25',
    '/aws/service/canonical/ubuntu/server/plucky/stable/current/arm64/hvm/ebs-gp3/ami-id',
  ],
  [
    'arm-al2023',
    '/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64',
  ],
  [
    'amd64-ubuntu22',
    '/aws/service/canonical/ubuntu/server/jammy/stable/current/amd64/hvm/ebs-gp2/ami-id',
  ],
  [
    'amd64-ubuntu24',
    '/aws/service/canonical/ubuntu/server/noble/stable/current/amd64/hvm/ebs-gp3/ami-id',
  ],
  [
    'amd64-ubuntu25',
    '/aws/service/canonical/ubuntu/server/plucky/stable/current/amd64/hvm/ebs-gp3/ami-id',
  ],
  [
    'amd64-al2023',
    '/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64',
  ],
]);

export function getAmiSSMParameterForLinuxArchitectureAndFlavor(
  arch: LinuxArchitectureType,
  flavor: LinuxFlavorType,
): string {
  if (AmiSSMParameterForLinuxArchitectureAndFlavor.has(`${arch}-${flavor}`)) {
    return AmiSSMParameterForLinuxArchitectureAndFlavor.get(
      `${arch}-${flavor}`,
    )!;
  }
  throw new Error(
    `Linux architecture '${arch}' and flavor '${flavor}' not supported`,
  );
}
