import React, { useRef, useEffect } from "react";
import * as THREE from "three";

interface FloorProps {
  width: number;
  height: number;
  cellSize: number;
  zIndex: number;
  color?: string | number;
}

const Floor: React.FC<FloorProps> = ({
  width,
  height,
  cellSize,
  zIndex,
  color = "#181828",
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;
    meshRef.current.receiveShadow = true;
  }, []);

  return (
    <mesh
      ref={meshRef}
      position={[
        (width * cellSize) / 2 - cellSize / 2,
        zIndex - 0.01,
        (height * cellSize) / 2 - cellSize / 2,
      ]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[width * cellSize, height * cellSize]} />
      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
    </mesh>
  );
};

export default Floor;
