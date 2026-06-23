import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

type Variant = "default" | "danger";

interface BaseProps {
  open: boolean;
  title: string;
  description?: string;
  variant?: Variant;
  confirmText?: string;
  cancelText?: string;
  onCancel?: () => void;
}

interface ConfirmProps extends BaseProps {
  mode?: "confirm";
  onConfirm: () => void;
}

interface AlertProps extends BaseProps {
  mode: "alert";
  onConfirm: () => void;
}

interface PromptProps extends BaseProps {
  mode: "prompt";
  defaultValue?: string;
  placeholder?: string;
  onConfirm: (value: string) => void;
}

type ModalProps = ConfirmProps | AlertProps | PromptProps;

export function Modal(props: ModalProps) {
  const {
    open,
    title,
    description,
    variant = "default",
    confirmText = "确认",
    cancelText = "取消",
  } = props;

  const isPrompt = props.mode === "prompt";
  const isAlert = props.mode === "alert";
  const [value, setValue] = useState(props.mode === "prompt" ? props.defaultValue ?? "" : "");

  useEffect(() => {
    if (open && props.mode === "prompt") {
      setValue(props.defaultValue ?? "");
    }
  }, [open, props]);

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open && isPrompt) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, isPrompt]);

  const handleConfirm = () => {
    if (props.mode === "prompt") {
      props.onConfirm(value);
    } else {
      props.onConfirm();
    }
  };

  const handleOverlayClick = () => {
    if (isAlert) return;
    props.onCancel?.();
  };

  const confirmClass =
    variant === "danger"
      ? "bg-red-500 hover:bg-red-600 text-white"
      : "bg-amber-500 hover:bg-amber-600 text-white";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={handleOverlayClick}
        >
          <motion.div
            data-ui
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-amber-100 overflow-hidden"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            <div className="p-5">
              <h3 className="text-base font-semibold text-stone-800">{title}</h3>
              {description && (
                <p className="mt-1.5 text-sm text-stone-500 leading-relaxed">{description}</p>
              )}
              {isPrompt && (
                <input
                  ref={inputRef}
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={(props as PromptProps).placeholder}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirm();
                  }}
                  className="mt-3 w-full px-3 py-2 text-sm rounded-lg border border-amber-200 bg-amber-50/40 focus:bg-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all"
                />
              )}
            </div>
            <div className="flex gap-2 px-5 pb-5">
              {!isAlert && (
                <button
                  onClick={() => props.onCancel?.()}
                  className="flex-1 h-10 rounded-lg text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors"
                >
                  {cancelText}
                </button>
              )}
              <button
                onClick={handleConfirm}
                className={`flex-1 h-10 rounded-lg text-sm font-medium shadow-sm transition-all ${confirmClass} ${
                  isAlert ? "w-full" : ""
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
