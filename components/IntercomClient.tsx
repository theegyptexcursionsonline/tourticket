// components/IntercomClient.tsx
"use client";

import { useEffect } from "react";

// Replace with your real app_id
const INTERCOM_APP_ID = "o5up1xz3";

export default function IntercomClient() {
  useEffect(() => {
    let messenger: any = null;
    let mounted = true;

    async function initIntercom() {
      try {
        // Try dynamic import of the official messenger SDK
        const mod = await import("@intercom/messenger-js-sdk");
        if (!mounted) return;
        messenger = mod.default ?? mod;

        // initialize messenger
        messenger({
          app_id: INTERCOM_APP_ID,
          // any other init options you want
        });

        // expose a helper to open the messenger
        (window as any).openIntercom = () => {
          // messenger-js-sdk exposes a showMessenger method on the returned object
          // but to be robust, try both patterns:
          try {
            // Some builds expect calling window.Intercom or messenger API - try them
            // If messenger returned a callable API with "show", "showMessenger", or "show", call it:
            if (typeof (window as any).Intercom === "function") {
              (window as any).Intercom("show");
              return;
            }
            // If messenger returned a function reference with .showMessenger
            if (typeof messenger === "function" && (messenger as any).showMessenger) {
              (messenger as any).showMessenger();
              return;
            }
            // Some versions expose global messenger object with show/hide
            if ((window as any).Messenger && typeof (window as any).Messenger.show === "function") {
              (window as any).Messenger.show();
              return;
            }
            // Last resort: try calling Intercom via window.Intercom command shim
            if (typeof (window as any).Intercom === "function") {
              (window as any).Intercom("show");
            }
          } catch (err) {
            // silently fail - still keep fallback below
            console.warn("openIntercom() helper error", err);
          }
        };
      } catch (err) {
        // If dynamic import fails, fall back to standard Intercom snippet injection
        console.warn("Failed to load @intercom/messenger-js-sdk, falling back to classic snippet.", err);

        // inject classic intercom snippet
        (function () {
          // standard Intercom snippet pattern
          const w = window as any;
          const ic = w.Intercom;
          if (typeof ic === "function") {
            return;
          }
          const d = document;
          const i = function () {
            (i as any).c?.push(arguments);
          } as any;
          (i as any).c = [];
          w.Intercom = i;
          function l() {
            const s = d.createElement("script");
            s.type = "text/javascript";
            s.async = true;
            s.src = "https://widget.intercom.io/widget/" + INTERCOM_APP_ID;
            const x = d.getElementsByTagName("script")[0];
            x.parentNode?.insertBefore(s, x);
          }
          if (document.readyState === "complete") {
            l();
          } else if (w.attachEvent) {
            w.attachEvent("onload", l);
          } else {
            w.addEventListener("load", l, false);
          }
        })();

        // init Intercom once snippet available
        const tryInit = () => {
          const w = window as any;
          if (typeof w.Intercom === "function") {
            w.Intercom("boot", { app_id: INTERCOM_APP_ID });
            // expose open helper
            (window as any).openIntercom = () => w.Intercom("show");
          } else {
            // retry soon
            setTimeout(tryInit, 500);
          }
        };
        tryInit();
      }
    }

    initIntercom();

    return () => {
      mounted = false;
      // Optionally shutdown Intercom on unmount:
      try {
        const w = window as any;
        if (typeof w.Intercom === "function") {
          w.Intercom("shutdown");
        }
      } catch (e) {
        // ignore
      }
    };
  }, []);

  // This component renders nothing visible — it only initializes intercom.
  return null;
}
