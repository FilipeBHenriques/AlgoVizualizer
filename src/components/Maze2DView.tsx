import React, { useRef, useMemo, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrthographicCamera, OrbitControls } from "@react-three/drei";
import SciFiSphere, { type SciFiSphereHandle } from "./SciFiSphere";
import MazeWalls from "./Wall";
import Cell from "./Cell";
import { generateMaze, printMaze, CELL_TYPES, COLORS } from "./utils";
import {
  breadthFirstSearch,
  depthFirstSearch,
  aStarSearch,
  dijkstraSearch,
  greedyBestFirstSearch,
} from "./utils";
import type { MazeSettings, MazeStats } from "@/App";
import BackgroundParticles from "./backgroundParticles";

interface Maze2DViewProps {
  maze: number[][];
  settings: MazeSettings;
  isRunning: boolean;
  setIsRunning: React.Dispatch<React.SetStateAction<boolean>>;
  stats: MazeStats | null;
  setStats: React.Dispatch<React.SetStateAction<MazeStats | null>>;
  shouldReset: boolean;
  setShouldReset: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Maze2DView({
  maze,
  settings,
  isRunning,
  setIsRunning,
  setStats,
  shouldReset,
  setShouldReset,
}: Maze2DViewProps) {
  const cellSize = 1;
  const sphereRefs = useRef<Map<string, SciFiSphereHandle>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  const paintNode = (x: number, y: number, color: number) => {
    const key = `${x}-${y}`;
    const sphere = sphereRefs.current.get(key);
    if (sphere) {
      sphere.paint(color);
    }
  };

  const { nodes, start, goal } = useMemo(() => {
    const n: [number, number][] = [];
    let s: [number, number] | null = null;
    let g: [number, number] | null = null;

    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[y].length; x++) {
        const cell = maze[y][x];
        if (cell === CELL_TYPES.NODE) n.push([x, y]);
        else if (cell === CELL_TYPES.START) {
          s = [x, y];
          n.push([x, y]);
        } else if (cell === CELL_TYPES.GOAL) {
          g = [x, y];
          n.push([x, y]);
        }
      }
    }

    return { nodes: n, start: s, goal: g };
  }, [maze]);

  const resetColors = () => {
    nodes.forEach(([x, y]) => {
      const key = `${x}-${y}`;
      const sphere = sphereRefs.current.get(key);
      const isStart = start && start[0] === x && start[1] === y;
      const isGoal = goal && goal[0] === x && goal[1] === y;
      if (sphere) {
        if (isStart) {
          sphere.paint(COLORS.START);
        } else if (isGoal) {
          sphere.paint(COLORS.GOAL);
        } else {
          sphere.paint(0);
        }
      }
    });
  };

  // Reset all colors when maze changes
  useEffect(() => {
    sphereRefs.current.forEach((sphere) => sphere.paint(0));
    sphereRefs.current.clear();

    // Wait a short moment to ensure all spheres mount
    const timer = setTimeout(() => {
      if (start) paintNode(start[0], start[1], COLORS.START);
      if (goal) paintNode(goal[0], goal[1], COLORS.GOAL);
      resetColors();
    }, 200);

    return () => clearTimeout(timer);
  }, [maze, start, goal]);

  const runAlgorithm = async () => {
    if (!start || !goal || !isRunning) return;

    setIsRunning(true);
    setShouldReset(false);
    setStats(null);
    resetColors();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const delay = 100 - settings.animationSpeed;

    try {
      let result;
      const signal = controller.signal;

      switch (settings.algorithm) {
        case "bfs":
          result = await breadthFirstSearch(
            maze,
            start,
            goal,
            paintNode,
            delay,
            signal
          );
          break;
        case "dfs":
          result = await depthFirstSearch(
            maze,
            start,
            goal,
            paintNode,
            delay,
            signal
          );
          break;
        case "astar":
          result = await aStarSearch(
            maze,
            start,
            goal,
            paintNode,
            delay,
            signal
          );
          break;
        case "dijkstra":
          result = await dijkstraSearch(
            maze,
            start,
            goal,
            paintNode,
            delay,
            signal
          );
          break;
        case "greedy":
          result = await greedyBestFirstSearch(
            maze,
            start,
            goal,
            paintNode,
            delay,
            signal
          );
          break;
      }

      setStats({
        pathLength: result.path.length,
        nodesVisited: result.visitedCount,
        success: result.success,
      });
    } catch (err) {
      if ((err as any).name !== "AbortError") {
        console.error("Algorithm error:", err);
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  const handleReset = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsRunning(false);
    setStats(null);
    resetColors();
  };

  useEffect(() => {
    if (isRunning) {
      runAlgorithm();
    }
  }, [isRunning]);

  // Reset when reset trigger changes
  useEffect(() => {
    if (shouldReset) handleReset();
  }, [shouldReset]);

  return (
    <div className="relative w-screen h-screen">
      <Canvas style={{ width: "100%", height: "100%", background: "#050505" }}>
        <OrthographicCamera
          makeDefault
          position={[
            settings.mazeWidth / 2,
            Math.max(settings.mazeWidth, settings.mazeHeight) * 1.5,
            settings.mazeHeight / 2,
          ]}
          zoom={Math.min(settings.mazeWidth, settings.mazeHeight) * 2.5}
        />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20, 10]} intensity={0.8} />
        {/* Background particles */}
        <BackgroundParticles count={50000} spread={100} color={0x32cd32} />
        {nodes.map(([x, y]) => (
          <mesh
            key={`cell-${x}-${y}`}
            position={[x * cellSize, 0, y * cellSize]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <Cell size={cellSize} />
          </mesh>
        ))}

        <MazeWalls maze={maze} cellSize={cellSize} />

        {nodes.map(([x, y]) => {
          const key = `${x}-${y}`;
          return (
            <SciFiSphere
              key={`sphere-${x}-${y}`}
              position={[x * cellSize, 1, y * cellSize]}
              scale={0.4}
              ref={(ref) => {
                if (ref) sphereRefs.current.set(key, ref);
                else sphereRefs.current.delete(key);
              }}
            />
          );
        })}

        <OrbitControls />
      </Canvas>
    </div>
  );
}
