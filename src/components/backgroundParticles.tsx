import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface BackgroundParticlesProps {
  count?: number;
  spread?: number;
  color?: number;
}

const BackgroundParticles: React.FC<BackgroundParticlesProps> = ({
  count = 300,
  spread = 30, // smaller spread = closer to center
  color = 0x32cd32, // lime green
}) => {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate random particle positions clustered toward center
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * spread; // cube to bias toward 0
      const y = (Math.random() - 0.5) * spread;
      const z = (Math.random() - 0.5) * spread;
      pos[i * 3 + 0] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
    }
    return pos;
  }, [count, spread]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.02; // slow rotation
    pointsRef.current.rotation.x += delta * 0.01;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.15}
        sizeAttenuation
        transparent
        opacity={0.8}
      />
    </points>
  );
};

export default BackgroundParticles;
