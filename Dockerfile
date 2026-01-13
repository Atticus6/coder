# Stage 1: 使用 bun 安装依赖和构建
FROM oven/bun:1 AS builder

WORKDIR /app

# 复制依赖文件
COPY package.json bun.lock* bun.lockb* ./

# 使用 bun 安装依赖
RUN bun install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN bun run build

# Stage 2: 使用 Node.js 运行
FROM node:22-slim AS runner

WORKDIR /app

# 从 builder 阶段复制构建产物（.output 内容直接放到 /app）
COPY --from=builder /app/.output ./

# 设置环境变量
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

# 使用 Node.js 运行 Nitro 服务
CMD ["node", "./server/index.mjs"]
