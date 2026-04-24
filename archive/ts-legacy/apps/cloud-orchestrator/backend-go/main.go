package main

import (
	"encoding/json"
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	corsmiddleware "github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/joho/godotenv"
	"github.com/jules-autopilot/backend/api"
	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/services"
)

func getProjectRoot() string {
	candidates := []string{filepath.Clean("."), filepath.Clean("..")}
	for _, candidate := range candidates {
		if info, err := os.Stat(filepath.Join(candidate, "package.json")); err == nil && !info.IsDir() {
			return candidate
		}
	}
	return filepath.Clean("..")
}

func serveSPA(c *fiber.Ctx) error {
	requestPath := c.Path()
	if strings.HasPrefix(requestPath, "/api") || strings.HasPrefix(requestPath, "/ws") || requestPath == "/metrics" || requestPath == "/healthz" {
		return c.SendStatus(fiber.StatusNotFound)
	}

	projectRoot, err := filepath.Abs(getProjectRoot())
	if err != nil {
		return c.SendStatus(fiber.StatusInternalServerError)
	}
	if requestPath == "/" {
		requestPath = "/index.html"
	}

	distPath := filepath.Join(projectRoot, "dist")
	candidate := filepath.Join(distPath, filepath.FromSlash(strings.TrimPrefix(requestPath, "/")))
	if info, statErr := os.Stat(candidate); statErr == nil && !info.IsDir() {
		return c.SendFile(candidate)
	}

	indexPath := filepath.Join(distPath, "index.html")
	if info, statErr := os.Stat(indexPath); statErr == nil && !info.IsDir() {
		return c.SendFile(indexPath)
	}

	return c.SendStatus(fiber.StatusNotFound)
}

func loadRootEnv() {
	projectRoot := getProjectRoot()
	_ = godotenv.Overload(filepath.Join(projectRoot, ".env"))
}

func main() {
	// Load environment variables from .env in project root for runtime parity with the Bun server.
	loadRootEnv()

	// Initialize Database
	db.InitDB()

	// Start Background Services
	if settings, err := services.GetSettingsForAPI(); err == nil && settings.IsEnabled {
		services.StartDaemon()
		services.StartWorker()
	}
	services.StartScheduler()

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if fiberErr, ok := err.(*fiber.Error); ok {
				code = fiberErr.Code
			}
			if strings.HasPrefix(c.Path(), "/api") || c.Path() == "/metrics" || c.Path() == "/healthz" {
				return c.Status(code).JSON(fiber.Map{"error": err.Error(), "status": code})
			}
			return c.Status(code).SendString(err.Error())
		},
	})

	allowOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")
	if allowOrigins == "" {
		allowOrigins = "*"
	}

	app.Use(corsmiddleware.New(corsmiddleware.Config{
		AllowOrigins: allowOrigins,
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS,PATCH",
		AllowHeaders: "Content-Type, Authorization, X-Jules-Api-Key, X-Jules-Auth-Token, X-Goog-Api-Key",
	}))

	// Setup API Routes
	api.SetupRoutes(app)

	// Port configuration from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// WebSocket Middleware
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	// WebSocket Endpoint
	app.Get("/ws", websocket.New(func(c *websocket.Conn) {
		// Register new client
		api.ClientsMutex.Lock()
		api.ActiveClients[c] = true
		api.ClientsMutex.Unlock()

		log.Printf("WebSocket client connected: %s", c.RemoteAddr())
		_ = c.WriteJSON(map[string]interface{}{"type": "connected"})

		defer func() {
			// Unregister client
			api.ClientsMutex.Lock()
			delete(api.ActiveClients, c)
			api.ClientsMutex.Unlock()
			c.Close()
			log.Printf("WebSocket client disconnected: %s", c.RemoteAddr())
		}()

		for {
			_, msg, err := c.ReadMessage()
			if err != nil {
				log.Println("WebSocket read error:", err)
				break
			}

			var payload struct {
				Type      string `json:"type"`
				Timestamp int64  `json:"timestamp"`
			}
			if err := json.Unmarshal(msg, &payload); err != nil {
				continue
			}

			switch payload.Type {
			case "ping":
				if err := c.WriteJSON(map[string]interface{}{
					"type": "pong",
					"data": map[string]interface{}{
						"timestamp": payload.Timestamp,
					},
				}); err != nil {
					log.Println("WebSocket write error:", err)
					break
				}
			default:
				// Ignore unsupported client-originated websocket payloads.
			}
		}
	}))

	// Static SPA serving parity with the Bun runtime.
	app.Get("/*", serveSPA)

	// Graceful shutdown handling
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Println("[Main] Shutdown signal received. Cleaning up...")
		services.StopDaemon()
		services.StopWorker()
		services.StopScheduler()
		if err := app.Shutdown(); err != nil {
			log.Printf("[Main] Server shutdown error: %v", err)
		}
	}()

	// Match the TypeScript daemon default port for smoother drop-in parity.
	log.Printf("[Main] Server starting on port %s", port)
	log.Fatal(app.Listen(":" + port))
}
