//go:build no_runtime_type_checking

package mavogelcdkvscodeserver

// Building without runtime type checking enabled, so all the below just return nil

func validateVSCodeServer_IsConstructParameters(x interface{}) error {
	return nil
}

func validateNewVSCodeServerParameters(scope constructs.Construct, id *string, props *VSCodeServerProps) error {
	return nil
}

