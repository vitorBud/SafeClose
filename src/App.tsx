import { useEffect, useRef, useState } from "react";
import { CompactPanel } from "./components/CompactPanel";
import { DevSimulator } from "./components/DevSimulator";
import { HoverPreview } from "./components/HoverPreview";
import { TopIndicator } from "./components/TopIndicator";
import { usePreferences } from "./hooks/usePreferences";
import { isCursorInsideCurrentWindow, resizeAndPosition, loadPlatformInfo } from "./platform/native";
import { useActivitySnapshot } from "./providers/ActivityContext";

type WindowMode = "collapsed" | "peek" | "open" | "simulator";

export default function App() {
  const snapshot = useActivitySnapshot();
  const { preferences } = usePreferences();
  const [mode, setMode] = useState<WindowMode>("collapsed");
  const [topOffset, setTopOffset] = useState(0);
  const modeRef = useRef<WindowMode>(mode);

  useEffect(() => {
    loadPlatformInfo().then((info) => setTopOffset(info.topOffset));
  }, []);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const dimensions = mode === "collapsed"
      ? { width: preferences.topbarWidth, height: 22 }
      : mode === "peek"
        ? { width: 330, height: 184 }
      : mode === "open"
        ? { width: 390, height: 414 }
        : { width: 440, height: 680 };
    const { width, height } = dimensions;
    void resizeAndPosition(width, height, topOffset);
  }, [mode, preferences.topbarWidth, topOffset]);

  useEffect(() => {
    let checking = false;
    let outsideSince: number | undefined;
    const interval = window.setInterval(async () => {
      if (checking || modeRef.current === "open" || modeRef.current === "simulator") return;
      checking = true;
      const inside = await isCursorInsideCurrentWindow();
      checking = false;

      if (inside) {
        outsideSince = undefined;
        if (modeRef.current === "collapsed") setMode("peek");
        return;
      }

      if (modeRef.current === "peek") {
        outsideSince ??= Date.now();
        if (Date.now() - outsideSince >= 260) setMode("collapsed");
      }
    }, 80);
    return () => window.clearInterval(interval);
  }, []);

  const toggleOpen = () => {
    setMode((current) => current === "open" ? "collapsed" : "open");
  };

  return (
    <div
      className="app-shell"
      data-mode={mode}
      data-state={snapshot.state}
      style={{ "--line-thickness": `${preferences.topbarThickness}px`, "--surface-opacity": preferences.transparency / 100 } as React.CSSProperties}
      data-animations={preferences.animations ? "on" : "off"}
      onPointerEnter={() => setMode((current) => current === "collapsed" ? "peek" : current)}
    >
      <div className="connected-surface">
        <TopIndicator state={snapshot.state} expanded={mode !== "collapsed"} onClick={toggleOpen} />
        {mode === "peek" && <HoverPreview snapshot={snapshot} onOpen={() => setMode("open")} />}
        {mode === "open" && (
          <CompactPanel
            snapshot={snapshot}
            onCollapse={() => setMode("collapsed")}
            onSimulator={() => setMode("simulator")}
          />
        )}
        {mode === "simulator" && <div className="simulator-shell"><button className="simulator-close" onClick={() => setMode("collapsed")}>×</button><DevSimulator /></div>}
      </div>
    </div>
  );
}
