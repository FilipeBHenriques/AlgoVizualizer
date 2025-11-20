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

export const COLORS = {
  VISITED: 0x1e90ff, // Dodger Blue - nodes that have been explored
  FRONTIER: 0x87ceeb, // Sky Blue - nodes in the queue/stack, lighter than VISITED
  PATH: 0xffd700, // Gold/Yellow - final path from start to goal
  START: 0x32cd32, // Lime Green - start node
  GOAL: 0xff8c00, // Dark Orange - goal node
  WALL: 0x555555, // Dark Gray - walls
  EMPTY: 0x111111, // Almost black - empty nodes (optional for clarity)
};

// Helper types
type Position = [number, number];
type PaintFunction = (x: number, y: number, color: number) => void;

interface SearchResult {
  path: Position[];
  visitedCount: number;
  success: boolean;
}

// Get walkable neighbors (4-directional movement)
function getNeighbors(pos: Position, maze: number[][]): Position[] {
  const [x, y] = pos;
  const neighbors: Position[] = [];
  const directions = [
    [0, 1], // down
    [1, 0], // right
    [0, -1], // up
    [-1, 0], // left
  ];

  for (const [dx, dy] of directions) {
    const nx = x + dx;
    const ny = y + dy;

    if (
      ny >= 0 &&
      ny < maze.length &&
      nx >= 0 &&
      nx < maze[0].length &&
      maze[ny][nx] !== CELL_TYPES.WALL
    ) {
      neighbors.push([nx, ny]);
    }
  }

  return neighbors;
}

// Reconstruct path from parent map
function reconstructPath(
  parentMap: Map<string, Position>,
  start: Position,
  goal: Position
): Position[] {
  const path: Position[] = [];
  let current = goal;

  while (current[0] !== start[0] || current[1] !== start[1]) {
    path.unshift(current);
    const key = `${current[0]}-${current[1]}`;
    const parent = parentMap.get(key);
    if (!parent) break;
    current = parent;
  }

  path.unshift(start);
  return path;
}

// Add delay for visualization
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Breadth-First Search (BFS)
 * Guarantees shortest path in unweighted graphs
 */
export async function breadthFirstSearch(
  maze: number[][],
  start: Position,
  goal: Position,
  paintNode: PaintFunction,
  delayMs: number = 50,
  abortSignal?: AbortSignal
): Promise<SearchResult> {
  const queue: Position[] = [start];
  const visited = new Set<string>();
  const parentMap = new Map<string, Position>();

  visited.add(`${start[0]}-${start[1]}`);
  let visitedCount = 0;

  while (queue.length > 0) {
    if (abortSignal?.aborted) throw new DOMException("Aborted", "AbortError");
    const current = queue.shift()!;
    const [x, y] = current;
    visitedCount++;

    // Paint current node as visited
    if (x !== start[0] || y !== start[1]) {
      if (x !== goal[0] || y !== goal[1]) {
        if (abortSignal?.aborted)
          throw new DOMException("Aborted", "AbortError");
        paintNode(x, y, COLORS.VISITED);
        await delay(delayMs);
      }
    }

    // Check if we reached the goal
    if (x === goal[0] && y === goal[1]) {
      const path = reconstructPath(parentMap, start, goal);
      // Paint the path
      for (const [px, py] of path) {
        if (
          (px !== start[0] || py !== start[1]) &&
          (px !== goal[0] || py !== goal[1])
        ) {
          if (abortSignal?.aborted)
            throw new DOMException("Aborted", "AbortError");
          paintNode(px, py, COLORS.PATH);
          await delay(delayMs / 2);
        }
      }
      return { path, visitedCount, success: true };
    }

    // Explore neighbors
    const neighbors = getNeighbors(current, maze);
    for (const neighbor of neighbors) {
      const [nx, ny] = neighbor;
      const key = `${nx}-${ny}`;

      if (!visited.has(key)) {
        visited.add(key);
        parentMap.set(key, current);
        queue.push(neighbor);

        // Paint frontier nodes
        if (nx !== goal[0] || ny !== goal[1]) {
          if (abortSignal?.aborted)
            throw new DOMException("Aborted", "AbortError");
          paintNode(nx, ny, COLORS.FRONTIER);
        }
      }
    }
  }

  return { path: [], visitedCount, success: false };
}

/**
 * Depth-First Search (DFS)
 * Does not guarantee shortest path
 */
export async function depthFirstSearch(
  maze: number[][],
  start: Position,
  goal: Position,
  paintNode: PaintFunction,
  delayMs: number = 50,
  abortSignal?: AbortSignal
): Promise<SearchResult> {
  const stack: Position[] = [start];
  const visited = new Set<string>();
  const parentMap = new Map<string, Position>();

  visited.add(`${start[0]}-${start[1]}`);
  let visitedCount = 0;

  while (stack.length > 0) {
    if (abortSignal?.aborted) throw new DOMException("Aborted", "AbortError");
    const current = stack.pop()!;
    const [x, y] = current;
    visitedCount++;

    // Paint current node as visited
    if (x !== start[0] || y !== start[1]) {
      if (x !== goal[0] || y !== goal[1]) {
        if (abortSignal?.aborted)
          throw new DOMException("Aborted", "AbortError");
        paintNode(x, y, COLORS.VISITED);
        await delay(delayMs);
      }
    }

    // Check if we reached the goal
    if (x === goal[0] && y === goal[1]) {
      const path = reconstructPath(parentMap, start, goal);
      // Paint the path
      for (const [px, py] of path) {
        if (
          (px !== start[0] || py !== start[1]) &&
          (px !== goal[0] || py !== goal[1])
        ) {
          if (abortSignal?.aborted)
            throw new DOMException("Aborted", "AbortError");
          paintNode(px, py, COLORS.PATH);
          await delay(delayMs / 2);
        }
      }
      return { path, visitedCount, success: true };
    }

    // Explore neighbors
    const neighbors = getNeighbors(current, maze);
    for (const neighbor of neighbors) {
      const [nx, ny] = neighbor;
      const key = `${nx}-${ny}`;

      if (!visited.has(key)) {
        visited.add(key);
        parentMap.set(key, current);
        stack.push(neighbor);

        // Paint frontier nodes
        if (nx !== goal[0] || ny !== goal[1]) {
          if (abortSignal?.aborted)
            throw new DOMException("Aborted", "AbortError");
          paintNode(nx, ny, COLORS.FRONTIER);
        }
      }
    }
  }

  return { path: [], visitedCount, success: false };
}

/**
 * A* Search Algorithm
 * Uses heuristic (Manhattan distance) to find optimal path efficiently
 */
export async function aStarSearch(
  maze: number[][],
  start: Position,
  goal: Position,
  paintNode: PaintFunction,
  delayMs: number = 50,
  abortSignal?: AbortSignal
): Promise<SearchResult> {
  // Manhattan distance heuristic
  const heuristic = (pos: Position): number => {
    return Math.abs(pos[0] - goal[0]) + Math.abs(pos[1] - goal[1]);
  };

  interface Node {
    pos: Position;
    g: number; // Cost from start
    h: number; // Heuristic to goal
    f: number; // Total cost (g + h)
  }

  const openSet: Node[] = [
    {
      pos: start,
      g: 0,
      h: heuristic(start),
      f: heuristic(start),
    },
  ];

  const visited = new Set<string>();
  const parentMap = new Map<string, Position>();
  const gScore = new Map<string, number>();
  gScore.set(`${start[0]}-${start[1]}`, 0);

  let visitedCount = 0;

  while (openSet.length > 0) {
    if (abortSignal?.aborted) throw new DOMException("Aborted", "AbortError");
    // Get node with lowest f score
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    const [x, y] = current.pos;
    const currentKey = `${x}-${y}`;

    if (visited.has(currentKey)) continue;
    visited.add(currentKey);
    visitedCount++;

    // Paint current node as visited
    if (x !== start[0] || y !== start[1]) {
      if (x !== goal[0] || y !== goal[1]) {
        if (abortSignal?.aborted)
          throw new DOMException("Aborted", "AbortError");
        paintNode(x, y, COLORS.VISITED);
        await delay(delayMs);
      }
    }

    // Check if we reached the goal
    if (x === goal[0] && y === goal[1]) {
      const path = reconstructPath(parentMap, start, goal);
      // Paint the path
      for (const [px, py] of path) {
        if (
          (px !== start[0] || py !== start[1]) &&
          (px !== goal[0] || py !== goal[1])
        ) {
          if (abortSignal?.aborted)
            throw new DOMException("Aborted", "AbortError");
          paintNode(px, py, COLORS.PATH);
          await delay(delayMs / 2);
        }
      }
      return { path, visitedCount, success: true };
    }

    // Explore neighbors
    const neighbors = getNeighbors(current.pos, maze);
    for (const neighbor of neighbors) {
      const [nx, ny] = neighbor;
      const key = `${nx}-${ny}`;

      if (visited.has(key)) continue;

      const tentativeG = current.g + 1;
      const existingG = gScore.get(key) ?? Infinity;

      if (tentativeG < existingG) {
        parentMap.set(key, current.pos);
        gScore.set(key, tentativeG);

        const h = heuristic(neighbor);
        openSet.push({
          pos: neighbor,
          g: tentativeG,
          h: h,
          f: tentativeG + h,
        });

        // Paint frontier nodes
        if (nx !== goal[0] || ny !== goal[1]) {
          if (abortSignal?.aborted)
            throw new DOMException("Aborted", "AbortError");
          paintNode(nx, ny, COLORS.FRONTIER);
        }
      }
    }
  }

  return { path: [], visitedCount, success: false };
}

/**
 * Dijkstra's Algorithm
 * Similar to A* but without heuristic (uniform cost search)
 */
export async function dijkstraSearch(
  maze: number[][],
  start: Position,
  goal: Position,
  paintNode: PaintFunction,
  delayMs: number = 50,
  abortSignal?: AbortSignal
): Promise<SearchResult> {
  interface Node {
    pos: Position;
    cost: number;
  }

  const openSet: Node[] = [{ pos: start, cost: 0 }];
  const visited = new Set<string>();
  const parentMap = new Map<string, Position>();
  const costMap = new Map<string, number>();
  costMap.set(`${start[0]}-${start[1]}`, 0);

  let visitedCount = 0;

  while (openSet.length > 0) {
    if (abortSignal?.aborted) throw new DOMException("Aborted", "AbortError");
    // Get node with lowest cost
    openSet.sort((a, b) => a.cost - b.cost);
    const current = openSet.shift()!;
    const [x, y] = current.pos;
    const currentKey = `${x}-${y}`;

    if (visited.has(currentKey)) continue;
    visited.add(currentKey);
    visitedCount++;

    // Paint current node as visited
    if (x !== start[0] || y !== start[1]) {
      if (x !== goal[0] || y !== goal[1]) {
        if (abortSignal?.aborted)
          throw new DOMException("Aborted", "AbortError");
        paintNode(x, y, COLORS.VISITED);
        await delay(delayMs);
      }
    }

    // Check if we reached the goal
    if (x === goal[0] && y === goal[1]) {
      const path = reconstructPath(parentMap, start, goal);
      // Paint the path
      for (const [px, py] of path) {
        if (
          (px !== start[0] || py !== start[1]) &&
          (px !== goal[0] || py !== goal[1])
        ) {
          if (abortSignal?.aborted)
            throw new DOMException("Aborted", "AbortError");
          paintNode(px, py, COLORS.PATH);
          await delay(delayMs / 2);
        }
      }
      return { path, visitedCount, success: true };
    }

    // Explore neighbors
    const neighbors = getNeighbors(current.pos, maze);
    for (const neighbor of neighbors) {
      const [nx, ny] = neighbor;
      const key = `${nx}-${ny}`;

      if (visited.has(key)) continue;

      const newCost = current.cost + 1;
      const existingCost = costMap.get(key) ?? Infinity;

      if (newCost < existingCost) {
        parentMap.set(key, current.pos);
        costMap.set(key, newCost);
        openSet.push({ pos: neighbor, cost: newCost });

        // Paint frontier nodes
        if (nx !== goal[0] || ny !== goal[1]) {
          if (abortSignal?.aborted)
            throw new DOMException("Aborted", "AbortError");
          paintNode(nx, ny, COLORS.FRONTIER);
        }
      }
    }
  }

  return { path: [], visitedCount, success: false };
}

/**
 * Greedy Best-First Search
 * Uses only heuristic (faster but doesn't guarantee optimal path)
 */
export async function greedyBestFirstSearch(
  maze: number[][],
  start: Position,
  goal: Position,
  paintNode: PaintFunction,
  delayMs: number = 50,
  abortSignal?: AbortSignal
): Promise<SearchResult> {
  // Manhattan distance heuristic

  const heuristic = (pos: Position): number => {
    return Math.abs(pos[0] - goal[0]) + Math.abs(pos[1] - goal[1]);
  };

  interface Node {
    pos: Position;
    h: number;
  }

  const openSet: Node[] = [{ pos: start, h: heuristic(start) }];
  const visited = new Set<string>();
  const parentMap = new Map<string, Position>();

  visited.add(`${start[0]}-${start[1]}`);
  let visitedCount = 0;

  while (openSet.length > 0) {
    if (abortSignal?.aborted) throw new DOMException("Aborted", "AbortError");
    // Get node with lowest heuristic
    openSet.sort((a, b) => a.h - b.h);
    const current = openSet.shift()!;
    const [x, y] = current.pos;
    visitedCount++;

    // Paint current node as visited
    if (x !== start[0] || y !== start[1]) {
      if (x !== goal[0] || y !== goal[1]) {
        if (abortSignal?.aborted)
          throw new DOMException("Aborted", "AbortError");
        paintNode(x, y, COLORS.VISITED);
        await delay(delayMs);
      }
    }

    // Check if we reached the goal
    if (x === goal[0] && y === goal[1]) {
      const path = reconstructPath(parentMap, start, goal);
      // Paint the path
      for (const [px, py] of path) {
        if (
          (px !== start[0] || py !== start[1]) &&
          (px !== goal[0] || py !== goal[1])
        ) {
          if (abortSignal?.aborted)
            throw new DOMException("Aborted", "AbortError");
          paintNode(px, py, COLORS.PATH);
          await delay(delayMs / 2);
        }
      }
      return { path, visitedCount, success: true };
    }

    // Explore neighbors
    const neighbors = getNeighbors(current.pos, maze);
    for (const neighbor of neighbors) {
      const [nx, ny] = neighbor;
      const key = `${nx}-${ny}`;

      if (!visited.has(key)) {
        visited.add(key);
        parentMap.set(key, current.pos);
        openSet.push({ pos: neighbor, h: heuristic(neighbor) });

        // Paint frontier nodes
        if (nx !== goal[0] || ny !== goal[1]) {
          if (abortSignal?.aborted)
            throw new DOMException("Aborted", "AbortError");
          paintNode(nx, ny, COLORS.FRONTIER);
        }
      }
    }
  }

  return { path: [], visitedCount, success: false };
}
