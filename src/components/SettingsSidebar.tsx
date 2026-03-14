import { useState } from "react";
import { Settings, Sun, Moon, PanelRightClose, PanelRightOpen, HelpCircle, FileText, BookOpen, Download, Trash2 } from "lucide-react";
import type { Config } from "../config/defaults";
import { useI18n } from "../i18n/useI18n";
import type { Theme } from "../theme";

const CLAUDE_MODELS = [
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (rapide)" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
  { id: "claude-opus-4-6", label: "Claude Opus 4.6" },
  { id: "claude-opus-4-5-20251101", label: "Claude Opus 4.5" },
  { id: "claude-opus-4-1-20250805", label: "Claude Opus 4.1" },
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { id: "claude-opus-4-20250514", label: "Claude Opus 4" },
];

interface SettingsSidebarProps {
  config: Config;
  onUpdateGatekeeper: (updates: Partial<Config["gatekeeper"]>) => void;
  onUpdateExtraction: (updates: Partial<Config["extraction"]>) => void;
  onUpdateAgent: (updates: Partial<Config["agent"]>) => void;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
  open: boolean;
  onToggle: () => void;
  /** Verrouille les paramètres ETL (GSHHG, extraction, agents) quand le swarm tourne */
  paramsLocked?: boolean;
  /** Export des projets filtrés en GeoJSON */
  onExportGeoJSON?: () => void;
  exportGeoJSONDisabled?: boolean;
  /** Effacer tous les projets de la base */
  onClearAllProjects?: () => void | Promise<void>;
  clearAllProjectsDisabled?: boolean;
  projectsCount?: number;
  targetMode?: "test" | "full";
  onTargetModeChange?: (v: "test" | "full") => void;
  selectedProxy?: string;
  onSelectedProxyChange?: (v: string) => void;
  loading?: boolean;
  seedsLength?: number;
  proxyLocations?: { code: string; name: string }[];
}

export function SettingsSidebar({
  config,
  onUpdateGatekeeper,
  onUpdateExtraction,
  onUpdateAgent,
  theme,
  onThemeChange,
  open,
  onToggle,
  paramsLocked = false,
  onExportGeoJSON,
  exportGeoJSONDisabled = true,
  onClearAllProjects,
  clearAllProjectsDisabled = true,
  projectsCount = 0,
  targetMode = "test",
  onTargetModeChange,
  selectedProxy = "",
  onSelectedProxyChange,
  loading = false,
  seedsLength = 0,
  proxyLocations = [],
}: SettingsSidebarProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const isDark = theme === "dark";
  const { t, lang, setLang, helpMode, setHelpMode } = useI18n();
  const btnCls = isDark
    ? "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
    : "bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800";
  const sidebarCls = isDark ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200";
  const textCls = isDark ? "text-slate-200" : "text-slate-800";
  const mutedCls = isDark ? "text-slate-400" : "text-slate-500";
  const inputCls = isDark ? "bg-slate-950 border-slate-800 text-slate-200" : "bg-white border-slate-200 text-slate-800";
  const cardCls = isDark ? "bg-slate-950/50 border-slate-800" : "bg-white/80 border-slate-200";

  return (
    <>
      {!open && (
        <button
          onClick={onToggle}
          className={`fixed top-4 right-4 z-[1000] p-2 rounded-lg border transition-colors shadow-lg ${btnCls}`}
          title={helpMode ? t.openSettingsHelp : t.openSettings}
        >
          <PanelRightOpen className="w-5 h-5" />
        </button>
      )}
      {open && (
        <div className={`w-80 shrink-0 border-l flex flex-col h-full min-h-0 z-10 shadow-2xl overflow-hidden ${sidebarCls}`}>
          <div className={`p-3 border-b flex items-center justify-between shrink-0 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
            <div className="flex items-center gap-2">
              <Settings className={`w-5 h-5 ${mutedCls}`} />
              <h2 className={`font-bold ${textCls}`}>{t.settings}</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setHelpMode(!helpMode)}
                className={`p-2 rounded-lg transition-colors ${helpMode ? "bg-blue-500/20 text-blue-500" : mutedCls} ${isDark ? "hover:text-slate-200" : "hover:text-slate-800"}`}
                title={helpMode ? t.helpHelp : t.help}
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              <div className="flex rounded-lg overflow-hidden border border-current opacity-70">
                <button
                  onClick={() => setLang("en")}
                  className={`px-2 py-1 text-[10px] font-bold ${lang === "en" ? "bg-blue-500/30 text-blue-600" : mutedCls}`}
                  title={helpMode ? t.langToggleHelp : "English"}
                >
                  EN
                </button>
                <button
                  onClick={() => setLang("fr")}
                  className={`px-2 py-1 text-[10px] font-bold ${lang === "fr" ? "bg-blue-500/30 text-blue-600" : mutedCls}`}
                  title={helpMode ? t.langToggleHelp : "Français"}
                >
                  FR
                </button>
              </div>
              <button
                onClick={() => onThemeChange(isDark ? "light" : "dark")}
                className={`p-2 rounded-lg transition-colors ${mutedCls} ${isDark ? "hover:text-slate-200" : "hover:text-slate-800"}`}
                title={helpMode ? t.themeHelp : (isDark ? t.lightMode : t.darkMode)}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={onToggle}
                className={`p-2 rounded-lg ${mutedCls} ${isDark ? "hover:text-slate-200" : "hover:text-slate-800"}`}
                title={helpMode ? t.closeSettingsHelp : t.closeSettings}
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className={`p-3 flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden ${textCls}`}>
            <div className="min-h-full flex flex-col shrink-0">
            {onTargetModeChange && onSelectedProxyChange && proxyLocations.length > 0 && (
              <section className="mb-4 shrink-0">
                <div className={`space-y-2 border rounded-lg p-3 ${cardCls}`}>
                  <div title={helpMode ? t.targetModeHelp : undefined}>
                    <label className={`block text-xs ${mutedCls} mb-1`}>{t.targetMode}</label>
                    <select
                      value={targetMode}
                      onChange={(e) => onTargetModeChange(e.target.value as "test" | "full")}
                      disabled={loading}
                      className={`w-full border rounded px-2 py-1.5 text-sm ${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <option value="test">Test ({Math.min(10, Math.max(1, config.agent.maxConcurrentAgents ?? 2))})</option>
                      <option value="full">{t.fullMode} ({seedsLength})</option>
                    </select>
                  </div>
                  <div title={helpMode ? t.proxyHelp : undefined}>
                    <label className={`block text-xs ${mutedCls} mb-1`}>{t.proxy}</label>
                    <select
                      value={selectedProxy}
                      onChange={(e) => onSelectedProxyChange(e.target.value)}
                      disabled={loading}
                      className={`w-full border rounded px-2 py-1.5 text-sm ${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {proxyLocations.map((p, idx) => (
                        <option key={p.code} value={p.code}>{idx === 0 ? t.noProxy : p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>
            )}
            {paramsLocked && (
              <div className={`mb-3 p-3 rounded-lg border text-xs shrink-0 ${isDark ? "bg-amber-500/10 border-amber-500/30 text-amber-600" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
                {t.paramsLockedHelp}
              </div>
            )}
            <section className="mb-4 shrink-0">
              <div className="flex flex-col gap-2">
                <a href={lang === "fr" ? "/docs/Blue-Intelligence-MANUAL_FR.md" : "/docs/Blue-Intelligence-MANUAL_EN.md"} download={lang === "fr" ? "Blue-Intelligence-MANUAL_FR.md" : "Blue-Intelligence-MANUAL_EN.md"} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${cardCls} hover:border-blue-500/50 transition-colors`} title={helpMode ? t.downloadManualHelp : undefined}>
                  <BookOpen className="w-3.5 h-3.5" /> {t.manual}
                </a>
                <a href={lang === "fr" ? "/docs/Blue-Intelligence-README_FR.md" : "/docs/Blue-Intelligence-README_EN.md"} download={lang === "fr" ? "Blue-Intelligence-README_FR.md" : "Blue-Intelligence-README_EN.md"} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${cardCls} hover:border-blue-500/50 transition-colors`} title={helpMode ? t.downloadReadmeHelp : undefined}>
                  <FileText className="w-3.5 h-3.5" /> {t.readme}
                </a>
                {onExportGeoJSON && (
                  <button type="button" onClick={onExportGeoJSON} disabled={exportGeoJSONDisabled} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs w-full text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${cardCls} hover:border-blue-500/50`} title={helpMode ? t.exportGeoJSONHelp : undefined}>
                    <Download className="w-3.5 h-3.5" /> {t.geojson}
                  </button>
                )}
              </div>
            </section>
            <section className="mb-4 shrink-0" title={helpMode ? t.marineFilterHelp : undefined}>
              <div className={`space-y-2 border rounded-lg p-3 ${cardCls}`}>
                <div title={helpMode ? t.coastDistanceHelp : undefined}>
                  <label className={`block text-xs ${mutedCls} mb-1`}>{t.coastDistance}</label>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    step={10}
                    value={config.gatekeeper.coast_distance_km}
                    onChange={(e) =>
                      onUpdateGatekeeper({ coast_distance_km: Math.max(0, parseFloat(e.target.value) || 0) })
                    }
                    disabled={paramsLocked}
                    className={`w-full border rounded px-2 py-1.5 text-sm ${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={paramsLocked ? t.paramsLockedHelp : undefined}
                  />
                </div>
                <div title={helpMode ? t.marineThresholdHelp : undefined}>
                  <label className={`block text-xs ${mutedCls} mb-1`}>{t.marineThreshold}</label>
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.gatekeeper.marine_threshold}
                    onChange={(e) =>
                      onUpdateGatekeeper({ marine_threshold: Math.max(0, Math.min(1, parseFloat(e.target.value) || 0)) })
                    }
                    disabled={paramsLocked}
                    className={`w-full border rounded px-2 py-1.5 text-sm ${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={paramsLocked ? t.paramsLockedHelp : undefined}
                  />
                </div>
                <div title={helpMode ? t.inlandThresholdHelp : undefined}>
                  <label className={`block text-xs ${mutedCls} mb-1`}>{t.inlandThreshold}</label>
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.gatekeeper.inland_threshold}
                    onChange={(e) =>
                      onUpdateGatekeeper({ inland_threshold: Math.max(0, Math.min(1, parseFloat(e.target.value) || 0)) })
                    }
                    disabled={paramsLocked}
                    className={`w-full border rounded px-2 py-1.5 text-sm ${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={paramsLocked ? t.paramsLockedHelp : undefined}
                  />
                </div>
              </div>
            </section>

            <section className="mb-4 shrink-0" title={helpMode ? t.extractionHelp : undefined}>
              <div className={`space-y-2 border rounded-lg p-3 ${cardCls}`}>
                <div title={helpMode ? t.maxConcurrentAgentsHelp : undefined}>
                  <label className={`block text-xs ${mutedCls} mb-1`}>{t.maxConcurrentAgents}</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={Math.min(10, Math.max(1, config.agent.maxConcurrentAgents ?? 2))}
                    onChange={(e) =>
                      onUpdateAgent({
                        maxConcurrentAgents: Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 2)),
                      })
                    }
                    disabled={paramsLocked}
                    className={`w-full border rounded px-2 py-1.5 text-sm ${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={paramsLocked ? t.paramsLockedHelp : undefined}
                  />
                </div>
                <div title={helpMode ? t.concurrencyHelp : undefined}>
                  <label className={`block text-xs ${mutedCls} mb-1`}>{t.concurrency}</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={config.extraction.concurrency}
                    onChange={(e) =>
                      onUpdateExtraction({
                        concurrency: Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)),
                      })
                    }
                    disabled={paramsLocked}
                    className={`w-full border rounded px-2 py-1.5 text-sm ${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={paramsLocked ? t.paramsLockedHelp : undefined}
                  />
                </div>
                <div title={helpMode ? t.gatekeeperModelHelp : undefined}>
                  <label className={`block text-xs ${mutedCls} mb-1`}>{t.gatekeeperModel}</label>
                  <select
                    value={config.extraction.claudeGatekeeperModel}
                    onChange={(e) => onUpdateExtraction({ claudeGatekeeperModel: e.target.value })}
                    disabled={paramsLocked}
                    className={`w-full border rounded px-2 py-1.5 text-sm font-mono ${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={paramsLocked ? t.paramsLockedHelp : undefined}
                  >
                    {!CLAUDE_MODELS.find(m => m.id === config.extraction.claudeGatekeeperModel) && (
                      <option value={config.extraction.claudeGatekeeperModel}>{config.extraction.claudeGatekeeperModel}</option>
                    )}
                    {CLAUDE_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div title={helpMode ? t.extractionModelHelp : undefined}>
                  <label className={`block text-xs ${mutedCls} mb-1`}>{t.extractionModel}</label>
                  <select
                    value={config.extraction.claudeExtractModel}
                    onChange={(e) => onUpdateExtraction({ claudeExtractModel: e.target.value })}
                    disabled={paramsLocked}
                    className={`w-full border rounded px-2 py-1.5 text-sm font-mono ${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={paramsLocked ? t.paramsLockedHelp : undefined}
                  >
                    {!CLAUDE_MODELS.find(m => m.id === config.extraction.claudeExtractModel) && (
                      <option value={config.extraction.claudeExtractModel}>{config.extraction.claudeExtractModel}</option>
                    )}
                    {CLAUDE_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div title={helpMode ? t.scoringModelHelp : undefined}>
                  <label className={`block text-xs ${mutedCls} mb-1`}>{t.scoringModel}</label>
                  <select
                    value={config.extraction.claudeScoringModel ?? config.extraction.claudeExtractModel}
                    onChange={(e) => onUpdateExtraction({ claudeScoringModel: e.target.value })}
                    disabled={paramsLocked}
                    className={`w-full border rounded px-2 py-1.5 text-sm font-mono ${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={paramsLocked ? t.paramsLockedHelp : undefined}
                  >
                    {(() => {
                      const val = config.extraction.claudeScoringModel ?? config.extraction.claudeExtractModel;
                      return !CLAUDE_MODELS.find(m => m.id === val) && val ? (
                        <option value={val}>{val}</option>
                      ) : null;
                    })()}
                    {CLAUDE_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="mb-4 shrink-0" title={helpMode ? t.mapHelp : undefined}>
              <div className={`space-y-2 border rounded-lg p-3 ${cardCls}`} title={helpMode ? t.maxMarkersHelp : undefined}>
                <div>
                  <label className={`block text-xs ${mutedCls} mb-1`}>{t.minZoom}</label>
                  <span className={`text-sm ${textCls}`}>{config.map.minZoom}</span>
                </div>
                <div>
                  <label className={`block text-xs ${mutedCls} mb-1`}>{t.maxMarkers}</label>
                  <span className={`text-sm ${textCls}`}>
                    {config.map.zoomLimits[0].maxMarkers} / {config.map.zoomLimits[1].maxMarkers} / {config.map.zoomLimits[2].maxMarkers}
                  </span>
                </div>
              </div>
            </section>

            </div>

            {onClearAllProjects && (
              <div className={`mt-4 pt-4 border-t shrink-0 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                {!showClearConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    disabled={clearAllProjectsDisabled}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/30 ${isDark ? "text-red-400" : ""}`}
                    title={helpMode ? t.clearAllProjectsHelp : undefined}
                  >
                    <Trash2 className="w-4 h-4" />
                    {t.clearAllProjects}
                  </button>
                ) : (
                  <div className={`space-y-2 p-3 rounded-lg border ${isDark ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"}`}>
                    <p className={`text-xs ${isDark ? "text-red-200" : "text-red-800"}`}>
                      {(t.clearAllProjectsConfirm as string).replace("{n}", String(projectsCount))}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowClearConfirm(false)}
                        className={`flex-1 px-3 py-1.5 rounded text-xs font-medium ${isDark ? "bg-slate-700 hover:bg-slate-600 text-slate-200" : "bg-slate-200 hover:bg-slate-300 text-slate-800"}`}
                      >
                        {t.cancel}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await onClearAllProjects?.();
                          setShowClearConfirm(false);
                        }}
                        className="flex-1 px-3 py-1.5 rounded text-xs font-medium bg-red-600 hover:bg-red-500 text-white"
                      >
                        {t.confirmDelete}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
