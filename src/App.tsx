import React, { useState } from "react";
import SettingsDrawer from "./components/SettingsDrawer";
import Maze2DView from "./components/Maze2DView";

export type Algorithm = "bfs" | "dfs" | "astar" | "dijkstra" | "greedy";

export interface MazeSettings {
  mazeWidth: number;
  mazeHeight: number;
  wallDensity: number;
  algorithm: Algorithm;
  animationSpeed: number;
}

export interface MazeStats {
  pathLength: number;
  nodesVisited: number;
  success: boolean;
}

function App() {
  const [settings, setSettings] = useState<MazeSettings>({
    mazeWidth: 21,
    mazeHeight: 21,
    wallDensity: 0.7,
    algorithm: "astar",
    animationSpeed: 50,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<MazeStats | null>(null);
  const [runTrigger, setRunTrigger] = useState(0);
  const [resetTrigger, setResetTrigger] = useState(0);

  // Trigger a run
  const handleRun = () => {
    if (!isRunning) {
      setRunTrigger((prev) => prev + 1);
    }
  };

  // Trigger a reset and stop running algorithm
  const handleReset = () => {
    setResetTrigger((prev) => prev + 1);
    setIsRunning(false);
    setStats(null);
  };

  return (
    <>
      <SettingsDrawer
        settings={settings}
        setSettings={setSettings}
        isRunning={isRunning}
        stats={stats}
        onRun={handleRun}
        onReset={handleReset}
      />
      <Maze2DView
        settings={settings}
        isRunning={isRunning}
        setIsRunning={setIsRunning}
        stats={stats}
        setStats={setStats}
        runTrigger={runTrigger}
        resetTrigger={resetTrigger}
      />
    </>
  );
}

export default App;
