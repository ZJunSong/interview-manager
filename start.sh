#!/bin/bash
set -e

echo ""
echo "========================================"
echo "  面试记录管理器 - Interview Manager"
echo "========================================"
echo ""

# ---- 获取脚本所在目录 ----
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ---- 检查 Node.js ----
echo "[1/3] 检查 Node.js 环境..."

install_node() {
    echo "      未检测到 Node.js，正在为您自动安装..."
    echo ""

    if [[ "$(uname)" == "Darwin" ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            echo "      正在通过 Homebrew 安装 Node.js..."
            brew install node
        else
            echo "  ========================================"
            echo "  未安装 Homebrew，请先安装 Homebrew："
            echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            echo "  然后重新运行本脚本"
            echo "  或者手动安装 Node.js: https://nodejs.org/"
            echo "  要求版本: 18 或更高"
            echo "  ========================================"
            exit 1
        fi
    else
        # Linux
        if command -v apt-get &> /dev/null; then
            echo "      正在通过 apt 安装 Node.js（需要 sudo 权限）..."
            curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif command -v dnf &> /dev/null; then
            echo "      正在通过 dnf 安装 Node.js（需要 sudo 权限）..."
            sudo dnf module install nodejs:18/common -y
        elif command -v yum &> /dev/null; then
            echo "      正在通过 yum 安装 Node.js（需要 sudo 权限）..."
            curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
            sudo yum install -y nodejs
        elif command -v pacman &> /dev/null; then
            echo "      正在通过 pacman 安装 Node.js（需要 sudo 权限）..."
            sudo pacman -S --noconfirm nodejs npm
        else
            echo "  ========================================"
            echo "  无法自动安装 Node.js，请手动安装："
            echo "  https://nodejs.org/"
            echo "  要求版本: 18 或更高"
            echo "  ========================================"
            exit 1
        fi
    fi
}

if command -v node &> /dev/null; then
    NODE_VER=$(node --version)
    echo "      检测到 Node.js $NODE_VER"
else
    install_node
    if ! command -v node &> /dev/null; then
        echo ""
        echo "  ========================================"
        echo "  Node.js 安装失败，请手动安装"
        echo "  下载地址: https://nodejs.org/"
        echo "  要求版本: 18 或更高"
        echo "  ========================================"
        exit 1
    fi
    NODE_VER=$(node --version)
    echo ""
    echo "      Node.js 安装成功！版本: $NODE_VER"
fi

# ---- 检查依赖 ----
echo ""
echo "[2/3] 检查项目依赖..."

if [ -d "node_modules" ]; then
    echo "      依赖已安装，跳过安装步骤。"
else
    echo "      首次运行，正在安装依赖，请稍候..."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "  ========================================"
        echo "  依赖安装失败，请检查网络连接后重试"
        echo "  ========================================"
        exit 1
    fi
    echo ""
    echo "      依赖安装完成！"
fi

# ---- 启动服务 ----
echo ""
echo "[3/3] 正在启动开发服务器..."
echo ""
echo "========================================"
echo "  启动成功！"
echo "  请访问 http://localhost:5173"
echo "  按 Ctrl+C 可停止服务"
echo "========================================"
echo ""
npm run dev
