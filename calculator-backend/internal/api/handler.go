package api

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"calculator-backend/internal/calculator"
)

type binaryRequest struct {
	Value1 *float64 `json:"value1" binding:"required"`
	Value2 *float64 `json:"value2" binding:"required"`
}

type unaryRequest struct {
	Value1 *float64 `json:"value1" binding:"required"`
}

type resultResponse struct {
	Result float64 `json:"result"`
}

type errorResponse struct {
	Error errorDetail `json:"error"`
}

type errorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func handleBinary(op func(a, b float64) (float64, error)) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req binaryRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, "invalid_request",
				`body must be a JSON object with numeric fields "value1" and "value2"`)
			return
		}

		result, err := op(*req.Value1, *req.Value2)
		if err != nil {
			respondDomainError(c, err)
			return
		}
		c.JSON(http.StatusOK, resultResponse{Result: result})
	}
}

func handleUnary(op func(a float64) (float64, error)) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req unaryRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, "invalid_request",
				`body must be a JSON object with numeric field "value1"`)
			return
		}

		result, err := op(*req.Value1)
		if err != nil {
			respondDomainError(c, err)
			return
		}
		c.JSON(http.StatusOK, resultResponse{Result: result})
	}
}

func respondDomainError(c *gin.Context, err error) {
	code := "invalid_operation"
	switch {
	case errors.Is(err, calculator.ErrNotFinite):
		code = "result_not_finite"
	case errors.Is(err, calculator.ErrDivisionByZero):
		code = "division_by_zero"
	case errors.Is(err, calculator.ErrNegativeSqrt):
		code = "negative_square_root"
	}
	respondError(c, http.StatusUnprocessableEntity, code, err.Error())
}

func respondError(c *gin.Context, status int, code, message string) {
	c.JSON(status, errorResponse{Error: errorDetail{Code: code, Message: message}})
}
