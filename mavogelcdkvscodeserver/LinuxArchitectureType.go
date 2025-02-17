package mavogelcdkvscodeserver


// The architecture of the cpu you want to run vscode server on.
// Experimental.
type LinuxArchitectureType string

const (
	// ARM architecture.
	// Experimental.
	LinuxArchitectureType_ARM LinuxArchitectureType = "ARM"
	// AMD64 architecture.
	// Experimental.
	LinuxArchitectureType_AMD64 LinuxArchitectureType = "AMD64"
)

