import React, { useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Cell from "./Cell";
import SciFiSphere, { type SciFiSphereHandle } from "./SciFiSphere";
import MazeWalls from "./Wall";
import {
  aStarSearch,
  breadthFirstSearch,
  CELL_TYPES,
  COLORS,
  depthFirstSearch,
  dijkstraSearch,
  greedyBestFirstSearch,
  printMaze,
} from "./utils";
import type { MazeStats } from "@/App";

interface Maze3DViewProps {
  maze3D: number[][][];
  settings: any;
  isRunning: boolean;
  setIsRunning: React.Dispatch<React.SetStateAction<boolean>>;
  stats: MazeStats | null;
  setStats: React.Dispatch<React.SetStateAction<MazeStats | null>>;
  shouldReset: boolean;
  setShouldReset: React.Dispatch<React.SetStateAction<boolean>>;
}

const Maze3DView: React.FC<Maze3DViewProps> = ({
  maze3D,
  settings,
  isRunning,
  setIsRunning,
  setStats,
  shouldReset,
  setShouldReset,
}) => {
  const cellSize = 1;
  const layerSpacing = 10;
  const sphereRefs = useRef<Map<string, SciFiSphereHandle>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Print each layer using the printMaze util function
    for (let z = 0; z < maze3D.length; z++) {
      console.log(`=== Layer ${z} ===`);
      // printMaze expects a 2D array, so pass one layer at a time
      // printMaze will handle walls/nodes/etc using cell type constants
      // @ts-ignore: printMaze is 2D only but it's fine for one layer
      // If printMaze isn't imported, fallback to manual symbols (but here we use the provided util)
      // You can remove "@ts-ignore" if type matches.
      // printMaze from utils handles console.log
      // eslint-disable-next-line
      // @ts-ignore
      printMaze(maze3D[z]);
      console.log("");
    }
  }, [maze3D]);

  const paintNode = (x: number, y: number, z: number, color: number) => {
    const key = `${x}-${y}-${z}`;
    const sphere = sphereRefs.current.get(key);
    if (sphere) {
      sphere.paint(color);
    }
  };

  const resetColors = () => {
    nodes.forEach(([x, y, z]) => {
      const key = `${x}-${y}-${z}`;
      const sphere = sphereRefs.current.get(key);

      let color = 0;
      const isStart =
        start && start[0] === x && start[1] === y && start[2] === z;
      const isGoal = goal && goal[0] === x && goal[1] === y && goal[2] === z;

      // Get cell type for coloring up/down nodes
      const cellType = maze3D?.[z]?.[y]?.[x];
      if (isStart) {
        color = COLORS.START;
      } else if (isGoal) {
        color = COLORS.GOAL;
      } else if (cellType === CELL_TYPES.PORTAL_UP) {
        color = COLORS.PORTAL_UP;
      } else if (cellType === CELL_TYPES.PORTAL_DOWN) {
        color = COLORS.PORTAL_DOWN;
      } else {
        color = 0;
      }

      if (sphere) {
        sphere.paint(color);
      }
    });
  };

  // Flatten all nodes across all layers
  const { nodes, start, goal } = useMemo(() => {
    const allNodes: [number, number, number][] = [];
    let s: [number, number, number] | null = null;
    let g: [number, number, number] | null = null;

    for (let z = 0; z < maze3D.length; z++) {
      const maze = maze3D[z];

      for (let y = 0; y < maze.length; y++) {
        for (let x = 0; x < maze[y].length; x++) {
          const cell = maze[y][x];

          if (cell !== CELL_TYPES.WALL) {
            allNodes.push([x, y, z]);

            if (cell === CELL_TYPES.START) s = [x, y, z];
            if (cell === CELL_TYPES.GOAL) g = [x, y, z];
          }
        }
      }
    }
    return { nodes: allNodes, start: s, goal: g };
  }, [maze3D]);
  console.log("start is and goal", start, goal);

  // Reset all colors when maze changes
  useEffect(() => {
    sphereRefs.current.forEach((sphere) => sphere.paint(0));
    sphereRefs.current.clear();

    // Wait a short moment to ensure all spheres mount
    const timer = setTimeout(() => {
      if (start) paintNode(start[0], start[1], start[2], COLORS.START);
      if (goal) paintNode(goal[0], goal[1], goal[2], COLORS.GOAL);
      resetColors();
    }, 200);

    return () => clearTimeout(timer);
  }, [maze3D, start, goal]);

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
      console.log("runnig");
      switch (settings.algorithm) {
        case "bfs":
          result = await breadthFirstSearch(
            maze3D,
            start,
            goal,
            paintNode,
            delay,
            "3D",
            signal
          );
          break;
        case "dfs":
          result = await depthFirstSearch(
            maze3D,
            start,
            goal,
            paintNode,
            delay,
            "3D",
            signal
          );
          break;
        case "astar":
          result = await aStarSearch(
            maze3D,
            start,
            goal,
            paintNode,
            delay,
            "3D",
            signal
          );
          break;
        case "dijkstra":
          result = await dijkstraSearch(
            maze3D,
            start,
            goal,
            paintNode,
            delay,
            "3D",
            signal
          );
          break;
        case "greedy":
          result = await greedyBestFirstSearch(
            maze3D,
            start,
            goal,
            paintNode,
            delay,
            "3D",
            signal
          );
          break;
      }
      setStats({
        pathLength: result?.path.length ?? 0,
        nodesVisited: result?.visitedCount ?? 0,
        success: result?.success ?? 0,
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
    <div className="w-screen h-screen">
      <Canvas style={{ width: "100%", height: "100%", background: "#050505" }}>
        <ambientLight intensity={0.5} />
        <directionalLight intensity={1.2} position={[10, 20, 10]} />

        <OrbitControls />

        {nodes.map(([x, y, z]) => (
          <mesh
            key={`cell-${x}-${y}-${z}`}
            position={[x * cellSize, z * layerSpacing, y * cellSize]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <Cell size={cellSize} />
          </mesh>
        ))}

        {/* Draw walls for all layers */}
        {maze3D.map((maze, z) => (
          <MazeWalls
            key={`walls-${z}`}
            maze={maze}
            cellSize={cellSize}
            verticalOffset={z * layerSpacing}
          />
        ))}

        {/* Spheres */}
        {nodes.map(([x, y, z]) => {
          const key = `${x}-${y}-${z}`;
          return (
            <SciFiSphere
              key={`sphere-${x}-${y}-${z}`}
              position={[x * cellSize, z * layerSpacing + 1, y * cellSize]}
              scale={0.4}
              ref={(ref) => {
                if (ref) sphereRefs.current.set(key, ref);
                else sphereRefs.current.delete(key);
              }}
            />
          );
        })}
      </Canvas>
    </div>
  );
};

export default Maze3DView;
