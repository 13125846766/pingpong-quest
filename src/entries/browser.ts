import { App } from "../ui/app";
import { browserAdapter } from "../platform/browser";
const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("Canvas missing");
const updateLanguage = (locale: "zh-CN" | "en") => {
  document.documentElement.lang = locale;
  document.title =
    locale === "zh-CN"
      ? "乒乓闯关王 · 世界巡回赛"
      : "Ping Pong Quest · World Tour";
  canvas.setAttribute(
    "aria-label",
    locale === "zh-CN"
      ? "单指轻滑移动球拍，鼠标移动即可操作"
      : "Slide one finger to move the racket, or move your mouse pointer",
  );
};
const app = new App(
  browserAdapter(canvas, import.meta.env.DEV),
  navigator.languages?.[0] || navigator.language,
  updateLanguage,
);
if (import.meta.env.DEV) Object.assign(window, { __PINGPONG_DEV__: app });
