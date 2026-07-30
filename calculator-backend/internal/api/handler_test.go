package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// postJSON sends a POST request with a JSON body through the full router stack.
func postJSON(t *testing.T, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	router := newTestRouter()
	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

// decodeResult extracts the "result" field from a successful response.
func decodeResult(t *testing.T, rec *httptest.ResponseRecorder) float64 {
	t.Helper()
	var body struct {
		Result float64 `json:"result"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("invalid JSON response: %v (body: %s)", err, rec.Body.String())
	}
	return body.Result
}

// decodeErrorCode extracts the "error.code" field from an error response.
func decodeErrorCode(t *testing.T, rec *httptest.ResponseRecorder) string {
	t.Helper()
	var body struct {
		Error struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("invalid JSON error response: %v (body: %s)", err, rec.Body.String())
	}
	if body.Error.Message == "" {
		t.Fatalf("error response must include a message (body: %s)", rec.Body.String())
	}
	return body.Error.Code
}

func TestOperationEndpoints(t *testing.T) {
	tests := []struct {
		name string
		path string
		body string
		want float64
	}{
		{name: "add", path: "/api/v1/add", body: `{"value1": 12, "value2": 3}`, want: 15},
		{name: "add zeros", path: "/api/v1/add", body: `{"value1": 0, "value2": 0}`, want: 0},
		{name: "add negatives", path: "/api/v1/add", body: `{"value1": -2.5, "value2": -1.5}`, want: -4},
		{name: "subtract", path: "/api/v1/subtract", body: `{"value1": 12, "value2": 3}`, want: 9},
		{name: "subtract negative result", path: "/api/v1/subtract", body: `{"value1": 3, "value2": 12}`, want: -9},
		{name: "multiply", path: "/api/v1/multiply", body: `{"value1": 12, "value2": 3}`, want: 36},
		{name: "multiply by zero", path: "/api/v1/multiply", body: `{"value1": 12, "value2": 0}`, want: 0},
		{name: "divide", path: "/api/v1/divide", body: `{"value1": 12, "value2": 3}`, want: 4},
		{name: "divide fractional", path: "/api/v1/divide", body: `{"value1": 7, "value2": 2}`, want: 3.5},
		{name: "power", path: "/api/v1/power", body: `{"value1": 2, "value2": 10}`, want: 1024},
		{name: "power fractional exponent", path: "/api/v1/power", body: `{"value1": 9, "value2": 0.5}`, want: 3},
		{name: "sqrt", path: "/api/v1/sqrt", body: `{"value1": 9}`, want: 3},
		{name: "sqrt of zero", path: "/api/v1/sqrt", body: `{"value1": 0}`, want: 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := postJSON(t, tt.path, tt.body)
			if rec.Code != http.StatusOK {
				t.Fatalf("expected status 200, got %d (body: %s)", rec.Code, rec.Body.String())
			}
			if got := decodeResult(t, rec); got != tt.want {
				t.Fatalf("expected result %v, got %v", tt.want, got)
			}
		})
	}
}

func TestInvalidRequests(t *testing.T) {
	tests := []struct {
		name     string
		path     string
		body     string
		wantCode string
	}{
		{name: "malformed JSON", path: "/api/v1/add", body: `{`, wantCode: "invalid_request"},
		{name: "missing operand", path: "/api/v1/add", body: `{"value1": 1}`, wantCode: "invalid_request"},
		{name: "non-numeric operand", path: "/api/v1/add", body: `{"value1": "x", "value2": 2}`, wantCode: "invalid_request"},
		{name: "empty body", path: "/api/v1/add", body: ``, wantCode: "invalid_request"},
		{name: "sqrt missing operand", path: "/api/v1/sqrt", body: `{}`, wantCode: "invalid_request"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := postJSON(t, tt.path, tt.body)
			if rec.Code != http.StatusBadRequest {
				t.Fatalf("expected status 400, got %d (body: %s)", rec.Code, rec.Body.String())
			}
			if code := decodeErrorCode(t, rec); code != tt.wantCode {
				t.Fatalf("expected error code %q, got %q", tt.wantCode, code)
			}
		})
	}
}

func TestDomainErrors(t *testing.T) {
	tests := []struct {
		name     string
		path     string
		body     string
		wantCode string
	}{
		{name: "add overflow", path: "/api/v1/add", body: `{"value1": 1.7976931348623157e308, "value2": 1.7976931348623157e308}`, wantCode: "result_not_finite"},
		{name: "multiply overflow", path: "/api/v1/multiply", body: `{"value1": 1.7976931348623157e308, "value2": 2}`, wantCode: "result_not_finite"},
		{name: "division by zero", path: "/api/v1/divide", body: `{"value1": 12, "value2": 0}`, wantCode: "division_by_zero"},
		{name: "power not finite", path: "/api/v1/power", body: `{"value1": -4, "value2": 0.5}`, wantCode: "result_not_finite"},
		{name: "sqrt of negative", path: "/api/v1/sqrt", body: `{"value1": -9}`, wantCode: "negative_square_root"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := postJSON(t, tt.path, tt.body)
			if rec.Code != http.StatusUnprocessableEntity {
				t.Fatalf("expected status 422, got %d (body: %s)", rec.Code, rec.Body.String())
			}
			if code := decodeErrorCode(t, rec); code != tt.wantCode {
				t.Fatalf("expected error code %q, got %q", tt.wantCode, code)
			}
		})
	}
}
