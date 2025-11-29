import React, { useMemo, useState } from "react";
import SettingsDrawer from "./components/SettingsDrawer";
import Maze2DView from "./components/Maze2DView";
import { generateMaze, generateMaze3D, printMaze } from "./components/utils";
import Maze3DView from "./components/Maze3DView";

export type Algorithm = "bfs" | "dfs" | "astar" | "dijkstra" | "greedy";

export interface MazeSettings {
  mazeWidth: number;
  mazeHeight: number;
  wallDensity: number;
  algorithm: Algorithm;
  animationSpeed: number;
  mazeLevels: number;
  viewType: "2D" | "3D";
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
    mazeLevels: 3,
    viewType: "2D",
  });

  const [isRunning, setIsRunning] = useState(false);
  const [shouldReset, setShouldReset] = useState(false);
  const [stats, setStats] = useState<MazeStats | null>(null);

  const handleRun = () => {
    setShouldReset(false);
    setIsRunning(true);
  };

  const handleReset = () => {
    setShouldReset(true);
    setIsRunning(false);
  };

  const maze = useMemo(() => {
    const m = generateMaze({
      width: settings.mazeWidth,
      height: settings.mazeHeight,
      wallDensity: settings.wallDensity,
    });
    printMaze(m);
    return m;
  }, [settings.mazeWidth, settings.mazeHeight, settings.wallDensity]);

  // Use generateMaze3D when in 3D view, otherwise use generateMaze (already set as 'maze')
  const maze3D = useMemo(() => {
    if (settings.viewType === "3D") {
      // Use 3 layers for demo; can expose as a setting if desired
      return generateMaze3D(
        settings.mazeLevels,
        settings.mazeWidth,
        settings.mazeHeight
      );
    }
    return [];
  }, [
    settings.mazeWidth,
    settings.mazeHeight,
    settings.wallDensity,
    settings.viewType,
  ]);

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
      {settings.viewType === "2D" ? (
        <Maze2DView
          maze={maze}
          settings={settings}
          isRunning={isRunning}
          setIsRunning={setIsRunning}
          stats={stats}
          setStats={setStats}
          shouldReset={shouldReset}
          setShouldReset={setShouldReset}
        />
      ) : (
        <Maze3DView
          maze3D={maze3D}
          settings={settings}
          isRunning={isRunning}
          setIsRunning={setIsRunning}
          stats={stats}
          setStats={setStats}
          shouldReset={shouldReset}
          setShouldReset={setShouldReset}
        />
      )}
    </>
  );
}

export default App;
