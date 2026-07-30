package calculator

import (
	"errors"
	"math"
)

var ErrNotFinite = errors.New("result is not a finite number")

func Add(a, b float64) (float64, error) {
	return finite(a + b)
}

func Subtract(a, b float64) (float64, error) {
	return finite(a - b)
}

// finite guards a result against overflow into ±Inf or NaN.
func finite(result float64) (float64, error) {
	if math.IsInf(result, 0) || math.IsNaN(result) {
		return 0, ErrNotFinite
	}
	return result, nil
}
