import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

/**
 * 横向自动滚动的卡片条：
 * - 缓慢滚动，到头后停顿一下再反向滚回来（来回往复）
 * - 鼠标悬停时暂停，此时滚动鼠标滚轮会带动卡片横向滚动；滚到两端后滚轮恢复为滚动页面
 * - 触屏可直接手指拖动，松手几秒后继续自动滚动
 */
export default function AutoScroller({ children, speed = 28, pauseAtEnd = 1500, className, label }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let pos = el.scrollLeft;
    let target = pos;
    let dir = 1;
    let hovering = false;
    let touchUntil = 0;
    let holdUntil = 0;
    let last = performance.now();
    let raf = 0;
    const maxScroll = () => el.scrollWidth - el.clientWidth;

    const tick = (now) => {
      const dt = Math.min(now - last, 100);
      last = now;
      const max = maxScroll();
      if (max > 0 && now > touchUntil) {
        if (hovering) {
          // 滚轮驱动：平滑逼近目标位置
          pos += (target - pos) * Math.min(1, dt / 80);
          el.scrollLeft = pos;
        } else if (!reduceMotion && now >= holdUntil) {
          pos += (dir * speed * dt) / 1000;
          if (pos >= max) {
            pos = max;
            dir = -1;
            holdUntil = now + pauseAtEnd;
          } else if (pos <= 0) {
            pos = 0;
            dir = 1;
            holdUntil = now + pauseAtEnd;
          }
          el.scrollLeft = pos;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    const onEnter = () => {
      hovering = true;
      pos = target = el.scrollLeft;
    };
    const onLeave = () => {
      hovering = false;
      pos = target = el.scrollLeft;
    };
    const onWheel = (e) => {
      const max = maxScroll();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (max <= 0 || !delta) return;
      // 已经滚到尽头，把滚轮还给页面
      if ((delta < 0 && target <= 0) || (delta > 0 && target >= max - 1)) return;
      e.preventDefault();
      const step = e.deltaMode === 1 ? delta * 32 : delta;
      target = Math.max(0, Math.min(max, target + step));
      dir = step > 0 ? 1 : -1;
    };
    const onTouch = () => {
      touchUntil = performance.now() + 3000;
    };
    const onScroll = () => {
      // 手指拖动或拖滚动条时同步位置，避免自动滚动跳回去
      if (performance.now() < touchUntil) pos = target = el.scrollLeft;
    };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouch, { passive: true });
    el.addEventListener('touchmove', onTouch, { passive: true });
    el.addEventListener('scroll', onScroll, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouch);
      el.removeEventListener('touchmove', onTouch);
      el.removeEventListener('scroll', onScroll);
    };
  }, [speed, pauseAtEnd]);

  return (
    <div ref={ref} className={clsx(styles.scroller, className)} role="region" aria-label={label} tabIndex={0}>
      <div className={styles.track}>{children}</div>
    </div>
  );
}
