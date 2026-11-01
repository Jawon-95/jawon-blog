import BrowserOnly from '@docusaurus/BrowserOnly';
import CodeRain from '@site/src/components/CodeRain';

// 全站根组件：在所有页面底层渲染背景代码雨
export default function Root({ children }) {
  return (
    <>
      <BrowserOnly>{() => <CodeRain />}</BrowserOnly>
      {children}
    </>
  );
}
