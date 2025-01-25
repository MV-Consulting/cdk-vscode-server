package mavogelcdkvscodeserver

import (
	_jsii_ "github.com/aws/jsii-runtime-go/runtime"
	_init_ "github.com/MV-Consulting/cdk-vscode-server/mavogelcdkvscodeserver/jsii"

	"github.com/aws/constructs-go/constructs/v10"
	"github.com/MV-Consulting/cdk-vscode-server/mavogelcdkvscodeserver/internal"
)

// VSCodeServer - spin it up in under 10 minutes.
type VSCodeServer interface {
	constructs.Construct
	// The name of the domain the server is reachable.
	DomainName() *string
	// The tree node.
	Node() constructs.Node
	// The password to login to the server.
	Password() *string
	// Returns a string representation of this construct.
	ToString() *string
}

// The jsii proxy struct for VSCodeServer
type jsiiProxy_VSCodeServer struct {
	internal.Type__constructsConstruct
}

func (j *jsiiProxy_VSCodeServer) DomainName() *string {
	var returns *string
	_jsii_.Get(
		j,
		"domainName",
		&returns,
	)
	return returns
}

func (j *jsiiProxy_VSCodeServer) Node() constructs.Node {
	var returns constructs.Node
	_jsii_.Get(
		j,
		"node",
		&returns,
	)
	return returns
}

func (j *jsiiProxy_VSCodeServer) Password() *string {
	var returns *string
	_jsii_.Get(
		j,
		"password",
		&returns,
	)
	return returns
}


func NewVSCodeServer(scope constructs.Construct, id *string, props *VSCodeServerProps) VSCodeServer {
	_init_.Initialize()

	if err := validateNewVSCodeServerParameters(scope, id, props); err != nil {
		panic(err)
	}
	j := jsiiProxy_VSCodeServer{}

	_jsii_.Create(
		"@mavogel/cdk-vscode-server.VSCodeServer",
		[]interface{}{scope, id, props},
		&j,
	)

	return &j
}

func NewVSCodeServer_Override(v VSCodeServer, scope constructs.Construct, id *string, props *VSCodeServerProps) {
	_init_.Initialize()

	_jsii_.Create(
		"@mavogel/cdk-vscode-server.VSCodeServer",
		[]interface{}{scope, id, props},
		v,
	)
}

// Checks if `x` is a construct.
//
// Returns: true if `x` is an object created from a class which extends `Construct`.
// Deprecated: use `x instanceof Construct` instead.
func VSCodeServer_IsConstruct(x interface{}) *bool {
	_init_.Initialize()

	if err := validateVSCodeServer_IsConstructParameters(x); err != nil {
		panic(err)
	}
	var returns *bool

	_jsii_.StaticInvoke(
		"@mavogel/cdk-vscode-server.VSCodeServer",
		"isConstruct",
		[]interface{}{x},
		&returns,
	)

	return returns
}

func (v *jsiiProxy_VSCodeServer) ToString() *string {
	var returns *string

	_jsii_.Invoke(
		v,
		"toString",
		nil, // no parameters
		&returns,
	)

	return returns
}

