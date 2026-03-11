import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Activity, Globe, Shield, Waves, Play, Loader2, Filter, Download } from "lucide-react";
import L from "leaflet";

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const TARGET_PORTALS = [
  { name: "David and Lucile Packard Foundation", url: "https://www.packard.org/" },
  { name: "Nippon Foundation", url: "https://www.nippon-foundation.or.jp/" },
  { name: "Gordon and Betty Moore Foundation", url: "https://www.moore.org/" },
  { name: "Walton Family Foundation", url: "https://www.waltonfamilyfoundation.org/" },
  { name: "Oak Foundation", url: "https://oakfnd.org/" },
  { name: "Bloomberg Philanthropies", url: "https://www.bloomberg.org/" },
  { name: "Waitt Foundation", url: "https://www.waittfoundation.org/" },
  { name: "National Fish and Wildlife Foundation (NFWF)", url: "https://www.nfwf.org/" },
  { name: "International Coral Reef Initiative (ICRI)", url: "https://icriforum.org/" },
  { name: "Mohamed bin Zayed Species Conservation Fund", url: "https://www.speciesconservation.org/" },
  { name: "Oceana", url: "https://oceana.org/" },
  { name: "Fondation CMA CGM", url: "https://www.cmacgm-group.com/en/foundation" },
  { name: "Paul M. Angell Family Foundation", url: "https://pmaff.org/" },
  { name: "Blue Action Fund", url: "https://www.blueactionfund.org/" },
  { name: "Global Fund for Coral Reefs", url: "https://globalfundcoralreefs.org/" },
  { name: "Fondation de la Mer", url: "https://www.fondationdelamer.org/" },
  { name: "Fondation de France", url: "https://www.fondationdefrance.org/" },
  { name: "Pure Ocean", url: "https://www.pure-ocean.org/" },
  { name: "The Ocean Foundation", url: "https://oceanfdn.org/" },
  { name: "The MedFund", url: "https://themedfund.org/" },
  { name: "Oceans 5", url: "https://www.oceans5.org/" },
  { name: "Fondation Prince Albert II de Monaco", url: "https://www.fpa2.org/" },
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
];

export default function App() {
  const [projects, setProjects] = useState<any>({ type: "FeatureCollection", features: [] });
  const [loading, setLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const [selectedFunderFilter, setSelectedFunderFilter] = useState<string>("All");
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [targetMode, setTargetMode] = useState<string>("test");

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(data);
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

  useEffect(() => {
    fetchProjects();
    fetchTelemetry();
  }, []);

  const deploySwarm = async (engine: 'tinyfish' | 'gemini') => {
    setLoading(true);
    
    const targets = targetMode === "test" ? [TARGET_PORTALS[0]] : TARGET_PORTALS;
    
    setAgentStatus(`Swarm deployed (${engine}). Dispatching agents to ${targets.length} foundation(s)...`);
    
    // Dispatch agents
    for (let i = 0; i < targets.length; i++) {
      const portal = targets[i];
      try {
        await fetch("/api/agent/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUrl: portal.url, engine }),
        });
      } catch (error) {
        console.error(`Failed to dispatch agent for ${portal.name}`, error);
      }
    }
    
    setAgentStatus(`All agents dispatched (${engine}). Monitoring swarm telemetry...`);

    // Poll for completion
    const pollInterval = setInterval(async () => {
      try {
        await fetchProjects();
        await fetchTelemetry();
        const res = await fetch("/api/agent/status");
        const data = await res.json();
        
        if (data.activeAgents === 0 && data.queuedAgents === 0) {
          clearInterval(pollInterval);
          setAgentStatus(`Swarm mission complete (${engine}). All targets processed.`);
          setLoading(false);
        } else {
          setAgentStatus(`Swarm active (${engine}). ${data.activeAgents} agents extracting data, ${data.queuedAgents} targets queued...`);
        }
      } catch (error) {
        console.error("Failed to fetch swarm status", error);
      }
    }, 5000);
  };

  // Extract unique funders for the filter dropdown
  const uniqueFunders = Array.from(new Set(projects.features.map((f: any) => f.properties.funder).filter(Boolean))) as string[];
  
  const filteredFeatures = selectedFunderFilter === "All" 
    ? projects.features 
    : projects.features.filter((f: any) => f.properties.funder === selectedFunderFilter);

  const exportGeoJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ type: "FeatureCollection", features: filteredFeatures }));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "blue_intelligence_projects.geojson");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-96 bg-slate-900 border-r border-slate-800 flex flex-col z-10 shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Waves className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Blue Intelligence</h1>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Maritime OSINT Swarm</p>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4" /> Target Acquisition
            </h2>

            <div className="flex flex-col gap-2">
              <select 
                value={targetMode}
                onChange={(e) => setTargetMode(e.target.value)}
                disabled={loading}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-2 disabled:opacity-50"
              >
                <option value="test">Test Mode (1 Foundation)</option>
                <option value="full">Full Swarm (32 Foundations)</option>
              </select>

              <button 
                onClick={() => deploySwarm('tinyfish')}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {loading ? "Swarm Active..." : "Deploy Swarm (TinyFish)"}
              </button>
              
              <button 
                onClick={() => deploySwarm('gemini')}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {loading ? "Swarm Active..." : "Compare with Gemini"}
              </button>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Swarm Telemetry
            </h2>
            <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 font-mono text-xs text-slate-300 min-h-[100px] mb-2">
              {agentStatus || "Awaiting deployment orders..."}
            </div>
            {telemetry.length > 0 && (
              <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-[10px] text-slate-300">
                    <thead className="bg-slate-900 sticky top-0">
                      <tr>
                        <th className="p-2">Engine</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Time</th>
                        <th className="p-2">Found</th>
                      </tr>
                    </thead>
                    <tbody>
                      {telemetry.map((t, i) => (
                        <tr key={i} className="border-t border-slate-800/50">
                          <td className="p-2 font-semibold" style={{ color: t.engine === 'gemini' ? '#a855f7' : '#3b82f6' }}>
                            {t.engine.toUpperCase()}
                          </td>
                          <td className="p-2">
                            <span className={t.status === 'SUCCESS' ? 'text-green-400' : 'text-red-400'}>
                              {t.status}
                            </span>
                          </td>
                          <td className="p-2">{(t.duration_ms / 1000).toFixed(1)}s</td>
                          <td className="p-2">{t.projects_found}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Intelligence Database
            </h2>
            
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><Filter className="w-3 h-3"/> Filter by Foundation</label>
              <select 
                value={selectedFunderFilter}
                onChange={(e) => setSelectedFunderFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="All">All Foundations</option>
                {uniqueFunders.map(funder => (
                  <option key={funder} value={funder}>{funder}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-sm text-slate-400">Filtered Projects</span>
                <span className="text-lg font-mono font-bold text-blue-400">{filteredFeatures.length}</span>
              </div>
              
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto pr-2">
                {filteredFeatures.map((f: any) => (
                  <div key={f.properties.id} className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg hover:border-blue-500/50 transition-colors">
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
        
        {/* Export Button at the bottom of sidebar */}
        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <button 
            onClick={exportGeoJSON}
            disabled={filteredFeatures.length === 0}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700"
          >
            <Download className="w-4 h-4" />
            Export GeoJSON
          </button>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
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
          {filteredFeatures.map((feature: any) => (
            <Marker 
              key={feature.properties.id} 
              position={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]}
            >
              <Popup className="custom-popup">
                <div className="p-1 w-48">
                  {feature.properties.image_url && (
                    <img 
                      src={feature.properties.image_url} 
                      alt={feature.properties.title} 
                      className="w-full h-28 object-cover rounded-md mb-2"
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <h3 className="font-bold text-sm mb-1">{feature.properties.title}</h3>
                  <p className="text-xs text-gray-400 mb-2">{feature.properties.funder}</p>
                  <p className="text-xs mb-2">{feature.properties.description}</p>
                  {(feature.properties.start_date || feature.properties.end_date) && (
                    <div className="text-[10px] text-gray-500 mb-2 flex flex-col gap-0.5">
                      {feature.properties.start_date && <span><strong>Start:</strong> {feature.properties.start_date}</span>}
                      {feature.properties.end_date && <span><strong>End:</strong> {feature.properties.end_date}</span>}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-[10px] rounded-full uppercase font-semibold">
                      {feature.properties.status}
                    </span>
                  </div>
                  <a href={feature.properties.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline mt-2 block">
                    View Source
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
