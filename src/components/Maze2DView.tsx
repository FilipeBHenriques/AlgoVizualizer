import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrthographicCamera, OrbitControls } from "@react-three/drei";
import SciFiSphere from "./SciFiSphere";
import MazeWalls from "./Wall";
import Cell from "./Cell";
import BackgroundParticles from "./backgroundParticles";
import { useMazeAlgorithm } from "@/hooks/useMazeAlgorithm";
import type { MazeSettings, MazeStats } from "@/App";

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

export default function Maze2DView(props: Maze2DViewProps) {
  const cellSize = 1;
  const { sphereRefs, nodes } = useMazeAlgorithm({
    ...props,
    viewType: "2D",
  });

  return (
    <div className="relative w-screen h-screen">
      <Canvas style={{ width: "100%", height: "100%", background: "#050505" }}>
        <OrthographicCamera
          makeDefault
          position={[
            props.settings.mazeWidth / 2,
            Math.max(props.settings.mazeWidth, props.settings.mazeHeight) * 1.5,
            props.settings.mazeHeight / 2,
          ]}
          zoom={
            Math.min(props.settings.mazeWidth, props.settings.mazeHeight) * 2.5
          }
        />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20, 10]} intensity={0.8} />

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

        <MazeWalls maze={props.maze} cellSize={cellSize} />

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
