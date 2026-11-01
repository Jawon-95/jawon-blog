# Stripe 收款说明

本站部署在 **Cloudflare Pages**，同时承载 `www.braveasy.com` 的统一支付后端：博客自己的 **JS Convert Tool**、`/pay` 自定义金额和 TOPRO 等外部产品都通过这里收款。Stripe 密钥只保存在本项目服务端。

**后续接入新网站/产品，请先阅读 [UNIFIED_PAYMENTS.md](./UNIFIED_PAYMENTS.md)**，其中有完整签名协议、接口示例、失败恢复、本地测试和生产发布步骤。

所有新付款的商品名固定为 `software customization`，商品描述与 PaymentIntent 描述不提交。业务订单编号、产品归属和备注在博客 D1 支付账本里管理。不同实际业务仍应如实说明，统一命名不代表免除 Stripe 审核。

| 接口 | 作用 |
| --- | --- |
| `POST /api/checkout` | `{ plan }` 购买 JS Convert Tool（价格以 `src/data/business.js` 为准）；`{ amount, item?, note?, email? }` 自定义金额 |
| `GET /api/session?session_id=` | 查询付款结果，已付款时返回激活码 |
| `POST /api/payments/create` | 可信产品后端创建付款，必须 HMAC 签名 |
| `POST /api/payments/status` | 可信产品后端查询自己产品的支付结果，必须 HMAC 签名 |
| `POST /api/pay/stripe-webhook` | 统一 Stripe Webhook，验证 Stripe 官方签名 |
| `GET /pay/<产品标识>?payment=` | 确认状态页；已付款时 3 秒自动返回对应产品 |

## JS Convert Tool 流程

1. 买家在 `/js-tool` 点击购买，跳转到 Stripe 付款。
2. 付款成功后回到 `/js-tool?session_id=cs_...`，页面顶部显示激活码，可一键激活。
3. 激活码由 Session ID 固定生成，刷新页面拿到的是同一个码。

## 自定义金额 `/pay`

- 金额 $1 – $5000（上限可用 `PAY_MAX_AMOUNT` 调整），可选填用途、备注、收据邮箱。
- 可以用 `/pay?amount=20&item=Logo%20script` 预填后把链接发给客户。
- 付款后回到 `/pay?session_id=...` 显示结果；用途和备注保存在商家 D1 支付订单的 details 中，不写入 Stripe 商品标题或描述。

## 环境变量

本地写在 `.env.local`；线上在 Cloudflare Pages → 项目 → 设置 → 变量和机密。

| 变量 | 说明 |
| --- | --- |
| `STRIPE_SECRET_KEY` | 必填。测试用 `sk_test_...`，正式收款换成 `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | 统一 Webhook 对应的 `whsec_...` |
| `SITE_URL` | 生产 `https://www.braveasy.com`（默认）；本地可配置 3001 端口 |
| `PAYMENTS_DB` | Cloudflare D1 绑定名称；本地 Node API 自动使用独立 SQLite |
| `PAY_TOPRO_SECRET` | 与 TOPRO 相同的随机密钥，至少 32 字符 |
| `PAY_TOPRO_ORIGIN` | 默认 `https://topro.braveasy.com` |
| `PAY_ALLOW_TEST` | 仅本地/沙箱设置 `1`，生产不设置 |

## 本地测试

```bash
npm run dev:api   # 本地模拟 Pages Functions，端口 3001（读取 .env.local）
npm run start     # 网站，端口 3000，/api/* 自动转发到 3001
```

测试卡号：`4242 4242 4242 4242`，任意未来日期、任意 CVC。

TOPRO 创建付款、查单和 Stripe Webhook 已统一通过本站；TOPRO 保留账号、激活码、续费和邮件。正式部署顺序为博客支付后端 → TOPRO → 管理面板。
