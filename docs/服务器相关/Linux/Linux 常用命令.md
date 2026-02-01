# Linux 常用命令

### 系统命令

```bash
# 查看内网 ip 地址，通常在 eth0/ens33/enp0s3 等物理网卡下
ip addr

# 获取当前机器的公网 ip 地址，原理是访问第三方ip查询网站，获取返回结果，下面是三个例子
curl ipinfo.io/ip
curl icanhazip.com
curl ifconfig.me

# 查看磁盘空间使用情况（单位 GB，方便阅读）
# -h：以人类可读方式显示
df -h

# 查看当前剩余内存
free -h

# 查看进程占用 CPU 和内存
top
# 或者使用 htop（需要安装：sudo apt install htop -y）
htop

# 查看当前文件夹及当前目录下的文件夹的大小
du -h

# 查看所有进程占用的内存并按大小排序
ps aux --sort=-rss
# 命令解释：
# ps aux：列出所有进程
# a: all users, 显示所有用户的进程
# u: user-oriented format, 输出以用户信息为主的格式, 会显示 UID、CPU%、MEM%、启动时间、命令等
# x: 包括没有控制终端的进程, 显示守护进程 / daemon / 背景进程，这些进程通常没有终端
# --sort=-rss：按物理内存占用排序
# rss: Resident Set Size，即占用内存大小（KB）

# 查看当前系统剩余多少运行内存
free -m
# -m：以 MB 显示

# 结束进程
sudo kill -9 PID
# -9 表示结束信号，有以下几种：
# 15	默认，温和终止，允许进程清理资源；
# 9	强制杀死，不可捕获，直接结束
# 1	挂起/终端关闭，很多守护进程用来重载配置
# 2	允许进程捕获退出，Ctrl+C 时发送
```

### 文件操作

```bash
# ls 查看当前目录下的文件，-a 所有文件，包括隐藏文件
ls -a

# 切换目录，cd .. 上一目录
cd 目录路径

# 查看当前路径
pwd

# 读取文件，直接打印出文件内容
cat fileName

# 创建文件
touch fileName

# 创建文件夹
mkdir folderName

# 修改文件, 使用 nano
nano filename
# nano 相关用法：
# ctrl+6 设置光标锚点, 之后使用上下键可以选中多行文本，之后 ctrl+k 切除
# ctrl+o 之后 enter 确认保存修改, 之后 ctrl+x 退出编辑

# 以下命令中：
# -r 递归，操作文件夹时使用
# -f 强制覆盖

# 复制文件/文件夹
cp src des

# 移动或重命名文件/文件夹
mv src des
```

### 文件传输

```bash
# 从服务器下载文件夹到本地
# -r：递归复制目录
# 格式：username@host:/remote/path
# /local/path：本地保存路径
scp -r ubuntu@nnn.nnn.nnn.nnn:/home/ubuntu/psl_web ./

# 从本地上传文件到服务器
scp C:\Users\xxx\test.txt ubuntu@serverhost:/home/xxx/xxx

# 从本地递归上传文件夹到服务器,例如上传本地的 nnn 到服务器的 sss，若 sss 文件夹不存在则会自动创建，若存在则不会覆盖内部文件
scp -r C:\Users\xxx\nnn ubuntu@serverhost:/home/xxx/sss
```

### 会话管理

> 在普通的 shell 窗口中启动服务之后，该服务进程属于窗口的子进程，如果窗口关闭，服务也将终止。这时可以使用 tmux 创建会话，在会话窗口中启动服务，退出会话后再关闭窗口服务也不会终止。并且可以创建多个会话，会话之间互不影响。

```bash
# 使用 tmux 管理会话窗口

# 创建会话窗口 s001
tmux new -s s001

# 退出并终止会话窗口
exit

# 退出但保留会话窗口
ctrl + b, d

# 恢复会话窗口
tmux attach -t s001

# 查看所有会话窗口
tmux ls

# 将当前会话的日志输出到文件，先进入会话，在会话内执行。
# 此外，日志文件的路径是相对于 tmux 启动会话时的路径，在会话中切换目录并不会影响日志路径
tmux pipe-pane -o 'sed -u "s/\x1B\[[0-9;?]*[A-Za-z]//g" >> log.txt'

# 停止输出到文件（也要在会话内执行）
tmux pipe-pane
```

### Node.js / npm 的安装问题

```bash
# 卸载 apt 安装的旧版 Node.js 和 npm
sudo apt remove --purge nodejs npm -y
sudo apt autoremove -y

# 安装 curl（如果没有）
sudo apt update
sudo apt install curl -y

# 使用 NodeSource 安装 Node.js 最新 LTS
# Node.js 官方 PPA，20.x 为最新 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### apt 软件管理

#### apt 常用命令

```bash
# 以软件 tmux 为例
# 更新软件源
sudo apt update
# 安装/升级软件
sudo apt install tmux -y

# 卸载软件，但不删除配置文件
sudo apt remove tmux

# 卸载并删除配置文件
sudo apt purge tmux

# 卸载后清理无用依赖
sudo apt autoremove

# 升级所有软件
sudo apt update && sudo apt upgrade

# 查看所有已安装的软件
apt list --installed

# 查看单个软件的安装状态, 例如查看 tmux 是否已安装
apt list --installed | grep tmux
```

#### apt 包锁定问题

```bash
# 在删除或升级软件时，如果该软件正在运行则无法对其进行修改 
# 查看正在运行的 apt 进程
ps -ef | grep apt

# 安全终止正在运行的 apt 进程（根据实际 PID 替换）
sudo kill -9 进程号
```

### Docker

```bash
# 查看正在运行的容器
docker ps

# 进入一个带 docker-compose.yaml 文件的目录，重启当前 docker 容器
docker compose down && docker compose up -d

# docker 数据库操作，之后输入密码，输入过程不可见
docker exec -it name_database mysql -uroot -p

```

### 服务管理

```bash
# 案例：创建一个开机自启，意外终止后会自动重启的 Node.js 服务
# 在 /etc/systemd/system 创建 service 文件
sudo nano /etc/systemd/system/my-node-app.service

# 添加以下内容 -------------------------------------------------
[Unit]
Description=my-node-app
After=network.target
[Service]
WorkingDirectory=/home/ubuntu/feeder-server
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=3
[Install]
WantedBy=multi-user.target
# -------------------------------------------------------------

# 加载修改后的 service 文件
sudo systemctl daemon-reload
# 启动服务
sudo systemctl start my-node-app
# 开机自启
sudo systemctl enable my-node-app

# 停止服务
sudo systemctl stop my-node-app
# 取消开机自启
sudo systemctl disable my-node-app

# 查看实时日志
journalctl -u my-node-app -f


# 手动 kill 掉 Node 进程，验证是否会自动重启
ps aux | grep node
kill -9 <pid>

# 查看服务状态，将会输出 Active: active (running)
systemctl status my-node-app

# 查看当前正在运行的服务
systemctl list-units --type=service --state=running
```
