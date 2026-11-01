# 统一支付验证记录

日期：2026-11-01（Asia/Singapore）。本次测试只使用 Stripe 沙箱，不涉及真实扣款；测试时代码尚未推送或部署。

## 自动化验证

- 博客 `npm run test:payments`：10/10 通过。
- TOPRO `npm run test:payments`：12/12 通过（含原有激活规则）。
- 博客 `npm run test:payments:pages`：6/6 通过，在实际本地 Cloudflare Pages/workerd 和独立 D1 中验证；会真实调用 Stripe 测试 API创建 Checkout，之后自动将未付款的本次 Session 过期。
- 博客和 TOPRO 的 `npm run build`：通过。TOPRO 使用 cloudflare-pages 构建。

覆盖签名篡改、超时签名、跨路径重放、越权查单、金额/币种/订单/模式不匹配、固定标题与空描述、套餐价格不可被浏览器覆盖、重复创建、异步付款确认、回调失败重试、查单补偿、取消/待确认返回页、事务回滚、重复通知和并发续费。

## 真实 Stripe Checkout/Webhook

在独立本地 TOPRO Wrangler/D1、博客支付后端、临时公开通道和临时 Stripe 测试 Webhook 中实测：

| 项目 | 测试金额 | 结果 |
| --- | --- | --- |
| TOPRO 首购（1 个月） | USD 6.00 | 真实 Stripe Webhook 自动发码，30 天待激活时长 |
| TOPRO 续费（3 个月） | USD 15.40 | 保留原码，总待激活时长 120 天 |
| 博客 JS Convert Tool | USD 6.00 | 返回激活码；浏览器点击 Activate now 成功，显示 Licensed |
| 博客自定义金额 | USD 1.23 | 付款成功，回执金额正确，不误发软件激活码 |

Stripe 实际 line item 的名称均为 `software customization`，Product description 为空；已付款 PaymentIntent description 也确认为空。商家显示名仍为 Software。

故障测试将一次 TOPRO 通知暂时指向不可用地址，真实 Stripe 事件首次得到 502；恢复后经签名查单补偿成功，Stripe 同一事件后来重试得到 200。重复并发通知 5 次没有重复增加时长。管理员账号接口仍能查到两笔 TOPRO 付款；更换激活码后保留 120 天时长。

浏览器还确认：主域名入口对应的成功页显示确认结果、3 秒倒计时和立即返回按钮，随后自动回到 TOPRO 原价格页显示激活码。沙箱实测域名使用临时通道替代未发布的生产 `www`；生产路径在代码和测试中固定校验。

本地原始结果在 `.wrangler/sandbox-payments/latest-report.json` 和 `.wrangler/pages-smoke/latest-report.json`，不提交测试数据库、密钥或临时凭证。沙箱测试记录可在 Stripe 测试模式按上述金额及测试时间核对。

## 尚需发布后核对

这次没有在 Cloudflare 线上发布，也没有使用正式密钥。生产域名绑定、D1 绑定、正式 Webhook 和线上支付应在按 `UNIFIED_PAYMENTS.md` 配置后核对。

TOPRO 邮件在本地使用 `MAIL_LOG_ONLY=1`，只验证发信调用，不向真实邮箱发送；生产 Resend 投递需要单独验证。
# 2026-11-01 邮件与 Checkout 体验修复复测

- 博客支付自动化 10/10、TOPRO 自动化 17/17、实际本地 Pages/workerd + D1 + Stripe 沙箱检查 6/6 通过。
- 注册及重置验证码：显式页面语言优先于冲突 Cookie，中文/英文主题和正文均验证；购买语言保存到订单，回调按订单语言发信。
- 首购/续费分别向买家和商家收件箱构造邮件，商家默认 `topro@braveasy.com`。模拟商家邮件服务故障，已付款及激活码仍保留，签名通知返回 503；重试只发送未完成邮件，不重复充值。
- 新版实际 Stripe 沙箱 Checkout 浏览器首屏显示银行卡表单，不预填账号邮箱，不禁用 Link。正式 Stripe 后台 Link 的“预填客户信息”已关闭，并重载确认保存。
- 本次新建的沙箱页面仅用于展示和接口检查，未进行任何真实扣款。Resend 发送由测试传输捕获，未向真实收件箱发送测试通知；正式邮件是否进入收件箱仍需真实购买后核对。

