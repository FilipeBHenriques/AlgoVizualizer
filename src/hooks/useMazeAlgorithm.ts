import React, { useRef, useMemo, useEffect } from "react";

import type { MazeSettings, MazeStats } from "@/App";
import type { SciFiSphereHandle } from "@/components/SciFiSphere";
import {
  aStarSearch,
  breadthFirstSearch,
  CELL_TYPES,
  COLORS,
  depthFirstSearch,
  dijkstraSearch,
  greedyBestFirstSearch,
} from "@/components/utils";

type Position2D = [number, number];
type Position3D = [number, number, number];
type Position = Position2D | Position3D;

interface UseMazeAlgorithmProps<T extends Position> {
  maze: number[][] | number[][][];
  settings: MazeSettings;
  isRunning: boolean;
  setIsRunning: React.Dispatch<React.SetStateAction<boolean>>;
  setStats: React.Dispatch<React.SetStateAction<MazeStats | null>>;
  shouldReset: boolean;
  setShouldReset: React.Dispatch<React.SetStateAction<boolean>>;
  viewType: "2D" | "3D";
  threadRefs?: any;
}

export function useMazeAlgorithm<T extends Position>({
  maze,
  settings,
  isRunning,
  setIsRunning,
  setStats,
  shouldReset,
  setShouldReset,
  viewType,
}: UseMazeAlgorithmProps<T>) {
  const sphereRefs = useRef<Map<string, SciFiSphereHandle>>(new Map());
  const threadRefs = useRef(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Paint node function that works for both 2D and 3D
  const paintNode = (...args: [...number[], number]) => {
    const color = args[args.length - 1];
    const coords = args.slice(0, -1);
    const key = coords.join("-");
    const sphere = sphereRefs.current.get(key);
    if (sphere) {
      sphere.paint(color);
    }
  };

  const paintThread = (from: number[], to: number[], color: number) => {
    console.log("paintThread called with:", { from, to, color }, threadRefs);
    if (threadRefs && threadRefs.current) {
      const key = `${from.join("-")}-${to.join("-")}`;
      const ref = threadRefs.current.get(key);
      if (ref) {
        console.log(`Found threadRef for key ${key}, painting...`);
        ref.paint(color);
      } else {
        console.log(`No threadRef found for key ${key}`);
      }
    } else {
      console.log("No threadRefs or threadRefs.current");
    }
  };

  // Extract nodes, start, and goal from maze
  const { nodes, start, goal } = useMemo(() => {
    const allNodes: T[] = [];
    let s: T | null = null;
    let g: T | null = null;

    if (viewType === "2D") {
      const maze2D = maze as number[][];
      for (let y = 0; y < maze2D.length; y++) {
        for (let x = 0; x < maze2D[y].length; x++) {
          const cell = maze2D[y][x];
          if (cell === CELL_TYPES.NODE) allNodes.push([x, y] as T);
          else if (cell === CELL_TYPES.START) {
            s = [x, y] as T;
            allNodes.push([x, y] as T);
          } else if (cell === CELL_TYPES.GOAL) {
            g = [x, y] as T;
            allNodes.push([x, y] as T);
          }
        }
      }
    } else {
      const maze3D = maze as number[][][];
      for (let z = 0; z < maze3D.length; z++) {
        const layer = maze3D[z];
        for (let y = 0; y < layer.length; y++) {
          for (let x = 0; x < layer[y].length; x++) {
            const cell = layer[y][x];
            if (cell !== CELL_TYPES.WALL) {
              allNodes.push([x, y, z] as T);
              if (cell === CELL_TYPES.START) s = [x, y, z] as T;
              if (cell === CELL_TYPES.GOAL) g = [x, y, z] as T;
            }
          }
        }
      }
    }

    return { nodes: allNodes, start: s, goal: g };
  }, [maze, viewType]);

  // Reset colors for all nodes and all threads
  const resetColors = () => {
    // Reset all spheres (nodes)
    nodes.forEach((pos) => {
      const key = pos.join("-");
      const sphere = sphereRefs.current.get(key);

      if (!sphere) return;

      const isStart = start && pos.every((v, i) => v === start[i]);
      const isGoal = goal && pos.every((v, i) => v === goal[i]);

      let color = 0;
      if (isStart) {
        color = COLORS.START;
      } else if (isGoal) {
        color = COLORS.GOAL;
      } else if (viewType === "3D" && pos.length === 3) {
        const [x, y, z] = pos;
        const cellType = (maze as number[][][])[z]?.[y]?.[x];
        if (cellType === CELL_TYPES.PORTAL_UP) {
          color = COLORS.PORTAL_UP;
        } else if (cellType === CELL_TYPES.PORTAL_DOWN) {
          color = COLORS.PORTAL_DOWN;
        }
      }

      sphere.paint(color);
    });

    // Reset all threads to invisible (color 0)
    if (threadRefs && threadRefs.current) {
      threadRefs.current.forEach((ref) => {
        if (ref && typeof ref.paint === "function") {
          ref.paint(0);
        }
      });
    }
  };

  // Reset all colors when maze changes
  useEffect(() => {
    sphereRefs.current.forEach((sphere) => sphere.paint(0));
    sphereRefs.current.clear();

    const timer = setTimeout(() => {
      resetColors();
    }, 200);

    return () => clearTimeout(timer);
  }, [maze, start, goal]);

  // Run the selected algorithm
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

      const algorithmMap = {
        bfs: breadthFirstSearch,
        dfs: depthFirstSearch,
        astar: aStarSearch,
        dijkstra: dijkstraSearch,
        greedy: greedyBestFirstSearch,
      };

      const algorithmFn = algorithmMap[settings.algorithm];
      if (algorithmFn) {
        result = await algorithmFn(
          maze,
          start as number[],
          goal as number[],
          paintNode as any,
          delay,
          viewType,
          paintThread,
          signal
        );

        setStats({
          pathLength: result?.path.length ?? 0,
          nodesVisited: result?.visitedCount ?? 0,
          success: result?.success ?? false,
        });
      }
    } catch (err) {
      if ((err as any).name !== "AbortError") {
        console.error("Algorithm error:", err);
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  // Handle reset
  const handleReset = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsRunning(false);
    setStats(null);
    resetColors();

    // To make sure last iteration of algorithm gets cleared reset again
    setTimeout(() => {
      resetColors();
    }, 100);
  };

  // Run algorithm when isRunning changes
  useEffect(() => {
    if (isRunning) {
      runAlgorithm();
    }
  }, [isRunning]);

  // Reset when reset trigger changes
  useEffect(() => {
    if (shouldReset) handleReset();
  }, [shouldReset]);

  return {
    sphereRefs,
    threadRefs,
    nodes,
    start,
    goal,
    paintNode,
    resetColors,
  };
}
