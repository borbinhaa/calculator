package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func newTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return NewRouter([]string{"http://localhost:5173"})
}

func TestHealthz(t *testing.T) {
	router := newTestRouter()

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}
	if body := rec.Body.String(); body != `{"status":"ok"}` {
		t.Fatalf("unexpected body: %s", body)
	}
}

func TestCORS(t *testing.T) {
	tests := []struct {
		name       string
		origin     string
		wantStatus int
	}{
		{name: "allowed origin", origin: "http://localhost:5173", wantStatus: http.StatusOK},
		{name: "origin outside the allow list", origin: "http://evil.example", wantStatus: http.StatusForbidden},
		{name: "no origin at all", origin: "", wantStatus: http.StatusOK},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := newTestRouter()
			req := httptest.NewRequest(http.MethodPost, "/api/v1/add",
				strings.NewReader(`{"value1": 1, "value2": 2}`))
			req.Header.Set("Content-Type", "application/json")
			if tt.origin != "" {
				req.Header.Set("Origin", tt.origin)
			}

			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("expected status %d, got %d (body: %s)", tt.wantStatus, rec.Code, rec.Body.String())
			}
		})
	}
}
