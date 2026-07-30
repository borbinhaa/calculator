package api

import (
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"calculator-backend/internal/calculator"
)

func NewRouter(allowedOrigins []string) *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())

	router.Use(cors.New(cors.Config{
		AllowOrigins: allowedOrigins,
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodOptions},
		AllowHeaders: []string{"Content-Type"},
	}))

	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	v1 := router.Group("/api/v1")
	v1.POST("/add", handleBinary(calculator.Add))
	v1.POST("/subtract", handleBinary(calculator.Subtract))
	v1.POST("/multiply", handleBinary(calculator.Multiply))
	v1.POST("/divide", handleBinary(calculator.Divide))
	v1.POST("/power", handleBinary(calculator.Power))
	v1.POST("/sqrt", handleUnary(calculator.Sqrt))
	v1.POST("/percentage", handleBinary(calculator.Percentage))

	return router
}
