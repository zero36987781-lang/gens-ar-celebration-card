import { onRequestGet as __api_media__ownerToken___mediaId__js_onRequestGet } from "C:\\gens-ar-celebration-card\\functions\\api\\media\\[ownerToken]\\[mediaId].js"
import { onRequestOptions as __api_media__ownerToken___mediaId__js_onRequestOptions } from "C:\\gens-ar-celebration-card\\functions\\api\\media\\[ownerToken]\\[mediaId].js"
import { onRequestOptions as __api_media_upload_js_onRequestOptions } from "C:\\gens-ar-celebration-card\\functions\\api\\media\\upload.js"
import { onRequestPost as __api_media_upload_js_onRequestPost } from "C:\\gens-ar-celebration-card\\functions\\api\\media\\upload.js"
import { onRequestOptions as __api_template_save_js_onRequestOptions } from "C:\\gens-ar-celebration-card\\functions\\api\\template\\save.js"
import { onRequestPost as __api_template_save_js_onRequestPost } from "C:\\gens-ar-celebration-card\\functions\\api\\template\\save.js"
import { onRequestGet as __api_template__id__js_onRequestGet } from "C:\\gens-ar-celebration-card\\functions\\api\\template\\[id].js"
import { onRequestOptions as __api_results_js_onRequestOptions } from "C:\\gens-ar-celebration-card\\functions\\api\\results.js"
import { onRequestPost as __api_results_js_onRequestPost } from "C:\\gens-ar-celebration-card\\functions\\api\\results.js"
import { onRequestGet as __api_runtime_config_js_onRequestGet } from "C:\\gens-ar-celebration-card\\functions\\api\\runtime-config.js"
import { onRequestGet as __api_templates_js_onRequestGet } from "C:\\gens-ar-celebration-card\\functions\\api\\templates.js"

export const routes = [
    {
      routePath: "/api/media/:ownerToken/:mediaId",
      mountPath: "/api/media/:ownerToken",
      method: "GET",
      middlewares: [],
      modules: [__api_media__ownerToken___mediaId__js_onRequestGet],
    },
  {
      routePath: "/api/media/:ownerToken/:mediaId",
      mountPath: "/api/media/:ownerToken",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_media__ownerToken___mediaId__js_onRequestOptions],
    },
  {
      routePath: "/api/media/upload",
      mountPath: "/api/media",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_media_upload_js_onRequestOptions],
    },
  {
      routePath: "/api/media/upload",
      mountPath: "/api/media",
      method: "POST",
      middlewares: [],
      modules: [__api_media_upload_js_onRequestPost],
    },
  {
      routePath: "/api/template/save",
      mountPath: "/api/template",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_template_save_js_onRequestOptions],
    },
  {
      routePath: "/api/template/save",
      mountPath: "/api/template",
      method: "POST",
      middlewares: [],
      modules: [__api_template_save_js_onRequestPost],
    },
  {
      routePath: "/api/template/:id",
      mountPath: "/api/template",
      method: "GET",
      middlewares: [],
      modules: [__api_template__id__js_onRequestGet],
    },
  {
      routePath: "/api/results",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_results_js_onRequestOptions],
    },
  {
      routePath: "/api/results",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_results_js_onRequestPost],
    },
  {
      routePath: "/api/runtime-config",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_runtime_config_js_onRequestGet],
    },
  {
      routePath: "/api/templates",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_templates_js_onRequestGet],
    },
  ]