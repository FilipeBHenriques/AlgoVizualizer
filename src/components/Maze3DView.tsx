import React, { useMemo, useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import MazeWalls from "./Wall";
import InstancedSciFiSpheres from "./SciFiSphere";

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

// Instanced Cells Component
const InstancedCells: React.FC<{
  nodes: [number, number, number][];
  cellSize: number;
  layerSpacing: number;
}> = ({ nodes, cellSize, layerSpacing }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;

    const dummy = new THREE.Object3D();
    nodes.forEach(([x, y, z], i) => {
      dummy.position.set(x * cellSize, z * layerSpacing, y * cellSize);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [nodes, cellSize, layerSpacing]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, nodes.length]}>
      <planeGeometry args={[cellSize, cellSize]} />
      <meshStandardMaterial color="#1a1a1a" side={THREE.DoubleSide} />
    </instancedMesh>
  );
};

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
        <OrbitControls makeDefault />

        {/* Instanced Cells - Single draw call */}
        <InstancedCells
          nodes={nodes as [number, number, number][]}
          cellSize={cellSize}
          layerSpacing={layerSpacing}
        />

        {/* Walls for all layers */}
        {props.maze3D.map((maze, z) => (
          <MazeWalls
            key={`walls-${z}`}
            maze={maze}
            cellSize={cellSize}
            verticalOffset={z * layerSpacing}
          />
        ))}

        {/* Instanced Sci-Fi Spheres - Single draw call */}
        <InstancedSciFiSpheres
          nodes={nodes as [number, number, number][]}
          positions={spherePositions}
          sphereRefs={sphereRefs}
        />
      </Canvas>
    </div>
  );
};

export default Maze3DView;
