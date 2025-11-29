// Maze cell types
export const CELL_TYPES = {
  WALL: 1,
  NODE: 2,
  START: 3,
  GOAL: 4,
  PORTAL_UP: 5,
  PORTAL_DOWN: 6,
} as const;

interface MazeConfig {
  width: number;
  height: number;
  wallDensity?: number; // 0-1, probability of keeping extra walls (0 = open, 1 = dense)
}

/**
 * Generates a maze using Prim's algorithm
 * Returns a 2D matrix with integers representing cell types.
 */
export function generateMaze(config: MazeConfig): number[][] {
  const { width, height, wallDensity = 0.7 } = config;

  // Ensure odd dimensions
  const w = width % 2 === 0 ? width + 1 : width;
  const h = height % 2 === 0 ? height + 1 : height;

  // Fill maze with walls
  const maze: number[][] = Array.from({ length: h }, () =>
    Array(w).fill(CELL_TYPES.WALL)
  );
  // Directions: right, down, left, up (only even steps)
  const directions = [
    [0, 2],
    [2, 0],
    [0, -2],
    [-2, 0],
  ];

  // Random odd cell for starting position
  const startX = 1 + Math.floor(Math.random() * Math.floor((w - 2) / 2)) * 2;
  const startY = 1 + Math.floor(Math.random() * Math.floor((h - 2) / 2)) * 2;
  maze[startY][startX] = CELL_TYPES.NODE;

  const walls: [number, number, number, number][] = [];
  for (const [dx, dy] of directions) {
    const nx = startX + dx;
    const ny = startY + dy;
    if (nx > 0 && nx < w - 1 && ny > 0 && ny < h - 1)
      walls.push([startX + dx / 2, startY + dy / 2, nx, ny]);
  }

  while (walls.length > 0) {
    const idx = Math.floor(Math.random() * walls.length);
    const [wallX, wallY, cellX, cellY] = walls[idx];
    walls.splice(idx, 1);

    if (maze[cellY][cellX] === CELL_TYPES.WALL) {
      maze[wallY][wallX] = CELL_TYPES.NODE;
      maze[cellY][cellX] = CELL_TYPES.NODE;

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
          const wallBetweenX = cellX + dx / 2;
          const wallBetweenY = cellY + dy / 2;
          if (
            !walls.some(
              ([wx, wy]) => wx === wallBetweenX && wy === wallBetweenY
            ) &&
            maze[wallBetweenY][wallBetweenX] === CELL_TYPES.WALL
          ) {
            walls.push([wallBetweenX, wallBetweenY, nx, ny]);
          }
        }
      }
    }
  }

  // Create random extra openings depending on wallDensity
  if (wallDensity < 1.0) {
    const nOpenings = Math.floor(w * h * (1 - wallDensity) * 0.1);
    for (let i = 0; i < nOpenings; i++) {
      const x = Math.floor(Math.random() * (w - 2)) + 1;
      const y = Math.floor(Math.random() * (h - 2)) + 1;
      if (maze[y][x] === CELL_TYPES.WALL) {
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

  // Find positions for START and GOAL
  const nodes: [number, number][] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (maze[y][x] === CELL_TYPES.NODE) {
        nodes.push([x, y]);
      }
    }
  }
  if (nodes.length < 2)
    throw new Error("Maze too small to place start and goal");

  const topLeft = nodes.filter(([x, y]) => x < w / 3 && y < h / 3);
  const startPos =
    topLeft.length > 0
      ? topLeft[Math.floor(Math.random() * topLeft.length)]
      : nodes[0];
  maze[startPos[1]][startPos[0]] = CELL_TYPES.START;

  const bottomRight = nodes.filter(
    ([x, y]) => x > (2 * w) / 3 && y > (2 * h) / 3
  );
  const goalPos =
    bottomRight.length > 0
      ? bottomRight[Math.floor(Math.random() * bottomRight.length)]
      : nodes[nodes.length - 1];
  maze[goalPos[1]][goalPos[0]] = CELL_TYPES.GOAL;

  return maze;
}

export function generateMaze3D(
  layers: number,
  width: number,
  height: number
): number[][][] {
  let maze3D: number[][][];
  let success = false;
  let start: [number, number, number] | null = null;
  let goal: [number, number, number] | null = null;

  // Step 1: Generate layers as 2D mazes
  maze3D = [];
  for (let z = 0; z < layers; z++) maze3D.push(generateMaze({ width, height }));

  // Step 2: Place portals to connect layers, ensure at least one portal per layer
  const portalPositions: [number, number, number][] = [];
  for (let z = 0; z < layers - 1; z++) {
    const mazeA = maze3D[z];
    const mazeB = maze3D[z + 1];

    // Candidates for PORTAL_UP in layer A
    const upCandidates: [number, number][] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (mazeA[y][x] !== CELL_TYPES.WALL) {
          upCandidates.push([x, y]);
        }
      }
    }

    // Candidates for PORTAL_DOWN in layer B
    const downCandidates: [number, number][] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (mazeB[y][x] !== CELL_TYPES.WALL) {
          downCandidates.push([x, y]);
        }
      }
    }

    if (upCandidates.length > 0 && downCandidates.length > 0) {
      const [upX, upY] =
        upCandidates[Math.floor(Math.random() * upCandidates.length)];
      const [downX, downY] =
        downCandidates[Math.floor(Math.random() * downCandidates.length)];
      mazeA[upY][upX] = CELL_TYPES.PORTAL_UP;
      mazeB[downY][downX] = CELL_TYPES.PORTAL_DOWN;
      portalPositions.push([upX, upY, z]);
      // Optionally keep track of down portal too: portalPositions.push([downX, downY, z+1]);
    }
  }

  // Step 3: Find all non-wall, non-portal cells in all layers for placing start/goal
  // REQUIREMENT: start and goal must be on different floors (z's must differ)
  const candidatesForStart: [number, number, number][] = [];
  const candidatesForGoalByLayer: [number, number, number][][] = Array.from(
    { length: layers },
    () => []
  );
  for (let z = 0; z < layers; z++) {
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (maze3D[z][y][x] === CELL_TYPES.NODE) {
          // Top third for start candidates
          if (x < width / 3 && y < height / 3) {
            candidatesForStart.push([x, y, z]);
          }
          // Bottom third for goal candidates
          if (x > (2 * width) / 3 && y > (2 * height) / 3) {
            candidatesForGoalByLayer[z].push([x, y, z]);
          }
        }
      }
    }
  }

  // Get all eligible (start, goal) pairs on different floors (z's must differ)
  const eligiblePairs: {
    start: [number, number, number];
    goal: [number, number, number];
  }[] = [];
  for (const s of candidatesForStart) {
    for (let zz = 0; zz < layers; zz++) {
      // Ensure goal and start are never on same floor
      if (zz === s[2]) continue;
      for (const g of candidatesForGoalByLayer[zz]) {
        // Defensive: also ensure g[2] !== s[2]
        if (g[2] !== s[2]) {
          eligiblePairs.push({ start: s, goal: g });
        }
      }
    }
  }

  if (eligiblePairs.length === 0) throw new Error("werros");

  // Pick random eligible pair
  const chosen =
    eligiblePairs[Math.floor(Math.random() * eligiblePairs.length)];
  start = chosen.start;
  goal = chosen.goal;

  // Make a deep copy and place START and GOAL, clearing other S/Gs
  maze3D = maze3D.map((layer) =>
    layer.map((row) =>
      row.map((cell) =>
        cell === CELL_TYPES.START || cell === CELL_TYPES.GOAL
          ? CELL_TYPES.NODE
          : cell
      )
    )
  );
  maze3D[start[2]][start[1]][start[0]] = CELL_TYPES.START;
  maze3D[goal[2]][goal[1]][goal[0]] = CELL_TYPES.GOAL;

  return maze3D;
}

// Helper to print maze to console
export function printMaze(maze: number[][]): void {
  const symbols: Record<number, string> = {
    [CELL_TYPES.WALL]: "█",
    [CELL_TYPES.NODE]: "·",
    [CELL_TYPES.START]: "S",
    [CELL_TYPES.GOAL]: "G",
    [CELL_TYPES.PORTAL_UP]: "^",
    [CELL_TYPES.PORTAL_DOWN]: "v",
  };
  console.log(
    maze
      .map((row) => row.map((cell) => symbols[cell] || "?").join(""))
      .join("\n")
  );
}

export const COLORS = {
  VISITED: 0x1e90ff,
  FRONTIER: 0x87ceeb,
  PATH: 0xffd700,
  START: 0x32cd32,
  GOAL: 0xff8c00,
  WALL: 0x555555,
  EMPTY: 0x111111,
  PORTAL_UP: 0x7b68ee, // purple-ish for up
  PORTAL_DOWN: 0x00ced1, // teal for down
  THREAD_DEFAULT: 0x4444ff,
};

// Helper types
export type Position = [number, number];
export type PaintFunction = (x: number, y: number, color: number) => void;
export type PaintFunction3D = (
  x: number,
  y: number,
  z: number,
  color: number
) => void;
export type PaintNode = PaintFunction | PaintFunction3D;
export type PaintThreadFunction = (
  fromPos: [number, number, number],
  toPos: [number, number, number],
  color: number
) => void;

export interface SearchResult {
  path: Position[];
  visitedCount: number;
  success: boolean;
}

function getNeighbors2D(pos: Position, maze: number[][]): Position[] {
  const [x, y] = pos;
  const neighbors: Position[] = [];
  const dirs = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ];
  for (const [dx, dy] of dirs) {
    const nx = x + dx,
      ny = y + dy;
    if (
      ny >= 0 &&
      ny < maze.length &&
      nx >= 0 &&
      nx < maze[0].length &&
      maze[ny][nx] !== CELL_TYPES.WALL
    )
      neighbors.push([nx, ny]);
  }
  return neighbors;
}

export type Position3D = [number, number, number];

export function getNeighbors3D(
  pos: Position3D,
  maze3D: number[][][]
): Position3D[] {
  const [x, y, z] = pos;
  const neighbors: Position3D[] = [];
  const layer = maze3D[z];
  const height = layer.length;
  const width = layer[0].length;
  const dirs = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ];
  for (const [dx, dy] of dirs) {
    const nx = x + dx,
      ny = y + dy;
    if (
      ny >= 0 &&
      ny < height &&
      nx >= 0 &&
      nx < width &&
      layer[ny][nx] !== CELL_TYPES.WALL
    )
      neighbors.push([nx, ny, z]);
  }

  // Find up-neighbors: All [nx,ny] in layer z+1 where cell is PORTAL_DOWN
  if (layer[y][x] === CELL_TYPES.PORTAL_UP && maze3D[z + 1]) {
    const nextLayer = maze3D[z + 1];
    for (let ny = 0; ny < nextLayer.length; ny++) {
      for (let nx = 0; nx < nextLayer[ny].length; nx++) {
        if (nextLayer[ny][nx] === CELL_TYPES.PORTAL_DOWN) {
          neighbors.push([nx, ny, z + 1]);
        }
      }
    }
  }

  // Find down-neighbors: All [nx,ny] in layer z-1 where cell is PORTAL_UP
  if (layer[y][x] === CELL_TYPES.PORTAL_DOWN && maze3D[z - 1]) {
    const prevLayer = maze3D[z - 1];
    for (let ny = 0; ny < prevLayer.length; ny++) {
      for (let nx = 0; nx < prevLayer[ny].length; nx++) {
        if (prevLayer[ny][nx] === CELL_TYPES.PORTAL_UP) {
          neighbors.push([nx, ny, z - 1]);
        }
      }
    }
  }

  return neighbors;
}

function posKey(pos: number[]): string {
  return pos.join(",");
}

function isSamePos(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

function reconstructPath(
  parentMap: Map<string, number[]>,
  start: number[],
  goal: number[]
): number[][] {
  const path: number[][] = [];
  let current = goal;
  while (!isSamePos(current, start)) {
    path.unshift(current);
    const parent = parentMap.get(posKey(current));
    if (!parent) break;
    current = parent;
  }
  path.unshift(start);
  return path;
}

// Helper to call paintNode for 2D or 3D
function callPaintNode(
  viewType: "2D" | "3D",
  paintNode: PaintNode,
  pos: number[],
  color: number
) {
  if (viewType === "2D") {
    (paintNode as PaintFunction)(pos[0], pos[1], color);
  } else {
    (paintNode as PaintFunction3D)(pos[0], pos[1], pos[2], color);
  }
}

// Auxiliary function to paint the path and threads
async function paintPathAndThreads(
  path: number[][],
  start: number[],
  goal: number[],
  maze: number[][] | number[][][],
  viewType: "2D" | "3D",
  paintNode: PaintNode,
  paintThread: PaintThreadFunction | undefined,
  delayMs: number
) {
  for (let i = 0; i < path.length; i++) {
    const p = path[i];

    // Paint the node
    if (!isSamePos(p, start) && !isSamePos(p, goal)) {
      callPaintNode(viewType, paintNode, p, COLORS.PATH);
      await delay(delayMs / 2);
    }

    // Check if this is a portal transition (z-level change between consecutive path points)
    if (viewType === "3D" && i < path.length - 1 && paintThread) {
      const currentPos = p as [number, number, number];
      const nextPos = path[i + 1] as [number, number, number];

      // If z-coordinate changes, this is a portal transition
      if (currentPos[2] !== nextPos[2]) {
        const maze3D = maze as number[][][];
        const currentCell = maze3D[currentPos[2]][currentPos[1]][currentPos[0]];
        const nextCell = maze3D[nextPos[2]][nextPos[1]][nextPos[0]];

        // Paint the thread if transitioning through portals
        if (
          (currentCell === CELL_TYPES.PORTAL_UP &&
            nextCell === CELL_TYPES.PORTAL_DOWN) ||
          (currentCell === CELL_TYPES.PORTAL_DOWN &&
            nextCell === CELL_TYPES.PORTAL_UP)
        ) {
          // Apply layer spacing to z-coordinate before calling paintThread
          const layerSpacing = 10; // Should match the value from Maze3DView
          const adjustedCurrentPos: [number, number, number] = [
            currentPos[0],
            currentPos[1],
            currentPos[2] * layerSpacing + 1, // +1 to match spherePositions.y in Maze3DView
          ];
          const adjustedNextPos: [number, number, number] = [
            nextPos[0],
            nextPos[1],
            nextPos[2] * layerSpacing + 1,
          ];
          paintThread(adjustedCurrentPos, adjustedNextPos, COLORS.PATH);
        }
      }
    }
  }
}

/** BFS */
export async function breadthFirstSearch(
  maze: number[][] | number[][][],
  start: number[],
  goal: number[],
  paintNode: PaintNode,
  delayMs: number = 50,
  viewType: "2D" | "3D",
  paintThread?: PaintThreadFunction,
  abortSignal?: AbortSignal
): Promise<SearchResult> {
  const queue: number[][] = [start];
  const visited = new Set<string>();
  const parentMap = new Map<string, number[]>();
  visited.add(posKey(start));
  let visitedCount = 0;
  while (queue.length > 0) {
    if (abortSignal?.aborted) throw new DOMException("Aborted", "AbortError");
    const current = queue.shift()!;
    visitedCount++;
    if (!isSamePos(current, start) && !isSamePos(current, goal)) {
      callPaintNode(viewType, paintNode, current, COLORS.VISITED);
      await delay(delayMs);
    }
    if (isSamePos(current, goal)) {
      const path = reconstructPath(parentMap, start, goal);
      await paintPathAndThreads(
        path,
        start,
        goal,
        maze,
        viewType,
        paintNode,
        paintThread,
        delayMs
      );
      return { path, visitedCount, success: true };
    }
    const neighbors =
      viewType === "2D"
        ? getNeighbors2D(current as [number, number], maze as number[][])
        : getNeighbors3D(
            current as [number, number, number],
            maze as number[][][]
          );
    for (const neighbor of neighbors) {
      const key = posKey(neighbor);
      if (!visited.has(key)) {
        visited.add(key);
        parentMap.set(key, current);
        queue.push(neighbor);
        if (!isSamePos(neighbor, goal))
          callPaintNode(viewType, paintNode, neighbor, COLORS.FRONTIER);
      }
    }
  }
  return { path: [], visitedCount, success: false };
}

/** DFS */
export async function depthFirstSearch(
  maze: number[][] | number[][][],
  start: number[],
  goal: number[],
  paintNode: PaintNode,
  delayMs: number = 50,
  viewType: "2D" | "3D",
  paintThread?: PaintThreadFunction,
  abortSignal?: AbortSignal
): Promise<SearchResult> {
  const stack: number[][] = [start];
  const visited = new Set<string>();
  const parentMap = new Map<string, number[]>();
  visited.add(posKey(start));
  let visitedCount = 0;
  while (stack.length > 0) {
    if (abortSignal?.aborted) throw new DOMException("Aborted", "AbortError");
    const current = stack.pop()!;
    visitedCount++;
    if (!isSamePos(current, start) && !isSamePos(current, goal)) {
      callPaintNode(viewType, paintNode, current, COLORS.VISITED);
      await delay(delayMs);
    }
    if (isSamePos(current, goal)) {
      const path = reconstructPath(parentMap, start, goal);
      await paintPathAndThreads(
        path,
        start,
        goal,
        maze,
        viewType,
        paintNode,
        paintThread,
        delayMs
      );
      return { path, visitedCount, success: true };
    }
    const neighbors =
      viewType === "2D"
        ? getNeighbors2D(current as [number, number], maze as number[][])
        : getNeighbors3D(
            current as [number, number, number],
            maze as number[][][]
          );
    for (const neighbor of neighbors) {
      const key = posKey(neighbor);
      if (!visited.has(key)) {
        visited.add(key);
        parentMap.set(key, current);
        stack.push(neighbor);
        if (!isSamePos(neighbor, goal))
          callPaintNode(viewType, paintNode, neighbor, COLORS.FRONTIER);
      }
    }
  }
  return { path: [], visitedCount, success: false };
}

/** A* Search */
export async function aStarSearch(
  maze: number[][] | number[][][],
  start: number[],
  goal: number[],
  paintNode: PaintNode,
  delayMs: number = 50,
  viewType: "2D" | "3D",
  paintThread?: PaintThreadFunction,
  abortSignal?: AbortSignal
): Promise<SearchResult> {
  const heuristic = (pos: number[]) =>
    Math.abs(pos[0] - goal[0]) +
    Math.abs(pos[1] - goal[1]) +
    Math.abs(pos[2] - goal[2]);

  interface Node {
    pos: number[];
    g: number;
    h: number;
    f: number;
  }

  const openSet: Node[] = [
    { pos: start, g: 0, h: heuristic(start), f: heuristic(start) },
  ];
  const visited = new Set<string>();
  const parentMap = new Map<string, number[]>();
  const gScore = new Map<string, number>();
  gScore.set(posKey(start), 0);
  let visitedCount = 0;

  while (openSet.length > 0) {
    if (abortSignal?.aborted) throw new DOMException("Aborted", "AbortError");
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    const key = posKey(current.pos);
    if (visited.has(key)) continue;
    visited.add(key);
    visitedCount++;

    if (!isSamePos(current.pos, start) && !isSamePos(current.pos, goal)) {
      callPaintNode(viewType, paintNode, current.pos, COLORS.VISITED);
      await delay(delayMs);
    }

    if (isSamePos(current.pos, goal)) {
      const path = reconstructPath(parentMap, start, goal);
      await paintPathAndThreads(
        path,
        start,
        goal,
        maze,
        viewType,
        paintNode,
        paintThread,
        delayMs
      );
      return { path, visitedCount, success: true };
    }

    const neighbors =
      viewType === "2D"
        ? getNeighbors2D(current.pos as [number, number], maze as number[][])
        : getNeighbors3D(
            current.pos as [number, number, number],
            maze as number[][][]
          );
    for (const neighbor of neighbors) {
      const nKey = posKey(neighbor);
      if (visited.has(nKey)) continue;
      const tentativeG = current.g + 1;
      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        parentMap.set(nKey, current.pos);
        gScore.set(nKey, tentativeG);
        const h = heuristic(neighbor);
        openSet.push({ pos: neighbor, g: tentativeG, h, f: tentativeG + h });
        if (!isSamePos(neighbor, goal))
          callPaintNode(viewType, paintNode, neighbor, COLORS.FRONTIER);
      }
    }
  }

  return { path: [], visitedCount, success: false };
}

/** Dijkstra's Algorithm */
export async function dijkstraSearch(
  maze: number[][] | number[][][],
  start: number[],
  goal: number[],
  paintNode: PaintNode,
  delayMs: number = 50,
  viewType: "2D" | "3D",
  paintThread?: PaintThreadFunction,
  abortSignal?: AbortSignal
): Promise<SearchResult> {
  interface Node {
    pos: number[];
    cost: number;
  }

  const openSet: Node[] = [{ pos: start, cost: 0 }];
  const visited = new Set<string>();
  const parentMap = new Map<string, number[]>();
  const costMap = new Map<string, number>();
  costMap.set(posKey(start), 0);
  let visitedCount = 0;

  while (openSet.length > 0) {
    if (abortSignal?.aborted) throw new DOMException("Aborted", "AbortError");
    openSet.sort((a, b) => a.cost - b.cost);
    const current = openSet.shift()!;
    const key = posKey(current.pos);
    if (visited.has(key)) continue;
    visited.add(key);
    visitedCount++;

    if (!isSamePos(current.pos, start) && !isSamePos(current.pos, goal)) {
      callPaintNode(viewType, paintNode, current.pos, COLORS.VISITED);
      await delay(delayMs);
    }

    if (isSamePos(current.pos, goal)) {
      const path = reconstructPath(parentMap, start, goal);
      await paintPathAndThreads(
        path,
        start,
        goal,
        maze,
        viewType,
        paintNode,
        paintThread,
        delayMs
      );
      return { path, visitedCount, success: true };
    }

    const neighbors =
      viewType === "2D"
        ? getNeighbors2D(current.pos as [number, number], maze as number[][])
        : getNeighbors3D(
            current.pos as [number, number, number],
            maze as number[][][]
          );
    for (const neighbor of neighbors) {
      const nKey = posKey(neighbor);
      if (visited.has(nKey)) continue;
      const newCost = current.cost + 1;
      if (newCost < (costMap.get(nKey) ?? Infinity)) {
        parentMap.set(nKey, current.pos);
        costMap.set(nKey, newCost);
        openSet.push({ pos: neighbor, cost: newCost });
        if (!isSamePos(neighbor, goal))
          callPaintNode(viewType, paintNode, neighbor, COLORS.FRONTIER);
      }
    }
  }
  return { path: [], visitedCount, success: false };
}

/** Greedy Best-First Search */
export async function greedyBestFirstSearch(
  maze: number[][] | number[][][],
  start: number[],
  goal: number[],
  paintNode: PaintNode,
  delayMs: number = 50,
  viewType: "2D" | "3D",
  paintThread?: PaintThreadFunction,
  abortSignal?: AbortSignal
): Promise<SearchResult> {
  const heuristic = (pos: number[]) =>
    pos.reduce((sum, v, i) => sum + Math.abs(v - goal[i]), 0);

  interface Node {
    pos: number[];
    h: number;
  }

  const openSet: Node[] = [{ pos: start, h: heuristic(start) }];
  const visited = new Set<string>();
  const parentMap = new Map<string, number[]>();
  visited.add(posKey(start));
  let visitedCount = 0;
  while (openSet.length > 0) {
    if (abortSignal?.aborted) throw new DOMException("Aborted", "AbortError");
    openSet.sort((a, b) => a.h - b.h);
    const current = openSet.shift()!;
    visitedCount++;

    if (!isSamePos(current.pos, start) && !isSamePos(current.pos, goal)) {
      callPaintNode(viewType, paintNode, current.pos, COLORS.VISITED);
      await delay(delayMs);
    }
    if (isSamePos(current.pos, goal)) {
      const path = reconstructPath(parentMap, start, goal);
      await paintPathAndThreads(
        path,
        start,
        goal,
        maze,
        viewType,
        paintNode,
        paintThread,
        delayMs
      );
      return { path, visitedCount, success: true };
    }
    const neighbors =
      viewType === "2D"
        ? getNeighbors2D(current.pos as [number, number], maze as number[][])
        : getNeighbors3D(
            current.pos as [number, number, number],
            maze as number[][][]
          );
    for (const neighbor of neighbors) {
      const key = posKey(neighbor);
      if (!visited.has(key)) {
        visited.add(key);
        parentMap.set(key, current.pos);
        openSet.push({ pos: neighbor, h: heuristic(neighbor) });
        if (!isSamePos(neighbor, goal))
          callPaintNode(viewType, paintNode, neighbor, COLORS.FRONTIER);
      }
    }
  }
  return { path: [], visitedCount, success: false };
}
