// Running VS Code Server on AWS
package mavogelcdkvscodeserver

import (
	"reflect"

	_jsii_ "github.com/aws/jsii-runtime-go/runtime"
)

func init() {
	_jsii_.RegisterEnum(
		"@mavogel/cdk-vscode-server.LinuxArchitectureType",
		reflect.TypeOf((*LinuxArchitectureType)(nil)).Elem(),
		map[string]interface{}{
			"ARM": LinuxArchitectureType_ARM,
			"AMD64": LinuxArchitectureType_AMD64,
		},
	)
	_jsii_.RegisterEnum(
		"@mavogel/cdk-vscode-server.LinuxFlavorType",
		reflect.TypeOf((*LinuxFlavorType)(nil)).Elem(),
		map[string]interface{}{
			"UBUNTU_22": LinuxFlavorType_UBUNTU_22,
			"UBUNTU_24": LinuxFlavorType_UBUNTU_24,
			"AMAZON_LINUX_2023": LinuxFlavorType_AMAZON_LINUX_2023,
		},
	)
	_jsii_.RegisterClass(
		"@mavogel/cdk-vscode-server.VSCodeServer",
		reflect.TypeOf((*VSCodeServer)(nil)).Elem(),
		[]_jsii_.Member{
			_jsii_.MemberProperty{JsiiProperty: "domainName", GoGetter: "DomainName"},
			_jsii_.MemberProperty{JsiiProperty: "node", GoGetter: "Node"},
			_jsii_.MemberProperty{JsiiProperty: "password", GoGetter: "Password"},
			_jsii_.MemberMethod{JsiiMethod: "toString", GoMethod: "ToString"},
		},
		func() interface{} {
			j := jsiiProxy_VSCodeServer{}
			_jsii_.InitJsiiProxy(&j.Type__constructsConstruct)
			return &j
		},
	)
	_jsii_.RegisterStruct(
		"@mavogel/cdk-vscode-server.VSCodeServerProps",
		reflect.TypeOf((*VSCodeServerProps)(nil)).Elem(),
	)
}
