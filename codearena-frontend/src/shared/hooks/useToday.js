import { useEffect, useState } from "react";
import { toDayKey } from "@/shared/utils/dates";

// Current local day key; rolls over at midnight and when the tab regains focus.
export function useToday() {
  const [today, setToday] = useState(toDayKey);

  useEffect(() => {
    const refresh = () => setToday(toDayKey());
    const timer = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return today;
}
