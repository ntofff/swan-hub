import { useState, useRef, useCallback } from "react";

interface UseDragReorderOptions<T> {
  items: T[];
  onReorder: (reordered: T[]) => void;
}

export function useDragReorder<T>({ items, onReorder }: UseDragReorderOptions<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const touchStartY = useRef(0);
  const touchCurrentItem = useRef<number | null>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const setItemRef = useCallback((idx: number) => (el: HTMLElement | null) => {
    itemRefs.current[idx] = el;
  }, []);

  // Mouse/pointer drag
  const handleDragStart = useCallback((idx: number) => (e: React.DragEvent) => {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIndex(idx);
  }, []);

  const handleDrop = useCallback((idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === idx) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const reordered = [...items];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(idx, 0, moved);
    onReorder(reordered);
    setDragIndex(null);
    setOverIndex(null);
  }, [dragIndex, items, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  // Touch drag
  const handleTouchStart = useCallback((idx: number) => (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentItem.current = idx;
    setDragIndex(idx);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchCurrentItem.current === null) return;
    const y = e.touches[0].clientY;
    const over = itemRefs.current.findIndex((el) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return y >= rect.top && y <= rect.bottom;
    });
    if (over >= 0) setOverIndex(over);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchCurrentItem.current !== null && overIndex !== null && touchCurrentItem.current !== overIndex) {
      const reordered = [...items];
      const [moved] = reordered.splice(touchCurrentItem.current, 1);
      reordered.splice(overIndex, 0, moved);
      onReorder(reordered);
    }
    touchCurrentItem.current = null;
    setDragIndex(null);
    setOverIndex(null);
  }, [overIndex, items, onReorder]);

  const getDragProps = useCallback((idx: number) => ({
    ref: setItemRef(idx),
    draggable: true,
    onDragStart: handleDragStart(idx),
    onDragOver: handleDragOver(idx),
    onDrop: handleDrop(idx),
    onDragEnd: handleDragEnd,
    onTouchStart: handleTouchStart(idx),
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  }), [setItemRef, handleDragStart, handleDragOver, handleDrop, handleDragEnd, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { dragIndex, overIndex, getDragProps };
}
