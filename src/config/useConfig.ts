import { useState, useEffect, useCallback } from "react";
import { DEFAULT_CONFIG, type Config } from "./defaults";

const STORAGE_KEY = "blue-intelligence-config";

function loadConfig(): Config {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw) as Partial<Config>;
    return deepMerge(DEFAULT_CONFIG, parsed);
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const out = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    const val = source[key];
    if (val != null && typeof val === "object" && !Array.isArray(val) && target[key] != null && typeof target[key] === "object" && !Array.isArray(target[key])) {
      (out as any)[key] = deepMerge((target[key] as object) || {}, val as object);
    } else if (val !== undefined) {
      (out as any)[key] = val;
    }
  }
  return out;
}

export function useConfig() {
  const [config, setConfigState] = useState<Config>(loadConfig);

  useEffect(() => {
    const stored = loadConfig();
    setConfigState(stored);
  }, []);

  const setConfig = useCallback((updates: Partial<Config>) => {
    setConfigState((prev) => {
      const next = deepMerge(prev, updates);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const updateGatekeeper = useCallback((updates: Partial<Config["gatekeeper"]>) => {
    setConfigState((prev) => {
      const next = { ...prev, gatekeeper: { ...prev.gatekeeper, ...updates } };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const updateExtraction = useCallback((updates: Partial<Config["extraction"]>) => {
    setConfigState((prev) => {
      const next = { ...prev, extraction: { ...prev.extraction, ...updates } };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const updateAgent = useCallback((updates: Partial<Config["agent"]>) => {
    setConfigState((prev) => {
      const next = { ...prev, agent: { ...prev.agent, ...updates } };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  return { config, setConfig, updateGatekeeper, updateExtraction, updateAgent };
}
