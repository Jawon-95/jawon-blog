# Stripe 支付方式配置记录

2026-11-01 在 Braveasy 正式账号的默认支付方式配置中操作，并读取最终状态确认。

| 支付方式 | 当前状态 |
| --- | --- |
| 微信支付、支付宝 | 已提交启用，待 Stripe 批准 |
| Google Pay、韩国本地银行卡 | 本次已启用 |
| 银行卡、Apple Pay、Link、Kakao Pay、MB WAY、Naver Pay、PAYCO、Samsung Pay、Bancontact、EPS | 保持启用 |
| iDEAL / Wero | 已尝试启用一次性付款，Stripe 要求补充个人身份验证，需要账号本人完成 |
| Przelewy24 | 已尝试启用，Stripe 返回“不符合资格” |
| SEPA 直接借记、普通银行转账 | 保留关闭：确认到账较慢，不适合目前付款后立即发码的预期 |

## 币种和显示限制

用户明确选择只开通后台，保留现有美元付款，不新增人民币入口或调整价格。统一接口仍只接受 USD。

同一香港 Stripe 账号的真实沙箱 API 检查：支付宝 USD、CNY Checkout 均可创建；微信支付 USD 被 API 明确拒绝，仅支持 HKD、CNY，CNY Checkout 可创建。本次这些测试 Session 均未付款，并已设为过期。沙箱成功不代表正式支付方式已经通过审核。

因此当前不能向用户宣传微信已经可以支付美元订单；必须先获得正式批准，再单独确定港币/人民币的价格、网关币种白名单、金额校验、TOPRO 本地订单及发码核对和管理端显示方案。不能只在前端更改币种，也不能放松 Webhook 的金额/币种核对。

后台启用并不意味着每个买家都能看到同一组方式，Stripe 会按客户、设备、币种、金额和账号资格动态显示。

## Link

Link 付款方式保持启用，已关闭其优化项“预填客户信息”，并重新加载页面确认保存。网关不再向 Checkout 传入 `customer_email`，业务账号邮箱仍保存在我们自己的订单库。新版真实沙箱 Checkout 首屏已检查为银行卡表单。已登录 Link 的浏览器可能仍受 Stripe 记忆状态影响。

## 参考

- [动态支付方式](https://docs.stripe.com/payments/payment-methods/overview)
- [微信支付的账号和币种要求](https://docs.stripe.com/payments/wechat-pay)
- [支付宝币种要求](https://docs.stripe.com/payments/alipay)
- [香港支付方式标准费率](https://stripe.com/en-hk/pricing/local-payment-methods)：不同方式费用不同，可能有国际交易或换汇附加费，实际以账号费率为准。
- [SEPA 直接借记确认时间和失败风险](https://docs.stripe.com/payments/sepa-debit)
