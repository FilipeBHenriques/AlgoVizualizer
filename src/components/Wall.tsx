import React, { useMemo } from "react";
import * as THREE from "three";

interface MazeWallsProps {
  maze: number[][];
  cellSize?: number;
}

export default function MazeWalls({ maze, cellSize = 1 }: MazeWallsProps) {
  // Create instanced mesh for all walls at once (better performance)
  const wallPositions = useMemo(() => {
    const positions: [number, number, number][] = [];

    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[y].length; x++) {
        if (maze[y][x] === 1) {
          // Wall type
          positions.push([x * cellSize, 0.5 * cellSize, y * cellSize]);
        }
      }
    }

    return positions;
  }, [maze, cellSize]);

  return (
    <group>
      {wallPositions.map((pos, idx) => (
        <mesh key={idx} position={pos} castShadow receiveShadow>
          <boxGeometry args={[cellSize, cellSize, cellSize]} />
          <meshStandardMaterial
            color="#444444"
            roughness={0.8}
            metalness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}
