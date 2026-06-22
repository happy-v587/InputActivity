# 开发者文档

本文档给需要运行源码、修改功能、测试或打包应用的开发者使用。

## 项目概览

Input Activity 是一个 Electron + TypeScript 桌面应用。主进程负责监听全局键盘和鼠标事件，将事件写入本地 SQLite，并通过 preload bridge 把统计数据提供给渲染进程。渲染进程负责展示 Overview、Events、Config、图表、键盘热力图和主题设置。

## 目录结构

- `src/main/`：Electron 主进程、输入捕获、统计控制、分析逻辑和 SQLite 存储。
- `src/preload/`：暴露给渲染进程的安全 IPC 接口。
- `src/renderer/`：桌面界面、图表、控制按钮、键盘热力图和主题设置。
- `src/shared/`：主进程和渲染进程共享的类型与默认配置。
- `tests/`：Vitest 测试，包括统计、归一化、存储和控制器测试。
- `docs/`：文档和手动验证清单。
- `openspec/`：需求提案和规格记录。

生成目录：

- `dist/`：TypeScript 和 Vite 构建产物。
- `release/`：本地打包出的 macOS 应用。

不要直接修改生成目录里的文件。

## 本地开发

安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run dev:electron
```

该命令会同时启动 Vite、TypeScript watch 和 Electron。

## 检查命令

类型检查：

```bash
npm run typecheck
```

运行测试：

```bash
npm test
```

运行 lint：

```bash
npm run lint
```

构建生产产物：

```bash
npm run build
```

手动验证步骤见 [manual-verification.md](manual-verification.md)。

## 原生依赖

项目使用两个原生模块：

- `better-sqlite3`
- `uiohook-napi`

为 Electron 运行时重新编译：

```bash
npm run rebuild:native:electron
```

为 Node 测试环境重新编译：

```bash
npm run rebuild:native:node
```

如果切换了 Node 或 Electron 版本，先重新编译原生依赖，再排查运行错误。

## macOS 打包

生成本地 `.app`：

```bash
npm run mac:dir
```

输出位置：

```text
release/mac-arm64/Input Activity.app
```

生成 DMG：

```bash
npm run mac:dmg
```

本地构建没有签名。首次打开时，macOS 可能需要你从 Finder 右键打开，或在“隐私与安全性”中手动允许。

## 权限说明

全局键盘和鼠标监听需要 macOS 辅助功能权限。如果权限缺失，应用应进入 `blocked` 状态并显示提示，而不是假装已经开始记录。

## 提交前检查

提交代码前建议运行：

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

如果修改了 UI 或打包逻辑，还需要运行：

```bash
npm run mac:dir
```

涉及界面变化时，请在 PR 或讨论中附上截图。
