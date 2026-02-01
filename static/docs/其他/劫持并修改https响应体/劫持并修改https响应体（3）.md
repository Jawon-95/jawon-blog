# 劫持并修改https响应体（三）

又过了一段时间，我开始对 electron 感兴趣，而且豆包说 electron 具备劫持 https 响应体的能力，还给了我一段有模有样的代码，

```js
const { app, BrowserWindow, session } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // 加载百度页面
    mainWindow.loadURL('https://www.baidu.com');

    // 获取当前会话
    const ses = mainWindow.webContents.session;

    // 拦截请求
    ses.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
        // 示例：假设拦截 index.html 请求
        if (details.url.includes('index.html')) {
            // 模拟修改响应内容
            const modifiedContent = '<html><body>Modified HTML</body></html>';
            callback({
                cancel: false,
                redirectURL: null,
                responseHeaders: {
                    'Content-Type': 'text/html'
                },
                body: Buffer.from(modifiedContent)
            });
        } else {
            // 不拦截其他请求
            callback({ cancel: false });
        }
    });

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
```

我看着挺有戏的，于是开始尝试 electron。

### 安装 electron

原本以为一键 npm install electron -D 就OK了，是的，我第二天在公司的电脑上确实一键成功了，但之前的晚上我在家花费了近4小时才勉强安装成功。网上的解决方法基本都试过了，安装的时候不是报红就是卡住，三个多小时后，我放弃了（世上无难事，只要肯放弃）。

我开始第一次尝试去手动安装一个 npm 包，我 Google 到了这篇文章，是他救了我：[手把手离线安装 electron](https://juejin.cn/post/7003249707216535565)。

按照这篇文章，我成功离线安装了 electron，值得一提的是，离线安装包不要下错：[Releases · electron/electron · GitHub](https://github.com/electron/electron/releases)

他 release 页面的压缩包非常多，一定要选对才行，window 系统选这个：

![1744783275956](image/劫持并修改https响应体(三)/1744783275956.png)

### 测试 electron 方案

在成功安装 electron 之后，我开始测试上面的代码，然而弹出网页并未被修改，说明劫持无效，之后我开始查阅大量资料，发现主要是围绕 electron 提供的 session.webRequest 相关的方法，但都是无效的，不错不错，被豆包狠狠地欺骗了！

我又陷入了沉思，那怎么办呢，使用 chromium 源码重编译一款符合需求的浏览器？查了一下编译一次需要 3~6 小时，搞不了一点啊！

那 [重编译一款 electron](https://blog.csdn.net/epubcn/article/details/136021220) 呢？看了下，也是一堆坑，而且同样编译一次需要几小时，搞不好又是一条不归路！

### Chrome.debugger

后来，在我发现了这一个可以修改响应体的浏览器插件 [ModResponse](https://chromewebstore.google.com/detail/modresponse-mock-and-repl/bbjcdpjihbfmkgikdkplcalfebgcjjpm?src=modheader-com)（基于[ chrome.debugger api](https://developer.chrome.com/docs/extensions/reference/debugger/)），结合前面对 electron 的了解，我发现 electron 也有 debugger api。

于是我开始在 electron 中尝试使用 debugger 劫持并修改响应体，经过不断尝试，我做到了，代码如下

```js
// main.js

import { app, BrowserWindow, session, net } from 'electron';
import { SetNetHookForWindow } from './Hook/hook.js';

app.whenReady().then(async () => {
    // 清除缓存
    await session.defaultSession.clearCache();

    let mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            webSecurity: false
        }
    });

    // let url = '某目标网站';
    let url = 'https://www.baidu.com/';
    // let url = 'https://github.com/';

    SetNetHookForWindow(mainWindow, url)

    mainWindow.loadURL(url);
});
```

```js
// Hook.js
import fs from 'fs';

export { SetNetHookForWindow };


function ModifyBody(body) {
    let bodyText = atob(body);
    let modifiedBody = bodyText.replace(/<title>.+?<\/title>/i, '<title>哈哈哈</title>');

    // 本地保存修改后的响应体
    fs.writeFileSync('HookedBody.html', modifiedBody);

    return modifiedBody;
}


function SetNetHookForWindow(targetWindow, targetURL) {
    const debuggerInstance = targetWindow.webContents.debugger;
    try {
        // 不指定 attach 版本，让 Electron 自动选择
        debuggerInstance.attach();
        console.log('[Hook] Debugger attached');
    }
    catch (err) {
        console.log('[Hook] Debugger attach failed: ', err);
    }

    // 启用网络调试
    debuggerInstance.sendCommand('Network.enable');

    // 启用请求拦截，设置模式为 HeadersReceived
    debuggerInstance.sendCommand('Network.setRequestInterception', {
        patterns: [
            {
                urlPattern: targetURL,
                resourceType: 'Document',
                interceptionStage: 'HeadersReceived'
            }
        ]
    });

    // 监听请求拦截事件
    debuggerInstance.on('message', async (event, method, params) => {

        if (params.request?.url !== targetURL) return;

        console.log('[Hook] url: ' + params.request.url);

        const interceptionId = params.interceptionId;

        console.log('[Hook] interceptionId: ', interceptionId);

         // 获取响应头
         const headers = params.responseHeaders || {};
         console.log('[Hook] headers: ', headers);

        try {
            // 获取响应体
            const { body } = await debuggerInstance.sendCommand(
                'Network.getResponseBodyForInterception',
                { interceptionId }
            );

            // 修改响应体
            const modifiedBody = ModifyBody(body);

            // 构建包含响应头和响应体的 base64 完整响应
            const base64Response = Buffer.from(
                'HTTP/1.1 200 OK\n' +
                'Content-Type: text/html; charset=utf-8\n' +
                'Content-Length: ' + Buffer.byteLength(modifiedBody) +
                '\n\n' +
                modifiedBody
            ).toString('base64');

            // 使用 Network.continueInterceptedRequest 修改响应体
            await debuggerInstance.sendCommand('Network.continueInterceptedRequest', {
                interceptionId,
                rawResponse: base64Response
            });
        }
        catch (error) {
            console.error('[Hook] Modification failed: ', error);
        }
    });
}
```

使用上面的代码，成功修改了百度的标题，于是我立马开始测试目标网站，真不错，也成功了，正当我满心欢喜，开始幻想可以任意修改 html 中的 CSP 时，md，忽然失效了，真的忽然失效了，我没有改动任何代码，但他就是失效了，而且就再也没有生效过，md，md！！！

我怀疑过时缓存问题，我使用各种方法清除了缓存，依然无效，但当我切换回百度，立马生效，那说明这个方法对于我目标网站是无效的。

废了，另谋出路吧！

---
