package memorystore

type Manager struct {
	path string
}

func NewManager(path string) *Manager {
	return &Manager{path: path}
}

func (m *Manager) GetAll() ([]map[string]interface{}, error) {
	// Stub implementation
	return []map[string]interface{}{}, nil
}

func (m *Manager) GetMemories() []string {
	return []string{}
}

func (m *Manager) AddMemory(mem string) {
	// Stub implementation
}
