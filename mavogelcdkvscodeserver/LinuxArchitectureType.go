package mavogelcdkvscodeserver


// The architecture of the cpu you want to run vscode server on.
type LinuxArchitectureType string

const (
	// ARM architecture.
	LinuxArchitectureType_ARM LinuxArchitectureType = "ARM"
	// AMD64 architecture.
	LinuxArchitectureType_AMD64 LinuxArchitectureType = "AMD64"
)

