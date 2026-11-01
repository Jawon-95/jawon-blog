# Stripe 收款说明

本站部署在 **Cloudflare Pages**，用 Stripe 收两类款：**JS Convert Tool** 激活码，以及 `/pay` 页面的自定义金额付款（定制开发、技术咨询、小费）。`functions/` 目录是服务端接口（Pages Functions），共用代码在 `server/pay.js`。Stripe 密钥只存在服务端环境变量里。

| 接口 | 作用 |
| --- | --- |
| `POST /api/checkout` | `{ plan }` 购买 JS Convert Tool（价格以 `src/data/business.js` 为准）；`{ amount, item?, note?, email? }` 自定义金额 |
| `GET /api/session?session_id=` | 查询付款结果，已付款时返回激活码 |

## JS Convert Tool 流程

1. 买家在 `/js-tool` 点击购买，跳转到 Stripe 付款。
2. 付款成功后回到 `/js-tool?session_id=cs_...`，页面顶部显示激活码，可一键激活。
3. 激活码由 Session ID 固定生成，刷新页面拿到的是同一个码。

## 自定义金额 `/pay`

- 金额 $1 – $5000（上限可用 `PAY_MAX_AMOUNT` 调整），可选填用途、备注、收据邮箱。
- 可以用 `/pay?amount=20&item=Logo%20script` 预填后把链接发给客户。
- 付款后回到 `/pay?session_id=...` 显示结果；备注写在订单的 metadata 里，在 Stripe 后台付款详情中能看到。

## 环境变量

本地写在 `.env.local`；线上在 Cloudflare Pages → 项目 → 设置 → 变量和机密。

| 变量 | 说明 |
| --- | --- |
| `STRIPE_SECRET_KEY` | 必填。测试用 `sk_test_...`，正式收款换成 `sk_live_...` |
| `SITE_URL` | 可选，本站地址，默认取请求域名 |

## 本地测试

```bash
npm run dev:api   # 本地模拟 Pages Functions，端口 3001（读取 .env.local）
npm run start     # 网站，端口 3000，/api/* 自动转发到 3001
```

测试卡号：`4242 4242 4242 4242`，任意未来日期、任意 CVC。

TOPRO 的收款由 TOPRO 自己的网站直接对接 Stripe，与本站无关。
