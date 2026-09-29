import { useCallback, useEffect, useRef, useState } from "react";
import { CompactPanel } from "./components/CompactPanel";
import { DevSimulator } from "./components/DevSimulator";
import { HoverPreview } from "./components/HoverPreview";
import { TopIndicator } from "./components/TopIndicator";
import { usePreferences } from "./hooks/usePreferences";
import { isCursorInsideCurrentWindow, resizeAndPosition, loadPlatformInfo } from "./platform/native";
import { useActivitySnapshot } from "./providers/ActivityContext";

type WindowMode = "collapsed" | "peek" | "open" | "simulator" | "closing-peek" | "closing-open" | "closing-simulator";

export default function App() {
  const snapshot = useActivitySnapshot();
  const { preferences } = usePreferences();
  const [mode, setMode] = useState<WindowMode>("collapsed");
  const [topOffset, setTopOffset] = useState(0);
  const modeRef = useRef<WindowMode>(mode);
  const closeTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    loadPlatformInfo().then((info) => setTopOffset(info.topOffset));
  }, []);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => () => window.clearTimeout(closeTimerRef.current), []);

  const showMode = useCallback((nextMode: WindowMode) => {
    window.clearTimeout(closeTimerRef.current);
    modeRef.current = nextMode;
    setMode(nextMode);
  }, []);

  const closeSmoothly = useCallback((current: "peek" | "open" | "simulator") => {
    const closingMode = `closing-${current}` as WindowMode;
    window.clearTimeout(closeTimerRef.current);
    modeRef.current = closingMode;
    setMode(closingMode);
    closeTimerRef.current = window.setTimeout(() => {
      modeRef.current = "collapsed";
      setMode("collapsed");
    }, preferences.animations ? 440 : 0);
  }, [preferences.animations]);

  useEffect(() => {
    const dimensions = mode === "collapsed"
      ? { width: preferences.topbarWidth, height: 22 }
      : mode === "peek" || mode === "closing-peek"
        ? { width: 330, height: 184 }
      : mode === "open" || mode === "closing-open"
        ? { width: 390, height: 414 }
        : { width: 440, height: 680 };
    const { width, height } = dimensions;
    void resizeAndPosition(width, height, topOffset);
  }, [mode, preferences.topbarWidth, topOffset]);

  useEffect(() => {
    let checking = false;
    let outsideSince: number | undefined;
    const interval = window.setInterval(async () => {
      if (checking || modeRef.current === "open" || modeRef.current === "simulator" || modeRef.current === "closing-open" || modeRef.current === "closing-simulator") return;
      checking = true;
      const inside = await isCursorInsideCurrentWindow();
      checking = false;

      if (inside) {
        outsideSince = undefined;
        if (modeRef.current === "collapsed" || modeRef.current === "closing-peek") showMode("peek");
        return;
      }

      if (modeRef.current === "peek") {
        outsideSince ??= Date.now();
        if (Date.now() - outsideSince >= 140) closeSmoothly("peek");
      }
    }, 80);
    return () => window.clearInterval(interval);
  }, [closeSmoothly, showMode]);

  const toggleOpen = () => {
    if (modeRef.current === "open") closeSmoothly("open");
    else showMode("open");
  };

  const visibleMode = mode.startsWith("closing-") ? mode.slice(8) : mode;
  const lineWidth = mode.startsWith("closing-") || visibleMode === "collapsed"
    ? Math.max(80, preferences.topbarWidth - 20)
    : visibleMode === "peek"
      ? 302
      : visibleMode === "open"
        ? 362
        : 412;

  return (
    <div
      className="app-shell"
      data-mode={mode}
      data-state={snapshot.state}
      style={{ "--line-thickness": `${preferences.topbarThickness}px`, "--surface-opacity": preferences.transparency / 100, "--bar-line-width": `${lineWidth}px` } as React.CSSProperties}
      data-animations={preferences.animations ? "on" : "off"}
      onPointerEnter={() => {
        if (modeRef.current === "collapsed" || modeRef.current === "closing-peek") showMode("peek");
      }}
    >
      <div className="connected-surface">
        <TopIndicator state={snapshot.state} expanded={mode !== "collapsed"} onClick={toggleOpen} />
        {(mode === "peek" || mode === "closing-peek") && <HoverPreview snapshot={snapshot} onOpen={() => showMode("open")} />}
        {(mode === "open" || mode === "closing-open") && (
          <CompactPanel
            snapshot={snapshot}
            onCollapse={() => closeSmoothly("open")}
            onSimulator={() => showMode("simulator")}
          />
        )}
        {(mode === "simulator" || mode === "closing-simulator") && <div className="simulator-shell"><button className="simulator-close" onClick={() => closeSmoothly("simulator")}>×</button><DevSimulator /></div>}
      </div>
    </div>
  );
}
