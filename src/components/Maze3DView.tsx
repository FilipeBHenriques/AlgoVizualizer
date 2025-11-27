import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Cell from "./Cell";
import SciFiSphere from "./SciFiSphere";
import MazeWalls from "./Wall";
import { useMazeAlgorithm } from "@/hooks/useMazeAlgorithm";
import type { MazeStats, MazeSettings } from "@/App";

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

  const { sphereRefs, nodes } = useMazeAlgorithm({
    maze: props.maze3D,
    settings: props.settings,
    isRunning: props.isRunning,
    setIsRunning: props.setIsRunning,
    setStats: props.setStats,
    shouldReset: props.shouldReset,
    setShouldReset: props.setShouldReset,
    viewType: "3D",
  });

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

        {props.maze3D.map((maze, z) => (
          <MazeWalls
            key={`walls-${z}`}
            maze={maze}
            cellSize={cellSize}
            verticalOffset={z * layerSpacing}
          />
        ))}

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
