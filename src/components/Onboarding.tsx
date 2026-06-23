import { useEffect, useLayoutEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

interface OnboardingProps {
  open: boolean;
  onClose: () => void;
}

interface StepContent {
  selector: string;
  title: string;
  body: string;
}

const STEPS: StepContent[] = [
  {
    selector: "[data-onboarding='hotbar']",
    title: "拖动豆子开始画",
    body: "数字键 1-8 切色;鼠标悬停 hotbar 时滚轮也可切色。",
  },
  {
    selector: "[data-onboarding='eraser']",
    title: "右键直接擦",
    body: "Mac 单键鼠标:点这里切擦除模式,再次点退出。",
  },
  {
    selector: "[data-onboarding='undo']",
    title: "取色与撤销",
    body: "双击有豆子的 peg 取色。Ctrl+Z 撤销。移动端:两指轻点画布。",
  },
];

const PADDING = 6;

export function Onboarding({ open, onClose }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const targetSelector = STEPS[step]?.selector;
    if (!targetSelector) return;

    const measure = () => {
      const el = document.querySelector<HTMLElement>(targetSelector);
      if (!el) return;
      setRect(el.getBoundingClientRect());
    };
    measure();

    const handleResize = () => measure();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    const raf = requestAnimationFrame(measure);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
      cancelAnimationFrame(raf);
    };
  }, [open, step]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // 高亮遮罩:四块半透明 div 围住目标 rect
  const overlayStyle = (key: string, style: CSSProperties) => (
    <div
      key={key}
      data-onboarding-mask={key}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        backgroundColor: "rgba(28, 25, 23, 0.55)",
        pointerEvents: "auto",
        ...style,
      }}
    />
  );

  const masks = rect
    ? [
        overlayStyle("top", {
          top: 0,
          left: 0,
          right: 0,
          height: Math.max(0, rect.top - PADDING),
        }),
        overlayStyle("bottom", {
          top: rect.bottom + PADDING,
          left: 0,
          right: 0,
          bottom: 0,
        }),
        overlayStyle("left", {
          top: Math.max(0, rect.top - PADDING),
          left: 0,
          width: Math.max(0, rect.left - PADDING),
          height: rect.height + PADDING * 2,
        }),
        overlayStyle("right", {
          top: Math.max(0, rect.top - PADDING),
          left: rect.right + PADDING,
          right: 0,
          height: rect.height + PADDING * 2,
        }),
      ]
    : [
        overlayStyle("full", {
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }),
      ];

  // 气泡定位
  let bubbleTop: number;
  let bubbleLeft: number;
  let placeBelow = true;

  if (rect) {
    const center = rect.left + rect.width / 2;
    const bottom = rect.bottom + PADDING + 8;
    const top = rect.top - PADDING - 8;
    const viewportH = window.innerHeight;

    placeBelow = bottom + 200 < viewportH || top < 60;
    bubbleTop = placeBelow ? bottom : Math.max(8, top - 220);
    bubbleLeft = Math.max(
      12,
      Math.min(center, window.innerWidth - 320 - 12)
    );
  } else {
    bubbleTop = window.innerHeight / 2 - 110;
    bubbleLeft = Math.max(12, window.innerWidth / 2 - 160);
  }

  const highlightBoxStyle: CSSProperties | null = rect
    ? {
        position: "fixed",
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
        borderRadius: 10,
        boxShadow: "0 0 0 9999px rgba(28, 25, 23, 0)",
        border: "2px solid #f59e0b",
        pointerEvents: "none",
        zIndex: 50,
      }
    : null;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setStep((s) => Math.min(STEPS.length - 1, s + 1));
    }
  };

  return (
    <div
      aria-modal="true"
      role="dialog"
      aria-label="新手引导"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        pointerEvents: "none",
      }}
    >
      {masks}
      {highlightBoxStyle && (
        <motion.div
          layout
          initial={false}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          style={highlightBoxStyle}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: placeBelow ? -8 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: placeBelow ? -8 : 8 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "fixed",
            top: bubbleTop,
            left: bubbleLeft,
            width: 320,
            maxWidth: "calc(100vw - 24px)",
            background: "white",
            borderRadius: 14,
            boxShadow:
              "0 20px 45px -10px rgba(0,0,0,0.35), 0 0 0 1px rgba(245, 158, 11, 0.25)",
            padding: "16px 16px 14px",
            pointerEvents: "auto",
            zIndex: 51,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold tracking-wider text-amber-600 uppercase">
                第 {step + 1} / {STEPS.length} 步
              </div>
              <h3 className="mt-0.5 text-base font-bold text-stone-800">
                {current.title}
              </h3>
            </div>
            {step > 0 && (
              <button
                onClick={onClose}
                aria-label="跳过剩余引导"
                title="跳过剩余"
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            {current.body}
          </p>
          <div className="mt-3.5 flex items-center justify-between gap-2">
            {step > 0 ? (
              <button
                onClick={onClose}
                className="text-xs px-3 py-1.5 rounded-md text-stone-500 hover:text-stone-800 hover:bg-stone-100"
              >
                跳过剩余
              </button>
            ) : (
              <span className="text-xs text-stone-400">点击下一步继续</span>
            )}
            <button
              onClick={handleNext}
              className="text-sm font-semibold px-4 py-1.5 rounded-lg bg-amber-500 text-white shadow-sm hover:bg-amber-600 active:scale-95 transition"
            >
              {isLast ? "完成" : "下一步"}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
