import { App, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { VSCodeServer } from "../../src/index";

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // Example 1: Custom domain with existing certificate
    // Nginx will be configured with: server_name *.cloudfront.net vscode.example.com;
    new VSCodeServer(this, "vscode-with-existing-cert", {
      domainName: "vscode.example.com",
      hostedZoneId: "Z123EXAMPLE456",
      certificateArn:
        "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012",
    });

    // Example 2: Custom domain with auto-created certificate
    // Nginx will be configured with: server_name *.cloudfront.net vscode-auto.example.com;
    new VSCodeServer(this, "vscode-with-auto-cert", {
      domainName: "vscode-auto.example.com",
      hostedZoneId: "Z123EXAMPLE456",
      autoCreateCertificate: true,
    });

    // Example 3: Custom domain with hosted zone lookup (auto-discovery)
    // Nginx will be configured with: server_name *.cloudfront.net vscode-lookup.example.com;
    new VSCodeServer(this, "vscode-with-zone-lookup", {
      domainName: "vscode-lookup.example.com",
      autoCreateCertificate: true,
      // hostedZoneId not provided - will be auto-discovered
    });

    // Example 4: Default behavior (no custom domain)
    // Nginx will be configured with: server_name *.cloudfront.net;
    new VSCodeServer(this, "vscode-default", {
      // No domain configuration - uses CloudFront default domain only
    });
  }
}

const env = {
  account: "123456789012",
  region: "eu-central-1",
};

const app = new App();
new MyStack(app, "vscode-server-custom-domain", { env });
app.synth();
