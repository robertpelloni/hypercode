package persistence

import (
	"encoding/json"
	"io/ioutil"
	"os"
	"path/filepath"
	"sync"
)

// PersistenceService handles JSON-based storage for settings, sessions, and groups.
type PersistenceService struct {
	syncPath string
	mu       sync.RWMutex
}

// NewPersistenceService creates a new instance of PersistenceService.
// If syncPath is empty, it defaults to the user's config directory.
func NewPersistenceService(syncPath string) *PersistenceService {
	if syncPath == "" {
		configDir, _ := os.UserConfigDir()
		syncPath = filepath.Join(configDir, "Maestro")
	}
	// Ensure directory exists
	_ = os.MkdirAll(syncPath, 0755)
	return &PersistenceService{
		syncPath: syncPath,
	}
}

// GetStoragePath returns the path to the storage directory.
func (ps *PersistenceService) GetStoragePath() string {
	return ps.syncPath
}

// readStore reads a JSON store file from the sync path.
func (ps *PersistenceService) readStore(name string, target interface{}) error {
	path := filepath.Join(ps.syncPath, name+".json")
	ps.mu.RLock()
	defer ps.mu.RUnlock()

	data, err := ioutil.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil // Return nil error if file doesn't exist
		}
		return err
	}
	return json.Unmarshal(data, target)
}

// writeStore writes a JSON store file to the sync path.
func (ps *PersistenceService) writeStore(name string, data interface{}) error {
	path := filepath.Join(ps.syncPath, name+".json")
	ps.mu.Lock()
	defer ps.mu.Unlock()

	bytes, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	return ioutil.WriteFile(path, bytes, 0644)
}

// GetSettings retrieves all settings from maestro-settings.json.
func (ps *PersistenceService) GetSettings() (map[string]interface{}, error) {
	settings := make(map[string]interface{})
	err := ps.readStore("maestro-settings", &settings)
	return settings, err
}

// SetSettings updates the settings in maestro-settings.json.
func (ps *PersistenceService) SetSettings(settings map[string]interface{}) error {
	return ps.writeStore("maestro-settings", settings)
}

// Get retrieves a specific key from a named store.
func (ps *PersistenceService) Get(storeName, key string) (interface{}, error) {
	store := make(map[string]interface{})
	if err := ps.readStore(storeName, &store); err != nil {
		return nil, err
	}
	return store[key], nil
}

// Set updates a specific key in a named store.
func (ps *PersistenceService) Set(storeName, key string, value interface{}) error {
	store := make(map[string]interface{})
	_ = ps.readStore(storeName, &store)
	store[key] = value
	return ps.writeStore(storeName, store)
}

// Delete removes a specific key from a named store.
func (ps *PersistenceService) Delete(storeName, key string) error {
	store := make(map[string]interface{})
	if err := ps.readStore(storeName, &store); err != nil {
		return err
	}
	delete(store, key)
	return ps.writeStore(storeName, store)
}

// Has checks if a key exists in a named store.
func (ps *PersistenceService) Has(storeName, key string) (bool, error) {
	store := make(map[string]interface{})
	if err := ps.readStore(storeName, &store); err != nil {
		return false, err
	}
	_, exists := store[key]
	return exists, nil
}

// Clear removes a named store file.
func (ps *PersistenceService) Clear(storeName string) error {
	path := filepath.Join(ps.syncPath, storeName+".json")
	return os.Remove(path)
}

// GetActivity reads CLI activities from cli-activity.json.
func (ps *PersistenceService) GetActivity() ([]interface{}, error) {
	var result struct {
		Activities []interface{} `json:"activities"`
	}
	err := ps.readStore("cli-activity", &result)
	if err != nil {
		return []interface{}{}, nil
	}
	return result.Activities, nil
}
