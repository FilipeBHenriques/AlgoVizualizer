import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";

interface MazeWallsProps {
  maze: number[][];
  cellSize?: number;
  verticalOffset?: number;
}

export default function MazeWalls({
  maze,
  cellSize = 1,
  verticalOffset = 0,
}: MazeWallsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Calculate wall positions
  const wallPositions = useMemo(() => {
    const positions: [number, number, number][] = [];

    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[y].length; x++) {
        if (maze[y][x] === 1) {
          positions.push([
            x * cellSize,
            0.5 * cellSize + verticalOffset,
            y * cellSize,
          ]);
        }
      }
    }

    return positions;
  }, [maze, cellSize, verticalOffset]);

  // Set up instance matrices
  useEffect(() => {
    if (!meshRef.current) return;

    const dummy = new THREE.Object3D();

    wallPositions.forEach((pos, i) => {
      dummy.position.set(pos[0], pos[1], pos[2]);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [wallPositions]);

  // Don't render if no walls
  if (wallPositions.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, wallPositions.length]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[cellSize, cellSize, cellSize]} />
      <meshStandardMaterial color="#444444" roughness={0.8} metalness={0.2} />
    </instancedMesh>
  );
}
