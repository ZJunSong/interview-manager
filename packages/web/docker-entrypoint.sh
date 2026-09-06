#!/bin/sh
set -e

# 数据目录（与服务端 database.ts 的默认值保持一致）
DATA_DIR="${DATA_DIR:-/app/data}"

# 以 root 启动时：先把数据目录归还给 node 用户，再降权运行真正的服务进程。
# 采用 postgres/redis 官方镜像同款模式，自动兼容以下场景：
#   - 首次启动（空卷或镜像内置目录）
#   - 历史版本以 root 写入过的数据卷
#   - 从备份恢复、迁移服务器产生的属主不一致
# 进程实际运行身份始终是 node，仅入口瞬间以 root 修权限。
if [ "$(id -u)" = "0" ]; then
  echo "[entrypoint] 修正数据目录属主: $DATA_DIR"
  chown -R node:node "$DATA_DIR" || echo "[entrypoint] 警告: 修正属主失败，请检查数据卷挂载"
  exec setpriv --reuid=node --regid=node --clear-groups "$@"
fi

# 非 root 启动（如已在 compose 中指定 user）则直接运行
exec "$@"
