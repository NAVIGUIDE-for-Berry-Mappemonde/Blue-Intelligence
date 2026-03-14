import { useEffect, useState, useRef, useMemo, useCallback, memo } from "react";
import { MapContainer, TileLayer, GeoJSON, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Activity, Globe, Shield, Waves, Play, Loader2, Filter, ExternalLink, AlertCircle, AlertTriangle, RefreshCw, PanelLeftClose, PanelLeftOpen, Trash2, FileCode, ImageOff } from "lucide-react";
import { useConfig } from "./config/useConfig";
import { SettingsSidebar } from "./components/SettingsSidebar";
import { loadTheme, saveTheme, type Theme } from "./theme";
import { safeStorage } from "./utils/safeStorage";
import { useI18n } from "./i18n/useI18n";
import { HelpTooltip } from "./components/HelpTooltip";
import L from "leaflet";

// Persist Stop/Clear intent across reloads (requests may be aborted on page unload)
const LS_SWARM_STOPPED = "blueintel_swarmStopped";
const LS_PROJECTS_CLEARED = "blueintel_projectsCleared";

// Évite double "Ready" sous React StrictMode (effet exécuté 2× en dev)
let hasLoggedReady = false;

/** Translate log payload from server (key + params) to localized string */
function translateLog(data: Record<string, unknown>, t: Record<string, unknown>): string {
  const key = data.key as string;
  if (!key || !(t as any).logs?.[key]) return (data.message as string) || JSON.stringify(data);
  let template = ((t as any).logs as Record<string, string>)[key];
  const params = { ...data };
  delete params.key;
  if (params.modeKey) {
    params.mode = ((t as any).logs as Record<string, string>)[params.modeKey as string] || params.modeKey;
    delete params.modeKey;
  }
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) template = template.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
  }
  return template;
}

// Zoom-based marker limits: fewer markers when zoomed out for performance
const ZOOM_LIMITS = [
  { maxZoom: 5, maxMarkers: 200 },
  { maxZoom: 8, maxMarkers: 500 },
  { maxZoom: 22, maxMarkers: 2000 },
];

function getMaxMarkersForZoom(zoom: number): number {
  for (const { maxZoom, maxMarkers } of ZOOM_LIMITS) {
    if (zoom < maxZoom) return maxMarkers;
  }
  return ZOOM_LIMITS[ZOOM_LIMITS.length - 1].maxMarkers;
}

/** Build popup HTML (lazy: only when popup opens). Image uses loading="lazy". */
function buildPopupHtml(props: Record<string, unknown>): string {
  const title = (props?.title as string) || "Project";
  const funder = (props?.funder as string) || "";
  const url = (props?.url as string) || "#";
  const description = (props?.description as string) || "";
  const status = (props?.status as string) || "";
  const startDate = (props?.start_date as string) || "";
  const endDate = (props?.end_date as string) || "";
  let imgSrc = "";
  const imageUrl = props?.image_url as string | null;
  const projectUrl = props?.url as string | null;
  if (imageUrl && projectUrl) {
    try {
      const resolved = new URL(imageUrl, projectUrl).href;
      imgSrc = `/api/proxy-image?url=${encodeURIComponent(resolved)}`;
    } catch {
      imgSrc = imageUrl.startsWith("http") ? `/api/proxy-image?url=${encodeURIComponent(imageUrl)}` : "";
    }
  } else if (imageUrl?.startsWith("http")) {
    imgSrc = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
  }
  const isPdf = (projectUrl || url || "").toLowerCase().endsWith(".pdf");
  const imgHtml = imgSrc
    ? `<div class="relative h-24 w-full -mx-2 -mt-2 mb-2 overflow-hidden bg-slate-100"><img src="${imgSrc}" alt="${title.replace(/"/g, "&quot;")}" class="w-full h-full object-cover" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.innerHTML='<span class=\\'text-[10px] font-bold text-slate-400\\'>${title.replace(/"/g, "&quot;")}</span>'"/></div>`
    : isPdf
      ? `<div class="h-24 w-full -mx-2 -mt-2 mb-2 bg-slate-100 flex flex-col items-center justify-center gap-1"><a href="${(projectUrl || url || "#").replace(/"/g, "&quot;")}" target="_blank" rel="noreferrer" class="text-blue-600 hover:text-blue-800 text-[10px] font-bold underline">View PDF</a><span class="text-[9px] text-slate-400">${title.replace(/"/g, "&quot;").slice(0, 30)}</span></div>`
      : `<div class="h-24 w-full -mx-2 -mt-2 mb-2 bg-slate-100 flex items-center justify-center"><span class="text-[10px] font-bold text-slate-400">${title.replace(/"/g, "&quot;")}</span></div>`;
  return `
    <div class="p-2 w-40 overflow-hidden">
      ${imgHtml}
      <div class="flex items-start justify-between gap-1 mb-1">
        <h3 class="font-bold text-xs leading-tight text-slate-900">${(title || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</h3>
        <a href="${url}" target="_blank" rel="noreferrer" class="text-blue-600 hover:text-blue-800 shrink-0"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg></a>
      </div>
      <p class="text-[10px] text-slate-500 mb-1">${(funder || "").replace(/</g, "&lt;")}</p>
      <p class="text-[10px] text-slate-700 mb-1.5 line-clamp-3">${(description || "").replace(/</g, "&lt;").slice(0, 120)}</p>
      <div class="flex flex-wrap items-center justify-between gap-1 mt-auto pt-1 border-t border-slate-100">
        <span class="px-1.5 py-0.5 bg-green-100 text-green-800 text-[9px] rounded-sm uppercase font-bold">${(status || "").replace(/</g, "&lt;")}</span>
        ${startDate || endDate ? `<div class="text-[8px] text-slate-400 flex flex-col items-end">${startDate ? `<span>S: ${startDate}</span>` : ""}${endDate ? `<span>E: ${endDate}</span>` : ""}</div>` : ""}
      </div>
    </div>
  `;
}

const FALLBACK_SEEDS = [
  { name: "Blue Marine Foundation", url: "https://www.bluemarinefoundation.com/projects/" },
  { name: "Blue Action Fund", url: "https://www.blueactionfund.org/" },
  { name: "Global Fund for Coral Reefs", url: "https://globalfundcoralreefs.org/" },
  { name: "Oceana", url: "https://oceana.org/" },
  { name: "Fondation de la Mer", url: "https://www.fondationdelamer.org/" },
  { name: "Waitt Foundation", url: "https://www.waittfoundation.org/" },
  { name: "National Fish and Wildlife Foundation (NFWF)", url: "https://www.nfwf.org/" },
  { name: "David and Lucile Packard Foundation", url: "https://www.packard.org/" },
  { name: "Fondation CMA CGM", url: "https://www.cmacgm-group.com/en/foundation" },
  { name: "Fondation Prince Albert II de Monaco", url: "https://www.fpa2.org/" },
  { name: "OceanX (Dalio Philanthropies)", url: "https://oceanx.org/" },
  { name: "Pew Charitable Trusts", url: "https://www.pewtrusts.org/" },
  { name: "Bloomberg Philanthropies", url: "https://www.bloomberg.org/" },
  { name: "Walton Family Foundation", url: "https://www.waltonfamilyfoundation.org/" },
  { name: "Gordon and Betty Moore Foundation", url: "https://www.moore.org/" },
  { name: "Oak Foundation", url: "https://oakfnd.org/" },
  { name: "Bertarelli Foundation", url: "https://www.fondation-bertarelli.org/" },
  { name: "Paul M. Angell Family Foundation", url: "https://pmaff.org/" },
  { name: "Nippon Foundation", url: "https://www.nippon-foundation.or.jp/" },
  { name: "International Coral Reef Initiative (ICRI)", url: "https://icriforum.org/" },
  { name: "Mohamed bin Zayed Species Conservation Fund", url: "https://www.speciesconservation.org/" },
  { name: "Fondation de France", url: "https://www.fondationdefrance.org/" },
  { name: "Pure Ocean", url: "https://www.pure-ocean.org/" },
  { name: "The Ocean Foundation", url: "https://oceanfdn.org/" },
  { name: "The MedFund", url: "https://themedfund.org/" },
  { name: "Oceans 5", url: "https://www.oceans5.org/" },
  { name: "Fondation Veolia", url: "https://www.fondation.veolia.com/" },
  { name: "Institut Océanographique Paul Ricard", url: "https://www.institut-paul-ricard.org/" },
  { name: "Fondation BNP Paribas", url: "https://fondation.bnpparibas/" },
  { name: "Fondation TotalEnergies", url: "https://fondation.totalenergies.com/" },
  { name: "Minderoo Foundation", url: "https://www.minderoo.org/" },
  { name: "Paul G. Allen Family Foundation", url: "https://pgafamilyfoundation.org/" },
  { name: "Khaled bin Sultan Living Oceans Foundation", url: "https://www.livingoceansfoundation.org/" },
  { name: "Sasakawa Peace Foundation (OPRI)", url: "https://www.spf.org/" },
  { name: "Oceankind", url: "https://oceankind.org/" },
  { name: "Synchronicity Earth", url: "https://www.synchronicityearth.org/" },
  { name: "Save Our Seas Foundation", url: "https://saveourseas.com/" },
  { name: "Blue Ventures", url: "https://blueventures.org/" },
  { name: "Marine Conservation Institute", url: "https://marine-conservation.org/" },
  { name: "Mission Blue (Sylvia Earle Alliance)", url: "https://missionblue.org/" },
  { name: "SeaLegacy", url: "https://www.sealegacy.org/" },
  { name: "Manta Trust", url: "https://www.mantatrust.org/" },
  { name: "Marine Megafauna Foundation", url: "https://marinemegafauna.org/" },
  { name: "Sea Shepherd Conservation Society", url: "https://www.seashepherd.org/" },
  { name: "Nekton Foundation", url: "https://nektonmission.org/" },
  { name: "REV Ocean", url: "https://www.revocean.org/" },
  { name: "Sustainable Ocean Alliance (SOA)", url: "https://www.soalliance.org/" },
  { name: "Coral Reef Alliance", url: "https://coral.org/" },
  { name: "Ocean 14 Capital", url: "https://www.ocean14capital.com/" },
  { name: "Marisla Foundation", url: "https://www.marisla.org/" },
  { name: "Adessium Foundation", url: "https://www.adessium.org/" },
  { name: "Arcadia Fund", url: "https://www.arcadiafund.org.uk/" },
  { name: "Calouste Gulbenkian Foundation", url: "https://gulbenkian.pt/" },
  { name: "Prince Bernhard Nature Fund", url: "https://www.pbnf.nl/" },
  { name: "SeaWorld Conservation Fund", url: "https://swbg-conservationfund.org/" },
  { name: "Shark Conservation Fund", url: "https://www.sharkconservationfund.org/" },
  { name: "Turtle Island Restoration Network", url: "https://seaturtles.org/" },
  { name: "Plastic Soup Foundation", url: "https://www.plasticsoupfoundation.org/" },
  { name: "Surfrider Foundation", url: "https://www.surfrider.org/" },
  { name: "5 Gyres Institute", url: "https://www.5gyres.org/" },
  { name: "Ocean Conservancy", url: "https://oceanconservancy.org/" },
  { name: "Rare", url: "https://rare.org/" },
  { name: "WildAid", url: "https://wildaid.org/" },
  { name: "Tiffany & Co. Foundation", url: "https://www.tiffanyandcofoundation.org/" },
  { name: "Disney Conservation Fund", url: "https://impact.disney.com/environmental-stewardship/conservation/" },
  { name: "MSC Ocean Stewardship Fund", url: "https://www.msc.org/what-we-are-doing/our-collective-impact/ocean-stewardship-fund/impact-projects" },
  { name: "Coastal Quest", url: "https://www.coastal-quest.org/our-programs/" },
  { name: "JPI Oceans", url: "https://jpi-oceans.eu/en/joint-actions" },
  { name: "Belmont Forum", url: "https://belmontforum.org/projects/" },
  { name: "SkyTruth", url: "https://skytruth.org/our-projects/" },
  { name: "Global Fishing Watch", url: "https://globalfishingwatch.org/research-projects/" },
  { name: "Ocean Risk and Resilience Action Alliance (ORRAA)", url: "https://oceanriskalliance.org/pipeline/" },
  { name: "Blue Natural Capital (BCAF)", url: "https://www.bluenaturalcapital.org/stories?organization=BCAF" },
  { name: "World Bank PROBLUE", url: "https://www.worldbank.org/en/programs/problue/our-work" },
  { name: "IW:LEARN (GEF International Waters)", url: "https://www.iwlearn.net/" },
  { name: "Ocean Decade", url: "https://oceandecade.org/decade-actions/" },
  { name: "BlueInvest (EU)", url: "https://maritime-forum.ec.europa.eu/theme/investments/blueinvest_en" },
  { name: "CORDIS (EU Research)", url: "https://cordis.europa.eu/" },
];

/** Sample features spatially so zoomed-out view shows markers from across the world, not just one region */
function spatiallySample(features: any[], max: number): any[] {
  if (features.length <= max) return features;
  const sorted = [...features].sort((a, b) => {
    const latA = a.geometry?.coordinates?.[1] ?? 0;
    const latB = b.geometry?.coordinates?.[1] ?? 0;
    if (latA !== latB) return latA - latB;
    return (a.geometry?.coordinates?.[0] ?? 0) - (b.geometry?.coordinates?.[0] ?? 0);
  });
  const step = sorted.length / max;
  const sampled: any[] = [];
  for (let i = 0; i < max; i++) {
    const idx = Math.min(Math.floor(i * step), sorted.length - 1);
    sampled.push(sorted[idx]);
  }
  return sampled;
}

/** Au chargement : fitWorld + invalidateSize pour que la carte remplisse le conteneur (supprime l'espace en haut en vue monde). */
function MapFitWorld() {
  const map = useMap();
  const didFit = useRef(false);
  useEffect(() => {
    const run = () => {
      map.invalidateSize();
      if (!didFit.current) {
        didFit.current = true;
        map.fitWorld({ animate: false, maxZoom: 3 });
      }
    };
    const t = setTimeout(run, 150);
    const t2 = setTimeout(run, 500);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [map]);
  useMapEvents({
    zoomend: () => { if (map.getZoom() <= 3) map.invalidateSize(); },
  });
  return null;
}

/** Recalcule la taille de la carte quand une sidebar est toggle (évite le bug de centrage). */
function MapResizeOnSidebarChange({ sidebarOpen, settingsOpen }: { sidebarOpen: boolean; settingsOpen: boolean }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 50);
    const t2 = setTimeout(() => map.invalidateSize(), 300);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [map, sidebarOpen, settingsOpen]);
  return null;
}

/** Viewport culling + zoom limit: updates visible features on pan/zoom */
function MapViewportHandler({
  allFeatures,
  onVisibleChange,
}: {
  allFeatures: any[];
  onVisibleChange: (features: any[]) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      const max = getMaxMarkersForZoom(zoom);
      const inBounds = allFeatures.filter((f: any) => {
        const coords = f.geometry?.coordinates;
        if (!coords || coords.length < 2) return false;
        const lat = coords[1];
        const lng = coords[0];
        return bounds.contains([lat, lng]);
      });
      const limited = inBounds.length > max ? spatiallySample(inBounds, max) : inBounds;
      onVisibleChange(limited);
    },
  });
  useEffect(() => {
    map.fire("moveend");
  }, [map, allFeatures]);
  return null;
}

/** Optimized map layer: GeoJSON + CircleMarker + lazy popup */
const MapMarkersLayer = memo(function MapMarkersLayer({ features }: { features: any[] }) {
  const geojson = useMemo(
    () => ({ type: "FeatureCollection" as const, features }),
    [features]
  );
  const pointToLayer = useCallback((_f: any, latlng: L.LatLng) => {
    return L.circleMarker(latlng, {
      radius: 6,
      fillColor: "#3b82f6",
      color: "#1d4ed8",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8,
    });
  }, []);
  const onEachFeature = useCallback((feature: any, layer: L.Layer) => {
    const props = feature.properties || {};
    (layer as L.CircleMarker).bindPopup(
      () => buildPopupHtml(props),
      { className: "custom-popup", minWidth: 180 }
    );
  }, []);
  if (features.length === 0) return null;
  return (
    <GeoJSON
      key={features.length}
      data={geojson}
      pointToLayer={pointToLayer}
      onEachFeature={onEachFeature}
    />
  );
});

export default function App() {
  const [projects, setProjects] = useState<any>({ type: "FeatureCollection", features: [] });
  const [seeds, setSeeds] = useState<{ name: string; url: string }[]>(FALLBACK_SEEDS);
  const [loading, setLoading] = useState(false);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const appendAgentLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setAgentLogs(prev => [...prev.slice(-99), `[${ts}] ${msg}`]);
  }, []);
  const [queueStatus, setQueueStatus] = useState<{ active: number, queued: number }>({ active: 0, queued: 0 });
  const [configStatus, setConfigStatus] = useState<{ tinyfishKeySet: boolean }>({ tinyfishKeySet: true });

  const fetchSeeds = async () => {
    try {
      const res = await fetch("/api/etl/seeds");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) setSeeds(data);
      }
    } catch (_) {}
  };

  const fetchConfigStatus = async () => {
    try {
      const res = await fetch("/api/config-check");
      const data = await res.json();
      setConfigStatus(data);
    } catch (error) {
      console.error("Failed to fetch config status:", error);
    }
  };
  const [targetMode, setTargetMode] = useState<"test" | "full">("test");
  const [selectedFunderFilter, setSelectedFunderFilter] = useState<string>("All");
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [failedExtractions, setFailedExtractions] = useState<any[]>([]);
  const [projectsWithoutImage, setProjectsWithoutImage] = useState<{ id: number; title: string; url: string; funder: string }[]>([]);
  const [activeRuns, setActiveRuns] = useState<any[]>([]);
  const [selectedProxy, setSelectedProxy] = useState<string>("");
  const [view, setView] = useState<"map" | "audit">("map");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(false);
  const [theme, setThemeState] = useState<Theme>(() => loadTheme());
  const [liveLogs, setLiveLogs] = useState<Record<string, string[]>>({});
  const eventSources = useRef<Record<string, EventSource>>({});
  const mainLogRef = useRef<HTMLDivElement>(null);
  const agentLogRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const swarmStoppedRef = useRef(safeStorage.getItem(LS_SWARM_STOPPED) === "1");
  const projectsClearedRef = useRef(safeStorage.getItem(LS_PROJECTS_CLEARED) === "1");
  const { config, updateGatekeeper, updateExtraction, updateAgent } = useConfig();
  const { t, helpMode } = useI18n();

  const setTheme = (theme: Theme) => {
    setThemeState(theme);
    saveTheme(theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
  };
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  const PROXY_LOCATIONS = [
    { code: "", name: "No Proxy" },
    { code: "US", name: "United States" },
    { code: "GB", name: "United Kingdom" },
    { code: "CA", name: "Canada" },
    { code: "DE", name: "Germany" },
    { code: "FR", name: "France" },
    { code: "JP", name: "Japan" },
    { code: "AU", name: "Australia" },
  ];

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const data = await res.json();
      if (!data || !data.features) {
        console.error("Invalid projects data:", data);
        return;
      }
      // Persisted Clear: after reload, localStorage ensures we stay empty until next deploy
      if (safeStorage.getItem(LS_PROJECTS_CLEARED) === "1") {
        setProjects({ type: "FeatureCollection", features: [] });
        return;
      }
      // Don't overwrite with stale data after user clicked Clear (same session)
      if (projectsClearedRef.current && data.features.length > 0) return;
      if (projectsClearedRef.current && data.features.length === 0) projectsClearedRef.current = false;
      setProjects(prev => {
        if (prev && prev.features && prev.features.length === data.features.length) {
          return prev;
        }
        return data;
      });
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    }
  };

  const fetchTelemetry = async () => {
    try {
      const res = await fetch("/api/telemetry");
      const data = await res.json();
      if (Array.isArray(data)) {
        setTelemetry(data);
      } else {
        console.error("Invalid telemetry data:", data);
      }
    } catch (error) {
      console.error("Failed to fetch telemetry:", error);
    }
  };

  const fetchProjectsWithoutImage = async () => {
    try {
      const res = await fetch("/api/projects/without-image");
      if (res.ok) {
        const data = await res.json();
        setProjectsWithoutImage(Array.isArray(data) ? data : []);
      }
    } catch (_) {}
  };

  const fetchFailedExtractions = async () => {
    try {
      const res = await fetch("/api/failed-extractions");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          setFailedExtractions(data);
        } else {
          console.error("Invalid failed extractions data:", data);
        }
      } catch (e) {
        console.error("Failed to parse failed extractions JSON:", text.substring(0, 100));
      }
    } catch (error) {
      console.error("Failed to fetch failed extractions:", error);
    }
  };

  const fetchActiveRuns = async () => {
    try {
      const res = await fetch("/api/agent/active-runs", { cache: "no-store" });
      const data = await res.json();
      
      if (!Array.isArray(data)) {
        console.error("Invalid active runs data:", data);
        return;
      }
      // Persisted Stop: after reload, localStorage ensures we stay empty until next deploy
      if (safeStorage.getItem(LS_SWARM_STOPPED) === "1") {
        setActiveRuns([]);
        Object.keys(eventSources.current).forEach(id => {
          eventSources.current[id]?.close();
          delete eventSources.current[id];
        });
        return;
      }
      // Ignore stale poll results after stop (same session)
      if (swarmStoppedRef.current) return;
      
      setActiveRuns(data);
      
      const currentRunIds = new Set(data.map((r: any) => r.id));
      
      // Cleanup closed runs
      Object.keys(eventSources.current).forEach(id => {
        if (!currentRunIds.has(id)) {
          eventSources.current[id].close();
          delete eventSources.current[id];
        }
      });

      // Setup SSE for new runs (TinyFish) or placeholder for Readability.js
      data.forEach((run: any) => {
        const targetUrl = run.targetUrl || "—";
        const urlDisplay = targetUrl.length > 100 ? targetUrl.slice(0, 97) + "…" : targetUrl;
        if (!run.streamingUrl && run.mode === "extract") {
          const extractMsg = run.totalUrls
            ? `[${new Date().toLocaleTimeString()}] Extracting ${run.totalUrls} URLs with Readability + Claude (post-discovery)...`
            : `[${new Date().toLocaleTimeString()}] Extracting with Readability + Claude...`;
          setLiveLogs(prev => ({
            ...prev,
            [run.id]: (prev[run.id] || []).length === 0
              ? [`[${new Date().toLocaleTimeString()}] Source: ${urlDisplay}`, extractMsg]
              : prev[run.id]
          }));
        } else if (!eventSources.current[run.id] && run.streamingUrl) {
          setLiveLogs(prev => ({
            ...prev,
            [run.id]: (prev[run.id] || []).length === 0
              ? [`[${new Date().toLocaleTimeString()}] Target URL: ${urlDisplay}`, `[${new Date().toLocaleTimeString()}] Connecting to live stream...`]
              : prev[run.id]
          }));

          const eventSource = new EventSource(`/api/agent/stream/${run.id}`);
          eventSources.current[run.id] = eventSource;
          
          eventSource.onmessage = (event) => {
            const ts = new Date().toLocaleTimeString();
            try {
              const logData = JSON.parse(event.data);
              let msg = logData.message || logData.text || logData.content;
              if (!msg && typeof logData === "object") {
                const parts: string[] = [];
                if (logData.step) parts.push(`Step ${logData.step}`);
                if (logData.action) parts.push(logData.action);
                if (logData.url) parts.push(`URL: ${logData.url}`);
                if (logData.status) parts.push(`[${logData.status}]`);
                msg = parts.length ? parts.join(" ") : JSON.stringify(logData);
              }
              setLiveLogs(prev => ({
                ...prev,
                [run.id]: [...(prev[run.id] || []), `[${ts}] ${msg || JSON.stringify(logData)}`].slice(-50)
              }));
            } catch (e) {
              setLiveLogs(prev => ({
                ...prev,
                [run.id]: [...(prev[run.id] || []), `[${ts}] ${event.data}`].slice(-50)
              }));
            }
          };
          
          eventSource.onerror = () => {
            eventSource.close();
            delete eventSources.current[run.id];
          };
        }
      });
    } catch (error) {
      console.error("Failed to fetch active runs:", error);
    }
  };

  const fetchQueueStatus = async () => {
    try {
      if (safeStorage.getItem(LS_SWARM_STOPPED) === "1") {
        setQueueStatus({ active: 0, queued: 0 });
        return;
      }
      const res = await fetch("/api/agent/status", { cache: "no-store" });
      const data = await res.json();
      setQueueStatus({ active: data.activeAgents, queued: data.queuedAgents });
    } catch (error) {
      console.error("Failed to fetch queue status:", error);
    }
  };

  useEffect(() => {
    if (!hasLoggedReady) {
      hasLoggedReady = true;
      appendAgentLog((t as any).logs?.ready || "Ready");
    }
  }, [appendAgentLog, t]);

  useEffect(() => {
    mainLogRef.current?.scrollTo({ top: mainLogRef.current.scrollHeight, behavior: "smooth" });
  }, [agentLogs]);

  useEffect(() => {
    activeRuns.forEach(run => {
      const el = agentLogRefs.current[run.id];
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [liveLogs, activeRuns]);

  useEffect(() => {
    // Re-sync server on load if user had Stop/Clear before reload (requests may have been aborted)
    if (safeStorage.getItem(LS_SWARM_STOPPED) === "1") {
      fetch("/api/agent/stop", { method: "POST", cache: "no-store" }).catch(() => {});
    }
    if (safeStorage.getItem(LS_PROJECTS_CLEARED) === "1") {
      fetch("/api/projects/clear", { method: "POST", cache: "no-store" }).catch(() => {});
    }
    fetchProjects();
    fetchSeeds();
    fetchTelemetry();
    fetchQueueStatus();
    fetchConfigStatus();
    fetchFailedExtractions();
    fetchProjectsWithoutImage();
    const logEs = new EventSource("/api/logs/stream");
    logEs.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as Record<string, unknown>;
        const msg = data?.key ? translateLog(data, t) : (data?.message as string);
        if (msg) appendAgentLog(msg);
      } catch (_) {}
    };
    const es = new EventSource("/api/projects/stream");
    es.onmessage = (e) => {
      try {
        if (projectsClearedRef.current || safeStorage.getItem(LS_PROJECTS_CLEARED) === "1") return;
        const feature = JSON.parse(e.data);
        const title = feature?.properties?.title || feature?.properties?.url || "—";
        appendAgentLog(((t as any).logs?.project_added || "Project added: {title}").replace("{title}", String(title).slice(0, 40) + (String(title).length > 40 ? "…" : "")));
        setProjects((prev: any) => ({ ...prev, features: [...(prev.features || []), feature] }));
      } catch (_) {}
    };
    const interval = setInterval(() => {
      fetchProjects();
      fetchActiveRuns();
      fetchTelemetry();
      fetchQueueStatus();
      fetchFailedExtractions();
      fetchProjectsWithoutImage();
    }, 5000);
    return () => {
      logEs.close();
      es.close();
      clearInterval(interval);
      Object.values(eventSources.current).forEach((ev: any) => ev.close());
    };
  }, [appendAgentLog, t]);

  const deploySwarm = async () => {
    if (isSwarmRunning) return; // Prevent double deploy
safeStorage.removeItem(LS_SWARM_STOPPED);
      safeStorage.removeItem(LS_PROJECTS_CLEARED);
    swarmStoppedRef.current = false;
    projectsClearedRef.current = false;
    setLoading(true);
    appendAgentLog((t as any).logs?.deploy_start || "ETL Swarm deploying (MasterSeeds + DeepLinkCache)...");
    try {
      const res = await fetch("/api/etl/swarm-deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clearBeforeStart: false,
          testMode: targetMode === "test",
          proxy: selectedProxy,
          config: {
            gatekeeper: config.gatekeeper,
            extraction: config.extraction,
            agent: config.agent,
          },
        }),
      });
      const data = await res.json();
      appendAgentLog(data.message || ((t as any).logs?.deploy_ok || "Swarm deployed. {n} tasks.").replace("{n}", String(data.enqueued || 0)));
      // Optimistic update: prevent double deploy and show Stop button immediately
      setQueueStatus(prev => ({ active: prev.active, queued: prev.queued + (data.enqueued || 0) }));
    } catch (error) {
      console.error("Failed to deploy swarm:", error);
      appendAgentLog((t as any).logs?.deploy_fail || "Swarm deploy failed.");
    } finally {
      setLoading(false);
    }
  };

  const stopSwarm = async () => {
    try {
      safeStorage.setItem(LS_SWARM_STOPPED, "1");
      swarmStoppedRef.current = true;
      setActiveRuns([]);
      setQueueStatus({ active: 0, queued: 0 });
      Object.values(eventSources.current).forEach(es => es.close());
      eventSources.current = {};
      await fetch("/api/agent/stop", { method: "POST", cache: "no-store" });
      appendAgentLog((t as any).logs?.swarm_stopped || "Swarm stopped. Queue cleared.");
    } catch (error) {
      console.error("Failed to stop swarm:", error);
      appendAgentLog((t as any).logs?.stop_fail || "Stop swarm failed.");
      swarmStoppedRef.current = false;
      safeStorage.removeItem(LS_SWARM_STOPPED);
    } finally {
      setLoading(false);
    }
  };

  const clearProjects = async () => {
    try {
safeStorage.setItem(LS_PROJECTS_CLEARED, "1");
        safeStorage.setItem(LS_SWARM_STOPPED, "1");
      projectsClearedRef.current = true;
      swarmStoppedRef.current = true;
      setProjects({ type: "FeatureCollection", features: [] });
      setActiveRuns([]);
      setQueueStatus({ active: 0, queued: 0 });
      Object.values(eventSources.current).forEach(es => es.close());
      eventSources.current = {};
      const res = await fetch("/api/projects/clear", { method: "POST", cache: "no-store" });
      if (res.ok) {
        appendAgentLog((t as any).logs?.db_cleared_cache || "Database cleared. Cache removed.");
      } else {
        projectsClearedRef.current = false;
        swarmStoppedRef.current = false;
        safeStorage.removeItem(LS_PROJECTS_CLEARED);
        safeStorage.removeItem(LS_SWARM_STOPPED);
      }
    } catch (error) {
      console.error("Failed to clear projects:", error);
      projectsClearedRef.current = false;
      swarmStoppedRef.current = false;
      safeStorage.removeItem(LS_PROJECTS_CLEARED);
      safeStorage.removeItem(LS_SWARM_STOPPED);
    }
  };

  // Normalize names to merge duplicates (e.g., "The David..." vs "David...")
  const normalize = (name: string) => (name || "").replace(/^The\s+/i, '').trim().toLowerCase();
  
  // 1 ligne = 1 fondation. Projets co-financés : chaque funder (séparé par virgule) compte pour le projet.
  const funderMap = new Map<string, { name: string; count: number }>();
  (projects?.features ?? []).forEach((f: any) => {
    const funderStr = f.properties?.funder || "";
    const funderNames = funderStr.split(",").map((s: string) => s.trim()).filter(Boolean);
    const seen = new Set<string>();
    funderNames.forEach((funderName: string) => {
      const norm = normalize(funderName);
      if (!norm || seen.has(norm)) return;
      seen.add(norm);
      const existing = funderMap.get(norm);
      if (existing) {
        funderMap.set(norm, { name: existing.name, count: existing.count + 1 });
      } else {
        funderMap.set(norm, { name: funderName, count: 1 });
      }
    });
  });

  const fundersWithCounts = (Array.from(funderMap.values()) as { name: string; count: number }[])
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  
  const features = projects?.features ?? [];
  const filteredFeatures = useMemo(
    () =>
      selectedFunderFilter === "All"
        ? features
        : features.filter((f: any) => {
            const funderStr = f.properties?.funder || "";
            return funderStr.split(",").map((s: string) => normalize(s.trim())).includes(normalize(selectedFunderFilter));
          }),
    [features, selectedFunderFilter]
  );
  const [visibleFeatures, setVisibleFeatures] = useState<any[]>([]);
  useEffect(() => {
    if (filteredFeatures.length === 0) setVisibleFeatures([]);
  }, [filteredFeatures.length]);

  const exportGeoJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ type: "FeatureCollection", features: filteredFeatures }));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "blue_intelligence_projects.geojson");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const isSwarmRunning = loading || queueStatus.active > 0 || queueStatus.queued > 0 || activeRuns.length > 0;
  const isDark = theme === "dark";

  const leftSidebar = {
    bg: isDark ? "bg-slate-900" : "bg-white",
    border: isDark ? "border-slate-800" : "border-slate-200",
    input: isDark ? "bg-slate-950 border-slate-800 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800",
    card: isDark ? "bg-slate-950/50 border-slate-800" : "bg-slate-50 border-slate-200",
    text: isDark ? "text-slate-200" : "text-slate-800",
    muted: isDark ? "text-slate-400" : "text-slate-500",
    button: isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-200 hover:bg-slate-300 text-slate-800",
    cardBg: isDark ? "bg-slate-950" : "bg-white",
    logBg: isDark ? "bg-black/50" : "bg-slate-100",
  };

  return (
    <div 
      className={`grid w-full h-screen font-sans overflow-hidden ${isDark ? "bg-slate-950 text-slate-200" : "bg-slate-100 text-slate-800"}`}
      style={{ gridTemplateColumns: sidebarOpen ? '384px 1fr' : '1fr', gridTemplateRows: '1fr' }}
    >
      {/* Sidebar */}
      {sidebarOpen && (
      <div className={`w-96 shrink-0 border-r flex flex-col min-h-0 h-full overflow-hidden z-10 shadow-2xl ${leftSidebar.bg} ${leftSidebar.border}`}>
        <div className={`p-6 border-b flex items-center justify-between shrink-0 ${leftSidebar.border}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Waves className="w-6 h-6 text-blue-500" />
            </div>
            <div title={helpMode ? t.appTitleHelp : undefined}>
              <h1 className={`text-xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>Blue Intelligence</h1>
              <p className={`text-xs uppercase tracking-wider font-semibold ${leftSidebar.muted} leading-tight`} title={helpMode ? t.headerSubtitleHelp : undefined}>
                Maritime OSINT Swarm
                <br />
                {t.forNaviguide}{" "}
                <a href="https://naviguide.fr" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                  NAVIGUIDE
                  <img src="/logo-naviguide.png" alt="" className="w-4 h-4 object-contain" />
                </a>
                <br />
                {t.andBerry}{" "}
                <a href="https://berrymappemonde.org" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                  Berry-Mappemonde
                  <img src="/logo-berry-mappemonde.png" alt="" className="w-4 h-4 object-contain" />
                </a>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setView(view === "map" ? "audit" : "map")}
              className={`p-2 rounded-lg transition-colors ${leftSidebar.muted} ${isDark ? "hover:bg-slate-800 hover:text-slate-200" : "hover:bg-slate-200 hover:text-slate-800"}`}
              title={helpMode ? t.viewToggleHelp : (view === "map" ? t.viewAudit : t.viewMap)}
            >
              <Activity className="w-5 h-5" />
            </button>
            <HelpTooltip helpKey="closePanelHelp" fallbackKey="closePanel">
            <button 
              onClick={() => setSidebarOpen(false)}
              className={`p-2 rounded-lg transition-colors ${leftSidebar.muted} ${isDark ? "hover:bg-slate-800 hover:text-slate-200" : "hover:bg-slate-200 hover:text-slate-800"}`}
              title={t.closePanel}
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
            </HelpTooltip>
          </div>
        </div>

        {!configStatus.tinyfishKeySet && (
          <div className="p-4 bg-amber-500/10 border-b border-amber-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-600">{t.apiKeyMissing}</p>
                <p className="text-xs text-amber-600/80 leading-relaxed">{t.apiKeyMissingDesc}</p>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="shrink-0 mb-4">
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex flex-col min-h-[5rem] max-h-[8rem] overflow-hidden shrink-0" title={helpMode ? t.processLogsHelp : undefined}>
                  <div ref={mainLogRef} className="flex-1 min-h-0 overflow-y-auto font-mono text-[10px] leading-[1.25rem] text-blue-600 space-y-0.5">
                    {agentLogs.length === 0 ? (
                      <p className="text-[10px] text-blue-600/70">—</p>
                    ) : (
                      agentLogs.map((log, i) => (
                        <div key={i} className="leading-tight break-words">{log}</div>
                      ))
                    )}
                  </div>
                  {(queueStatus.active > 0 || queueStatus.queued > 0) && (
                    <div className="mt-2 flex gap-3 border-t border-blue-500/20 pt-2 shrink-0">
                      <div className="flex items-center gap-1" title={helpMode ? t.activeHelp : undefined}>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className={`text-[9px] uppercase tracking-tighter ${leftSidebar.muted}`}>{t.active}: {queueStatus.active}</span>
                      </div>
                      <div className="flex items-center gap-1" title={helpMode ? t.queuedHelp : undefined}>
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                        <span className={`text-[9px] uppercase tracking-tighter ${leftSidebar.muted}`}>{t.queued}: {queueStatus.queued}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <HelpTooltip helpKey="deploySwarmHelp" fallbackKey="deploySwarm">
                  <button 
                    onClick={() => deploySwarm()}
                    disabled={isSwarmRunning}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  >
                    {isSwarmRunning && queueStatus.active > 0 ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    {t.deploySwarm}
                  </button>
                  </HelpTooltip>

                {isSwarmRunning && (
                  <HelpTooltip helpKey="stopSwarmHelp" fallbackKey="stopSwarm">
                  <button 
                    onClick={stopSwarm}
                    className="w-full mt-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs"
                  >
                    <Shield className="w-3 h-3" />
                    {t.stopSwarm}
                  </button>
                  </HelpTooltip>
                )}
                </div>
              </div>
          </div>

          {/* Live Swarm Console - scrollable */}
          {(activeRuns.length > 0 || isSwarmRunning) && (
            <div className="flex-1 min-h-0 flex flex-col mb-4 overflow-hidden" title={helpMode ? t.liveSwarmConsoleHelp : undefined}>
              <h2 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2 shrink-0">
                <Activity className="w-3 h-3" /> {t.liveSwarmConsole}
              </h2>
              <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1 rounded-lg border border-blue-500/20 bg-blue-500/5">
                {activeRuns.length === 0 && isSwarmRunning && (
                  <div className={`p-4 rounded-lg border border-dashed text-center ${leftSidebar.cardBg} ${leftSidebar.border}`}>
                    <p className={`text-[10px] uppercase tracking-widest animate-pulse ${leftSidebar.muted}`}>{t.waitingForAgent}</p>
                  </div>
                )}
                {activeRuns.map((run, idx) => {
                  const mode = run.mode || "discover";
                  const engineLabel = mode === "extract" ? "Readability.js" : "TinyFish";
                  const agentNum = run.agentLabel?.replace(/^(Agent|TinyFish|Readability\.js)\s*/i, "") || String(idx + 1);
                  return (
                  <div key={`run-${run.id}-${idx}`} className={`rounded-lg border overflow-hidden ${leftSidebar.cardBg} ${leftSidebar.border}`}>
                    <div className={`p-3 flex gap-3 ${leftSidebar.bg}`}>
                      <div className={`flex flex-col gap-1 min-w-[4rem] p-2 rounded border ${leftSidebar.border} ${leftSidebar.cardBg}`}>
                        {engineLabel === "TinyFish" ? (
                          <a
                            href="https://tinyfish.ai"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center"
                            title="TinyFish"
                          >
                            <img src="/tinyfish-logo.png" alt="TinyFish" className="w-8 h-8 object-contain shrink-0" />
                          </a>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5" title="Readability.js">
                            <FileCode className="w-6 h-6 text-emerald-500" />
                            <span className="text-[8px] font-semibold uppercase tracking-wider text-emerald-600">{engineLabel}</span>
                          </div>
                        )}
                        <span className="text-[11px] font-mono font-bold">{agentNum}</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          run.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-600' :
                          run.status === 'RUNNING' ? 'bg-green-500/20 text-green-600' :
                          'bg-slate-500/20 text-slate-500'
                        }`}>{run.status}</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-500 uppercase">{mode}</span>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        {run.targetUrl && (
                          <span className="text-[9px] truncate block" title={run.targetUrl}>{run.targetUrl}</span>
                        )}
                        {run.streamingUrl && (
                          <a
                            href={run.streamingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded hover:bg-blue-500/30 transition-colors inline-flex items-center gap-1 w-fit"
                            title={helpMode ? t.watchAgentHelp : undefined}
                          >
                            <ExternalLink className="w-2 h-2" /> {t.watchAgent}
                          </a>
                        )}
                        <div
                          ref={el => { agentLogRefs.current[run.id] = el; }}
                          className={`font-mono text-[9px] max-h-[60px] overflow-y-auto ${leftSidebar.muted} ${leftSidebar.logBg} rounded p-1.5`}
                        >
                          {liveLogs[run.id]?.map((log, i) => (
                            <div key={`${run.id}-log-${i}`} className="mb-1 border-l-2 border-blue-500/40 pl-2 text-[10px] leading-tight break-words">{log}</div>
                          )) || <div className="animate-pulse text-[10px]">{t.initializingStream}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                );})}
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="mb-3 shrink-0">
              <select 
                value={selectedFunderFilter}
                onChange={(e) => setSelectedFunderFilter(e.target.value)}
                className={`w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${leftSidebar.input}`}
                title={helpMode ? t.orgFilterHelp : undefined}
              >
                <option value="All">{fundersWithCounts.length} {t.organizations} ({features.length} {t.projects})</option>
                {fundersWithCounts.map((funder, idx) => (
                  <option key={`funder-${funder.name}-${idx}`} value={funder.name}>
                    {funder.name} ({funder.count})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-2">
              <div className="space-y-2">
                {filteredFeatures.map((f: any, idx: number) => (
                  <div key={`sidebar-project-${f.properties.id || idx}`} className={`p-3 rounded-lg border transition-colors ${leftSidebar.card} hover:border-blue-500/50`} title={helpMode ? t.projectCardHelp : undefined}>
                    <h3 className={`text-sm font-bold truncate ${leftSidebar.text}`}>{f.properties.title}</h3>
                    <p className={`text-xs truncate ${leftSidebar.muted}`}>{f.properties.funder}</p>
                    <div className="flex justify-end items-center mt-2">
                      <span className={`text-[10px] font-mono ${leftSidebar.muted}`}>
                        {f.geometry.coordinates[1].toFixed(2)}, {f.geometry.coordinates[0].toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
      </div>
      )}

      {/* Map or Audit Area - grid cell fills remaining space */}
      <div className={`min-h-0 relative overflow-hidden flex flex-col flex-1 ${isDark ? "bg-slate-950" : "bg-slate-200"}`}>
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 min-h-0 flex flex-col">
        {/* Bouton pour rouvrir la sidebar quand fermée */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className={`absolute top-4 left-4 z-[1000] p-2 border rounded-lg transition-colors shadow-lg ${isDark ? "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-400" : "bg-white hover:bg-slate-100 border-slate-300 text-slate-600"}`}
            title={helpMode ? t.openPanelHelp : t.openPanel}
          >
            <PanelLeftOpen className="w-5 h-5" />
          </button>
        )}
        {view === "audit" ? (
          <div className={`absolute inset-0 flex flex-col min-h-0 p-6 ${isDark ? "bg-slate-950" : "bg-slate-100"}`}>
            <div className="flex flex-col flex-1 min-h-0 max-w-4xl mx-auto w-full">
              <div className={`flex items-center gap-3 mb-4 shrink-0 ${isDark ? "text-white" : "text-slate-900"}`}>
                <h2 className="text-2xl font-bold flex items-center gap-3" title={helpMode ? t.swarmAuditHelp : undefined}>
                  <Shield className="w-6 h-6 text-blue-500" /> {t.swarmAudit}
                </h2>
                <button
                  onClick={async () => {
                    try {
                      await fetch("/api/audit/clear", { method: "POST", cache: "no-store" });
                      await fetchTelemetry();
                      await fetchFailedExtractions();
                      await fetchProjectsWithoutImage();
                      appendAgentLog((t as any).logs?.audit_cleared ?? "Audit cleared.");
                    } catch (error) {
                      console.error("Failed to clear audit:", error);
                    }
                  }}
                  className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700" : "bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300"}`}
                  title={helpMode ? t.clearAuditHelp : t.clearAudit}
                >
                  <Trash2 className="w-4 h-4" /> {t.clearAudit}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4 shrink-0">
                <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`} title={helpMode ? t.totalExtractionsHelp : undefined}>
                  <p className={`text-xs uppercase font-bold mb-1 ${leftSidebar.muted}`}>{t.totalExtractions}</p>
                  <p className={`text-3xl font-mono ${isDark ? "text-white" : "text-slate-900"}`}>{telemetry.length}</p>
                </div>
                <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`} title={helpMode ? t.successRateHelp : undefined}>
                    <p className={`text-xs uppercase font-bold mb-1 ${leftSidebar.muted}`}>{t.successRate}</p>
                  <p className="text-3xl font-mono text-green-600">
                    {telemetry.length > 0 ? ((telemetry.filter(t => t.status === 'SUCCESS').length / telemetry.length) * 100).toFixed(0) : 0}%
                  </p>
                </div>
                <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`} title={helpMode ? t.projectsMappedHelp : undefined}>
                    <p className={`text-xs uppercase font-bold mb-1 ${leftSidebar.muted}`}>{t.projectsMapped}</p>
                  <p className="text-3xl font-mono text-blue-500">{features.length}</p>
                </div>
              </div>

              <div className={`flex-1 min-h-0 flex flex-col mb-4 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"} rounded-xl border`}>
                <div className="overflow-y-auto flex-1 min-h-[10.5rem]">
                  <table className={`w-full text-left text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    <thead className={`sticky top-0 z-10 ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                      <tr>
                        <th className="p-3">{t.targetUrl}</th>
                        <th className="p-3">{t.engine}</th>
                        <th className="p-3">{t.status}</th>
                        <th className="p-3">{t.duration}</th>
                        <th className="p-3">Results</th>
                      </tr>
                    </thead>
                    <tbody className={isDark ? "divide-y divide-slate-800" : "divide-y divide-slate-200"}>
                      {telemetry.map((t, idx) => (
                      <tr key={`audit-row-${t.id || idx}`} className={isDark ? "hover:bg-slate-800/30 transition-colors" : "hover:bg-slate-50 transition-colors"}>
                        <td className="p-3 font-mono text-xs truncate max-w-[200px]">{t.target_url}</td>
                        <td className="p-3">
                          <span className="px-2 py-1 rounded text-[10px] font-bold bg-blue-500/20 text-blue-500">
                            TINYFISH
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`flex items-center gap-1.5 ${t.status === 'SUCCESS' ? 'text-green-600' : t.status === 'SKIPPED' ? 'text-yellow-600' : 'text-red-500'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'SUCCESS' ? 'bg-green-500' : t.status === 'SKIPPED' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                            {t.status}
                          </span>
                        </td>
                        <td className={`p-3 ${leftSidebar.muted}`}>{(t.duration_ms / 1000).toFixed(1)}s</td>
                        <td className={`p-3 font-mono ${isDark ? "text-white" : "text-slate-900"}`}>
                          {t.projects_found}
                          {(t as any).raw_response && (
                            <div className="mt-1">
                              <details className={`text-[9px] ${leftSidebar.muted}`}>
                                <summary className={`cursor-pointer ${isDark ? "hover:text-slate-300" : "hover:text-slate-600"}`}>Raw</summary>
                                <pre className={`mt-1 p-2 rounded overflow-x-auto whitespace-pre-wrap max-h-32 text-[8px] ${isDark ? "bg-black/40" : "bg-slate-100"}`}>
                                  {(t as any).raw_response}
                                </pre>
                              </details>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <h3 className={`text-lg font-bold mb-2 shrink-0 flex items-center justify-between ${isDark ? "text-white" : "text-slate-900"}`} title={helpMode ? t.projectsWithoutImageHelp : undefined}>
                <div className="flex items-center gap-3">
                  <ImageOff className="w-5 h-5 text-slate-500" /> {t.projectsWithoutImage}
                </div>
                {projectsWithoutImage.length > 0 && (
                  <button
                    title={helpMode ? t.forceReextractImageHelp : t.forceReextractImage}
                    onClick={async () => {
                      try {
                        safeStorage.removeItem(LS_SWARM_STOPPED);
                        swarmStoppedRef.current = false;
                        await fetch("/api/agent/force-extract", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            projectUrls: projectsWithoutImage.map(p => p.url),
                            proxy: selectedProxy,
                            config: { gatekeeper: config.gatekeeper, extraction: config.extraction, agent: config.agent },
                          }),
                        });
                        appendAgentLog(((t as any).logs?.force_reextract_image_queued || "Re-extraction queued for {n} projects (image refresh)").replace("{n}", String(projectsWithoutImage.length)));
                      } catch (error) {
                        console.error("Failed to queue re-extraction:", error);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-500/20 text-slate-600 hover:bg-slate-500/30 dark:text-slate-400 dark:hover:bg-slate-500/30 rounded-lg text-sm font-bold transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t.forceReextractImage}
                  </button>
                )}
              </h3>

              <div className={`flex-1 min-h-0 flex flex-col mb-4 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"} rounded-xl border`}>
                <div className="overflow-y-auto flex-1 min-h-[10.5rem]">
                  <table className={`w-full text-left text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    <thead className={`sticky top-0 z-10 ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                      <tr>
                        <th className="p-3">Title</th>
                        <th className="p-3">URL</th>
                        <th className="p-3">Funder</th>
                        <th className="p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className={isDark ? "divide-y divide-slate-800" : "divide-y divide-slate-200"}>
                      {projectsWithoutImage.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={`p-4 text-center italic ${leftSidebar.muted}`}>
                          {t.noProjectsWithoutImage}
                        </td>
                      </tr>
                    ) : (
                      projectsWithoutImage.map((p, idx) => (
                        <tr key={`noimg-${p.id}-${idx}`} className={isDark ? "hover:bg-slate-800/30 transition-colors" : "hover:bg-slate-50 transition-colors"}>
                          <td className="p-3 font-medium text-xs max-w-[180px] truncate" title={p.title}>{p.title}</td>
                          <td className="p-3 font-mono text-xs truncate max-w-[200px]" title={p.url}>
                            <a href={p.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                              {p.url}
                            </a>
                          </td>
                          <td className={`p-3 text-xs ${leftSidebar.muted}`}>{p.funder}</td>
                          <td className="p-3">
                            <button
                              onClick={async () => {
                                try {
                                  safeStorage.removeItem(LS_SWARM_STOPPED);
                                  swarmStoppedRef.current = false;
                                  await fetch("/api/agent/force-extract", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      projectUrls: [p.url],
                                      proxy: selectedProxy,
                                      config: { gatekeeper: config.gatekeeper, extraction: config.extraction, agent: config.agent },
                                    }),
                                  });
                                  appendAgentLog(((t as any).logs?.force_extract_queued || "Re-extraction queued for 1 URL").replace("{n}", "1"));
                                } catch (error) {
                                  console.error("Failed to queue re-extraction:", error);
                                }
                              }}
                              className={`p-1.5 rounded transition-colors ${leftSidebar.button} ${leftSidebar.text}`}
                              title={t.forceReextractImage}
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                    </tbody>
                  </table>
                </div>
              </div>

              <h3 className={`text-lg font-bold mb-2 shrink-0 flex items-center justify-between ${isDark ? "text-white" : "text-slate-900"}`} title={helpMode ? t.failedExtractionsHelp : undefined}>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" /> {t.failedExtractions}
                </div>
                {failedExtractions.length > 0 && (
                  <button
                    title={helpMode ? t.forceExtractHelp : undefined}
                    onClick={async () => {
                      try {
                        safeStorage.removeItem(LS_SWARM_STOPPED);
                        swarmStoppedRef.current = false;
                        await fetch("/api/agent/force-extract", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ 
                            projectUrls: failedExtractions.map(f => f.project_url),
                            proxy: selectedProxy,
                            config: { gatekeeper: config.gatekeeper, extraction: config.extraction, agent: config.agent },
                          }),
                        });
                        appendAgentLog(((t as any).logs?.force_extract_queued || "Forced extraction queued for {n} URLs").replace("{n}", String(failedExtractions.length)));
                      } catch (error) {
                        console.error("Failed to queue forced extraction:", error);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30 rounded-lg text-sm font-bold transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Force Extract All with TinyFish
                  </button>
                )}
              </h3>
              
              <div className={`flex-1 min-h-0 flex flex-col ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"} rounded-xl border`}>
                <div className="overflow-y-auto flex-1 min-h-[10.5rem]">
                  <table className={`w-full text-left text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    <thead className={`sticky top-0 z-10 ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                      <tr>
                        <th className="p-3">Source URL</th>
                        <th className="p-3">Project URL</th>
                        <th className="p-3">{t.error}</th>
                        <th className="p-3">Time</th>
                        <th className="p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className={isDark ? "divide-y divide-slate-800" : "divide-y divide-slate-200"}>
                      {failedExtractions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={`p-4 text-center italic ${leftSidebar.muted}`}>
                          No failed extractions recorded.
                        </td>
                      </tr>
                    ) : (
                      failedExtractions.map((f, idx) => (
                        <tr key={`failed-row-${f.id || idx}`} className={isDark ? "hover:bg-slate-800/30 transition-colors" : "hover:bg-slate-50 transition-colors"}>
                          <td className="p-3 font-mono text-xs truncate max-w-[150px]" title={f.target_url}>{f.target_url}</td>
                          <td className="p-3 font-mono text-xs truncate max-w-[150px]" title={f.project_url}>
                            <a href={f.project_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                              {f.project_url}
                            </a>
                          </td>
                          <td className="p-3 text-red-500 text-xs max-w-[200px] truncate" title={f.error_message}>
                            {f.error_message}
                          </td>
                          <td className={`p-3 text-xs ${leftSidebar.muted}`}>
                            {new Date(f.created_at).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={async () => {
                                try {
                                  safeStorage.removeItem(LS_SWARM_STOPPED);
                                  swarmStoppedRef.current = false;
                                  await fetch("/api/agent/force-extract", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ 
                                      projectUrls: [f.project_url],
                                      proxy: selectedProxy,
                                      config: { gatekeeper: config.gatekeeper, extraction: config.extraction, agent: config.agent },
                                    }),
                                  });
                                  appendAgentLog(((t as any).logs?.force_extract_queued || "Forced extraction queued for {n} URLs").replace("{n}", "1"));
                                } catch (error) {
                                  console.error("Failed to queue forced extraction:", error);
                                }
                              }}
                              className={`p-1.5 rounded transition-colors ${leftSidebar.button} ${leftSidebar.text}`}
                              title={helpMode ? t.forceExtractHelp : t.forceExtract}
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col relative" title={helpMode ? t.mapViewHelp : undefined}>
          <MapContainer
            center={[46.2276, 2.2137]}
            zoom={2}
            minZoom={2}
            maxBounds={[[-85, -180], [85, 180]]}
            maxBoundsViscosity={0.5}
            className="flex-1 w-full min-h-0"
            style={{ height: '100%', width: '100%', flex: 1 }}
            zoomControl={false}
            preferCanvas
          >
            <MapFitWorld />
            <MapResizeOnSidebarChange sidebarOpen={sidebarOpen} settingsOpen={settingsSidebarOpen} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url={theme === "dark" ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
              noWrap
            />
            <MapViewportHandler
              allFeatures={filteredFeatures}
              onVisibleChange={setVisibleFeatures}
            />
            <MapMarkersLayer features={visibleFeatures} />
          </MapContainer>
          </div>
        )}
          </div>
          <SettingsSidebar
            config={config}
            onUpdateGatekeeper={updateGatekeeper}
            onUpdateExtraction={updateExtraction}
            onUpdateAgent={updateAgent}
            theme={theme}
            onThemeChange={setTheme}
            open={settingsSidebarOpen}
            onToggle={() => setSettingsSidebarOpen((o) => !o)}
            paramsLocked={isSwarmRunning}
            onExportGeoJSON={exportGeoJSON}
            exportGeoJSONDisabled={filteredFeatures.length === 0}
            onClearAllProjects={clearProjects}
            clearAllProjectsDisabled={features.length === 0 || isSwarmRunning}
            projectsCount={features.length}
            targetMode={targetMode}
            onTargetModeChange={setTargetMode}
            selectedProxy={selectedProxy}
            onSelectedProxyChange={setSelectedProxy}
            loading={loading}
            seedsLength={seeds.length}
            proxyLocations={PROXY_LOCATIONS}
          />
        </div>
      </div>
    </div>
  );
}
