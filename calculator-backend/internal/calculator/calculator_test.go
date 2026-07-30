package calculator

import (
	"errors"
	"math"
	"testing"
)

func TestAdd(t *testing.T) {
	tests := []struct {
		name    string
		a, b    float64
		want    float64
		wantErr error
	}{
		{name: "positive numbers", a: 12, b: 3, want: 15},
		{name: "negative numbers", a: -5, b: -7, want: -12},
		{name: "mixed signs", a: 10, b: -4, want: 6},
		{name: "zeros", a: 0, b: 0, want: 0},
		{name: "decimals", a: 0.1, b: 0.2, want: 0.30000000000000004},
		{name: "overflow", a: math.MaxFloat64, b: math.MaxFloat64, wantErr: ErrNotFinite},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Add(tt.a, tt.b)
			assertResult(t, got, err, tt.want, tt.wantErr)
		})
	}
}

func TestSubtract(t *testing.T) {
	tests := []struct {
		name    string
		a, b    float64
		want    float64
		wantErr error
	}{
		{name: "positive numbers", a: 12, b: 3, want: 9},
		{name: "negative result", a: 3, b: 12, want: -9},
		{name: "negative numbers", a: -5, b: -7, want: 2},
		{name: "zeros", a: 0, b: 0, want: 0},
		{name: "overflow", a: -math.MaxFloat64, b: math.MaxFloat64, wantErr: ErrNotFinite},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Subtract(tt.a, tt.b)
			assertResult(t, got, err, tt.want, tt.wantErr)
		})
	}
}

func TestMultiply(t *testing.T) {
	tests := []struct {
		name    string
		a, b    float64
		want    float64
		wantErr error
	}{
		{name: "positive numbers", a: 12, b: 3, want: 36},
		{name: "by zero", a: 12, b: 0, want: 0},
		{name: "negative by positive", a: -4, b: 5, want: -20},
		{name: "two negatives", a: -4, b: -5, want: 20},
		{name: "decimals", a: 2.5, b: 4, want: 10},
		{name: "overflow", a: math.MaxFloat64, b: 2, wantErr: ErrNotFinite},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Multiply(tt.a, tt.b)
			assertResult(t, got, err, tt.want, tt.wantErr)
		})
	}
}

func TestDivide(t *testing.T) {
	tests := []struct {
		name    string
		a, b    float64
		want    float64
		wantErr error
	}{
		{name: "exact division", a: 12, b: 3, want: 4},
		{name: "fractional result", a: 7, b: 2, want: 3.5},
		{name: "zero numerator", a: 0, b: 5, want: 0},
		{name: "negative divisor", a: 10, b: -2, want: -5},
		{name: "division by zero", a: 12, b: 0, wantErr: ErrDivisionByZero},
		{name: "zero by zero", a: 0, b: 0, wantErr: ErrDivisionByZero},
		{name: "overflow", a: math.MaxFloat64, b: 0.5, wantErr: ErrNotFinite},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Divide(tt.a, tt.b)
			assertResult(t, got, err, tt.want, tt.wantErr)
		})
	}
}

func TestPower(t *testing.T) {
	tests := []struct {
		name    string
		a, b    float64
		want    float64
		wantErr error
	}{
		{name: "integer exponent", a: 2, b: 10, want: 1024},
		{name: "exponent zero", a: 5, b: 0, want: 1},
		{name: "zero to the zero", a: 0, b: 0, want: 1},
		{name: "negative exponent", a: 2, b: -2, want: 0.25},
		{name: "fractional exponent", a: 9, b: 0.5, want: 3},
		{name: "negative base integer exponent", a: -2, b: 3, want: -8},
		{name: "negative base fractional exponent", a: -4, b: 0.5, wantErr: ErrNotFinite},
		{name: "zero to negative exponent", a: 0, b: -1, wantErr: ErrNotFinite},
		{name: "overflow", a: 10, b: 400, wantErr: ErrNotFinite},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Power(tt.a, tt.b)
			assertResult(t, got, err, tt.want, tt.wantErr)
		})
	}
}

func assertResult(t *testing.T, got float64, err error, want float64, wantErr error) {
	t.Helper()
	if wantErr != nil {
		if !errors.Is(err, wantErr) {
			t.Fatalf("expected error %v, got %v", wantErr, err)
		}
		return
	}
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != want {
		t.Fatalf("expected %v, got %v", want, got)
	}
}
