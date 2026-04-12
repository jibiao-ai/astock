# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# 设置国内 Go 模块代理，解决中国境内 go mod download 超时/失败问题
ENV GOPROXY=https://goproxy.cn,direct
ENV GONOSUMDB=*
ENV GOFLAGS="-mod=mod"

COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o quantmind ./cmd/server

# Run stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Asia/Shanghai
WORKDIR /app
COPY --from=builder /app/quantmind .
EXPOSE 8080
CMD ["./quantmind"]
