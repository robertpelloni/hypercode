package fs

import (
	"encoding/base64"
	"fmt"
	"io"
	"io/fs"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// FileStat represents file or directory statistics
type FileStat struct {
	Size        int64     `json:"size"`
	CreatedAt   time.Time `json:"createdAt"`
	ModifiedAt  time.Time `json:"modifiedAt"`
	IsDirectory bool      `json:"isDirectory"`
	IsFile      bool      `json:"isFile"`
}

// DirEntry represents a directory entry
type DirEntry struct {
	Name        string `json:"name"`
	IsDirectory bool   `json:"isDirectory"`
	IsFile      bool   `json:"isFile"`
	Path        string `json:"path"`
}

// DirectorySizeResult represents the result of directory size calculation
type DirectorySizeResult struct {
	TotalSize   int64 `json:"totalSize"`
	FileCount   int   `json:"fileCount"`
	FolderCount int   `json:"folderCount"`
}

// ItemCountResult represents the result of item count calculation
type ItemCountResult struct {
	FileCount   int `json:"fileCount"`
	FolderCount int `json:"folderCount"`
}

// FsService provides filesystem operations
type FsService struct{}

// NewFsService creates a new FsService
func NewFsService() *FsService {
	return &FsService{}
}

// HomeDir returns the user's home directory
func (s *FsService) HomeDir() (string, error) {
	return os.UserHomeDir()
}

// ReadDir reads the contents of a directory
func (s *FsService) ReadDir(dirPath string) ([]DirEntry, error) {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, err
	}

	result := make([]DirEntry, 0, len(entries))
	for _, entry := range entries {
		result = append(result, DirEntry{
			Name:        entry.Name(),
			IsDirectory: entry.IsDir(),
			IsFile:      !entry.IsDir(),
			Path:        filepath.Join(dirPath, entry.Name()),
		})
	}
	return result, nil
}

// ReadFile reads the content of a file. If it's an image, it returns a base64 data URL.
func (s *FsService) ReadFile(filePath string) (string, error) {
	ext := strings.ToLower(filepath.Ext(filePath))
	isImage := false
	// Supported image file extensions for base64 encoding
	imageExtensions := []string{`.png`, `.jpg`, `.jpeg`, `.gif`, `.bmp`, `.webp`, `.svg`, `.ico`}
	for _, e := range imageExtensions {
		if ext == e {
			isImage = true
			break
		}
	}

	if isImage {
		data, err := os.ReadFile(filePath)
		if err != nil {
			if os.IsNotExist(err) {
				return "", nil
			}
			return "", err
		}

		var mimeType string
		if ext == ".svg" {
			mimeType = "image/svg+xml"
		} else {
			mimeType = "image/" + strings.TrimPrefix(ext, ".")
		}

		encoded := base64.StdEncoding.EncodeToString(data)
		return fmt.Sprintf("data:%s;base64,%s", mimeType, encoded), nil
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", err
	}
	return string(data), nil
}

// WriteFile writes content to a file
func (s *FsService) WriteFile(filePath string, content string) error {
	// Ensure parent directory exists
	parentDir := filepath.Dir(filePath)
	if err := os.MkdirAll(parentDir, 0755); err != nil {
		return err
	}
	return os.WriteFile(filePath, []byte(content), 0644)
}

// Mkdir creates a directory
func (s *FsService) Mkdir(dirPath string, recursive bool) error {
	if recursive {
		return os.MkdirAll(dirPath, 0755)
	}
	return os.Mkdir(dirPath, 0755)
}

// Exists checks if a file or directory exists
func (s *FsService) Exists(path string) (bool, error) {
	_, err := os.Stat(path)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, err
}

// Stat returns information about a file or directory
func (s *FsService) Stat(filePath string) (*FileStat, error) {
	info, err := os.Stat(filePath)
	if err != nil {
		return nil, err
	}

	stat := &FileStat{
		Size:        info.Size(),
		ModifiedAt:  info.ModTime(),
		IsDirectory: info.IsDir(),
		IsFile:      !info.IsDir(),
	}

	// Fallback for CreatedAt
	stat.CreatedAt = info.ModTime()

	return stat, nil
}

// Remove deletes a file or directory
func (s *FsService) Remove(targetPath string, recursive bool) error {
	if recursive {
		return os.RemoveAll(targetPath)
	}
	return os.Remove(targetPath)
}

// Move renames or moves a file or directory
func (s *FsService) Move(oldPath, newPath string) error {
	// Ensure destination parent directory exists
	destParent := filepath.Dir(newPath)
	if err := os.MkdirAll(destParent, 0755); err != nil {
		return err
	}
	return os.Rename(oldPath, newPath)
}

// Copy copies a file or directory
func (s *FsService) Copy(src, dst string) error {
	info, err := os.Stat(src)
	if err != nil {
		return err
	}

	if info.IsDir() {
		return s.copyDir(src, dst)
	}
	return s.copyFile(src, dst)
}

func (s *FsService) copyFile(src, dst string) error {
	srcFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer srcFile.Close()

	// Ensure destination parent directory exists
	destParent := filepath.Dir(dst)
	if err := os.MkdirAll(destParent, 0755); err != nil {
		return err
	}

	dstFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer dstFile.Close()

	_, err = io.Copy(dstFile, srcFile)
	return err
}

func (s *FsService) copyDir(src, dst string) error {
	info, err := os.Stat(src)
	if err != nil {
		return err
	}

	if err := os.MkdirAll(dst, info.Mode()); err != nil {
		return err
	}

	entries, err := os.ReadDir(src)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		srcPath := filepath.Join(src, entry.Name())
		dstPath := filepath.Join(dst, entry.Name())
		if err := s.Copy(srcPath, dstPath); err != nil {
			return err
		}
	}
	return nil
}

// ResolveHome expands the ~ prefix to the user's home directory
func (s *FsService) ResolveHome(path string) (string, error) {
	if !strings.HasPrefix(path, "~") {
		return path, nil
	}

	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	if path == "~" {
		return home, nil
	}

	if strings.HasPrefix(path, "~/") || strings.HasPrefix(path, "~\\") {
		return filepath.Join(home, path[2:]), nil
	}

	return path, nil
}

// GetDriveList returns a list of drives on Windows, or ["/"] on Unix systems.
func (s *FsService) GetDriveList() ([]string, error) {
	if runtime.GOOS != "windows" {
		return []string{"/"}, nil
	}

	drives := []string{}
	for _, drive := range "ABCDEFGHIJKLMNOPQRSTUVWXYZ" {
		d := string(drive) + ":\\"
		if _, err := os.Stat(d); err == nil {
			drives = append(drives, d)
		}
	}
	return drives, nil
}

// GetProjectRoot finds the root directory of the project by searching upwards for a .git directory.
func (s *FsService) GetProjectRoot(startPath string) (string, error) {
	current, err := filepath.Abs(startPath)
	if err != nil {
		current = startPath
	}
	for {
		if _, err := os.Stat(filepath.Join(current, ".git")); err == nil {
			return current, nil
		}
		parent := filepath.Dir(current)
		if parent == current {
			break
		}
		current = parent
	}
	return startPath, nil
}

// DirectorySize calculates the total size of a directory recursively
func (s *FsService) DirectorySize(dirPath string) (*DirectorySizeResult, error) {
	var totalSize int64
	var fileCount int
	var folderCount int

	err := filepath.WalkDir(dirPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil // Skip items that cannot be accessed
		}

		// Skip common ignore patterns
		if d.IsDir() && (d.Name() == "node_modules" || d.Name() == "__pycache__") {
			return filepath.SkipDir
		}

		if d.IsDir() {
			if path != dirPath {
				folderCount++
			}
		} else {
			fileCount++
			info, err := d.Info()
			if err == nil {
				totalSize += info.Size()
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return &DirectorySizeResult{
		TotalSize:   totalSize,
		FileCount:   fileCount,
		FolderCount: folderCount,
	}, nil

}

// CountItems counts files and folders in a directory recursively
func (s *FsService) CountItems(dirPath string) (*ItemCountResult, error) {
	var fileCount int
	var folderCount int

	err := filepath.WalkDir(dirPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() {
			if path != dirPath {
				folderCount++
			}
		} else {
			fileCount++
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return &ItemCountResult{
		FileCount:   fileCount,
		FolderCount: folderCount,
	}, nil

}

// FetchImageAsBase64 fetches an image from a URL and returns a base64 data URL
func (s *FsService) FetchImageAsBase64(imageUrl string) (string, error) {
	parsedURL, err := url.Parse(imageUrl)
	if err != nil {
		return "", err
	}

	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return "", fmt.Errorf("protocol not allowed: %s", parsedURL.Scheme)
	}

	hostname := parsedURL.Hostname()
	if isPrivateHostname(hostname) {
		return "", fmt.Errorf("requests to private/internal addresses are not allowed: %s", hostname)
	}

	resp, err := http.Get(imageUrl)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	contentType := resp.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		return "", fmt.Errorf("response is not an image: %s", contentType)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	encoded := base64.StdEncoding.EncodeToString(data)
	return fmt.Sprintf("data:%s;base64,%s", contentType, encoded), nil
}

// isPrivateHostname checks if a hostname resolves to a private/internal network address.
func isPrivateHostname(hostname string) bool {
	hostname = strings.ToLower(hostname)
	if hostname == "localhost" || hostname == "127.0.0.1" || hostname == "::1" || hostname == "0.0.0.0" || strings.HasSuffix(hostname, ".localhost") {
		return true
	}

	if hostname == "169.254.169.254" || hostname == "metadata.google.internal" {
		return true
	}

	ip := net.ParseIP(hostname)
	if ip != nil {
		if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsPrivate() {
			return true
		}
	}

	return false
}
