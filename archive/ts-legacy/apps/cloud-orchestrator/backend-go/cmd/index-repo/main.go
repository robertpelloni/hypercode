package main

import (
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/services"
)

func getProjectRoot() string {
	candidates := []string{filepath.Clean("."), filepath.Clean(".."), filepath.Clean("../..")}
	for _, candidate := range candidates {
		if info, err := os.Stat(filepath.Join(candidate, "package.json")); err == nil && !info.IsDir() {
			return candidate
		}
	}
	return filepath.Clean("../..")
}

func main() {
	// Load environment variables from .env in project root
	projectRoot := getProjectRoot()
	_ = godotenv.Load(filepath.Join(projectRoot, ".env"))

	// Initialize Database
	db.InitDB()

	log.Println("[Indexer] Starting Go-native codebase indexing...")
	
	// We reuse the service logic directly
	result, err := services.IndexCodebase()
	if err != nil {
		log.Fatalf("[Indexer] Failed: %v", err)
	}

	log.Printf("[Indexer] Completed: %s", result)
}
