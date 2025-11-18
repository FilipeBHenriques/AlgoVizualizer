// Maze cell types
export const CELL_TYPES = {
  WALL: 1, // Wall/obstacle (not walkable)
  NODE: 2, // Walkable path node
  START: 3, // Starting position (walkable)
  GOAL: 4, // Goal/end position (walkable)
} as const;

interface MazeConfig {
  width: number;
  height: number;
  wallDensity?: number; // 0-1, probability of keeping extra walls (0 = open, 1 = dense)
}

/**
 * Generates a maze using Prim's algorithm
 * Naturally guarantees connectivity - no need for path verification!
 * Returns a 2D matrix where:
 * - 1 = wall (not walkable)
 * - 2 = node (walkable path)
 * - 3 = start position (walkable)
 * - 4 = goal position (walkable)
 */
export function generateMaze(config: MazeConfig): number[][] {
  const { width, height, wallDensity = 0.7 } = config;

  // Ensure odd dimensions for proper maze generation
  const w = width % 2 === 0 ? width + 1 : width;
  const h = height % 2 === 0 ? height + 1 : height;

  // Initialize maze with all walls
  const maze: number[][] = Array(h)
    .fill(null)
    .map(() => Array(w).fill(CELL_TYPES.WALL));

  // Directions: right, down, left, up (only even steps)
  const directions = [
    [0, 2], // right
    [2, 0], // down
    [0, -2], // left
    [-2, 0], // up
  ];

  // Start with a random cell
  const startX = 1 + Math.floor(Math.random() * Math.floor((w - 2) / 2)) * 2;
  const startY = 1 + Math.floor(Math.random() * Math.floor((h - 2) / 2)) * 2;

  maze[startY][startX] = CELL_TYPES.NODE;

  // Walls adjacent to the maze (frontier)
  const walls: [number, number, number, number][] = [];

  // Add walls of the starting cell
  for (const [dx, dy] of directions) {
    const nx = startX + dx;
    const ny = startY + dy;

    if (nx > 0 && nx < w - 1 && ny > 0 && ny < h - 1) {
      walls.push([startX + dx / 2, startY + dy / 2, nx, ny]);
    }
  }

  // Prim's algorithm: pick random walls and carve paths
  while (walls.length > 0) {
    // Pick a random wall
    const randomIndex = Math.floor(Math.random() * walls.length);
    const [wallX, wallY, cellX, cellY] = walls[randomIndex];
    walls.splice(randomIndex, 1);

    // If the cell on the other side hasn't been visited yet
    if (maze[cellY][cellX] === CELL_TYPES.WALL) {
      // Make the wall a passage
      maze[wallY][wallX] = CELL_TYPES.NODE;
      maze[cellY][cellX] = CELL_TYPES.NODE;

      // Add neighboring walls to the list
      for (const [dx, dy] of directions) {
        const nx = cellX + dx;
        const ny = cellY + dy;

        if (
          nx > 0 &&
          nx < w - 1 &&
          ny > 0 &&
          ny < h - 1 &&
          maze[ny][nx] === CELL_TYPES.WALL
        ) {
          // Check if the wall isn't already in the list
          const wallBetweenX = cellX + dx / 2;
          const wallBetweenY = cellY + dy / 2;

          const alreadyExists = walls.some(
            ([wx, wy]) => wx === wallBetweenX && wy === wallBetweenY
          );

          if (
            !alreadyExists &&
            maze[wallBetweenY][wallBetweenX] === CELL_TYPES.WALL
          ) {
            walls.push([wallBetweenX, wallBetweenY, nx, ny]);
          }
        }
      }
    }
  }

  // Optional: Add some random openings based on wall density
  if (wallDensity < 1.0) {
    const openingsCount = Math.floor(w * h * (1 - wallDensity) * 0.1);
    for (let i = 0; i < openingsCount; i++) {
      const x = Math.floor(Math.random() * (w - 2)) + 1;
      const y = Math.floor(Math.random() * (h - 2)) + 1;

      if (maze[y][x] === CELL_TYPES.WALL) {
        // Check if at least two neighbors are empty (creates loops)
        const emptyNeighbors = [
          maze[y - 1]?.[x] === CELL_TYPES.NODE,
          maze[y + 1]?.[x] === CELL_TYPES.NODE,
          maze[y]?.[x - 1] === CELL_TYPES.NODE,
          maze[y]?.[x + 1] === CELL_TYPES.NODE,
        ].filter(Boolean).length;

        if (emptyNeighbors >= 2) {
          maze[y][x] = CELL_TYPES.NODE;
        }
      }
    }
  }

  // Find all node cells for placing start and goal
  const nodeCells: [number, number][] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (maze[y][x] === CELL_TYPES.NODE) {
        nodeCells.push([x, y]);
      }
    }
  }

  if (nodeCells.length < 2) {
    throw new Error("Maze too small to place start and goal");
  }

  // Place START in one corner area
  const topLeftCells = nodeCells.filter(([x, y]) => x < w / 3 && y < h / 3);
  const startPos =
    topLeftCells.length > 0
      ? topLeftCells[Math.floor(Math.random() * topLeftCells.length)]
      : nodeCells[0];
  maze[startPos[1]][startPos[0]] = CELL_TYPES.START;

  // Place GOAL in opposite corner area
  const bottomRightCells = nodeCells.filter(
    ([x, y]) => x > (2 * w) / 3 && y > (2 * h) / 3
  );
  const goalPos =
    bottomRightCells.length > 0
      ? bottomRightCells[Math.floor(Math.random() * bottomRightCells.length)]
      : nodeCells[nodeCells.length - 1];
  maze[goalPos[1]][goalPos[0]] = CELL_TYPES.GOAL;

  // All other cells remain as NODE (2) - these are the walkable paths!

  return maze;
}

// Helper to print maze to console
export function printMaze(maze: number[][]): void {
  const symbols = {
    [CELL_TYPES.WALL]: "█",
    [CELL_TYPES.NODE]: "·",
    [CELL_TYPES.START]: "S",
    [CELL_TYPES.GOAL]: "G",
  };

  console.log(
    maze
      .map((row) => row.map((cell) => symbols[cell] || "?").join(""))
      .join("\n")
  );
}
