import React, { useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings, Play, RotateCcw, Square, Cuboid } from "lucide-react";
import type { Algorithm, MazeSettings, MazeStats } from "@/App";

const algorithmNames: Record<Algorithm, string> = {
  bfs: "Breadth-First Search (BFS)",
  dfs: "Depth-First Search (DFS)",
  astar: "A* Search",
  dijkstra: "Dijkstra's Algorithm",
  greedy: "Greedy Best-First Search",
};

const algorithmDescriptions: Record<Algorithm, string> = {
  bfs: "Explores level by level. Guarantees shortest path.",
  dfs: "Explores deeply before backtracking. Fast but not optimal.",
  astar: "Uses heuristic for efficiency. Optimal and fast.",
  dijkstra: "Uniform cost search. Guarantees shortest path.",
  greedy: "Uses only heuristic. Fast but may not find optimal path.",
};

const viewTypeLabels: Record<MazeSettings["viewType"], string> = {
  "2d": "2D",
  "3d": "3D",
};

interface SettingsDrawerProps {
  settings: MazeSettings;
  setSettings: React.Dispatch<React.SetStateAction<MazeSettings>>;
  isRunning: boolean;
  stats: MazeStats | null;
  onRun: () => void;
  onReset: () => void;
}

export default function SettingsDrawer({
  settings,
  setSettings,
  isRunning,
  stats,
  onRun,
  onReset,
}: SettingsDrawerProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const updateSetting = <K extends keyof MazeSettings>(
    key: K,
    value: MazeSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <>
      {/* Control Panel */}
      <div className="absolute top-4 left-4 flex gap-2 z-10 items-center">
        {/* View Type Switch (2D/3D) OUTSIDE Drawer, next to settings button */}
        <div className="flex items-center gap-2 bg-[#232535] px-3 py-1 rounded-lg border border-white/10">
          <Label
            htmlFor="viewType"
            className="text-white flex items-center gap-1"
          >
            <Square className="w-4 h-4" />
            2D
          </Label>
          <Switch
            id="viewType"
            checked={settings.viewType === "3D"}
            onCheckedChange={(val: boolean) =>
              updateSetting("viewType", val ? "3D" : "2D")
            }
            disabled={isRunning}
            className="data-[state=checked]:bg-blue-600"
          />
          <Label
            htmlFor="viewType"
            className="text-white flex items-center gap-1"
          >
            <Cuboid className="w-4 h-4" />
            3D
          </Label>
        </div>
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button variant="default" size="lg" className="gap-2">
              <Settings className="w-5 h-5" />
              Settings
            </Button>
          </DrawerTrigger>
          <DrawerContent className="dark bg-[#191B23] text-white border border-white/15">
            <div className="mx-auto w-full max-w-2xl">
              <DrawerHeader>
                <DrawerTitle className="text-white">
                  Maze Search Settings
                </DrawerTitle>
                <DrawerDescription className="text-zinc-300">
                  Configure the maze and search algorithm parameters
                </DrawerDescription>
              </DrawerHeader>

              <div className="p-6 space-y-6">
                {/* Algorithm Selection */}
                <div className="space-y-2">
                  <Label htmlFor="algorithm" className="text-white">
                    Search Algorithm
                  </Label>
                  <Select
                    value={settings.algorithm}
                    onValueChange={(value) =>
                      updateSetting("algorithm", value as Algorithm)
                    }
                  >
                    <SelectTrigger
                      id="algorithm"
                      className="bg-[#232535] border border-white/10 text-white"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#232535] text-white border border-white/10">
                      {(Object.keys(algorithmNames) as Algorithm[]).map(
                        (alg) => (
                          <SelectItem
                            key={alg}
                            value={alg}
                            className="hover:bg-[#272846] focus:bg-[#272846]"
                          >
                            {algorithmNames[alg]}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-zinc-400">
                    {algorithmDescriptions[settings.algorithm]}
                  </p>
                </div>

                {/* Animation Speed */}
                <div className="space-y-2">
                  <Label htmlFor="speed" className="text-white">
                    Animation Speed: {settings.animationSpeed}
                  </Label>
                  <Slider
                    id="speed"
                    min={1}
                    max={150}
                    step={1}
                    value={[settings.animationSpeed]}
                    onValueChange={(vals) =>
                      updateSetting("animationSpeed", vals[0])
                    }
                    disabled={isRunning}
                    className="dark"
                    trackClassName="bg-zinc-700"
                    thumbClassName="bg-blue-500"
                  />
                  <p className="text-sm text-zinc-400">
                    Higher = faster visualization
                  </p>
                </div>

                {/* Maze Levels (3D only) */}
                {settings.viewType === "3D" && (
                  <div className="space-y-2">
                    <Label htmlFor="levels" className="text-white">
                      Maze Levels: {settings.mazeLevels}
                    </Label>
                    <Slider
                      id="levels"
                      min={2}
                      max={10}
                      step={1}
                      value={[settings.mazeLevels]}
                      onValueChange={(vals) =>
                        updateSetting("mazeLevels", vals[0])
                      }
                      disabled={isRunning}
                      className="dark"
                    />
                    <p className="text-sm text-zinc-400">
                      Only available in 3D Maze mode
                    </p>
                  </div>
                )}

                {/* Maze Width */}
                <div className="space-y-2">
                  <Label htmlFor="width" className="text-white">
                    Maze Width: {settings.mazeWidth}
                  </Label>
                  <Slider
                    id="width"
                    min={11}
                    max={41}
                    step={2}
                    value={[settings.mazeWidth]}
                    onValueChange={(vals) =>
                      updateSetting("mazeWidth", vals[0])
                    }
                    disabled={isRunning}
                    className="dark"
                    trackClassName="bg-zinc-700"
                    thumbClassName="bg-blue-500"
                  />
                </div>

                {/* Maze Height */}
                <div className="space-y-2">
                  <Label htmlFor="height" className="text-white">
                    Maze Height: {settings.mazeHeight}
                  </Label>
                  <Slider
                    id="height"
                    min={11}
                    max={41}
                    step={2}
                    value={[settings.mazeHeight]}
                    onValueChange={(vals) =>
                      updateSetting("mazeHeight", vals[0])
                    }
                    disabled={isRunning}
                    className="dark"
                    trackClassName="bg-zinc-700"
                    thumbClassName="bg-blue-500"
                  />
                </div>

                {/* Wall Density */}
                <div className="space-y-2">
                  <Label htmlFor="density" className="text-white">
                    Wall Density: {settings.wallDensity.toFixed(2)}
                  </Label>
                  <Slider
                    id="density"
                    min={0.3}
                    max={0.95}
                    step={0.05}
                    value={[settings.wallDensity]}
                    onValueChange={(vals) =>
                      updateSetting("wallDensity", vals[0])
                    }
                    disabled={isRunning}
                    className="dark"
                    trackClassName="bg-zinc-700"
                    thumbClassName="bg-blue-500"
                  />
                  <p className="text-sm text-zinc-400">
                    Higher = more walls (harder maze)
                  </p>
                </div>
              </div>

              <DrawerFooter>
                <DrawerClose asChild>
                  <Button
                    variant="outline"
                    className="text-white border-white/15 bg-[#24263b] hover:bg-[#292b43]"
                  >
                    Close
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>

        <Button
          onClick={onRun}
          disabled={isRunning}
          size="lg"
          className="gap-2"
        >
          <Play className="w-5 h-5" />
          Run {algorithmNames[settings.algorithm]}
        </Button>

        <Button
          onClick={onReset}
          disabled={!isRunning && !stats}
          variant="outline"
          size="lg"
          className="gap-2"
        >
          <RotateCcw className="w-5 h-5" />
          Reset
        </Button>
      </div>

      {/* Stats Display */}
      {stats && (
        <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm p-4 rounded-lg border border-white/20 text-white space-y-2 z-10">
          <h3 className="font-bold text-lg">Results</h3>
          <div className="space-y-1 text-sm">
            <p>
              Status:{" "}
              <span
                className={stats.success ? "text-green-400" : "text-red-400"}
              >
                {stats.success ? "Path Found ✓" : "No Path ✗"}
              </span>
            </p>
            {stats.success && (
              <p>
                Path Length:{" "}
                <span className="text-purple-400">{stats.pathLength}</span>
              </p>
            )}
            <p>
              Nodes Visited:{" "}
              <span className="text-blue-400">{stats.nodesVisited}</span>
            </p>
          </div>
          <div className="pt-2 border-t border-white/20 space-y-1 text-xs">
            <p>🔵 Blue = Visited</p>
            <p>🟡 Yellow = Frontier</p>
            <p>🟣 Magenta = Path</p>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isRunning && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20 text-white z-10">
          Running {algorithmNames[settings.algorithm]}...
        </div>
      )}
    </>
  );
}
