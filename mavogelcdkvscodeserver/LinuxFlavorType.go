package mavogelcdkvscodeserver


// The flavor of linux you want to run vscode server on.
type LinuxFlavorType string

const (
	// Ubuntu 22.
	LinuxFlavorType_UBUNTU_22 LinuxFlavorType = "UBUNTU_22"
	// Ubuntu 24.
	LinuxFlavorType_UBUNTU_24 LinuxFlavorType = "UBUNTU_24"
	// Amazon Linux 2023.
	LinuxFlavorType_AMAZON_LINUX_2023 LinuxFlavorType = "AMAZON_LINUX_2023"
)

