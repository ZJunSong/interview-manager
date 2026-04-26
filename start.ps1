Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  面试记录管理器 - Interview Manager" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ---- 切换到脚本所在目录 ----
Set-Location $PSScriptRoot

# ---- [1/3] 检查 Node.js ----
Write-Host "[1/3] 检查 Node.js 环境..." -ForegroundColor Yellow

$nodeInstalled = $false
try {
    $nodeVer = & node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        $nodeInstalled = $true
        Write-Host "      检测到 Node.js $nodeVer" -ForegroundColor Green
    }
} catch {}

if (-not $nodeInstalled) {
    Write-Host "      未检测到 Node.js，正在为您自动安装..." -ForegroundColor Yellow
    Write-Host ""

    $wingetInstalled = $false
    try {
        & winget --version 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $wingetInstalled = $true }
    } catch {}

    if ($wingetInstalled) {
        Write-Host "      正在通过 winget 安装 Node.js LTS，请稍候..." -ForegroundColor Yellow
        & winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "      Node.js 安装成功！正在刷新环境变量..." -ForegroundColor Green
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
            try {
                $nodeVer = & node --version 2>$null
                Write-Host "      Node.js $nodeVer" -ForegroundColor Green
            } catch {}
        } else {
            Write-Host ""
            Write-Host "  ========================================" -ForegroundColor Red
            Write-Host "  自动安装失败，请手动安装 Node.js" -ForegroundColor Red
            Write-Host "  下载地址: https://nodejs.org/" -ForegroundColor Red
            Write-Host "  要求版本: 18 或更高" -ForegroundColor Red
            Write-Host "  ========================================" -ForegroundColor Red
            Write-Host ""
            Read-Host "按回车键退出"
            exit 1
        }
    } else {
        Write-Host "  ========================================" -ForegroundColor Red
        Write-Host "  未找到 winget，无法自动安装 Node.js" -ForegroundColor Red
        Write-Host "  请手动安装: https://nodejs.org/" -ForegroundColor Red
        Write-Host "  要求版本: 18 或更高" -ForegroundColor Red
        Write-Host "  ========================================" -ForegroundColor Red
        Write-Host ""
        Read-Host "按回车键退出"
        exit 1
    }
}

# ---- [2/3] 检查项目依赖 ----
Write-Host ""
Write-Host "[2/3] 检查项目依赖..." -ForegroundColor Yellow

if (Test-Path "node_modules") {
    Write-Host "      依赖已安装，跳过安装步骤。" -ForegroundColor Green
} else {
    Write-Host "      首次运行，正在安装依赖，请稍候..." -ForegroundColor Yellow
    Write-Host ""
    & npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "  ========================================" -ForegroundColor Red
        Write-Host "  依赖安装失败，请检查网络连接后重试" -ForegroundColor Red
        Write-Host "  ========================================" -ForegroundColor Red
        Write-Host ""
        Read-Host "按回车键退出"
        exit 1
    }
    Write-Host ""
    Write-Host "      依赖安装完成！" -ForegroundColor Green
}

# ---- [3/3] 启动服务 ----
Write-Host ""
Write-Host "[3/3] 正在启动开发服务器，请稍候..." -ForegroundColor Yellow
Write-Host ""
& npm run dev
