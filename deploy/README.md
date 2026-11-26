# Docker 部署博客

部署使用 `compose.production.yaml`。Caddy 提供 Vue 页面和 HTTPS，并将同源的 `/api/` 请求转给 Go。Go 与 MySQL 只通过 Compose 网络通信。MySQL 数据与 Caddy 证书分别保存在 Docker 卷中。

## 服务启动

将整个工作区复制到服务器，包括 `blog-web`、`blog-bakend`、`deploy` 和根目录的 Compose 文件。保留前端锁文件、数据库迁移和 Docker 构建文件。开发机的 `.env`、`node_modules`、`dist` 和日志无需复制。

在服务器的项目根目录执行：

```sh
umask 077
cp deploy/production.env.example .env.production
```

编辑 `.env.production`，用实际域名替换 `BLOG_SITE_ADDRESS`，分别设置两个不同的随机 MySQL 密码。推荐使用十六进制随机值，例如执行两次 `openssl rand -hex 32`。域名解析到服务器后，允许外部访问 TCP 80 和 443。若已有网关占用这两个端口，可使用 `BLOG_HTTP_PORT` 和 `BLOG_HTTPS_PORT` 映射到其他端口。没有域名时，可在私有网络测试中设为 `BLOG_SITE_ADDRESS=:80`，此模式使用 HTTP，公网管理登录应使用 HTTPS。

```sh
docker compose --env-file .env.production -f compose.production.yaml up --build -d --wait
docker compose --env-file .env.production -f compose.production.yaml ps
```

全新的 MySQL 卷会自动执行两份迁移。已有卷只在第一次初始化时执行迁移文件。要重用已有数据库，请先备份并确认认证表迁移已应用。Compose 不会从开发机复制文章或账号。

## 创建管理员

在服务器上交互执行。密码以标准输入传入容器，至少 12 字节。

```sh
printf '输入管理员密码：'
stty -echo
IFS= read -r blog_admin_password
stty echo
printf '\n'
printf '%s\n' "$blog_admin_password" |
  docker compose --env-file .env.production -f compose.production.yaml exec -T backend \
    sh -c 'IFS= read -r BLOG_NEW_USER_PASSWORD; export BLOG_NEW_USER_PASSWORD; exec blog-service create-user admin admin'
unset blog_admin_password
```

打开站点的 `/login`，使用刚创建的管理员登录。通过 `/api/v1/articles?page_size=1` 检查公开 API。后续更新时重复执行启动命令即可重建镜像并保留现有数据库卷。

Caddy 的 SPA 回退与 API 路由配置参考[官方配置示例](https://caddyserver.com/docs/caddyfile/patterns#single-page-apps-spas)。
