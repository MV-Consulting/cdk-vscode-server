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
	// Folder to open in VS Code server.
	// Default: - /Workshop.
	//
	// Experimental.
	HomeFolder *string `field:"optional" json:"homeFolder" yaml:"homeFolder"`
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

