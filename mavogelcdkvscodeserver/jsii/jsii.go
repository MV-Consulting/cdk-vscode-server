// Package jsii contains the functionaility needed for jsii packages to
// initialize their dependencies and themselves. Users should never need to use this package
// directly. If you find you need to - please report a bug at
// https://github.com/aws/jsii/issues/new/choose
package jsii

import (
	_                "embed"

	_jsii_           "github.com/aws/jsii-runtime-go/runtime"

	awscdk           "github.com/aws/aws-cdk-go/awscdk/v2/jsii"
	constructs       "github.com/aws/constructs-go/constructs/v10/jsii"
	cdknag           "github.com/cdklabs/cdk-nag-go/cdknag/v2/jsii"
	mavogelmvcprojen "github.com/MV-Consulting/mvc-projen/mavogelmvcprojen/jsii"
)

//go:embed mavogel-cdk-vscode-server-0.0.53.tgz
var tarball []byte

// Initialize loads the necessary packages in the @jsii/kernel to support the enclosing module.
// The implementation is idempotent (and hence safe to be called over and over).
func Initialize() {
	// Ensure all dependencies are initialized
	mavogelmvcprojen.Initialize()
	awscdk.Initialize()
	cdknag.Initialize()
	constructs.Initialize()

	// Load this library into the kernel
	_jsii_.Load("@mavogel/cdk-vscode-server", "0.0.53", tarball)
}
