"use client";

import { useLocale } from "next-intl";
import { useEffect, useRef } from "react";

/**
 * hCaptcha widget. Renders nothing unless NEXT_PUBLIC_HCAPTCHA_SITEKEY is set,
 * so local dev and tests work without it. Inside a <form> the widget adds an
 * `h-captcha-response` field to the FormData; outside one, use `onToken`.
 * Tokens are single-use: change `resetKey` (e.g. pass the action state) to get
 * a fresh challenge after every submission.
 */
const SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY;
export const captchaEnabled = Boolean(SITE_KEY);

type HCaptchaApi = {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  reset(id?: string): void;
  remove(id?: string): void;
};
type CaptchaWindow = Window & { hcaptcha?: HCaptchaApi; __hcaptchaLoad?: Promise<void>; __hcaptchaOnLoad?: () => void };

function loadApi(): Promise<void> {
  const w = window as CaptchaWindow;
  w.__hcaptchaLoad ??= new Promise<void>((resolve, reject) => {
    w.__hcaptchaOnLoad = resolve;
    const s = document.createElement("script");
    s.src = "https://js.hcaptcha.com/1/api.js?render=explicit&recaptchacompat=off&onload=__hcaptchaOnLoad";
    s.async = true;
    s.onerror = () => {
      w.__hcaptchaLoad = undefined;
      reject(new Error("hcaptcha failed to load"));
    };
    document.head.appendChild(s);
  });
  return w.__hcaptchaLoad;
}

export function Captcha({ resetKey, onToken }: { resetKey?: unknown; onToken?: (token: string) => void }) {
  const locale = useLocale();
  const el = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const tokenCb = useRef(onToken);
  useEffect(() => {
    tokenCb.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!SITE_KEY) return;
    let alive = true;
    loadApi()
      .then(() => {
        const api = (window as CaptchaWindow).hcaptcha;
        if (!alive || !el.current || !api) return;
        widget.current = api.render(el.current, {
          sitekey: SITE_KEY,
          hl: locale,
          callback: (t: string) => tokenCb.current?.(t),
          "expired-callback": () => tokenCb.current?.(""),
          "error-callback": () => tokenCb.current?.(""),
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (widget.current) (window as CaptchaWindow).hcaptcha?.remove(widget.current);
      widget.current = null;
    };
  }, [locale]);

  useEffect(() => {
    if (!widget.current) return;
    (window as CaptchaWindow).hcaptcha?.reset(widget.current);
    tokenCb.current?.("");
  }, [resetKey]);

  if (!SITE_KEY) return null;
  return <div ref={el} className="min-h-[78px]" />;
}
