function getColorByProximity(dist) {
  if (dist < 1) return 0xff0000;
  if (dist < 2) return 0xffff00;
  return 0x00ff00;
}

function calculateDistance(p1, p2) {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) + Math.pow(p1.z - p2.z, 2)
  );
}

class Pathfinding {
    constructor(gridSize = 50, cellSize = 1) {
        this.gridSize = gridSize;
        this.cellSize = cellSize;
        this.grid = this.createGrid();
    }

    createGrid() {
        const grid = [];
        for (let i = 0; i < this.gridSize; i++) {
            grid[i] = [];
            for (let j = 0; j < this.gridSize; j++) {
                grid[i][j] = 0; // 0 = walkable, 1 = obstacle
            }
        }
        return grid;
    }

    setObstacle(x, z) {
        const gridX = Math.floor(x / this.cellSize) + this.gridSize / 2;
        const gridZ = Math.floor(z / this.cellSize) + this.gridSize / 2;
        if (gridX >= 0 && gridX < this.gridSize && gridZ >= 0 && gridZ < this.gridSize) {
            this.grid[gridX][gridZ] = 1;
        }
    }

    findPath(start, end) {
        const startX = Math.floor(start.x / this.cellSize) + this.gridSize / 2;
        const startZ = Math.floor(start.z / this.cellSize) + this.gridSize / 2;
        const endX = Math.floor(end.x / this.cellSize) + this.gridSize / 2;
        const endZ = Math.floor(end.z / this.cellSize) + this.gridSize / 2;

        const openSet = [{ x: startX, z: startZ, f: 0, g: 0, h: 0, parent: null }];
        const closedSet = new Set();
        const path = [];

        while (openSet.length > 0) {
            let current = openSet[0];
            let currentIndex = 0;

            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].f < current.f) {
                    current = openSet[i];
                    currentIndex = i;
                }
            }

            if (current.x === endX && current.z === endZ) {
                let temp = current;
                while (temp.parent) {
                    path.push(new THREE.Vector3(
                        (temp.x - this.gridSize / 2) * this.cellSize,
                        0,
                        (temp.z - this.gridSize / 2) * this.cellSize
                    ));
                    temp = temp.parent;
                }
                return path.reverse();
            }

            openSet.splice(currentIndex, 1);
            closedSet.add(`${current.x},${current.z}`);

            const neighbors = this.getNeighbors(current);
            for (const neighbor of neighbors) {
                if (closedSet.has(`${neighbor.x},${neighbor.z}`)) continue;

                const gScore = current.g + 1;
                let gScoreIsBest = false;

                if (!openSet.some(node => node.x === neighbor.x && node.z === neighbor.z)) {
                    gScoreIsBest = true;
                    neighbor.h = this.heuristic(neighbor, { x: endX, z: endZ });
                    openSet.push(neighbor);
                } else if (gScore < neighbor.g) {
                    gScoreIsBest = true;
                }

                if (gScoreIsBest) {
                    neighbor.parent = current;
                    neighbor.g = gScore;
                    neighbor.f = neighbor.g + neighbor.h;
                }
            }
        }

        return []; // No path found
    }

    getNeighbors(node) {
        const neighbors = [];
        const dirs = [
            { x: 0, z: 1 },
            { x: 1, z: 0 },
            { x: 0, z: -1 },
            { x: -1, z: 0 }
        ];

        for (const dir of dirs) {
            const x = node.x + dir.x;
            const z = node.z + dir.z;

            if (x >= 0 && x < this.gridSize && z >= 0 && z < this.gridSize && this.grid[x][z] === 0) {
                neighbors.push({ x, z, f: 0, g: 0, h: 0, parent: null });
            }
        }

        return neighbors;
    }

    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
    }
}