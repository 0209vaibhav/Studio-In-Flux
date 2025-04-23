// Priority Queue implementation for pathfinding
class PriorityQueue {
  constructor() {
    this.elements = [];
  }

  enqueue(element, priority) {
    this.elements.push({ element, priority });
    this.elements.sort((a, b) => a.priority - b.priority);
  }

  dequeue() {
    return this.elements.shift()?.element;
  }

  isEmpty() {
    return this.elements.length === 0;
  }
}

      // Add global variables
      let divisionsSlider, desksSlider, arrangementSelector, operatorsSlider;
      let divisions = 2;
      let desks = 10;
      let arrangement = "row";
      let operatorSpeed = 1;
      let welcomeContainer;

      // Add console log for debugging
      console.log("Script loaded");

      // Simple throttle function for smooth updates
      function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
          if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
          }
        }
      }

      let cellSize = 10; // Initialize cellSize as a variable
      const studioSize = 54;
      const gridWidth = studioSize;
      const gridHeight = studioSize;
      const deskWidth = 2; // 2 ft
      const deskHeight = 6; // 2 ft
      const deskMargin = 1; // 1 ft buffer from boundaries for desk placement
      let uniformMargin = 80; // Canvas margin for white space

      let grid = [];
      let deskPositions = [];
      let operatorAgents = [];
      let operatorSource = { x: Math.floor(gridWidth / 2), y: -1 };
      let operatorExit = { x: Math.floor(gridWidth / 2), y: gridHeight };
      let placementMode = 'default';

      // Add distance map for pathfinding
      let distanceMap = [];
      
      // Add global variables for persistent path tracking
      let globalHeatMap = {};
      let maxVisits = 0;

      // Add simulation control variables
      let isSimulationPaused = false;
      let entrySelector, exitSelector, startStopButton, resetButton, clearHeatmapButton;

      let legendCanvas;
      let corridorType = "single";

      // Add global variables for statistics
      let desksInteracted = 0;
      let operatorsCompleted = 0;

      // Add global variables for frame control
      let lastFrameTime = 0;
      const BASE_FRAME_INTERVAL = 16; // ~60fps for smoother animation
      let isUpdating = false;

      // Add timer variables
      let simulationStartTime = 0;
      let simulationElapsedTime = 0;
      let lastTimerUpdate = 0;

      // Add heatmap optimization variables
      let heatmapUpdateInterval = 10; // Reduce heatmap updates to prevent flickering
      let frameCount = 0;
      let heatmapColorCache = new Map();

      let interactedDesks = new Set(); // Add this new global variable to track interacted desks

      // Add global variable to store exited operators and their trails
      let exitedOperators = [];

      let trailLegendCanvas; // Add trail legend canvas variable

      // Add this constant at the top of the file with other global variables
      const LEGEND_MARGIN = 10;
      const LEGEND_HEIGHT = 15;

      // Add global variables for scoring
      let layoutScores = {
        efficiency: 0,
        spaceUtilization: 0,
        comfort: 0
      };

      // Add a global variable to store the last valid safety score
      let lastValidSafetyScore = 0;

      function initializeDistanceMap() {
        // Initialize distance map with Infinity
        distanceMap = Array(gridHeight).fill().map(() => Array(gridWidth).fill(Infinity));
        
        // Find the closest valid point to the entry point
        let entryX = operatorSource.x;
        let entryY = Math.max(0, Math.min(gridHeight - 1, operatorSource.y + 1));
        
        // Set entry point distance to 0
        let queue = [{x: entryX, y: entryY, distance: 0}];
        distanceMap[entryY][entryX] = 0;
        
        while (queue.length > 0) {
          // Sort queue to process closest points first
          queue.sort((a, b) => a.distance - b.distance);
          let current = queue.shift();
          
          let moves = [
            {x: current.x + 1, y: current.y},
            {x: current.x - 1, y: current.y},
            {x: current.x, y: current.y + 1},
            {x: current.x, y: current.y - 1}
          ];
          
          for (let move of moves) {
            if (move.x >= 0 && move.x < gridWidth && 
                move.y >= 0 && move.y < gridHeight && 
                grid[move.y][move.x] !== 1) {
              let newDistance = current.distance + 1;
              if (newDistance < distanceMap[move.y][move.x]) {
                distanceMap[move.y][move.x] = newDistance;
                queue.push({x: move.x, y: move.y, distance: newDistance});
              }
            }
          }
        }
      }

      function isValidMove(x, y, agent) {
        // Basic boundary check
        if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) {
          return false;
        }

        // Check if the move would put us in a desk
        if (grid[y][x] === 1) {
          // Allow if it's the agent's assigned desk and they're trying to interact with it
          if (agent && agent.assignedDesk && !agent.hasInteracted) {
            // Check if this position is adjacent to the assigned desk
            const deskDx = Math.abs(x - agent.assignedDesk.x);
            const deskDy = Math.abs(y - agent.assignedDesk.y);
            
            // Only allow movement to positions directly adjacent to the desk (not inside it)
            if ((deskDx === 1 && deskDy === 0) || (deskDx === 0 && deskDy === 1)) {
              return true;
            }
          }
          return false;
        }

        // Check for other agents with more lenient spacing
        for (let other of operatorAgents) {
          if (other === agent || other.hasExited) continue;
          
          // Direct collision check
          if (other.x === x && other.y === y) {
            return false;
          }

          // Check if we're trying to swap positions with another agent
          if (agent.prevX !== undefined && agent.prevY !== undefined &&
              other.prevX !== undefined && other.prevY !== undefined) {
            if (x === other.prevX && y === other.prevY &&
                other.x === agent.prevX && other.y === agent.prevY) {
              return false;
            }
          }

          // More lenient personal space check - only prevent direct adjacency if both agents are stationary
          const dx = Math.abs(x - other.x);
          const dy = Math.abs(y - other.y);
          if (dx + dy === 1) { // Adjacent orthogonally
            // Allow if either agent is moving
            const agentIsMoving = agent.prevX !== x || agent.prevY !== y;
            const otherIsMoving = other.prevX !== other.x || other.prevY !== other.y;
            if (!agentIsMoving && !otherIsMoving) {
            return false;
            }
          }
        }

        return true;
      }

      function findNextMove(agent) {
        // Store previous position for crossing detection
        agent.prevX = agent.x;
        agent.prevY = agent.y;

        // Check if agent has valid assigned desk
        if (!agent.assignedDesk) {
          if (!agent.hasExited) {
            agent.hasExited = true;
            operatorsCompleted++;
            updateStatistics();
          }
          return null;
        }

        // If not at assigned desk, move towards it
        if (!agent.hasInteracted) {
          // Check if near assigned desk
          const dx = Math.abs(agent.x - agent.assignedDesk.x);
          const dy = Math.abs(agent.y - agent.assignedDesk.y);
          
          // If adjacent to desk, start interaction
          if (dx <= 1 && dy <= 1 && (dx === 0 || dy === 0)) {
            if (!agent.isInteracting) {
              agent.isInteracting = true;
              agent.interactionStartTime = performance.now();
            }
            
            // Check if interaction time has elapsed (3 seconds)
            if (agent.isInteracting && performance.now() - agent.interactionStartTime >= 3000) {
              agent.hasInteracted = true;
              agent.isInteracting = false;
              desksInteracted++;
              // Add desk to interacted set
              interactedDesks.add(`${agent.assignedDesk.x},${agent.assignedDesk.y}`);
              updateStatistics();
              
              // Try to move away from desk in priority order: opposite direction, perpendicular directions
              const awayMoves = [];
              
              // Add move away from desk
              if (dx === 1) {
                awayMoves.push({x: agent.x + (agent.x > agent.assignedDesk.x ? 1 : -1), y: agent.y});
              } else if (dy === 1) {
                awayMoves.push({x: agent.x, y: agent.y + (agent.y > agent.assignedDesk.y ? 1 : -1)});
              }
              
              // Add perpendicular moves
              awayMoves.push({x: agent.x + 1, y: agent.y});
              awayMoves.push({x: agent.x - 1, y: agent.y});
              awayMoves.push({x: agent.x, y: agent.y + 1});
              awayMoves.push({x: agent.x, y: agent.y - 1});
              
              // Try each move in priority order
              for (const move of awayMoves) {
                if (isValidMove(move.x, move.y, agent)) {
                  return move;
                }
              }
            }
            return null; // Stay in place while interacting
          }
          
          // Move towards desk using pathfinding
          return findPathWithDijkstra(agent, agent.assignedDesk);
        }

        // After reaching desk, move to exit
        if (agent.hasInteracted) {
          // Calculate path to exit based on exit point location
          let targetX = operatorExit.x;
          let targetY = operatorExit.y;
          
          // Adjust target based on exit point location
          if (operatorExit.y === -1) targetY = 0;
          else if (operatorExit.y === gridHeight) targetY = gridHeight - 1;
          else if (operatorExit.x === -1) targetX = 0;
          else if (operatorExit.x === gridWidth) targetX = gridWidth - 1;
          
          // Simple direct movement towards exit if close
          const dx = targetX - agent.x;
          const dy = targetY - agent.y;
          
          if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
            // Try direct moves to exit
            const moves = [
              { x: targetX, y: targetY },
              { x: agent.x + Math.sign(dx), y: agent.y },
              { x: agent.x, y: agent.y + Math.sign(dy) }
            ];
            
            for (const move of moves) {
              if (isValidMove(move.x, move.y, agent)) {
                return move;
              }
            }
          }

          // Use pathfinding for longer distances
          return findPathWithDijkstra(agent, {x: targetX, y: targetY});
        }

        return null;
      }

      function findPathWithDijkstra(agent, target) {
        // Improved heuristic function for A* with congestion avoidance
        function heuristic(x1, y1, x2, y2) {
          const dx = Math.abs(x1 - x2);
          const dy = Math.abs(y1 - y2);
          
          // Base cost using Manhattan distance
          let cost = (dx + dy);
          
          // Add congestion cost
          let congestionCost = 0;
          for (let other of operatorAgents) {
            if (other === agent || other.hasExited) continue;
            const odx = Math.abs(x1 - other.x);
            const ody = Math.abs(y1 - other.y);
            if (odx <= 2 && ody <= 2) { // Consider nearby operators
              congestionCost += 3 / (odx + ody + 1); // Higher cost for closer operators
            }
          }
          
          // Reduce cost for moves towards exit for interacted agents
          if (agent.hasInteracted) {
            // Calculate distance to exit
            const exitX = operatorExit.x === -1 ? 0 : 
                         operatorExit.x === gridWidth ? gridWidth - 1 : 
                         operatorExit.x;
            const exitY = operatorExit.y === -1 ? 0 : 
                         operatorExit.y === gridHeight ? gridHeight - 1 : 
                         operatorExit.y;
            
            const currentDistToExit = Math.abs(agent.x - exitX) + Math.abs(agent.y - exitY);
            const newDistToExit = Math.abs(x1 - exitX) + Math.abs(y1 - exitY);
            
            // Reward moves that get closer to exit
            if (newDistToExit < currentDistToExit) {
              cost *= 0.5;
            }
          }
          
          return cost * (1.0 + congestionCost);
        }

        // Initialize data structures
        let openSet = new PriorityQueue();
        let cameFrom = new Map();
        let gScore = new Map();
        let fScore = new Map();
        let closedSet = new Set();
        let maxAttempts = 1000; // Prevent infinite loops
        let attempts = 0;

        // Initialize scores
        const startKey = `${agent.x},${agent.y}`;
        gScore.set(startKey, 0);
        fScore.set(startKey, heuristic(agent.x, agent.y, target.x, target.y));
        openSet.enqueue({ x: agent.x, y: agent.y }, fScore.get(startKey));

        while (!openSet.isEmpty() && attempts++ < maxAttempts) {
          let current = openSet.dequeue();
          const currentKey = `${current.x},${current.y}`;

          // Check if we've reached the target or are adjacent to it
          if (Math.abs(current.x - target.x) <= 1 && Math.abs(current.y - target.y) <= 1) {
            // Reconstruct path
            let path = [];
            let currentPos = current;
            while (cameFrom.has(`${currentPos.x},${currentPos.y}`)) {
              path.unshift(currentPos);
              currentPos = cameFrom.get(`${currentPos.x},${currentPos.y}`);
            }
            
            // If path is empty or only has one step, return the first step towards target
            if (path.length === 0) {
              // Try to move directly towards target while avoiding obstacles
              const dx = Math.sign(target.x - agent.x);
              const dy = Math.sign(target.y - agent.y);
              const directMoves = [
                { x: agent.x + dx, y: agent.y },
                { x: agent.x, y: agent.y + dy }
              ];
              
              // Add diagonal move if both orthogonal moves are valid
              if (isValidMove(agent.x + dx, agent.y, agent) && 
                  isValidMove(agent.x, agent.y + dy, agent)) {
                directMoves.push({ x: agent.x + dx, y: agent.y + dy });
              }
              
              // Try each move
              for (const move of directMoves) {
                if (isValidMove(move.x, move.y, agent)) {
                  return move;
                }
              }
            }
            
            return path[0] || current;
          }

          closedSet.add(currentKey);

          // Define possible moves (orthogonal only)
          const moves = [
            { dx: 0, dy: -1 }, // up
            { dx: 0, dy: 1 },  // down
            { dx: -1, dy: 0 }, // left
            { dx: 1, dy: 0 }   // right
          ];

          // If agent has interacted and is near exit, prioritize moves towards exit
          if (agent.hasInteracted) {
            const exitX = operatorExit.x === -1 ? 0 : 
                         operatorExit.x === gridWidth ? gridWidth - 1 : 
                         operatorExit.x;
            const exitY = operatorExit.y === -1 ? 0 : 
                         operatorExit.y === gridHeight ? gridHeight - 1 : 
                         operatorExit.y;
            
            // Sort moves by distance to exit
            moves.sort((a, b) => {
              const distA = Math.abs(current.x + a.dx - exitX) + Math.abs(current.y + a.dy - exitY);
              const distB = Math.abs(current.x + b.dx - exitX) + Math.abs(current.y + b.dy - exitY);
              return distA - distB;
            });
          }

          for (const move of moves) {
            const neighbor = {
              x: current.x + move.dx,
              y: current.y + move.dy
            };
            
            const neighborKey = `${neighbor.x},${neighbor.y}`;
            
            if (closedSet.has(neighborKey)) continue;
            
            // Skip if out of bounds or invalid move
            if (!isValidMove(neighbor.x, neighbor.y, agent)) {
              continue;
            }

            // Calculate costs
            const tentativeGScore = gScore.get(currentKey) + 1;
            
            if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
              cameFrom.set(neighborKey, current);
              gScore.set(neighborKey, tentativeGScore);
              const h = heuristic(neighbor.x, neighbor.y, target.x, target.y);
              fScore.set(neighborKey, tentativeGScore + h);
              
              if (!openSet.elements.some(e => e.element.x === neighbor.x && e.element.y === neighbor.y)) {
                openSet.enqueue(neighbor, fScore.get(neighborKey));
              }
            }
          }
        }

        // If no path found, try direct moves towards target
        const dx = Math.sign(target.x - agent.x);
        const dy = Math.sign(target.y - agent.y);
        
        const directMoves = [
          { x: agent.x + dx, y: agent.y },
          { x: agent.x, y: agent.y + dy },
          { x: agent.x + dx, y: agent.y + dy }
        ];
        
        for (const move of directMoves) {
          if (isValidMove(move.x, move.y, agent)) {
            return move;
          }
        }
        
        return null;
      }

      function calculateMoveCost(x, y, agent) {
        let baseCost = 1;
        
        // Add cost for proximity to furniture
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            let checkX = x + dx;
            let checkY = y + dy;
            if (checkX >= 0 && checkX < gridWidth && 
                checkY >= 0 && checkY < gridHeight && 
                grid[checkY][checkX] === 1) {
              let distance = Math.sqrt(dx * dx + dy * dy);
              baseCost += 2 / (distance + 1);
            }
          }
        }
        
        // Add cost for proximity to other agents
        for (let other of operatorAgents) {
          if (other === agent) continue;
          let dx = x - other.x;
          let dy = y - other.y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 3) {
            baseCost += 3 / (distance + 1);
          }
        }
        
        return baseCost;
      }

      function calculateMaxDesks() {
        // Get current division dimensions
        let numDivisions = divisions;
        let numRows, numCols;
        
        if (numDivisions === 2) {
          numRows = 1;
          numCols = 2;
        } else if (numDivisions === 9) {
          numRows = 3;
          numCols = 3;
        } else {
          numRows = 2;
          numCols = 2;
        }

        if (corridorType === 'double') {
          if (arrangement === 'row') {
            switch(numDivisions) {
              case 2:
                return 88; // 44 desks per division
              case 4:
                return 80; // 20 desks per division
              case 9:
                return 54; // 6 desks per division
              default:
                return 0;
            }
          } else if (arrangement === 'column') {
            switch(numDivisions) {
              case 2:
                return 90; // 45 desks per division
              case 4:
                return 80; // 20 desks per division
              case 9:
                return 54; // 6 desks per division
              default:
                return 0;
            }
          }
        } else {
          // Calculate path and division sizes
          const pathWidth = 6; // 6ft yellow path
          const totalUsableWidth = gridWidth - (pathWidth * (numCols - 1));
          const totalUsableHeight = gridHeight - (pathWidth * (numRows - 1));
          const divWidth = Math.floor(totalUsableWidth / numCols);
          const divHeight = Math.floor(totalUsableHeight / numRows);

          let maxDesksPerDivision = 0;

          if (arrangement === 'row') {
            // For row arrangement
            const deskWidth = 6; // 6ft wide
            const deskHeight = 2; // 2ft deep
            const minSpacing = 6; // Minimum 6ft between rows

            // Calculate desks per row
            const desksPerRow = Math.floor(divWidth / deskWidth);
            
            // Calculate total rows with proper spacing
            const totalRows = Math.floor((divHeight + minSpacing) / (deskHeight + minSpacing));
            
            maxDesksPerDivision = desksPerRow * totalRows;
          } else if (arrangement === 'column') {
            // For column arrangement
            const deskWidth = 2; // 2ft wide
            const deskHeight = 6; // 6ft deep
            const minSpacing = 6; // Minimum 6ft between columns

            // Calculate desks per column
            const desksPerColumn = Math.floor(divHeight / deskHeight);
            
            // Calculate total columns with proper spacing
            const totalColumns = Math.floor((divWidth + minSpacing) / (deskWidth + minSpacing));
            
            maxDesksPerDivision = desksPerColumn * totalColumns;
          }

          return maxDesksPerDivision * numDivisions;
        }
      }

      function updateSliderLimits() {
        const maxDesks = calculateMaxDesks();
        const desksSlider = document.getElementById('desks-slider');
        const operatorsSlider = document.getElementById('operators-slider');
        const desksValue = document.getElementById('desks-value');
        const operatorsValue = document.getElementById('operators-value');

        // Set desks to maximum for current layout
        desksSlider.max = maxDesks;
        desksSlider.value = maxDesks;
        desksValue.textContent = maxDesks;
        desks = maxDesks;

        // Sync operators with desks
        operatorsSlider.value = maxDesks;
        operatorsValue.textContent = maxDesks;
        numOperators = maxDesks;

        // Update simulation with new values
        resetSimulation();
      }

      // Update divisions event listener
      document.getElementById('divisions-slider').addEventListener('input', function() {
        divisions = parseInt(this.value);
        document.getElementById('divisions-value').textContent = divisions;
        updateSliderLimits(); // This will now set desks to maximum
      });

      // Update corridor type event listener
      document.getElementById('corridor-type-selector').addEventListener('change', function() {
        corridorType = this.value;
        updateSliderLimits(); // This will now set desks to maximum
      });

      // Update arrangement event listener
      document.getElementById('arrangement-selector').addEventListener('change', function() {
        arrangement = this.value;
        updateSliderLimits(); // This will now set desks to maximum
      });

      function setup() {
        console.log("Setup function called");
        
        // Get welcome container reference
        welcomeContainer = document.getElementById('welcome-container');
        console.log("Welcome container:", welcomeContainer);
        
        // Add event listener for start button
        document.getElementById('start-simulation').addEventListener('click', () => {
          console.log("Start simulation clicked");
          welcomeContainer.style.display = 'none';
        });
        
        // Calculate the available space
        let availableWidth = windowWidth - 600;
        let availableHeight = windowHeight;
        console.log("Available space:", { width: availableWidth, height: availableHeight });
        
        // Use a single uniform margin for all sides
        cellSize = Math.floor(Math.min(
          (availableWidth - uniformMargin * 2) / gridWidth,
          (availableHeight - uniformMargin * 2) / gridHeight
        ));
        console.log("Calculated cell size:", cellSize);
        
        // Create canvas with the exact size needed for the grid plus margins
        let canvasWidth = gridWidth * cellSize + (uniformMargin * 2);
        let canvasHeight = gridHeight * cellSize + (uniformMargin * 2);
        console.log("Canvas dimensions:", { width: canvasWidth, height: canvasHeight });
        
        let canvas = createCanvas(canvasWidth, canvasHeight, P2D);
        canvas.parent('simulation-container');
        frameRate(60);
        
        // Enable double buffering
        canvas.elt.style.imageRendering = 'pixelated';
        console.log("Canvas created and configured");
        
        // Initialize grid and arrays
        grid = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(0));
        deskPositions = [];
        operatorAgents = [];

        // Set default entry and exit positions
        setDefaultEntryExit();

        // Get references to HTML elements
        divisionsSlider = document.getElementById('divisions-slider');
        desksSlider = document.getElementById('desks-slider');
        arrangementSelector = document.getElementById('arrangement-selector');
        operatorsSlider = document.getElementById('operators-slider');
        speedSlider = document.getElementById('speed-slider');
        entrySelector = document.getElementById('entry-selector');
        exitSelector = document.getElementById('exit-selector');
        startStopButton = document.getElementById('start-stop-button');
        resetButton = document.getElementById('reset-button');
        clearHeatmapButton = document.getElementById('clear-heatmap-button');
        corridorTypeSelector = document.getElementById('corridor-type-selector');

        // Set default values
        divisionsSlider.value = 1; // Set to 2 divisions (value 1 corresponds to 2 divisions)
        divisions = 2;
        document.getElementById('divisions-value').textContent = divisions;

        // Update slider limits and get max desks
        updateSliderLimits();
        let maxDesks = parseInt(desksSlider.max);
        desksSlider.value = maxDesks;
        desks = maxDesks;
        document.getElementById('desks-value').textContent = maxDesks;

        // Set operators to match number of desks exactly
        operatorsSlider.value = maxDesks;
        document.getElementById('operators-value').textContent = maxDesks;

        // Set speed to initial value
        speedSlider.value = operatorSpeed;
        document.getElementById('speed-value').textContent = operatorSpeed;

        // Update slider appearances
        desksSlider.style.background = `linear-gradient(to right, #000000 100%, #cccccc 100%)`;
        operatorsSlider.style.background = `linear-gradient(to right, #000000 100%, #cccccc 100%)`;
        speedSlider.style.background = `linear-gradient(to right, #000000 100%, #cccccc 100%)`;

        // Initialize frame timing
        lastFrameTime = performance.now();

        let isUpdating = false;
        let updatePending = false;

        // Function to update values without triggering redraws
        function updateValues() {
          if (isUpdating) {
            updatePending = true;
            return;
          }
          
          isUpdating = true;
          
          // Update divisions
          let sliderValue = parseInt(divisionsSlider.value);
          if (sliderValue === 1) divisions = 2;
          else if (sliderValue === 2) divisions = 4;
          else if (sliderValue === 3) divisions = 9;
          document.getElementById('divisions-value').textContent = divisions;
          
          // Update slider limits based on new division count
          updateSliderLimits();
          
          isUpdating = false;
          
          if (updatePending) {
            updatePending = false;
            requestAnimationFrame(updateValues);
          }
        }

        // Modify the throttled redraw function
        const throttledRedraw = throttle(() => {
          // Only update grid and redraw if simulation is paused
          if (isSimulationPaused) {
            placeDesksInDivisions();
            clear();
            push();
            translate(uniformMargin, uniformMargin);
            drawGrid();
            drawDivisions();
            drawDesks();
            drawHeatMap();
            drawEntryExitPoints();
            pop();
          }
        }, 16); // ~60fps

        // Delayed full reset
        const delayedReset = throttle(() => {
        resetSimulation();
        }, 250);

        // Update event listeners
        divisionsSlider.addEventListener('input', () => {
          if (!isSimulationPaused) return;
          updateValues();
          throttledRedraw();
        });

        divisionsSlider.addEventListener('change', delayedReset);

        desksSlider.addEventListener('input', () => {
          if (!isSimulationPaused) return;
          
          // Ensure value is a multiple of divisions
          let newValue = parseInt(desksSlider.value);
          newValue = Math.floor(newValue / divisions) * divisions;
          
          // Update slider value and display
          desksSlider.value = newValue;
          desks = newValue;
          document.getElementById('desks-value').textContent = newValue;
          
          // Update slider appearance
          const maxDesks = parseInt(desksSlider.max);
          const percentage = (newValue / maxDesks) * 100;
          desksSlider.style.background = `linear-gradient(to right, 
            #000000 ${percentage}%, 
            #cccccc ${percentage}%)`;
          
          throttledRedraw();
        });

        desksSlider.addEventListener('change', delayedReset);

        arrangementSelector.addEventListener('change', () => {
          arrangement = arrangementSelector.value;
          updateSliderLimits();
          throttledRedraw();
          delayedReset();
        });

        operatorsSlider.addEventListener('input', () => {
          if (!isSimulationPaused) return;
          
          let opCount = parseInt(operatorsSlider.value);
          document.getElementById('operators-value').textContent = opCount;
          
          // Update slider appearance
          const operatorPercentage = (opCount / 200) * 100;
          operatorsSlider.style.background = `linear-gradient(to right, 
            #000000 ${operatorPercentage}%, 
            #cccccc ${operatorPercentage}%)`;
            
          throttledRedraw();
        });

        operatorsSlider.addEventListener('change', delayedReset);

        corridorTypeSelector.addEventListener('change', () => {
          corridorType = corridorTypeSelector.value;
          updateSliderLimits();
          throttledRedraw();
          delayedReset();
        });

        // Setup both legend canvases with proper dimensions
        const legendWidth = 280;
        
        // Setup heatmap legend canvas with extra height for text
        let legendElement = document.getElementById('legend-canvas');
        legendCanvas = createGraphics(legendWidth, 35); // 35px height to accommodate text
        legendElement.width = legendWidth;
        legendElement.height = 35;

        // Setup trail legend canvas
        let trailLegendElement = document.getElementById('trail-legend-canvas');
        trailLegendCanvas = createGraphics(legendWidth, 20);
        trailLegendElement.width = legendWidth;
        trailLegendElement.height = 20;

        // Add event listeners for entry/exit selectors
        entrySelector.addEventListener('change', () => {
          placementMode = entrySelector.value === 'set' ? 'entry' : 'default';
          if (placementMode === 'default') {
            setDefaultEntry();
            initializeDistanceMap();
          }
        });

        exitSelector.addEventListener('change', () => {
          placementMode = exitSelector.value === 'set' ? 'exit' : 'default';
          if (placementMode === 'default') {
            setDefaultExit();
            initializeDistanceMap();
          }
        });

        startStopButton.addEventListener('click', () => {
          isSimulationPaused = !isSimulationPaused;
          startStopButton.textContent = isSimulationPaused ? 'Start' : 'Stop';
        });

        resetButton.addEventListener('click', resetSimulation);

        clearHeatmapButton.addEventListener('click', () => {
          globalHeatMap = {};
          maxVisits = 0;
          drawHeatMapLegend();
        });

        // Place desks in divisions
        placeDesksInDivisions();

        // Initialize distance map for pathfinding
        initializeDistanceMap();

        // Start simulation in paused state
        isSimulationPaused = true;
        startStopButton.textContent = 'Start';
        
        // Initialize operators
        let opCount = parseInt(operatorsSlider.value) || 0;
        for (let i = 0; i < opCount; i++) {
          operatorAgents.push({
            x: Math.max(0, Math.min(gridWidth - 1, operatorSource.x)),
            y: Math.max(0, Math.min(gridHeight - 1, operatorSource.y + 1)),
            startX: operatorSource.x,
            startY: operatorSource.y,
            visited: new Set(),
            pathColor: color(random(100, 255), random(100), random(100), 150),
            targetDesk: null,
            desksVisited: 0,
            isExiting: false,
            hasExited: false,
            visitedDesks: new Set(),
            interactionTime: 0,
            isInteracting: false,
            prevX: operatorSource.x,
            prevY: operatorSource.y
          });
        }

        // Clear and redraw the heat map legend
        drawHeatMapLegend();
        
        // Force immediate redraw to show initial state
        draw();

        // Initial update of slider limits
        updateSliderLimits();

        // Update statistics for initial state
        updateStatistics();

        // Update speed slider event listener
        speedSlider.addEventListener('input', () => {
            operatorSpeed = parseInt(speedSlider.value);
            document.getElementById('speed-value').textContent = operatorSpeed;
            // Update slider appearance
            const percentage = ((operatorSpeed - speedSlider.min) / (speedSlider.max - speedSlider.min)) * 100;
            speedSlider.style.background = `linear-gradient(to right, #000000 ${percentage}%, #cccccc ${percentage}%)`;
        });

        // Draw both legends
        drawHeatMapLegend();
        drawTrailLengthLegend();
      }

      function setDefaultEntryExit() {
        // Set default entry and exit positions (middle of top and bottom edges)
        operatorSource = { 
          x: Math.floor(gridWidth / 2), // Middle of top edge
          y: -1 // Outside the grid at the top
        };
        
        operatorExit = { 
          x: Math.floor(gridWidth / 2), // Middle of bottom edge
          y: gridHeight // Outside the grid at the bottom
        };
      }

      function setDefaultEntry() {
        operatorSource = { 
          x: Math.floor(gridWidth / 2), // Middle of top edge
          y: -1 // Outside the grid at the top
        };
      }

      function setDefaultExit() {
        operatorExit = { 
          x: Math.floor(gridWidth / 2), // Middle of bottom edge
          y: gridHeight // Outside the grid at the bottom
        };
      }

      function windowResized() {
        // Calculate the available space
        let availableWidth = windowWidth - 600;
        let availableHeight = windowHeight;
        
        // Calculate cell size to fit the entire studio
        let newCellSize = Math.floor(Math.min(
          (availableWidth - uniformMargin * 2) / gridWidth,
          (availableHeight - uniformMargin * 2) / gridHeight
        ));
        
        // Only resize if cell size has actually changed
        if (newCellSize !== cellSize) {
          cellSize = newCellSize;
          
          // Resize canvas with uniform margins
          let canvasWidth = gridWidth * cellSize + (uniformMargin * 2);
          let canvasHeight = gridHeight * cellSize + (uniformMargin * 2);
          resizeCanvas(canvasWidth, canvasHeight, true);
          
          // Force immediate redraw
          placeDesksInDivisions();
          draw();
        }
      }

      function draw() {
        background(255);

        // Update simulation timer
        updateSimulationTimer();

        // Add translation to center the grid with uniform margins
        translate(uniformMargin, uniformMargin);

        drawGrid();
        drawDivisions();
        drawDesks();
        drawHeatMap();
        drawHeatMapLegend();
        drawEntryExitPoints();

        // Update and draw operators
        if (!isSimulationPaused) {
        updateOperators();
        }
        drawOperators();

        // Update legends less frequently to prevent flickering
        if (frameCount % 30 === 0) { // Only update every 30 frames
          drawHeatMapLegend();
          drawTrailLengthLegend();
        }
        
        // Update scores if simulation is running
        if (!isSimulationPaused) {
          calculateLayoutScores();
          updateScoreDisplay();
        }
      }

      function updateOperators() {
        const currentTime = performance.now();
        const speedMultiplier = 0.05 + (operatorSpeed * 0.05);
        const frameInterval = BASE_FRAME_INTERVAL / speedMultiplier;
        
        if (currentTime - lastFrameTime < frameInterval) {
            return;
        }
        
        lastFrameTime = currentTime;

        // First pass: mark operators for removal if they're at exit
        for (let agent of operatorAgents) {
            // Only check agents that have interacted with their desk
            if (!agent.hasInteracted) continue;

            // Get exit target position
            let targetX = operatorExit.x;
            let targetY = operatorExit.y;
            
            // Adjust target based on exit point location
            if (operatorExit.y === -1) targetY = 0;
            else if (operatorExit.y === gridHeight) targetY = gridHeight - 1;
            else if (operatorExit.x === -1) targetX = 0;
            else if (operatorExit.x === gridWidth) targetX = gridWidth - 1;

            // Check if agent is at exit position
            if (agent.x === targetX && agent.y === targetY) {
                if (!agent.hasExited) {
                    agent.hasExited = true;
                    operatorsCompleted++;
                    // Store exited operator and their trail
                    exitedOperators.push(agent);
                    updateStatistics();
                }
            }
        }

        // Remove exited operators from active list
        operatorAgents = operatorAgents.filter(agent => !agent.hasExited);

        // Second pass: update remaining operators
        const updates = Math.max(1, Math.ceil(speedMultiplier));
        for (let i = 0; i < updates; i++) {
            for (let agent of operatorAgents) {
                if (!agent.assignedDesk) {
                    if (!agent.hasExited) {
                        agent.hasExited = true;
                        operatorsCompleted++;
                        // Store exited operator and their trail
                        exitedOperators.push(agent);
                        updateStatistics();
                    }
                    continue;
                }

                agent.prevX = agent.x;
                agent.prevY = agent.y;
                
                let nextMove = findNextMove(agent);
                if (nextMove) {
                    agent.x = nextMove.x;
                    agent.y = nextMove.y;
                    // Add point to trail
                    if (!agent.trail) agent.trail = [];
                    agent.trail.push({x: agent.x, y: agent.y});
                    updateHeatMap(agent.x, agent.y);
                }
            }
        }

        // Update statistics and scores in real-time
        updateStatistics();
        calculateLayoutScores();
      }

      function drawOperators() {
        // Find the longest trail length
        let maxTrailLength = 0;
        for (let agent of [...operatorAgents, ...exitedOperators]) {
          if (agent.trail && agent.trail.length > maxTrailLength) {
            maxTrailLength = agent.trail.length;
          }
        }

        // Draw trails for all operators (both active and exited)
        for (let agent of [...operatorAgents, ...exitedOperators]) {
          if (agent.trail && agent.trail.length > 1) {
            const relativeLength = agent.trail.length / maxTrailLength; // How long this trail is compared to longest

            // Draw the trail as segments to create smooth gradient
            for (let i = 0; i < agent.trail.length - 1; i++) {
              const progress = i / (agent.trail.length - 1);
              const nextProgress = (i + 1) / (agent.trail.length - 1);
              
              // Current point color
              let r1, g1, b1;
              if (progress < 0.5) {
                // First half: Green to Yellow
                r1 = 255 * (progress * 2);
                g1 = 255;
                b1 = 0;
        } else {
                // Second half: Yellow to end color (determined by relative length)
                const endProgress = (progress - 0.5) * 2; // Normalize 0.5-1 to 0-1
                r1 = 255; // Red stays at max after yellow
                g1 = 255 * (1 - (endProgress * relativeLength)); // Green decreases based on relative length
                b1 = 0;
              }
              
              // Next point color
              let r2, g2, b2;
              if (nextProgress < 0.5) {
                // First half: Green to Yellow
                r2 = 255 * (nextProgress * 2);
                g2 = 255;
                b2 = 0;
              } else {
                // Second half: Yellow to end color (determined by relative length)
                const endProgress = (nextProgress - 0.5) * 2; // Normalize 0.5-1 to 0-1
                r2 = 255; // Red stays at max after yellow
                g2 = 255 * (1 - (endProgress * relativeLength)); // Green decreases based on relative length
                b2 = 0;
              }
              
              // Draw trail segment with reduced thickness
              strokeWeight(1); // Reduced from default thickness
              stroke(r1, g1, b1, 150);
              line(
                agent.trail[i].x * cellSize + cellSize/2,
                agent.trail[i].y * cellSize + cellSize/2,
                agent.trail[i + 1].x * cellSize + cellSize/2,
                agent.trail[i + 1].y * cellSize + cellSize/2
              );
            }
          }
        }

        // Draw all active operators
          for (let agent of operatorAgents) {
            // Skip drawing if at exit position
            if ((operatorExit.y === gridHeight && agent.y === gridHeight - 1) ||
                (operatorExit.y === -1 && agent.y === 0) ||
                (operatorExit.x === -1 && agent.x === 0) ||
                (operatorExit.x === gridWidth && agent.x === gridWidth - 1)) {
                continue;
            }

          if (agent.isInteracting || agent.hasInteracted) {
              // Find closest distance to any other operator for base color
              let minDistance = Infinity;
              for (let other of operatorAgents) {
                if (other === agent || other.hasExited) continue;
                const dx = Math.abs(agent.x - other.x);
                const dy = Math.abs(agent.y - other.y);
                const distance = Math.sqrt(dx * dx + dy * dy);
                minDistance = Math.min(minDistance, distance);
              }

              // Set base color based on distance
              if (minDistance <= 1) {
                fill(255, 0, 0);  // Red for unsafe distance (<1ft)
              } else if (minDistance <= 3) {
                fill(255, 255, 0);  // Yellow for warning distance (2-3ft)
              } else {
                fill(0, 255, 0);  // Green for safe distance (>4ft)
              }
              
            // Add black stroke for interacting or completed operators
              stroke(0);
            strokeWeight(1);
            } else {
              // Find closest distance to any other operator
              let minDistance = Infinity;
              for (let other of operatorAgents) {
                if (other === agent || other.hasExited) continue;
                const dx = Math.abs(agent.x - other.x);
                const dy = Math.abs(agent.y - other.y);
                const distance = Math.sqrt(dx * dx + dy * dy);
                minDistance = Math.min(minDistance, distance);
              }

              // Set color based on distance
              if (minDistance <= 1) {
                fill(255, 0, 0);  // Red for unsafe distance (<1ft)
              } else if (minDistance <= 3) {
                fill(255, 255, 0);  // Yellow for warning distance (2-3ft)
              } else {
                fill(0, 255, 0);  // Green for safe distance (>4ft)
              }
            noStroke(); // Remove stroke for non-interacting and non-completed operators
            }
            
            // Draw operator
            ellipse(agent.x * cellSize + cellSize/2, agent.y * cellSize + cellSize/2, cellSize * 0.8, cellSize * 0.8);
            
          // Add task completed arrow for operators that have interacted
          if (agent.hasInteracted && !agent.isInteracting) {
              push();
              translate(agent.x * cellSize + cellSize/2, agent.y * cellSize + cellSize/2);
              stroke(0);
            strokeWeight(1);
              noFill();
            // Draw checkmark-style arrow
              beginShape();
              vertex(-cellSize * 0.2, 0);
              vertex(0, cellSize * 0.2);
              vertex(cellSize * 0.2, -cellSize * 0.2);
              endShape();
              pop();
          }
        }
      }

      function mousePressed() {
        if (placementMode === 'entry' || placementMode === 'exit') {
          // Convert mouse coordinates to grid coordinates, accounting for translation
          let gridX = Math.floor((mouseX - uniformMargin) / cellSize);
          let gridY = Math.floor((mouseY - uniformMargin) / cellSize);
          
          // Check if click is on any edge of the grid
          let isOnEdge = (
            (gridY === -1 && gridX >= 0 && gridX < gridWidth) || // Top edge
            (gridY === gridHeight && gridX >= 0 && gridX < gridWidth) || // Bottom edge
            (gridX === -1 && gridY >= 0 && gridY < gridHeight) || // Left edge
            (gridX === gridWidth && gridY >= 0 && gridY < gridHeight) // Right edge
          );
          
          if (isOnEdge) {
            if (placementMode === 'entry') {
              operatorSource = { x: gridX, y: gridY };
            } else if (placementMode === 'exit') {
              operatorExit = { x: gridX, y: gridY };
            }
            // Reset placement mode to default after placing a point
            placementMode = 'default';
            document.querySelector('select').value = 'default';
            // Reinitialize distance map for new entry point
            initializeDistanceMap();
          }
        }
      }

      function resetSimulation() {
        // Reset timer
        simulationElapsedTime = 0;
        lastTimerUpdate = performance.now();
        document.getElementById('simulation-time').textContent = '0s';

        // Reset grid and positions
        grid = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(0));
       
        operatorAgents = [];
        exitedOperators = []; // Clear exited operators and their trails
        interactedDesks.clear(); // Clear the interacted desks set

        // Reset statistics
        desksInteracted = 0;
        operatorsCompleted = 0;
        updateStatistics();

        // Reset scores
        layoutScores = {
          efficiency: 0,
          spaceUtilization: 0,
          comfort: 0
        };
        updateScoreDisplay();

        // Clear heat map and trails
        globalHeatMap = {};
        maxVisits = 0;
        heatmapColorCache.clear();
        frameCount = 0;
        
        // Start in paused state
        isSimulationPaused = true;  
        startStopButton.textContent = 'Start';
        
        // Place desks in divisions
        placeDesksInDivisions();

        // Initialize new operators at the current entry point
        let spawnPoint = findValidSpawnPoint();
        if (spawnPoint && deskPositions.length > 0) {
          // Create a shuffled array of desk indices for random assignment
          let deskIndices = Array.from({length: deskPositions.length}, (_, i) => i);
          for (let i = deskIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deskIndices[i], deskIndices[j]] = [deskIndices[j], deskIndices[i]];
          }

          // Get the current operator count from the slider
          let opCount = parseInt(operatorsSlider.value);

          // Create operators with assigned desks
          for (let i = 0; i < opCount; i++) {
            let assignedDesk = deskPositions[deskIndices[i % deskPositions.length]];
            if (assignedDesk) {
              operatorAgents.push({
                x: spawnPoint.x,
                y: spawnPoint.y,
                startX: spawnPoint.x,
                startY: spawnPoint.y,
                visited: new Set(),
                trail: [{x: spawnPoint.x, y: spawnPoint.y}], // Initialize trail array
                assignedDesk: assignedDesk,
                assignedDeskNumber: assignedDesk.number,
                hasInteracted: false,
                hasExited: false,
                visitedDesks: new Set(),
                prevX: spawnPoint.x,
                prevY: spawnPoint.y
              });
            }
          }
        }

        // Update area statistics
        calculateAreas();
        
        // Force immediate redraw to show initial state
        draw();

        // Reset speed to initial value
        operatorSpeed = 1;
        speedSlider.value = operatorSpeed;
        document.getElementById('speed-value').textContent = operatorSpeed;

        // Reset the last valid safety score
        lastValidSafetyScore = 0;
      }

      function placeDesksInDivisions() {
        // Calculate division dimensions
        let numDivisions = divisions;
        let numRows, numCols;
        
        // Special handling for 2 divisions
        if (numDivisions === 2) {
          numRows = 1;
          numCols = 2;
        } else if (numDivisions === 9) {
          numRows = 3;
          numCols = 3;
        } else {
          numRows = 2;
          numCols = 2;
        }

        // Initialize grid
        grid = Array(gridHeight).fill().map(() => Array(gridWidth).fill(0));
        deskPositions = [];

        // Calculate path and division sizes
        const pathWidth = 6; // 6ft yellow path
        const totalUsableWidth = gridWidth - (pathWidth * (numCols - 1)); // Total width minus paths
        const totalUsableHeight = gridHeight - (pathWidth * (numRows - 1)); // Total height minus paths
        const divWidth = Math.floor(totalUsableWidth / numCols);
        const divHeight = Math.floor(totalUsableHeight / numRows);

        // Calculate desks per division
        let desksPerDivision = Math.floor(desks / numDivisions);
        let remainingDesks = desks % numDivisions;

        // Place desks division by division
        let currentDiv = 0;
        for (let row = 0; row < numRows && currentDiv < numDivisions; row++) {
          for (let col = 0; col < numCols && currentDiv < numDivisions; col++) {
            // Calculate division boundaries accounting for yellow paths
            let divStartX = col * (divWidth + pathWidth);
            let divStartY = row * (divHeight + pathWidth);
            let divEndX = divStartX + divWidth;
            let divEndY = divStartY + divHeight;

            // Calculate desks for this division
            let divisionDesks = desksPerDivision + (currentDiv < remainingDesks ? 1 : 0);

            if (arrangement === 'row' && corridorType === 'double') {
              // Calculate desk dimensions
              const deskWidth = 6; // 6ft wide
              const deskHeight = 2; // 2ft tall
              const rowSpacing = 6; // 6ft between single rows
              const pairSpacing = 8; // 8ft total spacing (2ft desk + 6ft clear space) between pairs
              
              // Calculate max desks in a row
              const maxDesksInRow = Math.floor(divWidth / deskWidth);
              
              // Calculate number of rows that can fit with proper spacing
              const maxRows = Math.floor((divHeight + rowSpacing) / (deskHeight + pairSpacing));
              
              // Calculate total space needed for desks in a row
              let totalDeskWidth = Math.min(divisionDesks, maxDesksInRow) * deskWidth;
              
              // Center the desk block horizontally in the division
              let startX = divStartX + Math.floor((divWidth - totalDeskWidth) / 2);
              
              let currentDesk = 0;
              
              // Place desks row by row
              for (let rowPos = 0; rowPos < maxRows && currentDesk < divisionDesks; rowPos++) {
                // Calculate Y position based on whether previous row was a pair
                let prevWasPair = rowPos > 0 && grid[Math.floor(divStartY + (rowPos - 1) * (deskHeight + pairSpacing) + deskHeight)][startX] === 1;
                let rowY;
                
                if (rowPos === 0) {
                    rowY = divStartY; // First row starts at division start
                } else if (prevWasPair) {
                    rowY = divStartY + rowPos * (deskHeight + pairSpacing); // After a pair, use pair spacing
                } else {
                    rowY = divStartY + (rowPos - 1) * (deskHeight + pairSpacing) + deskHeight + rowSpacing; // After single row, use row spacing
                }

                let canPair = true;
                
                // Check if this row touches a boundary or path
                if (rowY <= divStartY) canPair = false; // Top edge
                if (rowY + deskHeight >= divEndY) canPair = false; // Bottom edge
                if (row > 0 && rowY <= divStartY + deskHeight) canPair = false; // Near top path
                if (row < numRows - 1 && rowY + deskHeight >= divEndY - deskHeight) canPair = false; // Near bottom path
                
                // Place desks in this row
                for (let col = 0; col < maxDesksInRow && currentDesk < divisionDesks; col++) {
                  let deskX = startX + (col * deskWidth);
                  
                  // Place first desk
                  if (deskX >= divStartX && (deskX + deskWidth) <= divEndX &&
                      rowY >= divStartY && (rowY + deskHeight) <= divEndY) {
                    for (let y = 0; y < deskHeight; y++) {
                      for (let x = 0; x < deskWidth; x++) {
                        let gridX = deskX + x;
                        let gridY = rowY + y;
                        if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
                          grid[gridY][gridX] = 1;
                        }
                      }
                    }
                    deskPositions.push({x: deskX, y: rowY});
                    currentDesk++;
                  }
                  
                  // Place paired desk if allowed and needed
                  if (canPair && currentDesk < divisionDesks) {
                    let pairedY = rowY + deskHeight;
                    if (pairedY >= divStartY && (pairedY + deskHeight) <= divEndY) {
                      for (let y = 0; y < deskHeight; y++) {
                        for (let x = 0; x < deskWidth; x++) {
                          let gridX = deskX + x;
                          let gridY = pairedY + y;
                          if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
                            grid[gridY][gridX] = 1;
                          }
                        }
                      }
                      deskPositions.push({x: deskX, y: pairedY});
                      currentDesk++;
                    }
                  }
                }
              }
            } else if (arrangement === 'column' && corridorType === 'double') {
              // Calculate desk dimensions
              const deskWidth = 2; // 2ft wide
              const deskHeight = 6; // 6ft tall
              const colSpacing = 6; // 6ft between single columns
              const pairSpacing = 8; // 8ft total spacing (2ft desk + 6ft clear space) between pairs
              
              // Calculate max desks in a column
              const maxDesksInCol = Math.floor(divHeight / deskHeight);
              
              // Calculate number of columns that can fit with proper spacing
              const maxCols = Math.floor((divWidth + colSpacing) / (deskWidth + pairSpacing));
              
              // Calculate total space needed for desks in a column
              let totalDeskHeight = Math.min(divisionDesks, maxDesksInCol) * deskHeight;
              
              // Center the desk block vertically in the division
              let startY = divStartY + Math.floor((divHeight - totalDeskHeight) / 2);
              
              let currentDesk = 0;
              
              // Place desks column by column
              for (let colPos = 0; colPos < maxCols && currentDesk < divisionDesks; colPos++) {
                // Calculate X position based on whether previous column was a pair
                let prevWasPair = colPos > 0 && grid[startY][Math.floor(divStartX + (colPos - 1) * (deskWidth + pairSpacing) + deskWidth)] === 1;
                let colX;
                
                if (colPos === 0) {
                    colX = divStartX; // First column starts at division start
                } else if (prevWasPair) {
                    colX = divStartX + colPos * (deskWidth + pairSpacing); // After a pair, use pair spacing
                } else {
                    colX = divStartX + (colPos - 1) * (deskWidth + pairSpacing) + deskWidth + colSpacing; // After single column, use column spacing
                }

                let canPair = true;
                
                // Check if this column touches a boundary or path
                if (colX <= divStartX) canPair = false; // Left edge
                if (colX + deskWidth >= divEndX) canPair = false; // Right edge
                if (col > 0 && colX <= divStartX + deskWidth) canPair = false; // Near left path
                if (col < numCols - 1 && colX + deskWidth >= divEndX - deskWidth) canPair = false; // Near right path
                
                // Place desks in this column
                for (let row = 0; row < maxDesksInCol && currentDesk < divisionDesks; row++) {
                  let deskY = startY + (row * deskHeight);
                  
                  // Place first desk
                  if (colX >= divStartX && (colX + deskWidth) <= divEndX &&
                      deskY >= divStartY && (deskY + deskHeight) <= divEndY) {
                    for (let y = 0; y < deskHeight; y++) {
                      for (let x = 0; x < deskWidth; x++) {
                        let gridX = colX + x;
                        let gridY = deskY + y;
                        if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
                          grid[gridY][gridX] = 1;
                        }
                      }
                    }
                    deskPositions.push({x: colX, y: deskY});
                    currentDesk++;
                  }
                  
                  // Place paired desk if allowed and needed
                  if (canPair && currentDesk < divisionDesks) {
                    let pairedX = colX + deskWidth;
                    if (pairedX >= divStartX && (pairedX + deskWidth) <= divEndX) {
                      for (let y = 0; y < deskHeight; y++) {
                        for (let x = 0; x < deskWidth; x++) {
                          let gridX = pairedX + x;
                          let gridY = deskY + y;
                          if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
                            grid[gridY][gridX] = 1;
                          }
                        }
                      }
                      deskPositions.push({x: pairedX, y: deskY});
                      currentDesk++;
                    }
                  }
                }
              }
            } else if (arrangement === 'row') {
              // Single-loaded row arrangement
              // Calculate desk dimensions
              let deskWidth = 6; // 6ft wide
              let deskHeight = 2; // 2ft tall
              
              // Calculate how many desks can fit in a row
              let maxDesksInRow = Math.floor(divWidth / deskWidth);
              let rowsNeeded = Math.ceil(divisionDesks / maxDesksInRow);
              
              // Calculate total space needed for desks
              let totalDeskWidth = Math.min(divisionDesks, maxDesksInRow) * deskWidth;
              let totalDeskHeight = rowsNeeded * (deskHeight + 6) - 6; // 6ft spacing between rows
              
              // Center the desk block in the division
              let startX = divStartX + Math.floor((divWidth - totalDeskWidth) / 2);
              let startY = divStartY + Math.floor((divHeight - totalDeskHeight) / 2);
              
              // Place desks in rows
              let currentDesk = 0;
              for (let deskRow = 0; deskRow < rowsNeeded && currentDesk < divisionDesks; deskRow++) {
                let rowDesks = Math.min(maxDesksInRow, divisionDesks - currentDesk);
                let rowWidth = rowDesks * deskWidth;
                let rowStartX = startX + Math.floor((totalDeskWidth - rowWidth) / 2);
                
                for (let deskCol = 0; deskCol < rowDesks; deskCol++) {
                  let deskX = rowStartX + deskCol * deskWidth;
                  let deskY = startY + deskRow * (deskHeight + 6);
                  
                  // Verify desk position is within division bounds and not in yellow path
                  if (deskX >= divStartX && (deskX + deskWidth) <= divEndX &&
                      deskY >= divStartY && (deskY + deskHeight) <= divEndY) {
                    // Place desk
                    for (let y = 0; y < deskHeight; y++) {
                      for (let x = 0; x < deskWidth; x++) {
                        let gridX = deskX + x;
                        let gridY = deskY + y;
                        if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
                          grid[gridY][gridX] = 1;
                        }
                      }
                    }
                    deskPositions.push({x: deskX, y: deskY});
                    currentDesk++;
                  }
                }
              }
            } else if (arrangement === 'column') {
              // Single-loaded column arrangement
              // Calculate desk dimensions
              const deskWidth = 2; // 2ft wide
              const deskHeight = 6; // 6ft tall
              const colSpacing = 6; // 6ft between columns
              
              // Calculate max desks in a column
              const maxDesksInCol = Math.floor(divHeight / deskHeight);
              
              // Calculate number of columns needed
              const colsNeeded = Math.ceil(divisionDesks / maxDesksInCol);
              
              // Calculate total space needed for desks
              let totalDeskHeight = Math.min(divisionDesks, maxDesksInCol) * deskHeight;
              let totalDeskWidth = colsNeeded * (deskWidth + colSpacing) - colSpacing;
              
              // Center the desk block in the division
              let startX = divStartX + Math.floor((divWidth - totalDeskWidth) / 2);
              let startY = divStartY + Math.floor((divHeight - totalDeskHeight) / 2);
              
              // Place desks in columns
              let currentDesk = 0;
              for (let colPos = 0; colPos < colsNeeded && currentDesk < divisionDesks; colPos++) {
                let colDesks = Math.min(maxDesksInCol, divisionDesks - currentDesk);
                let colHeight = colDesks * deskHeight;
                let colStartY = startY + Math.floor((totalDeskHeight - colHeight) / 2);
                let colX = startX + colPos * (deskWidth + colSpacing);
                
                // Skip if column would be in a path
                if (colX < divStartX || colX + deskWidth > divEndX) continue;
                
                for (let row = 0; row < colDesks; row++) {
                  let deskY = colStartY + (row * deskHeight);
                  
                  // Verify desk position is within division bounds and not in yellow path
                  if (deskY >= divStartY && (deskY + deskHeight) <= divEndY) {
                    // Place desk
                    for (let y = 0; y < deskHeight; y++) {
                      for (let x = 0; x < deskWidth; x++) {
                        let gridX = colX + x;
                        let gridY = deskY + y;
                        if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
                          grid[gridY][gridX] = 1;
                        }
                      }
                    }
                    deskPositions.push({x: colX, y: deskY});
                    currentDesk++;
                  }
                }
              }
            }
            currentDiv++;
          }
        }

        // Update area statistics after placing desks
        calculateAreas();
        
        // Update statistics after placing desks
        updateStatistics();
      }

      function drawGrid() {
        // Draw the main grid
        stroke(220);
        strokeWeight(0.5);
        
        // Draw vertical lines
        for (let x = 0; x <= gridWidth; x++) {
          line(x * cellSize, 0, x * cellSize, gridHeight * cellSize);
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= gridHeight; y++) {
          line(0, y * cellSize, gridWidth * cellSize, y * cellSize);
        }

        // Draw thicker lines every 6 feet for better scale reference
        stroke(180);
        strokeWeight(1);
        for (let i = 0; i <= gridWidth; i += 6) {
          line(i * cellSize, 0, i * cellSize, gridHeight * cellSize);
          line(0, i * cellSize, gridWidth * cellSize, i * cellSize);
        }

        // Draw studio boundary
        stroke(0);
        strokeWeight(2);
            noFill();
        rect(0, 0, gridWidth * cellSize, gridHeight * cellSize);

        // Add dimension labels
        textSize(10);
        fill(100);
        noStroke();
        
        // Label every 6 feet
        for (let i = 0; i <= gridWidth; i += 6) {
          // X-axis labels (below the grid)
          push();
          translate(i * cellSize, gridHeight * cellSize);
          textAlign(CENTER, TOP);
          text(i + 'ft', 0, 5);
          pop();
          
          // Y-axis labels (left of grid)
          push();
          textAlign(RIGHT, CENTER);
          text(i + 'ft', -5, i * cellSize);
          pop();
        }
      }

      function drawDivisions() {
        // Calculate number of rows and columns based on divisions
        let numDivisions = divisions;
        let numRows, numCols;
        
        // Special handling for 2 divisions
        if (numDivisions === 2) {
          numRows = 1;
          numCols = 2;
        } else if (numDivisions === 9) {
          // For 9 divisions, create a perfect 3x3 grid
          numRows = 3;
          numCols = 3;
        } else {
          numRows = 2;
          numCols = 2;
        }

        // Calculate total available space
        const totalWidth = gridWidth * cellSize;
        const totalHeight = gridHeight * cellSize;
        
        // Calculate path and division sizes
        const pathWidth = 6 * cellSize; // 6ft yellow path
        const effectivePathWidth = 3 * cellSize; // 3ft from each division
        
        // Calculate division sizes accounting for paths
        const availableWidth = totalWidth - (pathWidth * (numCols - 1));
        const availableHeight = totalHeight - (pathWidth * (numRows - 1));
        const divWidth = availableWidth / numCols;
        const divHeight = availableHeight / numRows;
        
        // Draw light grey paths between divisions
        noStroke();
        fill(240, 240, 240, 100); // Very light grey with some transparency
        
        // Draw vertical paths
        for (let i = 1; i < numCols; i++) {
          const pathX = (i * divWidth) + ((i - 1) * pathWidth);
          rect(pathX, 0, pathWidth, totalHeight);
        }
        
        // Draw horizontal paths
        for (let i = 1; i < numRows; i++) {
          const pathY = (i * divHeight) + ((i - 1) * pathWidth);
          rect(0, pathY, totalWidth, pathWidth);
        }
        
        // Draw orange borders around non-path areas
        noFill();
        stroke(0); // Changed from orange to black
        strokeWeight(1); // Made thinner
        drawingContext.setLineDash([5, 5]); // Added dashed pattern
        
        // Draw borders for each division
        for (let row = 0; row < numRows; row++) {
          for (let col = 0; col < numCols; col++) {
            const x = col * (divWidth + pathWidth);
            const y = row * (divHeight + pathWidth);
            rect(x, y, divWidth, divHeight);
          }
        }
        
        // Draw red division lines
        stroke(255, 0, 0);
        strokeWeight(1);
        // Already dashed from above, no need to set again
        
        // Draw vertical division lines - centered in paths
        for (let i = 1; i < numCols; i++) {
          const pathX = (i * divWidth) + ((i - 1) * pathWidth);
          const lineX = pathX + (pathWidth / 2);
          line(lineX, 0, lineX, totalHeight);
        }
        
        // Draw horizontal division lines - centered in paths
        for (let i = 1; i < numRows; i++) {
          const pathY = (i * divHeight) + ((i - 1) * pathWidth);
          const lineY = pathY + (pathWidth / 2);
          line(0, lineY, totalWidth, lineY);
        }
        
        // Reset the line dash pattern
        drawingContext.setLineDash([]);
      }

      function drawDesks() {
        // Draw each desk individually
        let processedCells = new Set();
        let deskNumber = 1;
        
        for (let y = 0; y < gridHeight; y++) {
          for (let x = 0; x < gridWidth; x++) {
            let key = `${x},${y}`;
            if (grid[y][x] === 1 && !processedCells.has(key)) {
              // Check if this is the start of a desk
              let isDesk = true;
              let width = arrangement === 'row' ? deskHeight : deskWidth;  // 6ft wide for rows, 2ft for columns
              let height = arrangement === 'row' ? deskWidth : deskHeight; // 2ft tall for rows, 6ft for columns
              
              // Verify the full desk area
              for (let dy = 0; dy < height && isDesk; dy++) {
                for (let dx = 0; dx < width && isDesk; dx++) {
                  if (y + dy >= gridHeight || x + dx >= gridWidth || grid[y + dy][x + dx] !== 1) {
                    isDesk = false;
                  }
                }
              }
              
              if (isDesk) {
                // Check if this desk has been interacted with using the persistent set
                let hasBeenInteracted = interactedDesks.has(`${x},${y}`);

                // Set color based on interaction status
                if (hasBeenInteracted) {
                  fill(101, 67, 33); // Dark brown for interacted desks
                  stroke(50, 33, 16); // Darker outline
                } else {
                  fill(210, 180, 140); // Light brown (tan) for uninteracted desks
                  stroke(101, 67, 33); // Dark brown outline
                }
                
                strokeWeight(2);
                rect(x * cellSize, y * cellSize, width * cellSize, height * cellSize);
                
                // Draw chair
                push();
                if (hasBeenInteracted) {
                  fill(81, 47, 13); // Darker brown for interacted desk chairs
                  stroke(30, 13, 0);
                } else {
                  fill(190, 160, 120); // Lighter brown for uninteracted desk chairs
                  stroke(81, 47, 13);
                }
                strokeWeight(1);

                // Check if this is part of a desk pair in double-loaded corridor
                let isPaired = false;
                let isSecondInPair = false;

                if (corridorType === 'double') {
                  if (arrangement === 'row') {
                    // Check for vertical pairing (one desk above another)
                    isPaired = y + height < gridHeight && grid[y + height][x] === 1;
                    isSecondInPair = y > 0 && grid[y - height][x] === 1;
                  } else { // column arrangement
                    // Check for horizontal pairing (one desk next to another)
                    isPaired = x + width < gridWidth && grid[y][x + width] === 1;
                    isSecondInPair = x > 0 && grid[y][x - width] === 1;
                  }
                }

                // Define chair dimensions (1.5ft x 1.5ft)
                const chairSize = 1.5 * cellSize;

                // Position chair based on arrangement and pairing
                if (arrangement === 'row') {
                  if (corridorType === 'double' && (isPaired || isSecondInPair)) {
                    // For paired rows, place chairs on opposite ends
                    if (!isSecondInPair) { // First desk in pair
                      rectMode(CORNER);
                      rect(x * cellSize + (width * cellSize - chairSize) / 2, // Center horizontally
                           y * cellSize - chairSize, // Position above desk
                           chairSize,
                           chairSize,
                           4); // Rounded corners with 4px radius
                    } else { // Second desk in pair
                      rectMode(CORNER);
                      rect(x * cellSize + (width * cellSize - chairSize) / 2, // Center horizontally
                           (y + height) * cellSize, // Position below desk
                           chairSize,
                           chairSize,
                           4); // Rounded corners with 4px radius
                    }
                  } else {
                    // Single row desk, chair goes below
                    rectMode(CORNER);
                    rect(x * cellSize + (width * cellSize - chairSize) / 2, // Center horizontally
                         (y + height) * cellSize, // Position below desk
                         chairSize,
                         chairSize,
                         4); // Rounded corners with 4px radius
                  }
                } else { // column arrangement
                  if (corridorType === 'double' && (isPaired || isSecondInPair)) {
                    // For paired columns, place chairs on opposite ends
                    if (!isSecondInPair) { // First desk in pair
                      rectMode(CORNER);
                      rect((x - 1.5) * cellSize, // Position left of desk
                           y * cellSize + (height * cellSize - chairSize) / 2, // Center vertically
                           chairSize,
                           chairSize,
                           4); // Rounded corners with 4px radius
                    } else { // Second desk in pair
                      rectMode(CORNER);
                      rect((x + width) * cellSize, // Position right of desk
                           y * cellSize + (height * cellSize - chairSize) / 2, // Center vertically
                           chairSize,
                           chairSize,
                           4); // Rounded corners with 4px radius
                    }
                  } else {
                    // Single column desk, chair goes to the right
                    rectMode(CORNER);
                    rect((x + width) * cellSize, // Position right of desk
                         y * cellSize + (height * cellSize - chairSize) / 2, // Center vertically
                         chairSize,
                         chairSize,
                         4); // Rounded corners with 4px radius
                  }
                }
                pop();
                
                // Add desk number label with contrasting color
                if (hasBeenInteracted) {
                  fill(255); // White text for dark desks
                } else {
                  fill(0); // Black text for light desks
                }
        noStroke();
                textAlign(CENTER, CENTER);
                textSize(8);
                text(`Desk ${deskNumber}`, 
                     x * cellSize + (width * cellSize) / 2, 
                     y * cellSize + (height * cellSize) / 2);
                
                // Store desk number in deskPositions
                deskPositions[deskNumber - 1] = {
                  x: x,
                  y: y,
                  number: deskNumber,
                  width: width,
                  height: height
                };
                
                deskNumber++;
                
                // Mark all cells in this desk as processed
                for (let dy = 0; dy < height; dy++) {
                  for (let dx = 0; dx < width; dx++) {
                    processedCells.add(`${x + dx},${y + dy}`);
                  }
                }
              }
            }
          }
        }
      }

      function getHeatMapColor(visits) {
        // Check cache first
        if (heatmapColorCache.has(visits)) {
            return heatmapColorCache.get(visits);
        }

        // Normalize visits between 0 and 1, using a logarithmic scale for more gradual changes
        const normalized = Math.log(visits + 1) / Math.log(maxVisits + 1);
        
        // Create a gradient from light grey to black
        const intensity = Math.floor(255 * (1 - normalized));
        const r = intensity;
        const g = intensity;
        const b = intensity;
        
        // Make alpha more sensitive to early visits but still increase with traffic
        const alpha = Math.min(40 + Math.pow(normalized, 0.5) * 215, 255);
        
        const color = { r, g, b, alpha };
        heatmapColorCache.set(visits, color);
        return color;
      }

      function updateHeatMap(x, y) {
        // Check if all operators have exited
        if (operatorsCompleted >= parseInt(operatorsSlider.value)) {
            return; // Stop updating heatmap if all operators have completed
        }

        // Only update heatmap periodically
        if (frameCount++ % heatmapUpdateInterval !== 0) {
            return;
        }

        const key = `${x},${y}`;
        // Increment visit count
        globalHeatMap[key] = (globalHeatMap[key] || 0) + 1;
        
        // Update maximum visits
        if (globalHeatMap[key] > maxVisits) {
          maxVisits = globalHeatMap[key];
            // Clear color cache when maxVisits changes
            heatmapColorCache.clear();
        }
      }

      function drawHeatMap() {
        noStroke();
        
        // Draw heat map cells
        for (let pos in globalHeatMap) {
          let [x, y] = pos.split(',').map(Number);
          let visits = globalHeatMap[pos];
          
          // Get color based on visit count
          let color = getHeatMapColor(visits);
          
          // Apply color with proper blending
          fill(color.r, color.g, color.b, color.alpha);
          rect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }

      function drawHeatMapLegend() {
        if (!legendCanvas) return;
        
        // Clear the legend canvas
        legendCanvas.background(255);
        
        // Get actual canvas dimensions
        const canvasWidth = legendCanvas.width;
        const canvasHeight = legendCanvas.height;
        
        // Calculate legend dimensions
        const margin = 0;
        const legendWidth = canvasWidth;
        const gradientHeight = 20; // Match trail legend height
        
        // Add max visits text
        legendCanvas.textSize(10);
        legendCanvas.fill(80);
        legendCanvas.noStroke();
        legendCanvas.textAlign(RIGHT, TOP);
        legendCanvas.text(`Max Visits: ${maxVisits}`, legendWidth - 2, 0);
        
        // Draw gradient bar at the bottom
        for (let i = 0; i < legendWidth; i++) {
          const normalized = i / legendWidth;
          const simulatedVisits = Math.floor(Math.pow(maxVisits + 1, normalized)) - 1;
          const color = getHeatMapColor(simulatedVisits);
          legendCanvas.noStroke();
          legendCanvas.fill(color.r, color.g, color.b, color.alpha);
          legendCanvas.rect(i, canvasHeight - gradientHeight, 1, gradientHeight);
        }

        // Draw the legend canvas to the HTML canvas element
        let legendElement = document.getElementById('legend-canvas');
        if (legendElement) {
          let ctx = legendElement.getContext('2d');
          ctx.clearRect(0, 0, legendElement.width, legendElement.height);
          ctx.drawImage(legendCanvas.elt, 0, 0, legendElement.width, legendElement.height);
        }
      }

      function calculateLayoutScores() {
        // Only calculate scores if simulation is running
        if (isSimulationPaused) {
          return;
        }

        // Efficiency Score (45%)
        const efficiencyScore = calculateEfficiencyScore();
        
        // Space Utilization Score (35%)
        const spaceScore = calculateSpaceUtilizationScore();
        
        // Comfort Score (20%)
        const comfortScore = calculateComfortScore();
        
        // Update scores
        layoutScores = {
          efficiency: efficiencyScore,
          spaceUtilization: spaceScore,
          comfort: comfortScore
        };
      }

      function calculateEfficiencyScore() {
        // Calculate based on:
        // 1. Average path length (shorter = better)
        // 2. Time to complete tasks (faster = better)
        // 3. Desk interaction success rate
        
        let totalTrailLength = 0;
        let trailCount = 0;
        let totalTime = simulationElapsedTime;
        let interactionSuccessRate = deskPositions.length > 0 ? desksInteracted / deskPositions.length : 0;

        // Calculate average trail length
        for (let agent of [...operatorAgents, ...exitedOperators]) {
          if (agent.trail && agent.trail.length > 0) {
            totalTrailLength += calculateTrailLength(agent.trail);
            trailCount++;
          }
        }

        const avgTrailLength = trailCount > 0 ? totalTrailLength / trailCount : 0;
        
        // Normalize scores (lower is better for trail length and time)
        const maxTrailLength = gridWidth * gridHeight; // Maximum possible trail length
        const normalizedTrailScore = 1 - (avgTrailLength / maxTrailLength);
        const normalizedTimeScore = 1 - (totalTime / (1000 * 60)); // Normalize to 1 minute
        
        // Weight the components
        const trailWeight = 0.4;
        const timeWeight = 0.3;
        const interactionWeight = 0.3;
        
        // Calculate score and cap at 100%
        const score = (normalizedTrailScore * trailWeight + 
                      normalizedTimeScore * timeWeight + 
                      interactionSuccessRate * interactionWeight) * 100;
        
        return Math.min(score, 100); // Cap at 100%
      }

      function calculateSpaceUtilizationScore() {
        // Calculate based on:
        // 1. Desk density (optimal = better)
        // 2. Dead space percentage (lower = better)
        // 3. Division balance (even distribution = better)
        
        const totalStudioArea = gridWidth * gridHeight;
        const deskArea = deskPositions.length * 12; // Each desk is 12 sq ft
        const deskDensity = deskArea / totalStudioArea;
        
        // Calculate dead space
        const pathWidth = 6;
        const numDivisions = divisions;
        const numRows = numDivisions === 2 ? 1 : numDivisions === 9 ? 3 : 2;
        const numCols = numDivisions === 2 ? 2 : numDivisions === 9 ? 3 : 2;
        
        const totalUsableWidth = gridWidth - (pathWidth * (numCols - 1));
        const totalUsableHeight = gridHeight - (pathWidth * (numRows - 1));
        const divWidth = Math.floor(totalUsableWidth / numCols);
        const divHeight = Math.floor(totalUsableHeight / numRows);
        
        const divisionArea = divWidth * divHeight;
        const totalDivisionArea = divisionArea * numDivisions;
        const deadSpace = totalStudioArea - deskArea - (pathWidth * pathWidth * (numRows - 1) * (numCols - 1));
        const deadSpacePercentage = deadSpace / totalStudioArea;
        
        // Calculate division balance
        const desksPerDivision = Math.floor(deskPositions.length / numDivisions);
        const remainingDesks = deskPositions.length % numDivisions;
        const maxDesksPerDivision = desksPerDivision + (remainingDesks > 0 ? 1 : 0);
        const minDesksPerDivision = desksPerDivision;
        const divisionBalance = 1 - ((maxDesksPerDivision - minDesksPerDivision) / maxDesksPerDivision);
        
        // Weight the components
        const densityWeight = 0.4;
        const deadSpaceWeight = 0.3;
        const balanceWeight = 0.3;
        
        // Normalize scores
        const optimalDensity = 0.3; // 30% desk density is considered optimal
        const densityScore = 1 - Math.abs(deskDensity - optimalDensity) / optimalDensity;
        const deadSpaceScore = 1 - deadSpacePercentage;
        
        return (densityScore * densityWeight + 
                deadSpaceScore * deadSpaceWeight + 
                divisionBalance * balanceWeight) * 100;
      }

      function calculateComfortScore() {
        // Calculate based on:
        // 1. Personal space violations
        // 2. Noise level distribution
        // 3. Natural light access
        
        // For now, we'll use a simplified version based on:
        // - Personal space violations
        // - Desk arrangement comfort
        
        let personalSpaceViolations = 0;
        let totalChecks = 0;
        
        // Check personal space around each desk
        for (let desk of deskPositions) {
          let nearbyDesks = 0;
          for (let otherDesk of deskPositions) {
            if (desk === otherDesk) continue;
            const dx = Math.abs(desk.x - otherDesk.x);
            const dy = Math.abs(desk.y - otherDesk.y);
            if (dx <= 2 && dy <= 2) {
              nearbyDesks++;
            }
          }
          if (nearbyDesks > 2) { // More than 2 nearby desks is uncomfortable
            personalSpaceViolations++;
          }
          totalChecks++;
        }
        
        const personalSpaceScore = 1 - (personalSpaceViolations / totalChecks);
        
        // Calculate desk arrangement comfort
        let arrangementScore = 0;
        if (arrangement === 'row') {
          // Row arrangement is generally more comfortable
          arrangementScore = 0.8;
        } else if (arrangement === 'column') {
          // Column arrangement is less comfortable
          arrangementScore = 0.6;
        } else {
          // Cluster arrangement is least comfortable
          arrangementScore = 0.4;
        }
        
        // Weight the components
        const personalSpaceWeight = 0.6;
        const arrangementWeight = 0.4;
        
        return (personalSpaceScore * personalSpaceWeight + 
                arrangementScore * arrangementWeight) * 100;
      }

      function updateScoreDisplay() {
        // Update individual scores
        document.getElementById('efficiency-score').style.width = layoutScores.efficiency + '%';
        document.getElementById('efficiency-value').textContent = Math.round(layoutScores.efficiency) + '%';
        
        document.getElementById('space-score').style.width = layoutScores.spaceUtilization + '%';
        document.getElementById('space-value').textContent = Math.round(layoutScores.spaceUtilization) + '%';
        
        document.getElementById('comfort-score').style.width = layoutScores.comfort + '%';
        document.getElementById('comfort-value').textContent = Math.round(layoutScores.comfort) + '%';
        
        // Calculate and update total score with new weights
        const totalScore = (
          layoutScores.efficiency * 0.45 +      // 45%
          layoutScores.spaceUtilization * 0.35 + // 35%
          layoutScores.comfort * 0.20           // 20%
        );
        document.getElementById('total-score-value').textContent = Math.round(totalScore) + '%';
      }

      function updateStatistics() {
        // Update interaction counts
        document.getElementById('desks-interacted-count').textContent = desksInteracted;
        document.getElementById('operators-completed-count').textContent = operatorsCompleted;
        
        // Update total counts
        document.getElementById('total-desks-count').textContent = desks;
        document.getElementById('total-operators-count').textContent = parseInt(operatorsSlider.value);

        // Calculate trail length statistics
        let shortestTrail = Infinity;
        let longestTrail = 0;
        let totalTrailLength = 0;
        let trailCount = 0;

        // Check both active and exited operators
        for (let agent of [...operatorAgents, ...exitedOperators]) {
          if (agent.trail && agent.trail.length > 0) {
            const trailLength = calculateTrailLength(agent.trail);
            shortestTrail = Math.min(shortestTrail, trailLength);
            longestTrail = Math.max(longestTrail, trailLength);
            totalTrailLength += trailLength;
            trailCount++;
          }
        }

        // Update trail length statistics
        document.getElementById('shortest-trail').textContent = shortestTrail === Infinity ? '0' : Math.round(shortestTrail);
        document.getElementById('longest-trail').textContent = Math.round(longestTrail);
        document.getElementById('average-trail').textContent = trailCount > 0 ? Math.round(totalTrailLength / trailCount) : '0';
        
        // Update layout scores
        calculateLayoutScores();
      }

      function getOperatorColor(agent) {
        // Find closest distance to any other operator
        let minDistance = Infinity;
        for (let other of operatorAgents) {
          if (other === agent) continue;
          
          // Calculate distance in feet (each grid cell is 1 foot)
          const dx = Math.abs(agent.x - other.x);
          const dy = Math.abs(agent.y - other.y);
          const distance = Math.sqrt(dx * dx + dy * dy);
          minDistance = Math.min(minDistance, distance);
        }

        // Return color based on distance
        if (minDistance <= 1) {
          return color(255, 0, 0); // Red for <= 1 foot
        } else if (minDistance <= 3) {
          return color(255, 255, 0); // Yellow for 2-3 feet
        } else {
          return color(0, 255, 0); // Green for >= 4 feet
        }
      }

      function findValidSpawnPoint() {
        // Try to spawn at entry point first
        let spawnX = operatorSource.x;
        let spawnY = operatorSource.y;
        
        // Adjust spawn position based on entry point location
        if (operatorSource.y === -1) spawnY = 0; // Top edge
        else if (operatorSource.y === gridHeight) spawnY = gridHeight - 1; // Bottom edge
        else if (operatorSource.x === -1) spawnX = 0; // Left edge
        else if (operatorSource.x === gridWidth) spawnX = gridWidth - 1; // Right edge
        
        if (isValidMove(spawnX, spawnY)) {
          return { x: spawnX, y: spawnY };
        }
        
        // If entry point is blocked, try nearby points
        const offsets = [
          {dx: -1, dy: 0}, {dx: 1, dy: 0},
          {dx: 0, dy: -1}, {dx: 0, dy: 1},
          {dx: -1, dy: -1}, {dx: -1, dy: 1},
          {dx: 1, dy: -1}, {dx: 1, dy: 1}
        ];
        
        for (let offset of offsets) {
          let x = spawnX + offset.dx;
          let y = spawnY + offset.dy;
          if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight && isValidMove(x, y)) {
            return {x, y};
          }
        }
        
        return null;
      }

      function drawEntryExitPoints() {
        const symbolSize = cellSize * 1.2;
        const textGap = 1;
        const edgeOffset = cellSize; // Distance from grid edge for X-axis arrows
        
        // Draw entry point
        push();
        translate(
          operatorSource.x * cellSize + cellSize/2,
          operatorSource.y === -1 ? -edgeOffset : // Move up for top edge
          operatorSource.y === gridHeight ? gridHeight * cellSize + edgeOffset : // Move down for bottom edge
          operatorSource.y * cellSize + cellSize/2 // Normal Y position for side edges
        );
        
        // Add "ENTRY" text with proper orientation and alignment
        noStroke();
        fill(0);
        textSize(12);
        
        if (operatorSource.x === -1) { // Left edge
          textAlign(RIGHT, TOP);
          text("ENTRY", 0, symbolSize * 0.8);
        } else if (operatorSource.x === gridWidth) { // Right edge
          textAlign(LEFT, TOP);
          text("ENTRY", 0, symbolSize * 0.8);
        } else if (operatorSource.y === -1) { // Top edge
          textAlign(CENTER, BOTTOM);
          text("ENTRY", 0, -symbolSize * 0.3);
        } else { // Bottom edge
          textAlign(CENTER, TOP);
          text("ENTRY", 0, symbolSize * 0.8);
        }
        
        // Rotate arrow based on which edge it's on
        if (operatorSource.y === -1) { // Top edge
          rotate(0); // Point down
        } else if (operatorSource.y === gridHeight) { // Bottom edge
          rotate(PI); // Point up
        } else if (operatorSource.x === -1) { // Left edge
          rotate(PI/2); // Point right
        } else if (operatorSource.x === gridWidth) { // Right edge
          rotate(-PI/2); // Point left
        }
        
        // Draw entry symbol
        stroke(0);
        strokeWeight(2);
        fill(0);
        beginShape();
        vertex(0, symbolSize/2);
        vertex(symbolSize/2, 0);
        vertex(-symbolSize/2, 0);
        endShape(CLOSE);
        pop();
        
        // Draw exit point
        push();
        translate(
          operatorExit.x * cellSize + cellSize/2,
          operatorExit.y === -1 ? -edgeOffset : // Move up for top edge
          operatorExit.y === gridHeight ? gridHeight * cellSize + edgeOffset : // Move down for bottom edge
          operatorExit.y * cellSize + cellSize/2 // Normal Y position for side edges
        );
        
        // Add "EXIT" text with proper orientation and alignment
        noStroke();
        fill(0);
        textSize(12);
        
        if (operatorExit.x === -1) { // Left edge
          textAlign(RIGHT, TOP);
          text("EXIT", 0, symbolSize * 0.8);
        } else if (operatorExit.x === gridWidth) { // Right edge
          textAlign(LEFT, TOP);
          text("EXIT", 0, symbolSize * 0.8);
        } else if (operatorExit.y === -1) { // Top edge
          textAlign(CENTER, BOTTOM);
          text("EXIT", 0, -symbolSize * 0.3);
        } else { // Bottom edge
          textAlign(CENTER, TOP);
          text("EXIT", 0, symbolSize * 0.8);
        }
        
        // Rotate arrow based on which edge it's on
        if (operatorExit.y === -1) { // Top edge
          rotate(0); // Point down
        } else if (operatorExit.y === gridHeight) { // Bottom edge
          rotate(PI); // Point up
        } else if (operatorExit.x === -1) { // Left edge
          rotate(PI/2); // Point right
        } else if (operatorExit.x === gridWidth) { // Right edge
          rotate(-PI/2); // Point left
        }
        
        // Draw exit symbol
        stroke(0);
        strokeWeight(2);
        fill(0);
        beginShape();
        vertex(0, symbolSize/2);
        vertex(symbolSize/2, 0);
        vertex(-symbolSize/2, 0);
        endShape(CLOSE);
        pop();
      }

      function calculateAreas() {
        // Get current division dimensions
        let numDivisions = divisions;
        let numRows, numCols;
        
        if (numDivisions === 2) {
          numRows = 1;
          numCols = 2;
        } else if (numDivisions === 9) {
          numRows = 3;
          numCols = 3;
        } else {
          numRows = 2;
          numCols = 2;
        }

        // Calculate areas
        const totalStudioArea = gridWidth * gridHeight;
        const pathWidth = 6; // 6ft yellow path
        
        // Calculate main corridor area (yellow paths)
        const horizontalPathArea = (numRows - 1) * gridWidth * pathWidth;
        const verticalPathArea = (numCols - 1) * gridHeight * pathWidth;
        const mainCorridorArea = horizontalPathArea + verticalPathArea - ((numRows - 1) * (numCols - 1) * pathWidth * pathWidth);

        // Calculate total desk area
        const deskArea = deskPositions.length * (arrangement === 'row' ? 12 : 12); // Each desk is 6x2 or 2x6 = 12 sq ft

        // Calculate division areas
        const totalUsableWidth = gridWidth - (pathWidth * (numCols - 1));
        const totalUsableHeight = gridHeight - (pathWidth * (numRows - 1));
        const divWidth = Math.floor(totalUsableWidth / numCols);
        const divHeight = Math.floor(totalUsableHeight / numRows);
        const divisionArea = divWidth * divHeight;

        // Calculate desk area per division
        const desksPerDivision = Math.floor(deskPositions.length / numDivisions);
        const deskAreaPerDivision = desksPerDivision * 12;

        // Update the display
        document.getElementById('total-studio-area').textContent = totalStudioArea;
        document.getElementById('main-corridor-area').textContent = mainCorridorArea;
        document.getElementById('total-desk-area').textContent = deskArea;
        document.getElementById('total-non-desk-area').textContent = totalStudioArea - deskArea - mainCorridorArea;
        
        document.getElementById('division-total-area').textContent = divisionArea;
        document.getElementById('division-desk-area').textContent = deskAreaPerDivision;
        document.getElementById('division-non-desk-area').textContent = divisionArea - deskAreaPerDivision;
      }

      // Function to format time as seconds
      function formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        return `${seconds}s`;
      }

      // Function to update simulation timer
      function updateSimulationTimer() {
        if (!isSimulationPaused) {
          // Check if all operators have exited
          const totalOperators = parseInt(operatorsSlider.value);
          if (operatorsCompleted >= totalOperators) {
            return; // Stop updating timer if all operators have completed
          }

          const currentTime = performance.now();
          const deltaTime = currentTime - lastTimerUpdate;
          // Adjust time increment based on speed
          const speedMultiplier = 0.05 + (operatorSpeed * 0.05);
          simulationElapsedTime += deltaTime * speedMultiplier;
          lastTimerUpdate = currentTime;
          
          // Update timer display
          document.getElementById('simulation-time').textContent = formatTime(simulationElapsedTime);
        }
      }

      function drawTrailLengthLegend() {
        if (!trailLegendCanvas) return;

        // Clear the legend canvas
        trailLegendCanvas.clear();
        trailLegendCanvas.background(255);

        // Get actual canvas dimensions
        const canvasWidth = trailLegendCanvas.width;
        const canvasHeight = trailLegendCanvas.height;

        // Calculate legend dimensions
        const margin = 0;
        const legendWidth = canvasWidth;
        const legendHeight = canvasHeight;

        // Draw gradient bar
        for (let i = 0; i < legendWidth; i++) {
          const progress = i / legendWidth;
          let r, g, b;
          
          if (progress < 0.5) {
            // First half: Green to Yellow
            r = 255 * (progress * 2);
            g = 255;
            b = 0;
          } else {
            // Second half: Yellow to Red
            r = 255;
            g = 255 * (2 - (progress * 2));
            b = 0;
          }

          trailLegendCanvas.noStroke();
          trailLegendCanvas.fill(r, g, b, 255);
          trailLegendCanvas.rect(i, 0, 1, legendHeight);
        }

        // Draw the legend canvas to the HTML canvas element
        let legendElement = document.getElementById('trail-legend-canvas');
        if (legendElement) {
          let ctx = legendElement.getContext('2d');
          ctx.clearRect(0, 0, legendElement.width, legendElement.height);
          ctx.drawImage(trailLegendCanvas.elt, 0, 0, legendElement.width, legendElement.height);
        }
      }

      function calculateTrailLength(trail) {
        if (!trail || trail.length < 2) return 0;
        
        let length = 0;
        for (let i = 0; i < trail.length - 1; i++) {
          // Calculate actual distance between consecutive points
          const dx = trail[i + 1].x - trail[i].x;
          const dy = trail[i + 1].y - trail[i].y;
          length += Math.sqrt(dx * dx + dy * dy); // Use Euclidean distance
        }
        return length; // Each grid unit represents 1 foot
      }