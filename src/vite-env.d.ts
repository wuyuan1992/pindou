/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 高德地图 Web 端 JS API Key —— 申请见 .env.example */
  readonly VITE_AMAP_KEY?: string;
  /** 高德 Web 端安全密钥（2021-12-02 后申请的 key 必填） */
  readonly VITE_AMAP_SECURITY_CODE?: string;
  /** 门店展示名（用于 marker title / 导航目的地名称） */
  readonly VITE_STORE_NAME?: string;
  /** 门店详细地址（信息卡显示） */
  readonly VITE_STORE_ADDRESS?: string;
  /** 营业时间文案 */
  readonly VITE_STORE_HOURS?: string;
  /** 咨询电话 */
  readonly VITE_STORE_PHONE?: string;
  /** PlaceSearch 关键词（用于精确定位，建议填 POI 名） */
  readonly VITE_STORE_SEARCH_KEYWORD?: string;
  /** PlaceSearch 限定城市 */
  readonly VITE_STORE_SEARCH_CITY?: string;
  /** Fallback 经度（PlaceSearch 失败时用，字符串形式） */
  readonly VITE_STORE_LNG?: string;
  /** Fallback 纬度（同上） */
  readonly VITE_STORE_LAT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  /** 高德 JS API 安全密钥配置 —— 必须在加载 JSAPI 脚本前设置 */
  _AMapSecurityConfig?: {
    securityJsCode: string;
    serviceHost?: string;
  };
}
