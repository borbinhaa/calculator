# Build stage
FROM golang:1.26-alpine AS build

WORKDIR /src

# Dependencies are copied first so the module cache survives source-only changes.
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/server ./cmd/server

# Runtime stage: distroless carries no shell or package manager, which keeps the
# attack surface of a statically linked Go binary close to zero.
FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=build /out/server /server

USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/server"]
