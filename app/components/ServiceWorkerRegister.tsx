"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registado:", registration.scope);
      })
      .catch((error) => {
        console.error("SW erro:", error);
      });
  }, []);

  return null;
}