package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
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

	name := "Dev Key"
	if len(os.Args) > 1 {
		name = os.Args[1]
	}

	workspaceID := "default"
	prefix := "jp_"
	rawKey := uuid.New().String()
	id := uuid.New().String()

	apiKey := models.ApiKey{
		ID:          id,
		KeyHash:     rawKey, // In a real system, this would be a hash of rawKey
		KeyPrefix:   prefix,
		Name:        name,
		Scopes:      "*",
		IsActive:    true,
		WorkspaceID: &workspaceID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := db.DB.Create(&apiKey).Error; err != nil {
		log.Fatalf("[KeyGen] Failed to create key: %v", err)
	}

	fmt.Println("--------------------------------------------------")
	fmt.Printf("API Key Created: %s\n", name)
	fmt.Printf("ID:              %s\n", id)
	fmt.Printf("Key:             %s%s\n", prefix, rawKey)
	fmt.Println("--------------------------------------------------")
	fmt.Println("Keep this key safe. It will not be shown again.")
}
