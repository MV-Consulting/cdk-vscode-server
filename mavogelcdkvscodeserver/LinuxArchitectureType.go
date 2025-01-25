package mavogelcdkvscodeserver


// The architecture of the cpu you want to run vscode server on.
type LinuxArchitectureType string

const (
	LinuxArchitectureType_ARM LinuxArchitectureType = "ARM"
	LinuxArchitectureType_AMD64 LinuxArchitectureType = "AMD64"
)

