import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MapPin, Navigation, Clock, X, Sparkles, Phone, ExternalLink, Copy, Check } from "lucide-react";
import AMapLoader from "@amap/amap-jsapi-loader";

/**
 * 高德开放平台凭证（在 .env / Vercel 项目变量配置）
 *  - VITE_AMAP_KEY           Web 端 JS API Key
 *  - VITE_AMAP_SECURITY_CODE 安全密钥（2021-12-02 后申请的 key 必填）
 *
 * 申请：https://lbs.amap.com/dev/key/app  → 服务平台选「Web 端（JSAPI）」
 */
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY ?? "";
const AMAP_SECURITY_CODE = import.meta.env.VITE_AMAP_SECURITY_CODE ?? "";

// 门店信息全部从环境变量读取，避免硬编码（在 .env / Vercel 配置 VITE_STORE_*）
const STORE_NAME = import.meta.env.VITE_STORE_NAME ?? "";
const STORE_ADDRESS = import.meta.env.VITE_STORE_ADDRESS ?? "";
const STORE_HOURS = import.meta.env.VITE_STORE_HOURS ?? "";
const STORE_PHONE = import.meta.env.VITE_STORE_PHONE ?? "";
const STORE_SEARCH_KEYWORD = import.meta.env.VITE_STORE_SEARCH_KEYWORD ?? "";
const STORE_SEARCH_CITY = import.meta.env.VITE_STORE_SEARCH_CITY ?? "上海";

// 数字字段：Number() 转换，失败或未配置时 fallback 到上海市中心
// PlaceSearch 找到精确坐标后会搬过去，所以 fallback 只用于初始 center
const parsedLng = Number(import.meta.env.VITE_STORE_LNG);
const parsedLat = Number(import.meta.env.VITE_STORE_LAT);
const FALLBACK_LNG = Number.isFinite(parsedLng) ? parsedLng : 121.4737;
const FALLBACK_LAT = Number.isFinite(parsedLat) ? parsedLat : 31.2304;

const DOTS = [
  "bg-rose-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-sky-400",
  "bg-violet-400",
  "bg-orange-400",
];

function buildNavUrl(lng: number, lat: number) {
  // 官方规范：to=lon,lat[,name] 单参数逗号分隔；name 为空时省略尾逗号
  const nameSuffix = STORE_NAME ? `,${encodeURIComponent(STORE_NAME)}` : "";
  return (
    `https://uri.amap.com/navigation` +
    `?to=${lng},${lat}${nameSuffix}` +
    `&mode=car&policy=0&src=${encodeURIComponent("拼豆Pindou")}&callnative=1`
  );
}

function buildMarkerUrl(lng: number, lat: number) {
  return (
    `https://uri.amap.com/marker` +
    `?position=${lng},${lat}` +
    (STORE_NAME ? `&name=${encodeURIComponent(STORE_NAME)}` : "") +
    `&src=${encodeURIComponent("拼豆Pindou")}&coordinate=gaode&callnative=1`
  );
}

export function StoreLocation({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  // PlaceSearch 找到的精确坐标；null 时用 fallback
  const [exactPos, setExactPos] = useState<{ lng: number; lat: number } | null>(null);

  const handleLocate = useCallback((pos: { lng: number; lat: number }) => {
    setExactPos(pos);
  }, []);

  // 包装 setOpen，同步通知父组件（用于隐藏底部 toolbar 等）
  const updateOpen = useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange]
  );

  const lng = exactPos?.lng ?? FALLBACK_LNG;
  const lat = exactPos?.lat ?? FALLBACK_LAT;
  const navUrl = buildNavUrl(lng, lat);
  const markerUrl = buildMarkerUrl(lng, lat);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") updateOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, updateOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => updateOpen(true)}
        title="线下门店"
        aria-label="线下门店"
        className="group inline-flex items-center gap-1.5 h-9 md:h-10 px-3 md:px-4 rounded-full text-xs md:text-sm font-medium shadow-sm border border-rose-200 bg-white/90 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-all hover:scale-[1.03] active:scale-95"
      >
        <span className="relative flex items-center justify-center">
          <MapPin
            size={15}
            strokeWidth={2.4}
            className="text-rose-500 group-hover:-translate-y-0.5 transition-transform"
          />
          <Sparkles
            size={9}
            strokeWidth={2.8}
            className="absolute -top-1 -right-1.5 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </span>
        <span className="hidden sm:inline">线下门店</span>
        <span className="sm:hidden">门店</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center p-3 md:p-6 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => updateOpen(false)}
          >
            <motion.div
              data-ui
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border-2 border-rose-100 overflow-hidden max-h-[92vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
            >
              <button
                type="button"
                onClick={() => updateOpen(false)}
                aria-label="关闭"
                className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-rose-100 text-stone-500 hover:text-rose-600 flex items-center justify-center shadow-sm border border-rose-100 transition-colors"
              >
                <X size={16} strokeWidth={2.6} />
              </button>

              <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-rose-100 via-amber-50 to-orange-100 border-b border-rose-100">
                <div className="absolute top-3 left-4 flex -space-x-1.5">
                  {DOTS.map((c, i) => (
                    <span
                      key={i}
                      className={`inline-block w-2.5 h-2.5 rounded-full ${c} shadow-sm`}
                    />
                  ))}
                </div>

                <div className="mt-3 flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center shadow-md shrink-0">
                    <MapPin size={22} strokeWidth={2.4} className="text-white" />
                  </div>
                  <div className="min-w-0 pr-8">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg md:text-xl font-bold text-stone-800">
                        拼豆线下门店
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500 text-white shadow-sm">
                        <Sparkles size={9} strokeWidth={3} />
                        欢迎来玩
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-stone-500 mt-1 leading-relaxed">
                      来门店亲手摸到拼豆的质感 · 现场有更多颜色和模板
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-0">
                <div className="p-2 md:p-3 space-y-3.5">
                  {STORE_ADDRESS && (
                    <InfoRow icon={<MapPin size={16} strokeWidth={2.4} />} tone="rose" label="地址">
                      <CopyableField value={STORE_ADDRESS}>
                        <p className="text-sm text-stone-700 leading-relaxed">
                          {STORE_ADDRESS}
                        </p>
                      </CopyableField>
                    </InfoRow>
                  )}

                  {STORE_HOURS && (
                    <InfoRow icon={<Clock size={16} strokeWidth={2.4} />} tone="amber" label="营业时间">
                      <p className="text-sm text-stone-700">{STORE_HOURS}</p>
                    </InfoRow>
                  )}

                  {STORE_PHONE && (
                    <InfoRow icon={<Phone size={16} strokeWidth={2.4} />} tone="emerald" label="咨询电话">
                      <CopyableField value={STORE_PHONE}>
                        <p className="text-sm text-stone-700 tracking-wide">{STORE_PHONE}</p>
                      </CopyableField>
                    </InfoRow>
                  )}

                  <a
                    href={navUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 w-full inline-flex items-center justify-center gap-2 h-11 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <Navigation size={16} strokeWidth={2.6} />
                    导航前往门店
                  </a>
                  <p className="text-[11px] text-stone-400 text-center -mt-1">
                    点击用高德地图 App / 网页打开导航
                  </p>
                </div>

                <div className="p-2 md:p-3 md:pl-0">
                  <div className="relative w-full h-[260px] md:h-[340px] rounded-2xl overflow-hidden border-2 border-rose-100 shadow-inner bg-rose-50">
                    <StoreMap
                      lng={FALLBACK_LNG}
                      lat={FALLBACK_LAT}
                      name={STORE_NAME}
                      onLocate={handleLocate}
                      fallbackMarkerUrl={markerUrl}
                    />

                    <div className="pointer-events-none absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/85 backdrop-blur shadow text-[10px] font-medium text-rose-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      门店在这里
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

type MapStatus = "loading" | "ready" | "nokey" | "error";

/**
 * 用 @amap/amap-jsapi-loader 加载 JS API 2.0，渲染可交互地图 + Marker。
 * - 容器尺寸为 0 时 AMap 不渲染，所以等 ResizeObserver 报告非零尺寸再 boot
 * - 用 PlaceSearch 拿高德 POI 库里的精确坐标，避免硬编码坐标偏差
 * - 无 key 时降级为「点击跳转高德官方页面」的入口（避免 iframe 内嵌官方 URI）
 */
function StoreMap({
  lng,
  lat,
  name,
  onLocate,
  fallbackMarkerUrl,
}: {
  lng: number;
  lat: number;
  name: string;
  onLocate: (pos: { lng: number; lat: number }) => void;
  fallbackMarkerUrl: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onLocateRef = useRef(onLocate);
  onLocateRef.current = onLocate;
  const [status, setStatus] = useState<MapStatus>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!AMAP_KEY) {
      setStatus("nokey");
      return;
    }

    // 必须在 loader 加载脚本「之前」设置 securityJsCode
    if (AMAP_SECURITY_CODE) {
      (window as any)._AMapSecurityConfig = {
        securityJsCode: AMAP_SECURITY_CODE,
      };
    }

    let map: any = null;
    let aborted = false;
    let resizeObserver: ResizeObserver | null = null;
    let resizeTimer: number | undefined;
    let rafId: number | undefined;

    const bootWhenSized = (el: HTMLElement) => {
      const checkAndBoot = () => {
        if (aborted) return false;
        if (el.clientHeight > 0 && el.clientWidth > 0) {
          boot(el);
          return true;
        }
        return false;
      };

      if (checkAndBoot()) return;

      resizeObserver = new ResizeObserver(() => {
        if (checkAndBoot() && resizeObserver) {
          resizeObserver.disconnect();
          resizeObserver = null;
        }
      });
      resizeObserver.observe(el);
    };

    const boot = (el: HTMLElement) => {
      AMapLoader.load({
        key: AMAP_KEY,
        version: "2.0",
        plugins: ["AMap.Scale", "AMap.PlaceSearch"],
      })
        .then((AMap: any) => {
          if (aborted) return;
          map = new AMap.Map(el, {
            zoom: 16,
            center: [lng, lat],
            viewMode: "2D",
            resizeEnable: true,
          });
          const marker = new AMap.Marker({
            position: [lng, lat],
            title: name,
            anchor: "bottom-center",
          });
          map.add(marker);
          map.addControl(new AMap.Scale());

          // 用 PlaceSearch 拿精确坐标，找到就把地图 + marker 搬过去
          // keyword 为空（未配置）时跳过，直接保留 fallback 坐标
          if (STORE_SEARCH_KEYWORD.trim()) {
            try {
              const placeSearch = new AMap.PlaceSearch({
                city: STORE_SEARCH_CITY || "全国",
                citylimit: Boolean(STORE_SEARCH_CITY),
                pageSize: 1,
                extensions: "base",
              });
              placeSearch.search(STORE_SEARCH_KEYWORD, (status: string, result: any) => {
                if (aborted || !map) return;
                const poi = result?.poiList?.pois?.[0];
                if (status === "complete" && poi?.location) {
                  const next: [number, number] = [poi.location.lng, poi.location.lat];
                  map.setCenter(next);
                  marker.setPosition(next);
                  map.setZoom(17);
                  onLocateRef.current?.({ lng: poi.location.lng, lat: poi.location.lat });
                }
              });
            } catch {
              /* PlaceSearch 失败时保留 fallback 坐标 */
            }
          }

          // 弹窗动画稳定后让 AMap 重新测量一次
          resizeTimer = window.setTimeout(() => {
            if (!aborted && map) {
              try {
                map.setSize
                  ? map.setSize(new AMap.Size(el.clientWidth, el.clientHeight))
                  : map.resize?.();
              } catch {
                /* noop */
              }
            }
          }, 260);
          setStatus("ready");
        })
        .catch((err: unknown) => {
          if (aborted) return;
          console.error("[StoreMap] AMap load failed:", err);
          const msg =
            err instanceof Error
              ? err.message
              : typeof err === "string"
                ? err
                : "UNKNOWN";
          setErrorMsg(msg);
          setStatus("error");
        });
    };

    const el = containerRef.current;
    if (el) {
      rafId = requestAnimationFrame(() => bootWhenSized(el));
    }

    return () => {
      aborted = true;
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      if (resizeTimer) window.clearTimeout(resizeTimer);
      if (map) {
        try {
          map.destroy();
        } catch {
          /* noop */
        }
      }
    };
  }, [lng, lat, name]);

  if (status === "nokey") {
    return (
      <FallbackCover
        title="地图等待激活"
        desc="需要配置高德 API Key 后才会渲染可交互地图"
        href={fallbackMarkerUrl}
        cta="先在高德地图中查看"
      />
    );
  }

  if (status === "error") {
    return (
      <FallbackCover
        title="地图加载失败"
        desc={errorMsg || "请检查 API Key 与安全密钥配置"}
        href={fallbackMarkerUrl}
        cta="改在高德地图中查看"
      />
    );
  }

  return (
    <>
      <div ref={containerRef} className="absolute inset-0" />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-rose-50">
          <div className="w-6 h-6 rounded-full border-2 border-rose-300 border-t-transparent animate-spin" />
        </div>
      )}
    </>
  );
}

function FallbackCover({
  title,
  desc,
  href,
  cta,
}: {
  title: string;
  desc: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-5 text-center bg-gradient-to-br from-rose-50 to-amber-50">
      <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center">
        <MapPin size={18} strokeWidth={2.4} className="text-rose-400" />
      </div>
      <p className="text-xs font-semibold text-stone-700">{title}</p>
      <p className="text-[10px] text-stone-500 leading-relaxed max-w-[200px]">{desc}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline"
      >
        {cta}
        <ExternalLink size={11} strokeWidth={2.6} />
      </a>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  tone,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "rose" | "amber" | "emerald";
  children: React.ReactNode;
}) {
  const toneClass = {
    rose: "bg-rose-100 text-rose-600",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
  }[tone];

  return (
    <div className="flex items-start gap-3">
      <div
        className={`w-8 h-8 rounded-xl ${toneClass} flex items-center justify-center shrink-0 shadow-sm`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 mb-0.5">
          {label}
        </div>
        {children}
      </div>
    </div>
  );
}

function CopyableField({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | undefined>(undefined);

  const handleCopy = useCallback(async () => {
    const ok = await copyText(value);
    if (!ok) return;
    setCopied(true);
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopied(false), 1500);
  }, [value]);

  useEffect(() => () => {
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
  }, []);

  return (
    <div className="flex items-start gap-1.5">
      <div className="flex-1 min-w-0">{children}</div>
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? "已复制" : "复制"}
        aria-label={copied ? "已复制" : "复制"}
        className={`shrink-0 w-7 h-7 -mt-0.5 rounded-lg flex items-center justify-center transition-all active:scale-90 ${
          copied
            ? "bg-emerald-100 text-emerald-600"
            : "text-stone-400 hover:text-rose-600 hover:bg-rose-50"
        }`}
      >
        {copied ? (
          <Check size={13} strokeWidth={2.8} />
        ) : (
          <Copy size={13} strokeWidth={2.4} />
        )}
      </button>
    </div>
  );
}

async function copyText(text: string): Promise<boolean> {
  // 优先用 Clipboard API（HTTPS 或 localhost），降级到 execCommand 兜底
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallthrough */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
