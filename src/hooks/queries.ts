import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function usePolling() {
  const [visible, set] = useState(!document.hidden);
  useEffect(() => {
    const fn = () => set(!document.hidden);
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  }, []);
  return visible;
}
export function useDevices() {
  const visible = usePolling();
  return useQuery({
    queryKey: ["devices"],
    queryFn: api.devices,
    refetchInterval: visible ? 7000 : false,
  });
}
