# nvm nodejs版本控制

### nvm 安装

自行搜索相关步骤，确保已卸载nodejs，之后无脑下一步安装即可。

### nvm 相关命令

```bash
# 查看已安装的 nodejs 版本
nvm list

# 切换 nodejs 版本
nvm use 11.22.00

# 添加 nodejs 版本，直接去官网下载对应的 nodejs 包
# https://www.nvmnode.com/zh/cli/node-all-versions.html
# 下载之后将包解压到 nvm 的安装目录，文件夹名字类似 v11.22.00，里面是一个 nodejs 包，之后就可以直接用了
```

### 相关报错

1. nvm use 切换版本后 npm 命令变成了无法识别的指令
   原因是下载 nodejs 包不包含 npm，需要去官网重新下载 https://www.nvmnode.com/zh/cli/node-all-versions.html
2. npm 命令提示无法加载文件 xxx\nodejs\npm.ps1。未对文件 xxx\nodejs\npm.ps1 进行数字签名。
   原因是权限不够，在 powershell 中执行以下命令解除限制
   ```bash
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   # 按照提示输入 Y，回车确认
   # 如果无效则继续执行以下命令来解除系统对该文件的锁定，其中 xxx 需要改成对应路径
   Unblock-File -Path xxx\nodejs\npm.ps1
   ```
