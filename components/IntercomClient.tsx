// components/IntercomClient.tsx
"use client";

import { useEffect } from "react";
import Intercom from '@intercom/messenger-js-sdk';

// CSS to hide ONLY the Intercom launcher (chat bubble), but NOT the messenger widget
const hideIntercomStyle = `
  /* Hide ONLY the Intercom launcher (chat bubble button) */
  #intercom-container .intercom-launcher,
  .intercom-launcher-frame,
  .intercom-app-launcher-enabled .intercom-launcher,
  .intercom-launcher,
  iframe[name="intercom-launcher-frame"],
  [class*="intercom"][class*="launcher"]:not([class*="messenger"]):not([class*="widget"]),
  div[aria-label*="Open Intercom"],
  .intercom-namespace .intercom-launcher-frame,
  .intercom-launcher-discovery-frame {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
    width: 0 !important;
    height: 0 !important;
  }
  
  /* DO NOT hide the messenger widget itself when it's opened - only hide the launcher */
  /* The messenger will be shown/hidden by Intercom itself when show()/hide() is called */
`;

// Replace with your real app_id
const INTERCOM_APP_ID = "o5up1xz3";

interface IntercomWindow extends Window {
  openIntercom?: () => void;
}

export default function IntercomClient() {
  useEffect(() => {
    const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
    const intercomAlignment = isRtl ? 'left' : 'right';
    const intercomWindow = window as IntercomWindow;

    try {
      Intercom({
        app_id: INTERCOM_APP_ID,
        hide_default_launcher: true,
        alignment: intercomAlignment,
      });
    } catch (err) {
      console.error("Failed to initialize Intercom:", err);
    }

    intercomWindow.openIntercom = () => {
      if (typeof window.Intercom !== 'function') {
        console.warn('Intercom is not available yet');
        return;
      }

      try {
        window.Intercom('show');
      } catch (error) {
        console.warn('Failed to open Intercom:', error);
      }
    };

    return () => {
      delete intercomWindow.openIntercom;
      try {
        if (typeof window.Intercom === "function") {
          window.Intercom("shutdown");
        }
      } catch {}
    };
  }, []);

  // This component renders nothing visible — it only initializes intercom and hides the launcher
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: hideIntercomStyle }} />
    </>
  );
}
