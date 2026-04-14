# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# 使用国内 Alpine 镜像源（解决私有网络 TLS 无法访问 dl-cdn.alpinelinux.org 问题）
RUN sed -i 's#https://dl-cdn.alpinelinux.org/alpine#https://mirrors.aliyun.com/alpine#g' /etc/apk/repositories

# 设置国内 Go 模块代理，解决中国境内 go mod download 超时/失败问题
ENV GOPROXY=https://goproxy.cn,direct
ENV GONOSUMDB=*
ENV GOFLAGS="-mod=mod"

COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o quantmind ./cmd/server

# Run stage - 使用 debian 基础镜像避免 Alpine apk TLS 问题
FROM debian:bookworm-slim

# 使用国内 Debian 镜像源
RUN sed -i 's#deb.debian.org#mirrors.aliyun.com#g' /etc/apt/sources.list.d/debian.sources 2>/dev/null; \
    apt-get update && apt-get install -y --no-install-recommends ca-certificates tzdata && \
    rm -rf /var/lib/apt/lists/*

ENV TZ=Asia/Shanghai
WORKDIR /app
COPY --from=builder /app/quantmind .
EXPOSE 8080
CMD ["./quantmind"]
