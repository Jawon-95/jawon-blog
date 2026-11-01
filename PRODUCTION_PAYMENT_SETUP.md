# 生产支付配置记录

配置日期：2026-11-01（Asia/Singapore）。通过 Cloudflare 和 Stripe 管理页面完成，保存后重新加载页面核对。

**本记录描述生产配置：创建这些配置时没有发布代码、发起真实扣款或发送真实邮件。** 代码发布应按博客 → TOPRO → 管理面板的顺序进行，实际版本以 Git 和 Cloudflare 的部署记录为准。

## 博客 Cloudflare Pages：jawon-blog

- `www.braveasy.com` 自定义域已处于活动状态，SSL 已启用；原有 `braveasy.com`、`jawon.braveasy.com` 域名保留。
- 生产兼容日期保留为 `2026-03-23`，增加 `nodejs_compat`。使用“保存版本”，未点击部署。
- 构建命令仍为 `npm run build`，输出目录 `build`。

| 名称 | 配置类型 | 当前设置 |
| --- | --- | --- |
| `SITE_URL` | 文本 | `https://www.braveasy.com` |
| `PAY_TOPRO_ORIGIN` | 文本 | `https://topro.braveasy.com` |
| `PAY_TOPRO_SECRET` | 密钥 | 新生成的随机共享密钥，与 TOPRO 相同；不在文档记录原文 |
| `STRIPE_SECRET_KEY` | 密钥 | 保留原配置；用户已确认是正式 `sk_live_...`，未读取或替换 |
| `STRIPE_WEBHOOK_SECRET` | 密钥 | 本次新建正式 Webhook 对应的签名密钥，已回填 |
| `PAYMENTS_DB` | D1 绑定 | 指向 `braveasy-payments` |

新建数据库：

- 名称：`braveasy-payments`
- 数据库 ID：`c10bf06d-13b0-4d5f-9eee-2823f6e8c360`
- 生产支付专用，独立于 TOPRO 的原数据库。
- `gateway_orders` 表由统一支付代码首次请求自动创建；没有导入测试数据。

## TOPRO Cloudflare Pages：topro

保留原有 `DB` → `topro`、`PREMIUM_MODULES` → `topro-premium-modules`，以及 `ACCESS_SIGNING_PRIVATE_JWK` 和 `ADMIN_PW`。

| 名称 | 配置类型 | 当前设置 |
| --- | --- | --- |
| `PAYMENT_GATEWAY_URL` | 密钥 | `https://www.braveasy.com` |
| `PAY_TOPRO_SECRET` | 密钥 | 与博客同一份随机共享密钥 |
| `RESEND_API_KEY` | 密钥 | 沿用 TOPRO 原代码已使用的发信密钥，显式写入生产配置 |

该项目由 Wrangler 管理，仪表板只允许增加加密变量，所以支付地址也以“密钥”类型保存；程序读取到的仍然是同一个 URL 字符串，不影响调用。

没有配置 `PAY_ALLOW_TEST` 或 `MAIL_LOG_ONLY`；博客生产环境同样没有这两项。

## Stripe 正式 Webhook

- 账户：Braveasy，正式模式。
- 名称：`www.braveasy.com unified payments`
- 端点 ID：`we_1UWyh58tCsLeVyGlmnzz8KKp`
- 地址：`https://www.braveasy.com/api/pay/stripe-webhook`
- 状态：使用中。
- 来源：您的账户。
- 有效载荷：快照（Snapshot）。
- API 版本：`2026-05-27.dahlia`。
- 仅订阅：`checkout.session.completed`、`checkout.session.async_payment_succeeded`。
- 签名密钥已写入博客 `STRIPE_WEBHOOK_SECRET`，Stripe 页面已恢复隐藏显示。

没有修改 Stripe 商家名称、商家网站、正式 API 密钥或其他现有支付设置。

## 后续发布

1. 复用以上数据库、端点和共享密钥，不需要重复创建。
2. 先发布博客，再发布 TOPRO，最后按原流程发布管理面板。遵循 TOPRO 现有客户端版本保护流程。
3. 变量/绑定在部署后生效；仅保存本页配置不会把本地尚未推送的代码发布出去。
4. 部署前，新的统一 Webhook 地址不能视为已完成线上投递验证；不要把“配置保存成功”当成“交付已上线”。
5. 发布后核对正式付款、Webhook 投递、TOPRO 发码/续费、付款返回和真实 Resend 邮件投递。

本次生成的密钥备份保存在本机博客 `.wrangler/production-settings/`（已由 Git 忽略）。此目录不得提交、上传或写入公开文档。截图只记录隐藏密钥后的配置界面。

完整接口协议和新增产品接入方式见 [UNIFIED_PAYMENTS.md](./UNIFIED_PAYMENTS.md)。
