# Stage 1: Build (no CGO needed — pgx is pure Go)
FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY go-server/go.mod go-server/go.sum ./
RUN go mod download
COPY go-server/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o hk-bus-tool .

# Stage 2: Runtime
FROM alpine:latest
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /app/hk-bus-tool .
# Ship the committed JSON snapshot so the DB seeds offline on first boot
# (zero API calls) instead of fetching from the official APIs.
COPY --from=builder /app/data ./data
ENV PORT=8080
EXPOSE 8080
CMD ["./hk-bus-tool"]
