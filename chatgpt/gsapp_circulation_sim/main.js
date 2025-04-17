class Simulation {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.clock = new THREE.Clock();
        
        // Initialize properties
        this.numAgents = 20;
        this.agentSpeed = 1.0;
        this.trailLength = 50;
        this.showTrails = true;
        this.isRunning = true;
        this.numDivisions = 3;
        this.numEntrances = 2;
        this.numExits = 2;
        
        // Initialize components
        this.initializeRenderer();
        this.initializeCamera();
        this.environment = new Environment(this.scene);
        this.agents = [];
        this.controls = new Controls(this);
        
        // Start animation loop
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    initializeRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0xf0f0f0);
        document.getElementById('simulationContainer').appendChild(this.renderer.domElement);
    }

    initializeCamera() {
        this.camera.position.set(0, 20, 20);
        this.camera.lookAt(0, 0, 0);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updateParameters() {
        // Update number of agents
        while (this.agents.length < this.numAgents) {
            const startPos = this.environment.getRandomEntrance();
            this.agents.push(new Agent(this.scene, this.environment, startPos));
        }
        while (this.agents.length > this.numAgents) {
            const agent = this.agents.pop();
            this.scene.remove(agent.mesh);
        }

        // Update agent properties
        this.agents.forEach(agent => {
            agent.setSpeed(this.agentSpeed);
            agent.setTrailLength(this.trailLength);
        });
    }

    updateEnvironment() {
        // Clear existing environment
        this.environment.divisions = [];
        this.environment.entrances = [];
        this.environment.exits = [];
        this.environment.obstacles.forEach(obstacle => this.scene.remove(obstacle));
        this.environment.obstacles = [];

        // Create new divisions
        const divisionSize = 50 / this.numDivisions;
        for (let i = 0; i < this.numDivisions; i++) {
            for (let j = 0; j < this.numDivisions; j++) {
                const position = new THREE.Vector3(
                    (i - this.numDivisions/2) * divisionSize,
                    0,
                    (j - this.numDivisions/2) * divisionSize
                );
                this.environment.addDivision(position, new THREE.Vector3(divisionSize, 0, divisionSize));
            }
        }

        // Add entrances and exits
        for (let i = 0; i < this.numEntrances; i++) {
            this.environment.addEntrance(new THREE.Vector3(
                Math.random() * 40 - 20,
                0,
                -25
            ));
        }
        for (let i = 0; i < this.numExits; i++) {
            this.environment.addExit(new THREE.Vector3(
                Math.random() * 40 - 20,
                0,
                25
            ));
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const deltaTime = this.clock.getDelta();

        if (this.isRunning) {
            // Update agents
            this.agents.forEach(agent => {
                agent.update(deltaTime);
                
                // Update proximity to other agents
                let minDistance = Infinity;
                this.agents.forEach(otherAgent => {
                    if (agent !== otherAgent) {
                        const distance = agent.position.distanceTo(otherAgent.position);
                        minDistance = Math.min(minDistance, distance);
                    }
                });
                agent.distanceToOthers = minDistance;
            });
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize simulation when the page loads
window.addEventListener('load', () => {
    new Simulation();
});