import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Activity, Globe, Shield, Waves, Play, Loader2, Filter, Download, ExternalLink, AlertCircle } from "lucide-react";
import L from "leaflet";

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const TARGET_PORTALS = [
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
];

const ProjectImage = ({ imageUrl, title, projectUrl }: { imageUrl: string | null, title: string, projectUrl?: string }) => {
  const [error, setError] = useState(false);
  
  // Try to resolve relative URLs if we have the project URL
  let resolvedImageUrl = imageUrl;
  if (imageUrl && projectUrl) {
    try {
      // This handles both absolute (ignores base) and relative (uses base)
      const urlObj = new URL(imageUrl, projectUrl);
      resolvedImageUrl = urlObj.href;
    } catch (e) {
      // Ignore invalid URLs
    }
  }

  const proxyUrl = resolvedImageUrl ? `/api/proxy-image?url=${encodeURIComponent(resolvedImageUrl)}` : null;

  if (!proxyUrl || error) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center p-2 text-center">
        <span className="text-[10px] font-bold text-slate-400 leading-tight uppercase tracking-tighter">
          {title}
        </span>
      </div>
    );
  }

  return (
    <img 
      src={proxyUrl} 
      alt={title} 
      className="w-full h-full object-cover"
      referrerPolicy="no-referrer"
      onError={() => setError(true)}
    />
  );
};

export default function App() {
  const [projects, setProjects] = useState<any>({ type: "FeatureCollection", features: [] });
  const [loading, setLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<{ active: number, queued: number }>({ active: 0, queued: 0 });
  const [configStatus, setConfigStatus] = useState<{ tinyfishKeySet: boolean }>({ tinyfishKeySet: true });

  const fetchConfigStatus = async () => {
    try {
      const res = await fetch("/api/config-check");
      const data = await res.json();
      setConfigStatus(data);
    } catch (error) {
      console.error("Failed to fetch config status:", error);
    }
  };
  const [manualUrl, setManualUrl] = useState("");
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [selectedFunderFilter, setSelectedFunderFilter] = useState<string>("All");
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [targetMode, setTargetMode] = useState<string>("test");
  const [activeRuns, setActiveRuns] = useState<any[]>([]);
  const [selectedProxy, setSelectedProxy] = useState<string>("");
  const [clearBeforeStart, setClearBeforeStart] = useState(false);
  const [view, setView] = useState<"map" | "audit">("map");
  const [liveLogs, setLiveLogs] = useState<Record<string, string[]>>({});
  const eventSources = useRef<Record<string, EventSource>>({});

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
      const res = await fetch("/api/projects");
      const data = await res.json();
      // Only update if the number of projects has changed or if we had none and now have some
      setProjects(prev => {
        if (prev.features.length === data.features.length) {
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
      setTelemetry(data);
    } catch (error) {
      console.error("Failed to fetch telemetry:", error);
    }
  };

  const fetchActiveRuns = async () => {
    try {
      const res = await fetch("/api/agent/active-runs");
      const data = await res.json();
      setActiveRuns(data);
      
      const currentRunIds = new Set(data.map((r: any) => r.id));
      
      // Cleanup closed runs
      Object.keys(eventSources.current).forEach(id => {
        if (!currentRunIds.has(id)) {
          eventSources.current[id].close();
          delete eventSources.current[id];
        }
      });

      // Setup SSE for new runs
      data.forEach((run: any) => {
        if (!eventSources.current[run.id] && run.streamingUrl) {
          // Set initial log state
          setLiveLogs(prev => ({
            ...prev,
            [run.id]: (prev[run.id] || []).length === 0 ? ["Agent dispatched. Connecting to live stream..."] : prev[run.id]
          }));

          const eventSource = new EventSource(`/api/agent/stream/${run.id}`);
          eventSources.current[run.id] = eventSource;
          
          eventSource.onmessage = (event) => {
            try {
              const logData = JSON.parse(event.data);
              setLiveLogs(prev => ({
                ...prev,
                [run.id]: [...(prev[run.id] || []), logData.message || JSON.stringify(logData)].slice(-20)
              }));
            } catch (e) {
              setLiveLogs(prev => ({
                ...prev,
                [run.id]: [...(prev[run.id] || []), event.data].slice(-20)
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
      const res = await fetch("/api/agent/status");
      const data = await res.json();
      setQueueStatus({ active: data.activeAgents, queued: data.queuedAgents });
    } catch (error) {
      console.error("Failed to fetch queue status:", error);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchTelemetry();
    fetchQueueStatus();
    fetchConfigStatus();
    const interval = setInterval(() => {
      fetchProjects();
      fetchActiveRuns();
      fetchTelemetry();
      fetchQueueStatus();
    }, 5000);
    return () => {
      clearInterval(interval);
      Object.values(eventSources.current).forEach((es: any) => es.close());
    };
  }, []);

  const deployManual = async () => {
    if (!manualUrl) return;
    setIsManualLoading(true);
    try {
      await fetch("/api/agent/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          targetUrl: manualUrl, 
          proxy: selectedProxy
        }),
      });
      setAgentStatus(`Manual agent dispatched to ${manualUrl}`);
    } catch (error) {
      console.error("Failed to deploy manual agent:", error);
    } finally {
      setIsManualLoading(false);
    }
  };

  const deploySwarm = async () => {
    setLoading(true);
    
    if (clearBeforeStart) {
      await clearProjects();
    }
    
    const targets = targetMode === "test" ? [TARGET_PORTALS[0]] : TARGET_PORTALS;
    
    setAgentStatus(`Swarm deployed. Dispatching agents to ${targets.length} foundation(s)...`);
    
    // Dispatch agents
    for (let i = 0; i < targets.length; i++) {
      const portal = targets[i];
      try {
        await fetch("/api/agent/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            targetUrl: portal.url, 
            proxy: selectedProxy
          }),
        });
      } catch (error) {
        console.error(`Failed to dispatch agent for ${portal.name}`, error);
      }
    }
    
    setAgentStatus(`All agents dispatched. Monitoring swarm telemetry...`);
    setLoading(false);
  };

  const stopSwarm = async () => {
    try {
      await fetch("/api/agent/stop", { method: "POST" });
      setAgentStatus("Swarm stopped. Queue cleared.");
      setLoading(false);
    } catch (error) {
      console.error("Failed to stop swarm:", error);
    }
  };

  const clearProjects = async () => {
    try {
      const res = await fetch("/api/projects/clear", { method: "POST" });
      if (res.ok) {
        setProjects({ type: "FeatureCollection", features: [] });
        setAgentStatus("Database cleared. Cache removed.");
      }
    } catch (error) {
      console.error("Failed to clear projects:", error);
    }
  };

  // Extract unique funders for the filter dropdown
  const uniqueFundersInData = Array.from(new Set(projects.features.map((f: any) => f.properties.funder).filter(Boolean))) as string[];
  const targetNames = TARGET_PORTALS.map(p => p.name);
  
  // Normalize names to merge duplicates (e.g., "The David..." vs "David...")
  const normalize = (name: string) => name.replace(/^The\s+/i, '').trim().toLowerCase();
  
  const funderMap = new Map<string, { name: string, count: number }>();
  
  // Initialize with target names
  targetNames.forEach(name => {
    const norm = normalize(name);
    if (!funderMap.has(norm)) {
      funderMap.set(norm, { name, count: 0 });
    }
  });
  
  // Add/Update with data names
  uniqueFundersInData.forEach(name => {
    const norm = normalize(name);
    const count = projects.features.filter((f: any) => f.properties.funder === name).length;
    
    if (funderMap.has(norm)) {
      const existing = funderMap.get(norm)!;
      // If the data name has projects, prefer it as the display name
      if (count > 0) {
        funderMap.set(norm, { name, count: existing.count + count });
      } else {
        funderMap.set(norm, { name: existing.name, count: existing.count + count });
      }
    } else {
      funderMap.set(norm, { name, count });
    }
  });

  const fundersWithCounts = Array.from(funderMap.values())
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  
  const filteredFeatures = selectedFunderFilter === "All" 
    ? projects.features 
    : projects.features.filter((f: any) => normalize(f.properties.funder) === normalize(selectedFunderFilter));

  const exportGeoJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ type: "FeatureCollection", features: filteredFeatures }));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "blue_intelligence_projects.geojson");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const isSwarmRunning = loading || queueStatus.active > 0 || queueStatus.queued > 0;

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-96 bg-slate-900 border-r border-slate-800 flex flex-col z-10 shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Waves className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Blue Intelligence</h1>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Maritime OSINT Swarm</p>
            </div>
          </div>
          <button 
            onClick={() => setView(view === "map" ? "audit" : "map")}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
            title={view === "map" ? "View Audit Log" : "View Map"}
          >
            <Activity className="w-5 h-5" />
          </button>
        </div>

        {!configStatus.tinyfishKeySet && (
          <div className="p-4 bg-amber-500/10 border-b border-amber-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-400">API Key Missing</p>
                <p className="text-xs text-amber-400/80 leading-relaxed">
                  TINYFISH_API_KEY is not configured. Please add it to your environment variables to enable agent extraction.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-8">
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <select 
                    value={targetMode}
                    onChange={(e) => setTargetMode(e.target.value)}
                    disabled={loading}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none disabled:opacity-50"
                  >
                    <option value="test">Test (1)</option>
                    <option value="full">Full ({TARGET_PORTALS.length})</option>
                  </select>
                  <select 
                    value={selectedProxy}
                    onChange={(e) => setSelectedProxy(e.target.value)}
                    disabled={loading}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none disabled:opacity-50"
                  >
                    {PROXY_LOCATIONS.map(p => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {agentStatus && (
                  <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-[10px] text-blue-400 font-mono animate-pulse">{agentStatus}</p>
                    {(queueStatus.active > 0 || queueStatus.queued > 0) && (
                      <div className="mt-2 flex gap-3 border-t border-blue-500/20 pt-2">
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-[9px] text-slate-400 uppercase tracking-tighter">Active: {queueStatus.active}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                          <span className="text-[9px] text-slate-400 uppercase tracking-tighter">Queued: {queueStatus.queued}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={() => deploySwarm()}
                    disabled={isSwarmRunning}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  >
                    {isSwarmRunning && queueStatus.active > 0 ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    Deploy TinyFish Swarm
                  </button>
                  
                  <div className="flex items-center gap-2 px-1">
                    <input 
                      type="checkbox" 
                      id="clear-before-start"
                      checked={clearBeforeStart}
                      onChange={(e) => setClearBeforeStart(e.target.checked)}
                      className="w-3 h-3 rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="clear-before-start" className="text-[10px] text-slate-400 cursor-pointer">Clear database before starting</label>
                  </div>
                </div>

                <div className="flex flex-col gap-2 p-3 bg-slate-950/50 rounded-lg border border-slate-800 mt-2">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Manual Target Extraction</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={manualUrl}
                      onChange={(e) => setManualUrl(e.target.value)}
                      placeholder="https://example.org/projects"
                      className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={() => deployManual()}
                      disabled={!manualUrl || isManualLoading || isSwarmRunning}
                      className="bg-slate-800 hover:bg-slate-700 px-3 rounded text-[10px] font-bold disabled:opacity-50"
                    >
                      {isManualLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Extract"}
                    </button>
                  </div>
                </div>

                {isSwarmRunning && (
                  <button 
                    onClick={stopSwarm}
                    className="w-full mt-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs"
                  >
                    <Shield className="w-3 h-3" />
                    Stop Swarm
                  </button>
                )}
              </div>
          </div>

          {/* Live Swarm Console */}
          {(activeRuns.length > 0 || isSwarmRunning) && (
            <div className="mb-8">
              <h2 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Activity className="w-3 h-3" /> Live Swarm Console
              </h2>
              <div className="space-y-3">
                {activeRuns.length === 0 && isSwarmRunning && (
                  <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 border-dashed text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest animate-pulse">Waiting for next agent in queue...</p>
                  </div>
                )}
                {activeRuns.map((run, idx) => (
                  <div key={`run-${run.id}-${idx}`} className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                    <div className="p-2 bg-slate-900 flex justify-between items-center border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-blue-400 truncate w-24">Run: {run.id}</span>
                        <span className={`text-[8px] px-1 rounded font-bold uppercase ${
                          run.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-500' : 
                          run.status === 'RUNNING' ? 'bg-green-500/20 text-green-500' : 
                          'bg-slate-500/20 text-slate-500'
                        }`}>
                          {run.status}
                        </span>
                      </div>
                      {run.streamingUrl && (
                        <a 
                          href={run.streamingUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded hover:bg-blue-500/30 transition-colors flex items-center gap-1"
                        >
                          <ExternalLink className="w-2 h-2" /> Watch Agent
                        </a>
                      )}
                    </div>
                    <div className="p-2 font-mono text-[9px] text-slate-400 h-24 overflow-y-auto bg-black/50">
                      {liveLogs[run.id]?.map((log, i) => (
                        <div key={`${run.id}-log-${i}`} className="mb-1 border-l border-blue-500/30 pl-2 text-xs">{log}</div>
                      )) || <div className="animate-pulse">Initializing agent stream...</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-4">
              <select 
                value={selectedFunderFilter}
                onChange={(e) => setSelectedFunderFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="All">All Foundations ({projects.features.length})</option>
                {fundersWithCounts.map((funder, idx) => (
                  <option key={`funder-${funder.name}-${idx}`} value={funder.name}>
                    {funder.name} ({funder.count})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-sm text-slate-400">Filtered Projects</span>
                <span className="text-lg font-mono font-bold text-blue-400">{filteredFeatures.length}</span>
              </div>
              
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto pr-2">
                {filteredFeatures.map((f: any, idx: number) => (
                  <div key={`sidebar-project-${f.properties.id || idx}`} className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg hover:border-blue-500/50 transition-colors">
                    <h3 className="text-sm font-bold text-slate-200 truncate">{f.properties.title}</h3>
                    <p className="text-xs text-slate-500 truncate">{f.properties.funder}</p>
                    <div className="flex justify-end items-center mt-2">
                      <span className="text-[10px] font-mono text-slate-500">
                        {f.geometry.coordinates[1].toFixed(2)}, {f.geometry.coordinates[0].toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Export & Clear Buttons at the bottom of sidebar */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 space-y-2">
          <button 
            onClick={exportGeoJSON}
            disabled={filteredFeatures.length === 0}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 text-xs"
          >
            <Download className="w-4 h-4" />
            Export GeoJSON
          </button>
          
          <button 
            onClick={clearProjects}
            disabled={projects.features.length === 0 || isSwarmRunning}
            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
          >
            <Shield className="w-4 h-4" />
            Clear All Projects
          </button>
        </div>
      </div>

      {/* Map or Audit Area */}
      <div className="flex-1 relative">
        {view === "audit" ? (
          <div className="absolute inset-0 bg-slate-950 p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Shield className="w-6 h-6 text-blue-400" /> Swarm Intelligence Audit
              </h2>
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Total Extractions</p>
                  <p className="text-3xl font-mono text-white">{telemetry.length}</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Success Rate</p>
                  <p className="text-3xl font-mono text-green-400">
                    {telemetry.length > 0 ? ((telemetry.filter(t => t.status === 'SUCCESS').length / telemetry.length) * 100).toFixed(0) : 0}%
                  </p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Projects Mapped</p>
                  <p className="text-3xl font-mono text-blue-400">{projects.features.length}</p>
                </div>
              </div>

              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="p-4">Target URL</th>
                      <th className="p-4">Engine</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Duration</th>
                      <th className="p-4">Results</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {telemetry.map((t, idx) => (
                      <tr key={`audit-row-${t.id || idx}`} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-mono text-xs truncate max-w-[200px]">{t.target_url}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400`}>
                            TINYFISH
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`flex items-center gap-1.5 ${t.status === 'SUCCESS' ? 'text-green-400' : t.status === 'SKIPPED' ? 'text-yellow-400' : 'text-red-400'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'SUCCESS' ? 'bg-green-400' : t.status === 'SKIPPED' ? 'bg-yellow-400' : 'bg-red-400'}`} />
                            {t.status}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500">{(t.duration_ms / 1000).toFixed(1)}s</td>
                        <td className="p-4 font-mono text-white">
                          {t.projects_found}
                          {(t as any).raw_response && (
                            <div className="mt-1">
                              <details className="text-[9px] text-slate-500">
                                <summary className="cursor-pointer hover:text-slate-300">Raw</summary>
                                <pre className="mt-1 p-2 bg-black/40 rounded overflow-x-auto whitespace-pre-wrap max-h-32 text-[8px]">
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
          </div>
        ) : (
          <MapContainer 
          center={[46.2276, 2.2137]} 
          zoom={2} 
          minZoom={2}
          maxBounds={[[-90, -180], [90, 180]]}
          maxBoundsViscosity={1.0}
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {filteredFeatures.map((feature: any, idx: number) => (
            <Marker 
              key={`map-marker-${feature.properties.id || idx}`} 
              position={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]}
            >
              <Popup className="custom-popup">
                <div className="p-2 w-40 overflow-hidden">
                  <div className="relative h-24 w-full -mx-2 -mt-2 mb-2 overflow-hidden bg-slate-100">
                    <ProjectImage 
                      imageUrl={feature.properties.image_url} 
                      title={feature.properties.title} 
                      projectUrl={feature.properties.url}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  </div>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <h3 className="font-bold text-xs leading-tight text-slate-900">{feature.properties.title}</h3>
                    <a 
                      href={feature.properties.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-blue-600 hover:text-blue-800 shrink-0"
                      title="View Source"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-[10px] text-slate-500 mb-1 leading-tight">{feature.properties.funder}</p>
                  <p className="text-[10px] text-slate-700 mb-1.5 line-clamp-3 leading-snug">{feature.properties.description}</p>
                  
                  <div className="flex flex-wrap items-center justify-between gap-1 mt-auto pt-1 border-t border-slate-100">
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-[9px] rounded-sm uppercase font-bold">
                      {feature.properties.status}
                    </span>
                    {(feature.properties.start_date || feature.properties.end_date) && (
                      <div className="text-[8px] text-slate-400 flex flex-col items-end">
                        {feature.properties.start_date && <span>S: {feature.properties.start_date}</span>}
                        {feature.properties.end_date && <span>E: {feature.properties.end_date}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        )}
      </div>
    </div>
  );
}
