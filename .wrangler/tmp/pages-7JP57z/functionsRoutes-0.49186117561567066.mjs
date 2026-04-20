import { onRequestDelete as __api_preset__id__ts_onRequestDelete } from "/Users/simon/DEV/josm-preset-studio/functions/api/preset/[id].ts"
import { onRequestGet as __api_preset__id__ts_onRequestGet } from "/Users/simon/DEV/josm-preset-studio/functions/api/preset/[id].ts"
import { onRequestOptions as __api_preset__id__ts_onRequestOptions } from "/Users/simon/DEV/josm-preset-studio/functions/api/preset/[id].ts"
import { onRequestPut as __api_preset__id__ts_onRequestPut } from "/Users/simon/DEV/josm-preset-studio/functions/api/preset/[id].ts"
import { onRequestOptions as __api_preset_index_ts_onRequestOptions } from "/Users/simon/DEV/josm-preset-studio/functions/api/preset/index.ts"
import { onRequestPost as __api_preset_index_ts_onRequestPost } from "/Users/simon/DEV/josm-preset-studio/functions/api/preset/index.ts"
import { onRequestGet as __josm_preset__id__ts_onRequestGet } from "/Users/simon/DEV/josm-preset-studio/functions/josm-preset/[id].ts"
import { onRequestOptions as __josm_preset__id__ts_onRequestOptions } from "/Users/simon/DEV/josm-preset-studio/functions/josm-preset/[id].ts"
import { onRequestGet as __josm_preset_ts_onRequestGet } from "/Users/simon/DEV/josm-preset-studio/functions/josm-preset.ts"
import { onRequestOptions as __josm_preset_ts_onRequestOptions } from "/Users/simon/DEV/josm-preset-studio/functions/josm-preset.ts"

export const routes = [
    {
      routePath: "/api/preset/:id",
      mountPath: "/api/preset",
      method: "DELETE",
      middlewares: [],
      modules: [__api_preset__id__ts_onRequestDelete],
    },
  {
      routePath: "/api/preset/:id",
      mountPath: "/api/preset",
      method: "GET",
      middlewares: [],
      modules: [__api_preset__id__ts_onRequestGet],
    },
  {
      routePath: "/api/preset/:id",
      mountPath: "/api/preset",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_preset__id__ts_onRequestOptions],
    },
  {
      routePath: "/api/preset/:id",
      mountPath: "/api/preset",
      method: "PUT",
      middlewares: [],
      modules: [__api_preset__id__ts_onRequestPut],
    },
  {
      routePath: "/api/preset",
      mountPath: "/api/preset",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_preset_index_ts_onRequestOptions],
    },
  {
      routePath: "/api/preset",
      mountPath: "/api/preset",
      method: "POST",
      middlewares: [],
      modules: [__api_preset_index_ts_onRequestPost],
    },
  {
      routePath: "/josm-preset/:id",
      mountPath: "/josm-preset",
      method: "GET",
      middlewares: [],
      modules: [__josm_preset__id__ts_onRequestGet],
    },
  {
      routePath: "/josm-preset/:id",
      mountPath: "/josm-preset",
      method: "OPTIONS",
      middlewares: [],
      modules: [__josm_preset__id__ts_onRequestOptions],
    },
  {
      routePath: "/josm-preset",
      mountPath: "/",
      method: "GET",
      middlewares: [],
      modules: [__josm_preset_ts_onRequestGet],
    },
  {
      routePath: "/josm-preset",
      mountPath: "/",
      method: "OPTIONS",
      middlewares: [],
      modules: [__josm_preset_ts_onRequestOptions],
    },
  ]