import { useEffect } from "react";
import { APP_NAME } from "@/config/app";

// Sets the browser tab title for the current page, e.g. "DSA 200 · CodeArena".
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}
