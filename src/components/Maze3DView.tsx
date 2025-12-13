import React, { useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, OrthographicCamera } from "@react-three/drei";
import MazeWalls from "./Wall";
import InstancedSciFiSpheres from "./SciFiSphere";

import { useMazeAlgorithm } from "@/hooks/useMazeAlgorithm";
import type { MazeStats, MazeSettings } from "@/App";
import type { Connection } from "./InstancedElevatorThreads";
import { CELL_TYPES } from "./utils";
import InstancedElevatorThreads from "./InstancedElevatorThreads";
import Floor from "./Floor";
import BackgroundParticles from "./backgroundParticles";

interface Maze3DViewProps {
  maze3D: number[][][];
  settings: MazeSettings;
  isRunning: boolean;
  setIsRunning: React.Dispatch<React.SetStateAction<boolean>>;
  stats: MazeStats | null;
  setStats: React.Dispatch<React.SetStateAction<MazeStats | null>>;
  shouldReset: boolean;
  setShouldReset: React.Dispatch<React.SetStateAction<boolean>>;
}

const Maze3DView: React.FC<Maze3DViewProps> = (props) => {
  const cellSize = 1;
  const layerSpacing = 10;

  const { sphereRefs, threadRefs, nodes } = useMazeAlgorithm({
    maze: props.maze3D,
    settings: props.settings,
    isRunning: props.isRunning,
    setIsRunning: props.setIsRunning,
    setStats: props.setStats,
    shouldReset: props.shouldReset,
    setShouldReset: props.setShouldReset,
    viewType: "3D",
  });

  // Pre-computed positions for sci-fi spheres
  const spherePositions = useMemo(
    () =>
      nodes.map(([x, y, z]) => ({
        x: x * cellSize,
        y: z * layerSpacing + 1,
        z: y * cellSize,
      })),
    [nodes, cellSize, layerSpacing]
  );

  // Shared materials for better performance
  const materials = useMemo(
    () => ({
      ambient: <ambientLight intensity={0.5} />,
      directional: <directionalLight intensity={1.2} position={[10, 20, 10]} />,
    }),
    []
  );

  const portalPositions = useMemo(() => {
    const positions: { type: "UP" | "DOWN"; pos: [number, number, number] }[] =
      [];
    nodes.forEach(([x, y, z]) => {
      const cell = props.maze3D[z]?.[y]?.[x];
      if (cell === CELL_TYPES.PORTAL_UP) {
        positions.push({ type: "UP", pos: [x, y, z] });
      } else if (cell === CELL_TYPES.PORTAL_DOWN) {
        positions.push({ type: "DOWN", pos: [x, y, z] });
      }
    });
    return positions;
  }, [props.maze3D, nodes]);
  const elevatorConnections = useMemo(() => {
    const connections: Connection[] = [];

    portalPositions.forEach((portal) => {
      if (portal.type === "UP") {
        const [x, y, z] = portal.pos;
        const downPortal = portalPositions.find(
          (p) => p.type === "DOWN" && p.pos[2] === z + 1
        );
        if (downPortal) {
          connections.push({
            from: [x, y, z * layerSpacing + cellSize],
            to: [
              downPortal.pos[0],
              downPortal.pos[1],
              downPortal.pos[2] * layerSpacing + cellSize,
            ],
          });
        }
      }
    });
    return connections;
  }, [portalPositions]);

  const mazeWidthWorld = props.settings.mazeWidth * cellSize;
  const mazeDepthWorld = props.settings.mazeHeight * cellSize;
  const mazeHeightWorld = props.settings.mazeLevels * layerSpacing;

  const center = [
    mazeWidthWorld / 2,
    mazeHeightWorld / 2,
    mazeDepthWorld / 2,
  ] as [number, number, number];

  const maxDimension = Math.max(
    mazeWidthWorld,
    mazeHeightWorld,
    mazeDepthWorld
  );

  return (
    <div className="w-screen h-screen">
      <Canvas
        style={{ width: "100%", height: "100%", background: "#050505" }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
        }}
      >
        {materials.ambient}
        {materials.directional}

        <OrthographicCamera
          makeDefault
          position={[center[0], center[1] + maxDimension, center[2]]}
          zoom={Math.min(mazeWidthWorld, mazeDepthWorld) * 0.8}
          near={-maxDimension * 2}
          far={maxDimension * 2}
        />
        <OrbitControls makeDefault />
        {/* Walls for all layers */}
        {props.maze3D.map((maze, z) => (
          <MazeWalls
            key={`walls-${z}`}
            maze={maze}
            cellSize={cellSize}
            verticalOffset={z * layerSpacing}
          />
        ))}
        {props.maze3D.map((maze, z) => (
          <Floor
            key={`floor-${z}`}
            width={props.settings.mazeWidth}
            height={props.settings.mazeHeight}
            cellSize={cellSize}
            zIndex={z * layerSpacing}
          />
        ))}
        {/* Instanced Sci-Fi Spheres - Single draw call */}
        <InstancedSciFiSpheres
          nodes={nodes as [number, number, number][]}
          positions={spherePositions}
          sphereRefs={sphereRefs}
        />

        <InstancedElevatorThreads
          connections={elevatorConnections}
          threadRefs={threadRefs}
        />

        <BackgroundParticles count={50000} spread={750} color={0x32cd32} />
      </Canvas>
    </div>
  );
};

export default Maze3DView;
