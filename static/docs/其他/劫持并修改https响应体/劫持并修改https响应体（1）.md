# 劫持并修改https响应体（一）

### 需求

对某个网站进行逆向的过程中，遇到了 CSP 限制，CSP 限制让人非常不爽，通过 [simple-modify-headers ](https://microsoftedge.microsoft.com/addons/detail/simplemodifyheaders/nmjjhcnkglmnieepjlgodcaebeigppjh) 浏览器插件可以很好地去除响应头中的 CSP 限制。但是，页面返回的 html 中仍然包含带有 CSP 的 meta 标签。

由于该 meta 标签存在于页面返回的html中，而不是 js 动态创建的，因此想通过 hook 创建 dom 相关的方法来拦截标签的创建是无效的。

所以需要在网页加载之前劫持服务器响应体(index.html)，之后去除带有 CSP 的 meta 标签，同时也能去除 CSP 相关的响应头，一举两得。

### 浏览器插件

既然浏览器插件可以修改响应头，那应该也能修改响应体吧，于是决定先从浏览器插件入手。

经过进一步了解，浏览器插件开发的官方文档中提供有 [chrome.webRequest ](https://developer.chrome.com/docs/extensions/mv2/reference/webRequest?hl=zh_cn)api 可以实现此功

但是这个 api 属于谷歌扩展的 mv2 版本，官方明确表示已放弃 [Manifest V2 简介  |  Chrome for Developers](https://developer.chrome.com/docs/extensions/mv2?hl=zh-cn)![1744772125922](image/劫持并修改https响应体(一)/1744772125922.png)

[Chrome 浏览器官方已经给出确定的时间来弃用 V2 版本的插件了](https://zhuanlan.zhihu.com/p/677476234)

![1744772819259](image\劫持并修改https响应体(一)\1744772819259.png)

因此这个 api 显然不是一个长久之计！！！

经过一番查阅，发现谷歌扩展 mv3 版本中提供了 [chrome.declarativeNetRequest ](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest?hl=zh_cn)api 来修改网络请求。

又经过几天的查阅和尝试，发现这个 api 只能对请求进行重定向、修改响应头、请求头等操作，并不具备修改响应体的能力，因此浏览器插件方案要暂时放一放了。

### 相关代码

```js
export { setNetRules, removeNetRules };

function setNetRules() {
    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rules.map(rule => rule.id),
        addRules: rules
    });
}

function removeNetRules() {
    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rules.map(rule => rule.id)
    });
}

let resourceTypes = [
    "main_frame",
    "sub_frame",
    "stylesheet",
    "script",
    "image",
    "font",
    "object",
    "xmlhttprequest",
    "ping",
    "csp_report",
    "media",
    "websocket",
    "other"
];

let rules = [
    {
        id: 1,
        priority: 1,
        action: {
            type: "modifyHeaders",
            requestHeaders: [
                {
                    header: "Origin",
                    operation: "set",
                    value: "https://tankionline.com/",
                },
                {
                    header: "Referer",
                    operation: "set",
                    value: "https://tankionline.com/",
                },
            ],
            responseHeaders: [
                {
                    header: "Access-Control-Allow-Origin",
                    operation: "set",
                    value: "*"
                },
                {
                    header: "Access-Control-Allow-Methods",
                    operation: "set",
                    value: "GET, POST, PUT, DELETE, OPTIONS"
                },
                {
                    header: "Access-Control-Allow-Headers",
                    operation: "set",
                    value: "*"
                },
                {
                    header: "Content-Security-Policy",
                    operation: "set",
                    value: "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval' data: blob:; style-src * 'unsafe-inline' 'unsafe-eval' data: blob:; img-src * data: blob:; font-src * data: blob:; connect-src * data: blob:; frame-src * data: blob:; object-src * data: blob:; media-src * data: blob:; child-src * data: blob:; form-action * data: blob:; manifest-src * data: blob:; worker-src * data: blob:; base-uri * data: blob:;"
                }
            ]
        },
        condition: {
            urlFilter: "*",
            resourceTypes
        }
    }
];

// function sss() {
//     chrome.declarativeNetRequest.updateDynamicRules({
//         removeRuleIds: [2],
//         addRules: [{
//             id: 2,
//             priority: 1,
//             action: {
//                 type: "redirect",
//                 redirect: {
//                     regexSubstitution: "https://tankionline.com\\1"
//                 }
//             },
//             condition: {
//                 regexFilter: "^https://gitee.com(.*)",
//                 resourceTypes
//             }
//         }]
//     });
// }
```

---
