# 部署新的 WangCai 实例

# 一、复制项目

当前项目目录：

```bash
/home/ubuntu/wangcai/wangcai_dashboard
```

复制一份：

```bash
cd /home/ubuntu/wangcai

cp -r wangcai_dashboard wangcai_dashboard_shiqiang
```

最终目录：

```text
/home/ubuntu/wangcai/
├── wangcai_dashboard
└── wangcai_dashboard_shiqiang
```

---

# 二、修改配置

进入新项目：

```bash
cd /home/ubuntu/wangcai/wangcai_dashboard_shiqiang
```

根据需要修改：

例如

```text
.env
```

修改：

```env
BINANCE_API_KEY=
BINANCE_API_SECRET=

PORT=
```

> 注意
>
> 至少保证下面这些不要和其它实例冲突：
>
> - PORT

---

# 三、PM2启动

启动：

```bash
cd /home/ubuntu/wangcai/wangcai_dashboard_shiqiang

pm2 start "npm run start" \
--name wangcai-shiqiang
```

查看：

```bash
pm2 ls
```

查看日志：

```bash
pm2 logs wangcai-shiqiang
```

确认端口：

```bash
sudo ss -lntp | grep 5000
```

本机测试：

```bash
curl http://127.0.0.1:5000
```

应该返回页面。

---

# 四、配置 Nginx

创建配置：

```bash
sudo vim /etc/nginx/sites-available/shiqiang.wangcai
```

内容：

```nginx
server {

    server_name shiqiang.wangcai.ca;

    location / {
        proxy_pass http://127.0.0.1:5000;

        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
```

保存
按ESC键 输入 :wq 回车

---

启用：

```bash
sudo ln -s \
/etc/nginx/sites-available/shiqiang.wangcai \
/etc/nginx/sites-enabled/
```

测试：

```bash
sudo nginx -t
```

重新加载：

```bash
sudo systemctl reload nginx
```

---

测试：

```text
http://shiqiang.wangcai.ca
```

如果能够打开即可。

---

# 七、申请 SSL

执行：

```bash
sudo certbot --nginx \
-d shiqiang.wangcai.ca
```

一路：

```
N
```

即可。

成功会看到：

```
Successfully received certificate

Successfully deployed certificate
```

浏览器访问：

```
https://shiqiang.wangcai.ca
```

---

---

# 多实例示例

| 域名 | PM2名称 | 本地端口 |
|------|----------|----------|
| app.wangcai.ca | wangcai-app | 5173 |
| demo.wangcai.ca | wangcai-demo | 5174 |
| test.wangcai.ca | wangcai-test | 5175 |
| dev.wangcai.ca | wangcai-dev | 5176 |

以后新增实例，只需要重复：

1. 复制项目
2. 修改配置（端口、KEY等）
3. PM2 启动
4. 配置 Nginx
5. `sudo certbot --nginx -d 子域名`
6. 测试访问