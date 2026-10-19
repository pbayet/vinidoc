const IS_PRODUCTION = import.meta.env.VITE_PRODUCTION === "1";
const API_URL = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL;
const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL;
const APP_NAME = import.meta.env.VITE_APP_NAME;
const APP_CODE = import.meta.env.VITE_APP_CODE;
const LS_JWT = import.meta.env.VITE_LS_JWT;
const DOMAIN = import.meta.env.VITE_DOMAIN;
const LOCAL_DOMAIN = import.meta.env.VITE_LOCAL_DOMAIN;
const MODIFY_PERMS: string[] = (import.meta.env.VITE_MODIFY_PERMS ?? "")
  .split(",")
  .map((p: string) => p.trim())
  .filter(Boolean);

export {
  IS_PRODUCTION,
  API_URL,
  WS_URL,
  UPLOADS_URL,
  APP_NAME,
  LS_JWT,
  DOMAIN,
  LOCAL_DOMAIN,
  APP_CODE,
  MODIFY_PERMS,
};
