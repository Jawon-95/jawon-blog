import { useEffect, useRef } from 'react';
import styles from './styles.module.css';

/**
 * 背景 01 代码雨（与 TOPRO 官网同风格）：固定在页面最底层，颜色取自 CSS 变量 --jw-rain / --jw-rain-lead，
 * 跟随深浅色主题切换；页面隐藏或系统开启「减少动态效果」时停止，约 20 帧/秒，开销很小。
 */
const FONT_SIZE = 14;
const COL_W = 22;
const ROW_H = 17;
const FRAME_MS = 50;
const SNIPPETS = [
  'const ready = true; if (ready) render();',
  'for (const bit of [0, 1, 0, 1]) sum += bit;',
  'await fetch("/api/notes").then((r) => r.json());',
];

export default function CodeRain() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let columns = [];
    let colors = {};
    let raf = 0;
    let last = 0;

    const readColors = () => {
      const css = getComputedStyle(document.documentElement);
      colors = { body: css.getPropertyValue('--jw-rain').trim(), lead: css.getPropertyValue('--jw-rain-lead').trim() };
    };

    const newColumn = (x, fresh) => {
      const snippet = Math.random() < 0.06 ? SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)] : '';
      return {
        x,
        y: fresh ? Math.random() * -40 : -Math.random() * 30,
        speed: 0.35 + Math.random() * 0.65,
        active: Math.random() < 0.42,
        snippet,
        index: 0,
      };
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `${FONT_SIZE}px ui-monospace, Consolas, monospace`;
      columns = Array.from({ length: Math.ceil(window.innerWidth / COL_W) }, (_, i) => newColumn(i * COL_W, true));
    };

    const draw = (now) => {
      raf = requestAnimationFrame(draw);
      if (now - last < FRAME_MS) return;
      last = now;
      const h = window.innerHeight;
      // 拖尾：每帧把已有字符擦淡一点
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.085)';
      ctx.fillRect(0, 0, window.innerWidth, h);
      ctx.globalCompositeOperation = 'source-over';
      for (const col of columns) {
        if (!col.active) {
          if (Math.random() < 0.004) col.active = true;
          continue;
        }
        col.y += col.speed;
        const py = Math.floor(col.y) * ROW_H;
        if (py !== col.lastPy && col.y > 0) {
          col.lastPy = py;
          const ch = col.snippet ? col.snippet[col.index++ % col.snippet.length] : Math.random() < 0.5 ? '0' : '1';
          ctx.fillStyle = colors.lead;
          ctx.fillText(ch, col.x, py);
          if (col.prev) {
            ctx.fillStyle = colors.body;
            ctx.fillText(col.prev.ch, col.x, col.prev.py);
          }
          col.prev = { ch, py };
        }
        if (py > h + ROW_H * 4) Object.assign(col, newColumn(col.x, false), { prev: null, lastPy: null });
      }
    };

    const update = () => {
      cancelAnimationFrame(raf);
      if (reduceMotion.matches || document.hidden) return;
      raf = requestAnimationFrame(draw);
    };

    const observer = new MutationObserver(readColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    readColors();
    resize();
    update();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', update);
    reduceMotion.addEventListener('change', update);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', update);
      reduceMotion.removeEventListener('change', update);
    };
  }, []);

  return <canvas ref={ref} className={styles.rain} aria-hidden="true" />;
}
