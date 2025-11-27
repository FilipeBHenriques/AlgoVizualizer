import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrthographicCamera, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import MazeWalls from "./Wall";
import BackgroundParticles from "./backgroundParticles";
import InstancedSciFiSpheres from "./SciFiSphere";
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

// Instanced Cells Component
const InstancedCells: React.FC<{
  nodes: [number, number][];
  cellSize: number;
}> = ({ nodes, cellSize }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;

    const dummy = new THREE.Object3D();
    nodes.forEach(([x, y], i) => {
      dummy.position.set(x * cellSize, 0, y * cellSize);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [nodes, cellSize]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, nodes.length]}>
      <planeGeometry args={[cellSize, cellSize]} />
      <meshStandardMaterial color="#1a1a1a" side={THREE.DoubleSide} />
    </instancedMesh>
  );
};

// Component to trigger re-renders during animation
const AutoInvalidate: React.FC<{ isRunning: boolean }> = ({ isRunning }) => {
  useFrame(({ invalidate }) => {
    if (isRunning) {
      invalidate();
    }
  });
  return null;
};

export default function Maze2DView(props: Maze2DViewProps) {
  const cellSize = 1;
  const { sphereRefs, nodes } = useMazeAlgorithm({
    ...props,
    viewType: "2D",
  });

  // Pre-computed positions for sci-fi spheres
  const spherePositions = useMemo(
    () =>
      nodes.map(([x, y]) => ({
        x: x * cellSize,
        y: 1,
        z: y * cellSize,
      })),
    [nodes, cellSize]
  );

  // Shared materials for better performance
  const materials = useMemo(
    () => ({
      ambient: <ambientLight intensity={0.5} />,
      directional: <directionalLight position={[10, 20, 10]} intensity={0.8} />,
    }),
    []
  );

  return (
    <div className="relative w-screen h-screen">
      <Canvas
        style={{ width: "100%", height: "100%", background: "#050505" }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
        }}
      >
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

        {materials.ambient}
        {materials.directional}

        <BackgroundParticles count={50000} spread={100} color={0x32cd32} />

        {/* Instanced Cells - Single draw call */}
        <InstancedCells
          nodes={nodes as [number, number][]}
          cellSize={cellSize}
        />

        <MazeWalls maze={props.maze} cellSize={cellSize} />

        {/* Instanced Sci-Fi Spheres - Single draw call */}
        <InstancedSciFiSpheres
          nodes={nodes as [number, number][]}
          positions={spherePositions}
          sphereRefs={sphereRefs}
        />

        <OrbitControls makeDefault />

        {/* Auto-invalidate on changes */}
        <AutoInvalidate isRunning={props.isRunning} />
      </Canvas>
    </div>
  );
}
