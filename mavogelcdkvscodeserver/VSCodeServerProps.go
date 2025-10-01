package mavogelcdkvscodeserver

import (
	"github.com/aws/aws-cdk-go/awscdk/v2/awsec2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
)

// Properties for the VSCodeServer construct.
// Experimental.
type VSCodeServerProps struct {
	// Additional instance role policies.
	// Default: - [].
	//
	// Experimental.
	AdditionalInstanceRolePolicies *[]awsiam.PolicyStatement `field:"optional" json:"additionalInstanceRolePolicies" yaml:"additionalInstanceRolePolicies"`
	// Additional tags to add to the instance.
	// Default: - {}.
	//
	// Experimental.
	AdditionalTags *map[string]*string `field:"optional" json:"additionalTags" yaml:"additionalTags"`
	// Auto-create ACM certificate with DNS validation in us-east-1 region Requires hostedZoneId to be provided for DNS validation Cannot be used together with certificateArn Certificate will automatically be created in us-east-1 as required by CloudFront.
	// Default: false.
	//
	// Experimental.
	AutoCreateCertificate *bool `field:"optional" json:"autoCreateCertificate" yaml:"autoCreateCertificate"`
	// ARN of existing ACM certificate for the domain Certificate must be in us-east-1 region for CloudFront Cannot be used together with autoCreateCertificate.
	// Default: - auto-create certificate if autoCreateCertificate is true.
	//
	// Experimental.
	CertificateArn *string `field:"optional" json:"certificateArn" yaml:"certificateArn"`
	// Base path for the application to be added to Nginx sites-available list.
	// Default: - app.
	//
	// Experimental.
	DevServerBasePath *string `field:"optional" json:"devServerBasePath" yaml:"devServerBasePath"`
	// Port for the DevServer.
	// Default: - 8081.
	//
	// Experimental.
	DevServerPort *float64 `field:"optional" json:"devServerPort" yaml:"devServerPort"`
	// Custom domain name for the VS Code server When provided, creates a CloudFront distribution with this domain name and sets up Route53 A record pointing to the distribution.
	// Default: - uses CloudFront default domain.
	//
	// Experimental.
	DomainName *string `field:"optional" json:"domainName" yaml:"domainName"`
	// Folder to open in VS Code server.
	// Default: - /Workshop.
	//
	// Experimental.
	HomeFolder *string `field:"optional" json:"homeFolder" yaml:"homeFolder"`
	// Route53 hosted zone ID for the domain Required when using autoCreateCertificate If not provided, will attempt to lookup hosted zone from domain name.
	// Default: - auto-discover from domain name.
	//
	// Experimental.
	HostedZoneId *string `field:"optional" json:"hostedZoneId" yaml:"hostedZoneId"`
	// VSCode Server EC2 instance class.
	// Default: - m7g.
	//
	// Experimental.
	InstanceClass awsec2.InstanceClass `field:"optional" json:"instanceClass" yaml:"instanceClass"`
	// VSCode Server EC2 cpu architecture for the operating system.
	// Default: - arm.
	//
	// Experimental.
	InstanceCpuArchitecture LinuxArchitectureType `field:"optional" json:"instanceCpuArchitecture" yaml:"instanceCpuArchitecture"`
	// VSCode Server EC2 instance name.
	// Default: - VSCodeServer.
	//
	// Experimental.
	InstanceName *string `field:"optional" json:"instanceName" yaml:"instanceName"`
	// VSCode Server EC2 operating system.
	// Default: - Ubuntu-22.
	//
	// Experimental.
	InstanceOperatingSystem LinuxFlavorType `field:"optional" json:"instanceOperatingSystem" yaml:"instanceOperatingSystem"`
	// VSCode Server EC2 instance size.
	// Default: - xlarge.
	//
	// Experimental.
	InstanceSize awsec2.InstanceSize `field:"optional" json:"instanceSize" yaml:"instanceSize"`
	// VSCode Server EC2 instance volume size in GB.
	// Default: - 40.
	//
	// Experimental.
	InstanceVolumeSize *float64 `field:"optional" json:"instanceVolumeSize" yaml:"instanceVolumeSize"`
	// Password for VSCode Server.
	// Default: - empty and will then be generated.
	//
	// Experimental.
	VscodePassword *string `field:"optional" json:"vscodePassword" yaml:"vscodePassword"`
	// UserName for VSCode Server.
	// Default: - participant.
	//
	// Experimental.
	VscodeUser *string `field:"optional" json:"vscodeUser" yaml:"vscodeUser"`
}

