import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import SciFiSphere from "./SciFiSphere";

interface CellProps {
  position?: [number, number, number];
  size?: number;
}

const BORDER_COLOR_DEFAULT = "#222629"; // dark grey
const BORDER_COLOR_HOVER = "#00ff88";
const FILL_COLOR = "#1a1a1a";

// Each cell is a cube, and on top face we have the circle hover effect exactly on the top
export default function Cell({ position = [0, 0, 0], size = 1 }: CellProps) {
  const [hovered, setHovered] = useState(false);
  const borderMaterialRef = useRef<THREE.LineBasicMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  // Animate border color smoothly on hover
  useFrame(() => {
    if (borderMaterialRef.current) {
      const targetColor = new THREE.Color(
        hovered ? BORDER_COLOR_HOVER : BORDER_COLOR_DEFAULT
      );
      borderMaterialRef.current.color.lerp(targetColor, 0.2);
    }
  });

  // Create circular border geometry for the top face (y constant, in xz-plane)
  const borderGeometry = React.useMemo(() => {
    const segments = 64;
    const radius = size * 0.4;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius)
      );
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [size]);

  // Height of cell, for true cube (should match width/length)
  const cubeHeight = size;

  // --- HOVER FIX: Only highlight border if you hover the TOP cube face ---
  // The normal of the top face boxGeometry is (0,1,0).
  const handlePointerOver = (e: any) => {
    e.stopPropagation(); // Prevent event from bubbling to other cells
    // Only count pointer as hover if over the top face (normal.y === 1)
    if (e.face && e.face.normal && e.face.normal.y === 0) {
      setHovered(true);
    }
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation(); // Prevent event from bubbling
    setHovered(false);
  };

  return (
    <group position={position}>
      {/* Main Cube */}
      <mesh
        ref={meshRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[size, cubeHeight, size]} />
        <meshStandardMaterial color={FILL_COLOR} />
      </mesh>
      {/* Border effect: thin circle on the *top face* (y = half cube height), in xz-plane */}
      <group
        position={[0, 0, cubeHeight / 2]} // precisely on top face
        rotation={[-Math.PI / 2, 0, 0]} // align into xz-plane to match top
      >
        <line geometry={borderGeometry}>
          <lineBasicMaterial
            ref={borderMaterialRef}
            color={BORDER_COLOR_DEFAULT}
            linewidth={2}
          />
        </line>
        {/* Sci-Fi node */}
      </group>
    </group>
  );
}
