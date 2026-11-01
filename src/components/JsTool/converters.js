// 转换逻辑，与原 static/pages/JSConvertTool.html 保持一致

// JS 转字符串
export function jsToString(input) {
  return JSON.stringify(input).replace(/^"|"$/g, '');
}

// 字符串转 JS CharCode
export function stringToCharCode(input) {
  return 'String.fromCharCode(' + input.split('').map((c) => c.charCodeAt(0)).join(',') + ')';
}

// JS 转 Regex ------------------------------------------------------------
// sabaka-babaka
function escapeRegExpSpecialCharacters(str) {
  return str.replace(/[.*+?^{}()|[\]\\]/g, '\\$&');
}

// sabaka-babaka
function replaceMangledNames(str) {
  const reg =
    /(?:".+?")|(?:\b\d+\.\d+\b)|(?:\b\d+\b)|(?:\b(?:break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|import|in|instanceof|new|null|return|super|switch|this|throw|true|try|typeof|var|void|while|with|toString|equals|hashCode|callableName)\b)|([\w$]+)/g;
  return str.replace(reg, (match, group1) => (group1 ? '[\\w$]+' : match));
}

// sabaka-babaka
function escapeDollars(str) {
  const reg = /(?:\[\\w\$\]\+)|(\$)/g;
  return str.replace(reg, (match, group1) => (group1 ? '\\$' : match));
}

export function jsToRegex(text) {
  if (!text) return '';
  text = escapeRegExpSpecialCharacters(text);
  text = replaceMangledNames(text);
  text = escapeDollars(text);
  return RegExp(text).toString().replace(/^\/|\/$/g, '');
}

// eval 加密 --------------------------------------------------------------
function stringToCharCodes(str) {
  return '"' + str.split('').map((c) => '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('') + '"';
}

export function deepEvalEncrypt(depth, script) {
  script = `window[String.fromCharCode(101,118,97,108)](${stringToCharCodes(script)});`;
  depth--;
  if (depth > 0) script = deepEvalEncrypt(depth, script);
  return script;
}
