package ssh

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/RunMaestro/Maestro/internal/types"
	"golang.org/x/crypto/ssh"
	"golang.org/x/crypto/ssh/agent"
)

// SshService provides methods for managing SSH connections and executing remote commands.
type SshService struct {
	// Default options similar to TS implementation
	connectTimeout time.Duration
}

// NewSshService creates a new SshService instance.
func NewSshService() *SshService {
	return &SshService{
		connectTimeout: 10 * time.Second,
	}
}

// Client wraps an ssh.Client and provides high-level methods.
type Client struct {
	*ssh.Client
	config *types.SshRemoteConfig
}

// GetClient creates an SSH client for the given configuration.
func (s *SshService) GetClient(config *types.SshRemoteConfig) (*Client, error) {
	authMethods := []ssh.AuthMethod{}

	// 1. Try SSH Agent
	if socket := os.Getenv("SSH_AUTH_SOCK"); socket != "" {
		if conn, err := net.Dial("unix", socket); err == nil {
			agentClient := agent.NewClient(conn)
			authMethods = append(authMethods, ssh.PublicKeysCallback(agentClient.Signers))
		}
	}

	// 2. Try Private Key if path is provided
	if config.PrivateKeyPath != "" {
		keyPath := expandTilde(config.PrivateKeyPath)
		key, err := os.ReadFile(keyPath)
		if err == nil {
			signer, err := ssh.ParsePrivateKey(key)
			if err == nil {
				authMethods = append(authMethods, ssh.PublicKeys(signer))
			} else {
				// Check if it's a passphrase protected key
				if strings.Contains(err.Error(), "passphrase") {
					return nil, fmt.Errorf("private key is passphrase protected: %w", err)
				}
			}
		}
	}

	// Default username to current user if not provided
	username := config.Username
	if username == "" {
		username = os.Getenv("USER")
		if username == "" {
			username = os.Getenv("USERNAME")
		}
	}

	sshConfig := &ssh.ClientConfig{
		User:            username,
		Auth:            authMethods,
		HostKeyCallback: ssh.InsecureIgnoreHostKey(), // Equivalent to 'accept-new' logic in TS for simplicity
		Timeout:         s.connectTimeout,
	}

	addr := fmt.Sprintf("%s:%d", config.Host, config.Port)
	client, err := ssh.Dial("tcp", addr, sshConfig)
	if err != nil {
		return nil, s.translateSshError(err)
	}

	return &Client{
		Client: client,
		config: config,
	}, nil
	
}

// TestConnection verifies the SSH connection and returns remote info.
func (s *SshService) TestConnection(config *types.SshRemoteConfig, agentCommand string) (*types.SshRemoteTestResult, error) {
	client, err := s.GetClient(config)
	if err != nil {
		return &types.SshRemoteTestResult{
			Success: false,
			Error:   err.Error(),
			}, nil
		}
	defer client.Close()

	// Test command: echo marker, get hostname, optionally check agent
	testCmd := "echo \"SSH_OK\" && hostname"
	if agentCommand != "" {
		testCmd += fmt.Sprintf(" && which %s 2>/dev/null || echo \"AGENT_NOT_FOUND\"", agentCommand)
	}

	stdout, stderr, err := client.Exec(testCmd)
	if err != nil {
		return &types.SshRemoteTestResult{
			Success: false,
			Error:   fmt.Sprintf("Failed to execute test command: %v (stderr: %s)", err, stderr),
		}, nil
	}

	lines := strings.Split(strings.TrimSpace(stdout), "\n")
	if len(lines) == 0 || lines[0] != "SSH_OK" {
		return &types.SshRemoteTestResult{
			Success: false,
			Error:   "Unexpected response from remote host",
		}, nil
	}

	hostname := "unknown"
	if len(lines) > 1 {
		hostname = lines[1]
	}

	agentVersion := ""
	if agentCommand != "" && len(lines) > 2 {
		if lines[2] != "AGENT_NOT_FOUND" {
			agentVersion = "installed"
		}
	}

	return &types.SshRemoteTestResult{
		Success: true,
		RemoteInfo: &types.SshRemoteInfo{
			Hostname:     hostname,
			AgentVersion: agentVersion,
			},
		}, nil
	}

// CloseConnection closes the SSH connection.
func (c *Client) CloseConnection() error {
	return c.Close()
}

// GetRemoteInfo returns remote host information.
func (c *Client) GetRemoteInfo(agentCommand string) (*types.SshRemoteInfo, error) {
	testCmd := "hostname"
	if agentCommand != "" {
		testCmd += fmt.Sprintf(" && which %s 2>/dev/null || echo \"AGENT_NOT_FOUND\"", agentCommand)
	}

	stdout, _, err := c.Exec(testCmd)
	if err != nil {
		return nil, err
	}

	lines := strings.Split(strings.TrimSpace(stdout), "\n")
	hostname := "unknown"
	if len(lines) > 0 {
		hostname = lines[0]
	}

	agentVersion := ""
	if agentCommand != "" && len(lines) > 1 {
		if lines[1] != "AGENT_NOT_FOUND" {
			agentVersion = "installed"
		}
	}

	return &types.SshRemoteInfo{
		Hostname:     hostname,
		AgentVersion: agentVersion,
	}, nil
	
}

// Exec executes a command on the remote host and returns stdout and stderr.
func (c *Client) Exec(command string) (string, string, error) {
	session, err := c.NewSession()
	if err != nil {
		return "", "", err
	}
	defer session.Close()

	var stdout, stderr bytes.Buffer
	session.Stdout = &stdout
	session.Stderr = &stderr

	err = session.Run(command)
	return stdout.String(), stderr.String(), err
}

// ReadDirRemote lists directory contents on the remote host.
func (c *Client) ReadDirRemote(dirPath string) ([]types.RemoteDirEntry, error) {
	// Equivalent to TS: ls -1AF --color=never
	escapedPath := shellEscape(dirPath)
	cmd := fmt.Sprintf("ls -1AF --color=never %s 2>/dev/null || echo \"__LS_ERROR__\"", escapedPath)

	stdout, _, err := c.Exec(cmd)
	if err != nil {
		return nil, err
	}

	output := strings.TrimSpace(stdout)
	if output == "__LS_ERROR__" {
		return nil, fmt.Errorf("directory not found or not accessible: %s", dirPath)
	}

	lines := strings.Split(output, "\n")
	var entries []types.RemoteDirEntry
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || line == "__LS_ERROR__" {
			continue
		}

		name := line
		isDir := false
		isSymlink := false

		if strings.HasSuffix(name, "/") {
			name = name[:len(name)-1]
			isDir = true
		} else if strings.HasSuffix(name, "@") {
			name = name[:len(name)-1]
			isSymlink = true
		} else if strings.HasSuffix(name, "*") || strings.HasSuffix(name, "|") || strings.HasSuffix(name, "=") {
			name = name[:len(name)-1]
		}

		if name == "" {
			continue
		}

		entries = append(entries, types.RemoteDirEntry{
			Name:        name,
			IsDirectory: isDir,
			IsSymlink:   isSymlink,
		})
	}

	return entries, nil
}

// ReadFileRemote reads file contents from the remote host.
func (c *Client) ReadFileRemote(filePath string) (string, error) {
	escapedPath := shellEscape(filePath)
	cmd := fmt.Sprintf("cat %s", escapedPath)

	stdout, stderr, err := c.Exec(cmd)
	if err != nil {
		errMsg := strings.ToLower(stderr)
		if strings.Contains(errMsg, "no such file") {
			return "", fmt.Errorf("file not found: %s", filePath)
		}
		if strings.Contains(errMsg, "is a directory") {
			return "", fmt.Errorf("path is a directory: %s", filePath)
		}
		if strings.Contains(errMsg, "permission denied") {
			return "", fmt.Errorf("permission denied: %s", filePath)
		}
		return "", fmt.Errorf("%s: %v", stderr, err)
	}

	return stdout, nil
}

// WriteFileRemote writes content to a file on the remote host.
func (c *Client) WriteFileRemote(filePath string, content []byte) error {
	escapedPath := shellEscape(filePath)
	base64Content := base64.StdEncoding.EncodeToString(content)

	// Decode base64 on remote and write to file
	cmd := fmt.Sprintf("echo '%s' | base64 -d > %s", base64Content, escapedPath)

	_, stderr, err := c.Exec(cmd)
	if err != nil {
		errMsg := strings.ToLower(stderr)
		if strings.Contains(errMsg, "permission denied") {
			return fmt.Errorf("permission denied: %s", filePath)
		}
		if strings.Contains(errMsg, "no such file") {
			return fmt.Errorf("parent directory not found: %s", filePath)
		}
		return fmt.Errorf("%s: %v", stderr, err)
	}

	return nil
}

// translateSshError maps SSH errors to user-friendly messages.
func (s *SshService) translateSshError(err error) error {
	errMsg := strings.ToLower(err.Error())

	if strings.Contains(errMsg, "permission denied") {
		return fmt.Errorf("authentication failed: check username and private key")
	}
	if strings.Contains(errMsg, "connection refused") {
		return fmt.Errorf("connection refused: check host and port")
	}
	if strings.Contains(errMsg, "timeout") {
		return fmt.Errorf("connection timed out: check host and network")
	}
	if strings.Contains(errMsg, "no route to host") {
		return fmt.Errorf("no route to host: check host address and network")
	}
	if strings.Contains(errMsg, "no such host") || strings.Contains(errMsg, "lookup") {
		return fmt.Errorf("could not resolve hostname: check the host address")
	}

	return err
}

// expandTilde expands ~ to the user's home directory.
func expandTilde(path string) string {
	if !strings.HasPrefix(path, "~") {
		return path
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return path
	}
	return filepath.Join(home, path[1:])
}

// shellEscape escapes a string for use in a shell command.
func shellEscape(s string) string {
	if s == "" {
		return "''"
	}
	// Simple escaping: wrap in single quotes and escape any single quotes inside
	return "'" + strings.ReplaceAll(s, "'", "'\\''") + "'"
}
