import { Settings, Sun, Moon, PanelRightClose, PanelRightOpen, HelpCircle, FileText, BookOpen } from "lucide-react";
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
}: SettingsSidebarProps) {
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
        <div className={`w-80 shrink-0 border-l flex flex-col z-10 shadow-2xl ${sidebarCls}`}>
          <div className={`p-4 border-b flex items-center justify-between ${isDark ? "border-slate-800" : "border-slate-200"}`}>
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

          <div className={`p-4 flex-1 overflow-y-auto ${textCls}`}>
            <section className="mb-4">
              <h3 className={`text-xs font-bold uppercase tracking-wider ${mutedCls} mb-2`} title={helpMode ? t.downloadManualHelp : undefined}>{t.downloadManual}</h3>
              <div className="flex gap-2">
                <a href="/docs/Blue-Intelligence-MANUAL_EN.md" download="Blue-Intelligence-MANUAL_EN.md" className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs ${cardCls} hover:border-blue-500/50 transition-colors`} title={helpMode ? t.downloadManualHelp : undefined}>
                  <BookOpen className="w-3.5 h-3.5" /> EN
                </a>
                <a href="/docs/Blue-Intelligence-MANUAL_FR.md" download="Blue-Intelligence-MANUAL_FR.md" className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs ${cardCls} hover:border-blue-500/50 transition-colors`} title={helpMode ? t.downloadManualHelp : undefined}>
                  <BookOpen className="w-3.5 h-3.5" /> FR
                </a>
              </div>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${mutedCls} mb-2 mt-4`} title={helpMode ? t.downloadReadmeHelp : undefined}>{t.downloadReadme}</h3>
              <div className="flex gap-2">
                <a href="/docs/Blue-Intelligence-README_EN.md" download="Blue-Intelligence-README_EN.md" className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs ${cardCls} hover:border-blue-500/50 transition-colors`} title={helpMode ? t.downloadReadmeHelp : undefined}>
                  <FileText className="w-3.5 h-3.5" /> EN
                </a>
                <a href="/docs/Blue-Intelligence-README_FR.md" download="Blue-Intelligence-README_FR.md" className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs ${cardCls} hover:border-blue-500/50 transition-colors`} title={helpMode ? t.downloadReadmeHelp : undefined}>
                  <FileText className="w-3.5 h-3.5" /> FR
                </a>
              </div>
            </section>
            <section className="mb-6" title={helpMode ? t.marineFilterHelp : undefined}>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${mutedCls} mb-3`}>
                {t.marineFilter}
              </h3>
              <div className={`space-y-3 border rounded-lg p-3 ${cardCls}`}>
                <div title={helpMode ? t.coastDistanceHelp : undefined}>
                  <label className={`block text-xs ${mutedCls} mb-1`}>
                    {t.coastDistance}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    step={10}
                    value={config.gatekeeper.coast_distance_km}
                    onChange={(e) =>
                      onUpdateGatekeeper({ coast_distance_km: Math.max(0, parseFloat(e.target.value) || 0) })
                    }
                    className={`w-full border rounded px-2 py-1.5 text-sm ${inputCls}`}
                  />
                  <p className={`text-[10px] ${mutedCls} mt-0.5`}>{t.coastDistanceHelp}</p>
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
                    className={`w-full border rounded px-2 py-1.5 text-sm ${inputCls}`}
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
                    className={`w-full border rounded px-2 py-1.5 text-sm ${inputCls}`}
                  />
                </div>
              </div>
            </section>

            <section className="mb-6" title={helpMode ? t.extractionHelp : undefined}>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${mutedCls} mb-3`}>
                {t.extraction}
              </h3>
              <div className={`space-y-3 border rounded-lg p-3 ${cardCls}`}>
                <div title={helpMode ? t.maxConcurrentAgentsHelp : undefined}>
                  <label className={`block text-xs ${mutedCls} mb-1`}>{t.maxConcurrentAgents}</label>
                  <input
                    type="number"
                    min={1}
                    max={2}
                    value={Math.min(2, config.agent.maxConcurrentAgents)}
                    onChange={(e) =>
                      onUpdateAgent({
                        maxConcurrentAgents: Math.max(1, Math.min(2, parseInt(e.target.value, 10) || 1)),
                      })
                    }
                    className={`w-full border rounded px-2 py-1.5 text-sm ${inputCls}`}
                  />
                  <p className={`text-[10px] ${mutedCls} mt-0.5`}>{t.maxConcurrentAgentsHelp}</p>
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
                    className={`w-full border rounded px-2 py-1.5 text-sm ${inputCls}`}
                  />
                  <p className={`text-[10px] ${mutedCls} mt-0.5`}>{t.concurrencyHelp}</p>
                </div>
                <div title={helpMode ? t.gatekeeperModelHelp : undefined}>
                  <label className={`block text-xs ${mutedCls} mb-1`}>{t.gatekeeperModel}</label>
                  <select
                    value={config.extraction.claudeGatekeeperModel}
                    onChange={(e) => onUpdateExtraction({ claudeGatekeeperModel: e.target.value })}
                    className={`w-full border rounded px-2 py-1.5 text-sm font-mono ${inputCls}`}
                  >
                    {!CLAUDE_MODELS.find(m => m.id === config.extraction.claudeGatekeeperModel) && (
                      <option value={config.extraction.claudeGatekeeperModel}>{config.extraction.claudeGatekeeperModel}</option>
                    )}
                    {CLAUDE_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div title={helpMode ? t.extractModelHelp : undefined}>
                  <label className={`block text-xs ${mutedCls} mb-1`}>{t.extractModel}</label>
                  <select
                    value={config.extraction.claudeExtractModel}
                    onChange={(e) => onUpdateExtraction({ claudeExtractModel: e.target.value })}
                    className={`w-full border rounded px-2 py-1.5 text-sm font-mono ${inputCls}`}
                  >
                    {!CLAUDE_MODELS.find(m => m.id === config.extraction.claudeExtractModel) && (
                      <option value={config.extraction.claudeExtractModel}>{config.extraction.claudeExtractModel}</option>
                    )}
                    {CLAUDE_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="mb-6" title={helpMode ? t.mapHelp : undefined}>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${mutedCls} mb-3`}>{t.map}</h3>
              <div className={`space-y-2 border rounded-lg p-3 ${cardCls}`} title={helpMode ? t.maxMarkersHelp : undefined}>
                <div>
                  <label className={`block text-xs ${mutedCls} mb-1`}>{t.minZoom}</label>
                  <span className={`text-sm ${textCls}`}>{config.map.minZoom}</span>
                </div>
                <div>
                  <label className={`block text-xs ${mutedCls} mb-1`}>{t.maxMarkers}</label>
                  <span className={`text-sm ${textCls}`}>
                    {config.map.zoomLimits[0].maxMarkers} / {config.map.zoomLimits[1].maxMarkers} /{" "}
                    {config.map.zoomLimits[2].maxMarkers}
                  </span>
                </div>
              </div>
            </section>

            <p className={`text-[10px] ${mutedCls} mt-4`} title={helpMode ? t.paramsStoredHelp : undefined}>{t.paramsStored}</p>
          </div>
        </div>
      )}
    </>
  );
}
