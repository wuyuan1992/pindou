import { useCallback, useEffect, useRef } from "react";

interface PressLikeEvent {
  pointerType?: string;
  clientX: number;
  clientY: number;
  preventDefault?: () => void;
}

interface LongPressOptions {
  onTap: () => void;
  onLongPress: () => void;
  ms?: number;
  moveThreshold?: number;
}

/**
 * 取代式长按 hook：350ms 内抬起 = onTap；超时 = onLongPress 且吞掉后续 tap。
 * 桌面 mouse 早退，由调用方走原有 mouse 路径。
 * move/up 用 window listener 跟踪，避免手指移出 hit 对象后丢失事件。
 * 兼容 React.PointerEvent 与 R3F 的 ThreeEvent<PointerEvent>。
 */
export function useLongPress({
  onTap,
  onLongPress,
  ms = 350,
  moveThreshold = 10,
}: LongPressOptions) {
  const onTapRef = useRef(onTap);
  const onLongPressRef = useRef(onLongPress);
  useEffect(() => {
    onTapRef.current = onTap;
  }, [onTap]);
  useEffect(() => {
    onLongPressRef.current = onLongPress;
  }, [onLongPress]);

  const timerRef = useRef<number | undefined>(undefined);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);
  const detachRef = useRef<(() => void) | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const detach = useCallback(() => {
    detachRef.current?.();
    detachRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: PressLikeEvent) => {
      if (e.pointerType === "mouse") return;
      e.preventDefault?.();
      // 防御性：先清理上一次的 window listeners（理论上 onUp/onCancel 会清，但
      // 极端情况下连续 down 不出现 up 时会泄漏）。
      detach();
      clear();
      startRef.current = { x: e.clientX, y: e.clientY };
      firedRef.current = false;
      timerRef.current = window.setTimeout(() => {
        firedRef.current = true;
        onLongPressRef.current();
      }, ms);

      const moveThr = moveThreshold;
      const onMove = (ev: PointerEvent) => {
        if (!startRef.current || firedRef.current) return;
        const dx = ev.clientX - startRef.current.x;
        const dy = ev.clientY - startRef.current.y;
        if (dx * dx + dy * dy > moveThr * moveThr) {
          clear();
          startRef.current = null;
        }
      };
      const onUp = () => {
        clear();
        if (startRef.current && !firedRef.current) {
          onTapRef.current();
        }
        startRef.current = null;
        detach();
      };
      const onCancel = () => {
        clear();
        startRef.current = null;
        firedRef.current = false;
        detach();
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      detachRef.current = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
      };
    },
    [ms, moveThreshold, clear, detach]
  );

  useEffect(() => {
    return () => {
      clear();
      detach();
    };
  }, [clear, detach]);

  return { onPointerDown };
}
