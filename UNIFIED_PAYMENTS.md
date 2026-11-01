# 统一支付后端：接入、运维与发布

本仓库不只是博客：它还承载所有接入产品共用的 Stripe 支付后端。生产入口固定为 **https://www.braveasy.com**。

本次验证范围和结果见 [PAYMENT_TEST_RESULTS.md](./PAYMENT_TEST_RESULTS.md)。

各产品可以继续部署在自己的域名和仓库。创建 Stripe Checkout、查询 Stripe、接收 Stripe Webhook 都在本仓库完成；产品后端维护自己的用户、业务订单、激活码或其他权益。

## 当前行为

- 所有**新建** Checkout 的商品名称严格为 `software customization`。
- 不提交商品 `description`，也不提交 PaymentIntent `description`；Stripe 中对应描述为空。浏览器传入的 item/description 不能覆盖它们。
- 只收 USD，金额使用整数美分。默认范围 $1–$5000；关闭 Adaptive Pricing，按下单美元金额核对。无自动续费。
- Stripe metadata 仅保存不透明的 `payment_id`，`client_reference_id` 也是此编号；业务对应关系保存在商家数据库里。这些订单标识不是机密。
- 商品标题不用于判断发什么权益：通过支付订单关联产品和业务订单。
- `www` 返回页不展示激活码。确认已支付后显示成功、3 秒倒计时及“立即返回产品”；待确认时轮询最多约 2 分钟，不提前报成功；取消/过期时允许手动返回。禁用 JS 时仍可点击链接。
- 原博客 `/js-tool` 的购买/发码和 `/pay` 自定义金额付款都经过同一个支付核心；旧博客 Checkout 链接仍能查询。
- 已经创建的 Stripe 付款不会被改名；统一设置只影响新建付款。

统一入口和商品名称是技术配置，不保证免除 Stripe 的业务审核。网站、商家资料和实际交易应准确一致。后续维护者需要核对固定名称是否适用于新增业务，不能把此接口当成绕过审核的机制。

## 分工和数据

| 模块 | 责任 |
| --- | --- |
| `server/payment-gateway.js` | 创建支付、向 Stripe 查单、核对金额/模式/订单、通知产品 |
| `server/payment-apps.js` | 可信产品清单、各产品密钥变量名、固定回调和返回路径 |
| `server/payment-auth.js` | v1 HMAC-SHA256 请求签名和验签 |
| `server/payment-store.js` | D1 支付账本初始化、读取 |
| `server/payment-return.js` | 简洁的确认/成功页面和倒计时 |
| `functions/api/payments/*` | 产品后端专用的签名接口 |
| `functions/api/pay/stripe-webhook.js` | Stripe 官方签名入口 |
| `functions/pay/[client].js` | 各产品的浏览器返回页 |

博客需要绑定独立 D1 数据库 **PAYMENTS_DB**；第一笔请求自动创建 `gateway_orders` 表，不访问 TOPRO 的数据库。表记录产品、业务订单、金额、Stripe Session、支付状态、通知次数/错误/成功时间。`UNIQUE(client_id, order_id)` 防止同一个业务订单重复创建支付；同一订单更换金额会返回 409。

TOPRO 数据库仍保存 `pay_orders`，新增可空字段 `payment_id`；首次请求自动兼容旧表。付款历史和管理面板保持原来的字段，`session_id` 仍是 Stripe 的 Session 编号。

## TOPRO 当前完整流程

1. 浏览器向 TOPRO `POST /api/pay/order`，必须已经登录；TOPRO 从 `shared/pricing-plans.js` 读取套餐金额，忽略浏览器自报价格。
2. TOPRO 保存业务订单，签名请求博客 `POST /api/payments/create`。博客持久化支付记录并用幂等键创建 Checkout，只返回到 `www` 下的地址。
3. TOPRO 保存返回的 `payment_id` 和 `session_id`，让浏览器跳转 Stripe。
4. Stripe 把付款事件发往 `https://www.braveasy.com/api/pay/stripe-webhook`。博客验证原始正文签名、订单引用、金额、币种、正式/测试模式。
5. 确认 paid 后，博客签名通知 TOPRO `/api/pay/gateway-notify`。TOPRO 核对本地订单、两个支付编号和金额，在同一个 D1 batch 事务中发码/续费并标记 paid，避免重复加时长和中途失败造成的重复交付。
6. 邮件由 TOPRO 发送；已有账号继续使用原激活码，购买增加时长。更换激活码和设备/活跃度继承逻辑保留。
7. 买家返回 `www/pay/topro?payment=...`，付款已确认时倒计时 3 秒回到 TOPRO `/pricing?order=...`，继续使用 TOPRO 自己的登录态显示激活码。
8. Webhook 没到或回调失败时，TOPRO 查单会调用博客签名状态接口，再由 TOPRO 完成交付。博客返回页也能补查和重试通知。

## 接入新产品

### 1. 注册可信后端

在 `server/payment-apps.js` 增加一个固定配置，例如：

```js
productb: {
  secretEnv: 'PAY_PRODUCTB_SECRET',
  originEnv: 'PAY_PRODUCTB_ORIGIN',
  defaultOrigin: 'https://productb.example.com',
  notifyPath: '/api/pay/gateway-notify',
  successPath: '/orders/payment-result',
  cancelPath: '/pricing',
}
```

产品标识使用小写字母、数字和连字符。给每个产品生成不同的至少 32 字符随机密钥，分别配置在博客和对应产品**服务端**。产品域名、回调路径、返回路径都由此处固定配置，不能让浏览器或任意请求提供外部回调地址。

所有接入方都必须是你信任的服务端。获得某产品签名密钥就能代表该产品创建支付和接收确认，因此不能放在客户端、网页 JS、软件安装包或公开仓库里。

### 2. 产品后端创建自己的业务订单

用户登录、套餐权限和价格校验由产品后端负责。从服务端套餐表读取金额，先落库，再调用统一接口。自定义金额业务同样需要服务端校验允许范围和用途；不得把软件授权价格交给浏览器决定。

`POST https://www.braveasy.com/api/payments/create`

```json
{
  "order_id": "32位随机业务订单编号",
  "amount_cents": 600,
  "currency": "usd",
  "email": "buyer@example.com"
}
```

- `order_id`：16–100 位字母、数字、下划线或连字符，每个产品内唯一；重试必须沿用原编号和原参数。
- `amount_cents`：整数美分，例如 600 = $6；只由可信后端提交。
- `currency`：当前只能是 `usd`。
- `email`：可选，传入时必须是有效邮箱。
- 不接受自定义商品名称/描述、回调 URL、成功 URL、取消 URL。

响应示例：

```json
{
  "payment_id": "博客生成的32位支付编号",
  "order_id": "产品原始业务订单编号",
  "session_id": "cs_live_...",
  "amount_cents": 600,
  "currency": "usd",
  "paid": false,
  "status": "pending",
  "livemode": true,
  "url": "https://checkout.stripe.com/..."
}
```

产品保存两个支付编号后，让浏览器跳转 `url`。网络失败时用同一订单和相同请求体重试。博客还会使用 Stripe 幂等键；若某笔创建结果不明且已超过 23 小时，会要求人工核对，不会在 Stripe 幂等保留期之外默默新建另一笔付款。

### 3. 签名协议（请求与通知相同）

请求头：

```text
Content-Type: application/json
X-Payment-Client: topro
X-Payment-Timestamp: Unix秒时间戳
X-Payment-Signature: HMAC-SHA256的小写十六进制
```

签名内容为下列各行用一个 LF 换行符连接，最后正文后没有额外换行：

```text
payment-v1
产品标识
时间戳
大写HTTP方法
请求pathname和完整query（如果存在）
原始JSON正文
```

使用该产品共享密钥计算 HMAC-SHA256。服务端允许时钟偏差 300 秒；必须对**原始正文**验签，不能先 JSON.parse 再序列化验签。方法和路径也参与签名，不能跨接口复用签名。保持服务器时钟准确。

JavaScript 后端可复用 `server/payment-auth.js` 中的 `signedHeaders()` / `verifyRequest()`，并使用相同 JSON 字符串签名和发送。TOPRO 已有对应实现与一致性测试。

### 4. 实现产品付款通知

博客按固定配置向产品的 `notifyPath` 发送上述签名 POST，正文是支付结果（见上方响应字段，不包含 `url`）。只有 `paid: true`、`status: "paid"` 才通知发货。

产品必须：

1. 校验产品标识、时间戳和原始正文签名。
2. 查找自己的业务订单；匹配 `payment_id`、`session_id`、金额、币种和模式，不接受任意新订单。
3. 以数据库事务实现幂等交付。重复已完成的通知也返回成功。
4. 交付成功后返回 HTTP 200 和 `{"received":true}`；失败返回非 2xx，让通知重试。

不能只凭浏览器“成功”参数、订单 URL、商品名或者邮箱给用户开通权限。

### 5. 增加查单补偿

产品后端签名请求：

```text
POST /api/payments/status
{"payment_id":"已保存的博客支付编号"}
```

只能查本产品订单。响应是付款状态字段；产品核对后调用与通知相同的幂等交付函数。浏览器应通过产品后端查自己的订单，不能直接拿签名密钥请求博客。

返回页自动使用 `/pay/<产品标识>?payment=<编号>`，不必给每个产品再写一份页面；产品只需实现自己的成功和取消落地页。

**不需要为每个产品单独注册 Stripe Webhook。** 所有产品共用本仓库的一个端点，博客根据支付账本决定通知哪个产品。

## 失败恢复及范围

- 博客确认收款后先保存 paid，再交付。通知失败会保存错误并给 Stripe 返回失败，依赖 Stripe 的 Webhook 重试；产品查单和返回页也会补偿。
- 当前没有独立定时任务或永久消息队列。若产品持续不可用，超过 Stripe 自动重试窗口，应在 Stripe 重发事件，或由对应产品后端签名调用状态接口恢复。可在 D1 查询 `status='paid' AND delivered_at IS NULL AND client_id!='blog'` 查找未交付订单。
- 只有回调明确返回 `received: true` 才记录通知成功。通知不能 301/302 跳转。
- 邮件失败不会回滚已经发放的激活码；账号页面仍然能查询。邮件实际发送由 TOPRO 的 Resend 配置决定。
- 当前支持一次性付款；退款、拒付自动撤销权益、订阅账单和多币种不在本次接口范围内。
- 旧 TOPRO `/api/pay/stripe-webhook` 返回 410，不再使用。此次支付功能尚未上线；如迁移已有独立 Stripe 集成，需先核对未结订单，不能直接停掉仍承担交付的旧端点。

## 生产环境配置与发布顺序

本账号在 2026-11-01 已完成生产配置准备，具体项目、数据库、端点和保存状态见 [PRODUCTION_PAYMENT_SETUP.md](./PRODUCTION_PAYMENT_SETUP.md)。后续发布应复用现有配置，不要重复创建数据库或 Webhook。

### 博客 Cloudflare Pages

1. 确认 `www.braveasy.com` 已绑定博客 Pages 项目，并能直接访问，不会被整站重定向去 `jawon.braveasy.com`。
2. 在 Cloudflare 创建独立 D1，例如 `braveasy-payments`，给博客绑定名称 **PAYMENTS_DB**；第一笔请求自动创建表。
   Pages 构建命令仍用 `npm run build`、输出目录 `build`；必须连同项目根目录的 `functions/` 编译发布，不能只作为纯静态站点上传。配置兼容性标记 `nodejs_compat`（本地验证日期为 `2026-03-01`）。
3. 设置生产变量/机密：

| 名称 | 值 |
| --- | --- |
| `SITE_URL` | `https://www.braveasy.com` |
| `STRIPE_SECRET_KEY` | 正式 `sk_live_...`，仅博客保管 |
| `STRIPE_WEBHOOK_SECRET` | 此正式 Webhook 端点的 `whsec_...` |
| `PAY_TOPRO_SECRET` | 新生成的随机共享密钥，至少 32 字符 |
| `PAY_TOPRO_ORIGIN` | `https://topro.braveasy.com`（也是默认值） |
| `PAY_MAX_AMOUNT` | 可选，美元金额上限，默认 5000 |

生产环境**不设置 `PAY_ALLOW_TEST`**。测试/预览环境单独使用沙箱密钥、测试 D1 和 `PAY_ALLOW_TEST=1`，不得共用生产数据库。

### Stripe 正式模式

新建快照（Snapshot）Webhook 端点：

```text
https://www.braveasy.com/api/pay/stripe-webhook
```

订阅 `checkout.session.completed`、`checkout.session.async_payment_succeeded`。复制这个端点的签名密钥到博客。不要把 Stripe CLI/临时测试端点的密钥用于正式端点。不要把该路径转到其他域名或强制登录页。

### TOPRO Cloudflare Pages

| 名称 | 值 |
| --- | --- |
| `PAYMENT_GATEWAY_URL` | `https://www.braveasy.com`（也是默认值） |
| `PAY_TOPRO_SECRET` | 与博客完全相同的共享密钥 |
| `RESEND_API_KEY` | 配置正式发信密钥，确保发件域名可用 |
| 原有 DB/R2/管理员/访问签名设置 | 按原部署保留 |

TOPRO 不再需要 `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`。生产不设置 `PAY_ALLOW_TEST`、`MAIL_LOG_ONLY`。

可在本机运行 `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` 生成共享密钥，粘贴到双方的机密配置中，不要提交到仓库。

### 发布

1. 先把域名、D1、双方共享密钥、Stripe 正式端点及环境变量配置好。
2. 发布博客，检查无签名请求被拒绝、Webhook 无签名返回 400，而非 404/重定向。
3. 发布 TOPRO，检查注册登录、创建订单、付款返回页、发码、续费、邮件和后台付款记录。
4. 最后按原流程发布 topro-admin（本次统一支付不需要改变其 API）。
5. 若使用 TOPRO 现有 `build:compatible` / `release:site` 发布流程，保持它的客户端版本保护；不要为了这次后端改动误发布未准备好的客户端版本。

生产配置保存和代码发布是两个步骤；正式支付与 Cloudflare 线上联调应在发布后单独确认。更新商家业务资料并不能由修改 Checkout 标题替代。

## 本地验证

需要 Node 22.13+（本地适配器使用 node:sqlite），博客和 TOPRO 已安装依赖。

```powershell
# 博客自动化协议/支付测试（使用隔离 SQLite 和模拟 Stripe）
npm run test:payments
# TOPRO 内执行：原子发码、并发续费、回滚和现有激活规则
npm run test:payments
```

TOPRO 测试默认寻找当前目录结构下的 jawon-blog 本地 SQLite 适配器。

普通本地开发：将 `.env.example` 中需要的设置补充到博客 `.env.local`（不要覆盖已有密钥），`npm run dev:api` 启动 3001 端口，自动使用忽略提交的 `.wrangler/unified-payments.sqlite`。Docusaurus 前端 `npm run start` 会代理 `/api`。跨产品返回页直接由 API 服务的 3001 端口提供，因此本地 `SITE_URL` 使用此端口。

### 真实 Stripe 沙箱端到端

1. TOPRO 先执行 `npm run build`，不部署。
2. 博客 `.env.local` 放 `sk_test_...`，执行 `npm run test:payments:sandbox`。
3. 脚本拒绝正式密钥，启动独立本地 TOPRO Wrangler/D1、博客 API、临时 cloudflared 通道，并创建临时 Stripe **测试** Webhook。
4. 按输出的专用测试账号登录 TOPRO，再打开脚本输出的付款链接，使用 `4242 4242 4242 4242`、未来有效期和任意 CVC 完成四笔沙箱付款（首购、续费、博客 JS 工具、自定义金额）。
5. 脚本自动核对 Stripe 实际商品/描述、真实 Webhook 发码、故障补偿、不重复续费、管理记录、更换激活码和博客原有发码；结果保存到 `.wrangler/sandbox-payments/latest-report.json`，不包含真实密钥。
6. 完成后可检查返回页；向 `http://127.0.0.1:3002/stop` 发 POST 清理临时 Webhook、通道和本地服务。未付款的本次测试 Checkout 会过期，已付款的测试记录保留用于核对。

脚本只操作本次新建的沙箱测试数据，不部署、不改生产 Webhook、不发真实邮件。邮件在本地使用 `MAIL_LOG_ONLY=1`；这不等于验证了生产 Resend 投递。

`npm run test:payments:pages` 还会将实际博客 Pages Functions 编译进本地 workerd，在独立 D1 中验证签名接口、Webhook 验签、真实沙箱 Checkout 创建、状态查询和动态返回页；本次未付款的测试 Session 会自动过期。

### Checkout 邮箱预填与 Link

网关仍将业务后端提交的邮箱保存到自己的订单表，但不再传 `customer_email` 给 Stripe Checkout，避免已注册 Link 的邮箱在打开付款页时直接触发 Link 验证。Link 保持启用，支付方式仍由 Stripe 动态选择；后台 Link 设置中已关闭“预填客户信息”。Stripe 托管页面对已登录 Link 的浏览器仍可能使用其记忆状态，本站不能保证强制覆盖每个浏览器的首选方式。

因此产品必须根据自己已认证的账号和订单发货、发邮件，不能根据用户在 Stripe 另行填写的邮箱重新绑定账号。TOPRO 将下单语言持久化到订单，由 TOPRO 发送买家邮件和商家通知；其中邮件失败会使签名通知要求重试，已完成的激活码交付不会回滚。
