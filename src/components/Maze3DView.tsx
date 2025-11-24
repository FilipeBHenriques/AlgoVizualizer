import React, { useRef, useMemo, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera, OrbitControls, Line } from "@react-three/drei";
import * as THREE from "three";

// Import your actual components
import SciFiSphere, { type SciFiSphereHandle } from "./SciFiSphere";
import { CELL_TYPES } from "./utils";

interface Maze3DViewProps {
  maze: number[][];
  settings: any;
  isRunning: boolean;
  setIsRunning: React.Dispatch<React.SetStateAction<boolean>>;
  stats: any;
  setStats: React.Dispatch<React.SetStateAction<any>>;
  shouldReset: boolean;
  setShouldReset: React.Dispatch<React.SetStateAction<boolean>>;
}

interface Node3D {
  x: number;
  y: number;
  z: number;
  gridX: number;
  gridY: number;
}

interface Edge {
  from: Node3D;
  to: Node3D;
  color: number;
  animated: boolean;
  progress: number;
}

const EdgeLine = React.memo(({ from, to, color, animated, progress }: Edge) => {
  const points = useMemo(() => {
    const start = new THREE.Vector3(from.x, from.y, from.z);
    const end = new THREE.Vector3(to.x, to.y, to.z);

    if (!animated || progress >= 1) {
      return [start, end];
    }

    const partialEnd = new THREE.Vector3(
      start.x + (end.x - start.x) * progress,
      start.y + (end.y - start.y) * progress,
      start.z + (end.z - start.z) * progress
    );

    return [start, partialEnd];
  }, [from.x, from.y, from.z, to.x, to.y, to.z, animated, progress]);

  return (
    <Line
      points={points}
      color={new THREE.Color(color)}
      lineWidth={2.5}
      transparent
      opacity={animated ? Math.min(progress * 1.5, 0.8) : 0.5}
    />
  );
});

export default function Maze3DView({
  maze,
  settings,
  isRunning,
  setIsRunning,
  setStats,
  shouldReset,
  setShouldReset,
}: Maze3DViewProps) {
  const sphereRefs = useRef<Map<string, SciFiSphereHandle>>(new Map());
  const isAbortedRef = useRef(false);
  const runningAlgorithmRef = useRef<Promise<void> | null>(null);
  const [edges, setEdges] = useState<Edge[]>([]);
  const edgeMapRef = useRef<Map<string, Edge>>(new Map());

  const paintNode = (x: number, y: number, color: number) => {
    if (isAbortedRef.current) return;
    const key = `${x}-${y}`;
    const sphere = sphereRefs.current.get(key);
    if (sphere) {
      sphere.paint(color);
    }
  };

  const paintEdge = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: number
  ) => {
    if (isAbortedRef.current) return;

    const key = `${fromX}-${fromY}-${toX}-${toY}`;
    const reverseKey = `${toX}-${toY}-${fromX}-${fromY}`;

    const edge =
      edgeMapRef.current.get(key) || edgeMapRef.current.get(reverseKey);
    if (edge) {
      edge.color = color;
      edge.animated = true;
      edge.progress = 0;

      const startTime = Date.now();
      const duration = 150;

      const animate = () => {
        if (isAbortedRef.current) {
          edge.animated = false;
          edge.progress = 1;
          return;
        }

        const elapsed = Date.now() - startTime;
        const newProgress = Math.min(elapsed / duration, 1);

        edge.progress = newProgress;

        if (newProgress >= 1 || elapsed % 3 === 0) {
          setEdges([...edgeMapRef.current.values()]);
        }

        if (newProgress < 1) {
          requestAnimationFrame(animate);
        } else {
          edge.animated = false;
        }
      };

      requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    (window as any).paintNode = paintNode;
    (window as any).paintEdge = paintEdge;
    return () => {
      delete (window as any).paintNode;
      delete (window as any).paintEdge;
    };
  }, []);

  const { nodes3D, start, goal, adjacencyMap } = useMemo(() => {
    const nodeMap = new Map<string, Node3D>();
    let s: Node3D | null = null;
    let g: Node3D | null = null;

    const spreadRadius =
      Math.max(settings.mazeWidth, settings.mazeHeight) * 1.5;
    const heightVariation = spreadRadius * 0.6;

    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[y].length; x++) {
        const cell = maze[y][x];
        if (
          cell === CELL_TYPES.NODE ||
          cell === CELL_TYPES.START ||
          cell === CELL_TYPES.GOAL
        ) {
          const randomOffsetX = (Math.random() - 0.5) * 4;
          const randomOffsetY = (Math.random() - 0.5) * heightVariation;
          const randomOffsetZ = (Math.random() - 0.5) * 4;

          const node3D: Node3D = {
            x: x * 3 + randomOffsetX,
            y: randomOffsetY,
            z: y * 3 + randomOffsetZ,
            gridX: x,
            gridY: y,
          };

          const key = `${x}-${y}`;
          nodeMap.set(key, node3D);

          if (cell === CELL_TYPES.START) s = node3D;
          if (cell === CELL_TYPES.GOAL) g = node3D;
        }
      }
    }

    const adjMap = new Map<string, string[]>();
    const directions = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ];

    nodeMap.forEach((node, key) => {
      const neighbors: string[] = [];
      const [x, y] = key.split("-").map(Number);

      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        const neighborKey = `${nx}-${ny}`;

        if (
          ny >= 0 &&
          ny < maze.length &&
          nx >= 0 &&
          nx < maze[0].length &&
          maze[ny][nx] !== CELL_TYPES.WALL &&
          nodeMap.has(neighborKey)
        ) {
          neighbors.push(neighborKey);
        }
      }

      adjMap.set(key, neighbors);
    });

    return {
      nodes3D: Array.from(nodeMap.values()),
      start: s,
      goal: g,
      adjacencyMap: adjMap,
    };
  }, [maze, settings.mazeWidth, settings.mazeHeight]);

  useEffect(() => {
    const newEdges: Edge[] = [];
    const newEdgeMap = new Map<string, Edge>();
    const processed = new Set<string>();

    nodes3D.forEach((node) => {
      const key = `${node.gridX}-${node.gridY}`;
      const neighbors = adjacencyMap.get(key) || [];

      neighbors.forEach((neighborKey) => {
        const [nx, ny] = neighborKey.split("-").map(Number);
        const neighbor = nodes3D.find((n) => n.gridX === nx && n.gridY === ny);

        if (neighbor) {
          const edgeKey = `${key}-${neighborKey}`;
          const reverseEdgeKey = `${neighborKey}-${key}`;

          if (!processed.has(edgeKey) && !processed.has(reverseEdgeKey)) {
            const edge: Edge = {
              from: node,
              to: neighbor,
              color: 0x444444,
              animated: false,
              progress: 1,
            };
            newEdges.push(edge);
            newEdgeMap.set(edgeKey, edge);
            processed.add(edgeKey);
          }
        }
      });
    });

    edgeMapRef.current = newEdgeMap;
    setEdges(newEdges);
  }, [nodes3D, adjacencyMap]);

  const resetColors = () => {
    nodes3D.forEach((node) => {
      const key = `${node.gridX}-${node.gridY}`;
      const sphere = sphereRefs.current.get(key);

      if (sphere) {
        const isStart =
          start && start.gridX === node.gridX && start.gridY === node.gridY;
        const isGoal =
          goal && goal.gridX === node.gridX && goal.gridY === node.gridY;

        if (isStart) {
          sphere.paint(0x00ff44);
        } else if (isGoal) {
          sphere.paint(0xff8800);
        } else {
          sphere.paint(0);
        }
      }
    });

    edgeMapRef.current.forEach((edge) => {
      edge.color = 0x444444;
      edge.animated = false;
      edge.progress = 1;
    });
    setEdges(Array.from(edgeMapRef.current.values()));
  };

  const runAlgorithm = async () => {
    if (!start || !goal) return;

    isAbortedRef.current = false;
    (window as any).__algorithmAborted = false;

    resetColors();
    paintNode(start.gridX, start.gridY, 0x00ff44);
    paintNode(goal.gridX, goal.gridY, 0xff8800);

    try {
      let result;
      const delay = 200 - settings.animationSpeed;

      // Use 2D grid coordinates for algorithm
      const start2D: [number, number] = [start.gridX, start.gridY];
      const goal2D: [number, number] = [goal.gridX, goal.gridY];

      // Import your actual search algorithms from utils
      const {
        breadthFirstSearch,
        depthFirstSearch,
        aStarSearch,
        dijkstraSearch,
        greedyBestFirstSearch,
      } = await import("./utils");

      switch (settings.algorithm) {
        case "bfs":
          result = await breadthFirstSearch(
            maze,
            start2D,
            goal2D,
            paintNode,
            delay
          );
          break;
        case "dfs":
          result = await depthFirstSearch(
            maze,
            start2D,
            goal2D,
            paintNode,
            delay
          );
          break;
        case "astar":
          result = await aStarSearch(maze, start2D, goal2D, paintNode, delay);
          break;
        case "dijkstra":
          result = await dijkstraSearch(
            maze,
            start2D,
            goal2D,
            paintNode,
            delay
          );
          break;
        case "greedy":
          result = await greedyBestFirstSearch(
            maze,
            start2D,
            goal2D,
            paintNode,
            delay
          );
          break;
        default:
          throw new Error("Unknown algorithm");
      }

      // Light up edges in the path
      if (result.path.length > 1) {
        for (let i = 0; i < result.path.length - 1; i++) {
          if (isAbortedRef.current || (window as any).__algorithmAborted) {
            throw new Error("Algorithm aborted");
          }
          const [x1, y1] = result.path[i];
          const [x2, y2] = result.path[i + 1];
          paintEdge(x1, y1, x2, y2, 0xff00ff); // Magenta for path edges
          await new Promise((resolve) => setTimeout(resolve, delay / 2));
        }
      }

      if (!isAbortedRef.current) {
        setStats({
          pathLength: result.path.length,
          nodesVisited: result.visitedCount,
          success: result.success,
        });
      }
    } catch (error) {
      if (error instanceof Error && error.message === "Algorithm aborted") {
        console.log("Algorithm was aborted by user");
      } else {
        console.error("Algorithm error:", error);
      }
    } finally {
      if (!isAbortedRef.current) {
        setIsRunning(false);
      }
      runningAlgorithmRef.current = null;
    }
  };

  const handleReset = () => {
    // SET ABORT FLAG FIRST - CRITICAL!
    isAbortedRef.current = true;
    (window as any).__algorithmAborted = true;

    // Cancel any running algorithm
    runningAlgorithmRef.current = null;

    // Update state
    setIsRunning(false);
    setStats(null);
    setShouldReset(false);

    // Reset visuals after a brief delay to ensure abort is processed
    setTimeout(() => {
      resetColors();
      if (start) paintNode(start.gridX, start.gridY, 0x00ff44);
      if (goal) paintNode(goal.gridX, goal.gridY, 0xff8800);
    }, 50);
  };

  useEffect(() => {
    sphereRefs.current.forEach((sphere) => {
      sphere.paint(0);
    });
    sphereRefs.current.clear();

    setTimeout(() => {
      if (start) paintNode(start.gridX, start.gridY, 0x00ff44);
      if (goal) paintNode(goal.gridX, goal.gridY, 0xff8800);
    }, 100);
  }, [maze, start, goal]);

  // SINGLE useEffect to handle both reset and running
  useEffect(() => {
    if (shouldReset) {
      handleReset();
    } else if (isRunning && !runningAlgorithmRef.current) {
      runningAlgorithmRef.current = runAlgorithm();
    }
  }, [isRunning, shouldReset]);

  const centerX = settings.mazeWidth * 1.5;
  const centerZ = settings.mazeHeight * 1.5;

  return (
    <div className="relative w-screen h-screen">
      <Canvas style={{ width: "100%", height: "100%", background: "#050505" }}>
        <PerspectiveCamera
          makeDefault
          position={[centerX * 1.5, centerZ * 1.2, centerZ * 1.5]}
          fov={70}
        />
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 10]} intensity={0.6} />
        <pointLight position={[centerX, 10, centerZ]} intensity={0.5} />

        {edges.map((edge, index) => (
          <EdgeLine key={index} {...edge} />
        ))}

        {nodes3D.map((node) => {
          const key = `${node.gridX}-${node.gridY}`;
          return (
            <SciFiSphere
              key={key}
              position={[node.x, node.y, node.z]}
              scale={0.5}
              ref={(ref: SciFiSphereHandle | null) => {
                if (ref) {
                  sphereRefs.current.set(key, ref);
                } else {
                  sphereRefs.current.delete(key);
                }
              }}
            />
          );
        })}

        <OrbitControls enableDamping dampingFactor={0.05} rotateSpeed={0.5} />
      </Canvas>
    </div>
  );
}
