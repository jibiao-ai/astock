# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# 使用国内 Alpine 镜像源（解决私有网络 TLS 无法访问 dl-cdn.alpinelinux.org 问题）
RUN sed -i 's#https://dl-cdn.alpinelinux.org/alpine#https://mirrors.aliyun.com/alpine#g' /etc/apk/repositories

# 使用国内 npm 镜像
RUN npm config set registry https://registry.npmmirror.com

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Run stage - 使用 debian 基础 nginx 避免 Alpine apk TLS 问题
FROM nginx:stable

# 使用国内 Debian 镜像源
RUN sed -i 's#deb.debian.org#mirrors.aliyun.com#g' /etc/apt/sources.list.d/debian.sources 2>/dev/null; true

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
