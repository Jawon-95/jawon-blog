# nodejs 常用命令

## npm 包管理

### 查看 npm 版本

```bash
npm -v
```

### 初始化 nodejs 项目

```bash
npm init
# 会创建一个package.json文件，包括名称、版本、作者这些信息等，创建过程一路回车
```

### 安装包

```bash
npm instal
# 或简写为 npm i，一键安装当前项目中所有的依赖。
# 后面加上 --save 或 -S 表示把包的信息写入 package.json 中的 dependencies，但不加也会默认写入。
# 后面加上 --save-dev 或 -D 表示把包的信息写入 package.json 中的 devDependencies
# 出现版本问题时在后面加 --legacy-peer-deps ，忽略版本问题
```

### 查看包

```bash
# 查看当前项目的包，简写 npm ls
npm list

# 查看全局包，简写 npm ls -g
npm list -g
```

### 删除包

```bash
# 删除 xxx 包
npm uninstall xxx

# 删除 xxx 全局包
npm uninstall -g xxx
```

### 执行自定义指令

```bash
npm run xxx
# xxx 是 package.json 中 scripts 中的自定义指令
```

例子：

假设仓库名为 origin，分支名为 main，通过在 ./package.json 中自定义 push 和 pull 指令，实现一键 push 和一键 pull

```json
{
  "scripts": {
    "push": "git add . && git commit -m '1' && git push -f origin main",
    "pull": "git fetch origin main && git reset --hard origin/main",
   }
}
```

执行 npm run push 或 npm run pull 即可一键上传或拉取项目。

> 同时执行多个 bash 指令时，两哥指令之间使用 && 或 & 分隔，区别是 && 会检测上一个指令是否成功，只有成功才会执行后续指令，而 & 则不会检测。

## 执行 nodejs 脚本

```bash
node ./xxx/xxx.js
```
