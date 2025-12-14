'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronsUp } from 'lucide-react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useClick } from '@/shared/hooks/useAudio';

export default function BackToTop() {
  const { playClick } = useClick();

  const [visible, setVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(16);
  const pathname = usePathname();
  const container = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Only run on client side
    setIsMounted(true);

    if (typeof document === 'undefined') return;

    container.current = document.querySelector(
      '[data-scroll-restoration-id="container"]'
    );

    if (!container.current) return;

    const onScroll = () => {
      // Show after user scrolls down 300px
      setVisible(container.current!.scrollTop > 300);
    };

    // attach scroll listener to the container, not window
    container.current.addEventListener('scroll', onScroll, { passive: true });
    // Initial check
    onScroll();

    return () => container.current?.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const computeOffset = () => {
      const gutter = 16;
      const isMobile = window.innerWidth < 1024;

      const trainingActionBar = document.getElementById(
        'main-training-action-bar'
      );
      const sidebar = document.getElementById('main-sidebar');
      const desktopBottomBar = document.getElementById('main-bottom-bar');

      const trainingBarRect = trainingActionBar?.getBoundingClientRect();
      const trainingBarVisible =
        !!trainingBarRect && trainingBarRect.height > 0;

      if (isMobile) {
        // Mobile: sidebar is at bottom as nav bar
        const sidebarHeight = sidebar?.offsetHeight ?? 0;

        if (trainingBarVisible) {
          // Training action bar sits above sidebar, so we need both heights
          const trainingBarTopFromViewportBottom =
            window.innerHeight - trainingBarRect.top;
          setBottomOffset(
            Math.max(gutter, trainingBarTopFromViewportBottom + gutter)
          );
        } else {
          // Just the sidebar/bottom nav
          setBottomOffset(sidebarHeight + gutter);
        }
      } else {
        // Desktop layout
        if (trainingBarVisible) {
          const trainingBarTopFromViewportBottom =
            window.innerHeight - trainingBarRect.top;
          setBottomOffset(
            Math.max(gutter, trainingBarTopFromViewportBottom + gutter)
          );
        } else {
          // Fallback: place above the desktop bottom bar if present
          const desktopBottomBarHeight = desktopBottomBar?.offsetHeight ?? 0;
          setBottomOffset(desktopBottomBarHeight + gutter);
        }
      }
    };

    computeOffset();

    const observers: ResizeObserver[] = [];

    // Observe all relevant elements for size changes
    const elementsToObserve = [
      document.getElementById('main-training-action-bar'),
      document.getElementById('main-sidebar'),
      document.getElementById('main-bottom-bar')
    ].filter(Boolean) as HTMLElement[];

    if (typeof ResizeObserver !== 'undefined') {
      elementsToObserve.forEach(el => {
        const observer = new ResizeObserver(computeOffset);
        observer.observe(el);
        observers.push(observer);
      });
    }

    // Also use MutationObserver to detect when training action bar appears/disappears
    const mutationObserver = new MutationObserver(computeOffset);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('resize', computeOffset);

    return () => {
      window.removeEventListener('resize', computeOffset);
      observers.forEach(o => o.disconnect());
      mutationObserver.disconnect();
    };
  }, []);

  // Hide on root path only
  const isRootPath = pathname === '/' || pathname === '';

  // Don't render during SSR or if not visible or on root path
  if (!isMounted || !visible || isRootPath) return null;

  const handleClick = () => {
    if (typeof window !== 'undefined') {
      playClick();
      container.current?.scrollTo({ top: 0, behavior: 'smooth' });
      // Move focus to body for keyboard users after scroll
      // (give the browser a tick so scrolling starts)
      setTimeout(() => {
        (document.body as HTMLElement)?.focus?.();
      }, 300);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={clsx(
        'fixed z-[60] right-2 lg:right-3',
        'max-md:border-2 border-[var(--border-color)]',
        'inline-flex items-center justify-center rounded-full ',
        'p-2 md:p-3 shadow-lg transition-all duration-200 ',
        'bg-[var(--card-color)] text-[var(--main-color)] ',
        'hover:bg-[var(--main-color)] hover:text-[var(--background-color)]',
        'hover:cursor-pointer'
      )}
      style={{ bottom: bottomOffset }}
    >
      <ChevronsUp size={32} strokeWidth={2.5} />
    </button>
  );
}
