package main

import (
	"log"
	"os"
	"strings"

	"calculator-backend/internal/api"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	allowedOrigins := []string{"http://localhost:5173"}
	if origins := os.Getenv("CORS_ALLOWED_ORIGINS"); origins != "" {
		allowedOrigins = strings.Split(origins, ",")
	}

	router := api.NewRouter(allowedOrigins)

	log.Printf("calculator API listening on :%s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
