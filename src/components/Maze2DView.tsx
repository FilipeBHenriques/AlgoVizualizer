import React, { useRef, useMemo, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrthographicCamera, OrbitControls } from "@react-three/drei";
import SciFiSphere, { type SciFiSphereHandle } from "./SciFiSphere";
import MazeWalls from "./Wall";
import Cell from "./Cell";
import { generateMaze, printMaze, CELL_TYPES } from "./utils";

export default function Maze2DView({
  mazeWidth = 21,
  mazeHeight = 21,
  cellSize = 1,
}) {
  // Store refs for ALL spheres
  const sphereRefs = useRef<Map<string, SciFiSphereHandle>>(new Map());

  // Function to paint any node by coordinates
  const paintNode = (x: number, y: number, color: number) => {
    const key = `${x}-${y}`;
    const sphere = sphereRefs.current.get(key);
    if (sphere) {
      sphere.paint(color);
      console.log(
        `Painted node at (${x}, ${y}) with color ${color.toString(16)}`
      );
    } else {
      console.warn(`No sphere found at (${x}, ${y})`);
    }
  };

  // Expose paintNode to window for easy access (optional)
  useEffect(() => {
    (window as any).paintNode = paintNode;
    return () => {
      delete (window as any).paintNode;
    };
  }, []);

  // Generate maze once
  const maze = useMemo(() => {
    const m = generateMaze({
      width: mazeWidth,
      height: mazeHeight,
      wallDensity: 0.7,
    });
    printMaze(m);
    return m;
  }, [mazeWidth, mazeHeight]);

  // Extract nodes, start, goal positions
  const { nodes, start, goal } = useMemo(() => {
    const n: [number, number][] = [];
    let s: [number, number] | null = null;
    let g: [number, number] | null = null;

    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[y].length; x++) {
        const cell = maze[y][x];
        if (cell === CELL_TYPES.NODE) {
          n.push([x, y]);
        } else if (cell === CELL_TYPES.START) {
          s = [x, y];
          n.push([x, y]); // Add start to nodes so sphere renders
        } else if (cell === CELL_TYPES.GOAL) {
          g = [x, y];
          n.push([x, y]); // Add goal to nodes so sphere renders
        }
      }
    }

    console.log("Start:", s, "Goal:", g, "Total nodes:", n.length);
    return { nodes: n, start: s, goal: g };
  }, [maze]);

  return (
    <Canvas style={{ width: "100vw", height: "100vh", background: "#050505" }}>
      <OrthographicCamera
        makeDefault
        position={[
          mazeWidth / 2,
          Math.max(mazeWidth, mazeHeight) * 1.5,
          mazeHeight / 2,
        ]}
        zoom={Math.min(mazeWidth, mazeHeight) * 2.5}
      />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} />

      {/* Ground cells */}
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

      {/* Nodes spheres */}
      {nodes.map(([x, y]) => {
        const key = `${x}-${y}`;
        const isStart = start && start[0] === x && start[1] === y;
        const isGoal = goal && goal[0] === x && goal[1] === y;

        return (
          <SciFiSphere
            key={`sphere-${x}-${y}`}
            position={[x * cellSize, 1, y * cellSize]}
            scale={0.4}
            ref={(ref) => {
              if (ref) {
                sphereRefs.current.set(key, ref);
                // Only paint start and goal, leave regular nodes empty
                if (isStart) {
                  console.log("Painting start at", x, y);
                  ref.paint(0x00ff44); // green for start
                } else if (isGoal) {
                  console.log("Painting goal at", x, y);
                  ref.paint(0xff8800); // orange for goal
                }
              } else {
                sphereRefs.current.delete(key);
              }
            }}
          />
        );
      })}

      <OrbitControls />
    </Canvas>
  );
}
