# Nginx 配置

### 简介

nginx 位于客户端和内网之间，用于接受客户端请求，根据自定义规则映射到不同端口。
比如服务器上的 3001 和 3002 端口上部署了不同的服务，那么就通过两个子域名 aaa.xxx.com 和 bbb.xxx.com 来分别映射到这两个端口上，用户直接访问域名，无需添加端口号，就可以访问到目标服务。还可以通过设置不同的访问路径等方式来映射到不同端口上的服务。

### 部署步骤

1. 安装 nginx

   ```bash
   sudo apt install nginx -y
   ```
2. 编辑配置文件

   ```bash
   # 使用 nano 编辑 nginx 配置文件
   sudo nano /etc/nginx/nginx.conf
   ```

   其他都不需要动，只需要在 http 模块中添加自己的 server 规则，以下是一个例子，将 test1.xxx.com 和 test2.xxx.com 分别映射到 3001 和 3002 端口。

   ```bash
   user www-data;
   worker_processes auto;
   pid /run/nginx.pid;
   include /etc/nginx/modules-enabled/*.conf;

   events {
     worker_connections  1024;
   	# multi_accept on;
   }

   http {

   	##
   	# Basic Settings
   	##

   	sendfile on;
   	tcp_nopush on;
   	types_hash_max_size 2048;
   	# server_tokens off;

   	# server_names_hash_bucket_size 64;
   	# server_name_in_redirect off;

   	include /etc/nginx/mime.types;
   	default_type application/octet-stream;

   	##
   	SSL Settings
   	##

   	ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3; # Dropping SSLv3, ref: POODLE
   	ssl_prefer_server_ciphers on;

   	##
   	# Logging Settings
   	##

   	access_log /var/log/nginx/access.log;
   	error_log /var/log/nginx/error.log;

   	##
   	# Gzip Settings
   	##

   	gzip on;


   	include /etc/nginx/conf.d/*.conf;
   	include /etc/nginx/sites-enabled/*;

     ##
     # servers
     ##

     # ===== test1 =====
     server {
         listen 80;
         server_name test1.xxx.com;

         location / {
             proxy_pass http://127.0.0.1:3001;
             proxy_set_header Host $host;
             proxy_set_header X-Real-IP $remote_addr;
             proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
         }
     }

     # ===== test2 =====
     server {
         listen 80;
         server_name test2.xxx.com;

         location / {
             proxy_pass http://127.0.0.1:3002;
             proxy_set_header Host $host;
             proxy_set_header X-Real-IP $remote_addr;
             proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
         }
     }
   }
   ```
3. 测试配置文件是否正确

   ```bash
   sudo nginx -t
   # 输出以下信息则配置正确
   # nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
   # nginx: configuration file /etc/nginx/nginx.conf test is successful
   ```
4. 启动 nginx

   ```bash
   sudo systemctl start nginx
   # 配置开机自启动
   sudo systemctl enable nginx
   ```

   至此 nginx 配置结束。

   后面可根据需要为 nginx 添加意外终止后自动重启的配置，配置方法参考当前目录下《Linux 常用命令》中的服务管理。
