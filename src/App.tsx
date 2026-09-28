import { useEffect, useState } from "react";
import { MainPanel } from "./components/MainPanel";
import { QuickPanel } from "./components/QuickPanel";
import { TopIndicator } from "./components/TopIndicator";
import { resizeAndPosition, loadPlatformInfo } from "./platform/native";
import { useActivitySnapshot } from "./providers/ActivityContext";

type WindowMode = "collapsed" | "peek" | "expanded";

const dimensions: Record<WindowMode, { width: number; height: number }> = {
  collapsed: { width: 420, height: 34 },
  peek: { width: 420, height: 254 },
  expanded: { width: 476, height: 680 },
};

export default function App() {
  const snapshot = useActivitySnapshot();
  const [mode, setMode] = useState<WindowMode>("collapsed");
  const [topOffset, setTopOffset] = useState(38);

  useEffect(() => {
    loadPlatformInfo().then((info) => setTopOffset(info.topOffset));
  }, []);

  useEffect(() => {
    const { width, height } = dimensions[mode];
    void resizeAndPosition(width, height, topOffset);
  }, [mode, topOffset]);

  return (
    <div
      className="app-shell"
      data-mode={mode}
      data-state={snapshot.state}
      onPointerEnter={() => setMode((current) => current === "collapsed" ? "peek" : current)}
      onPointerLeave={() => setMode((current) => current === "peek" ? "collapsed" : current)}
    >
      <TopIndicator state={snapshot.state} onClick={() => setMode("expanded")} />
      {mode === "peek" && <QuickPanel snapshot={snapshot} onOpen={() => setMode("expanded")} />}
      {mode === "expanded" && <MainPanel onClose={() => setMode("collapsed")} />}
    </div>
  );
}

