class Environment {
    constructor(scene) {
        this.scene = scene;
        this.floorPlan = null;
        this.obstacles = [];
        this.entrances = [];
        this.exits = [];
        this.divisions = [];
        this.pathfinder = new Pathfinding();
        this.initializeEnvironment();
    }

    initializeEnvironment() {
        // Create a simple floor plan (will be replaced with actual GSAPP model)
        const floorGeometry = new THREE.PlaneGeometry(50, 50);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xcccccc,
            side: THREE.DoubleSide
        });
        this.floorPlan = new THREE.Mesh(floorGeometry, floorMaterial);
        this.floorPlan.rotation.x = -Math.PI / 2;
        this.scene.add(this.floorPlan);

        // Add some basic lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 10, 0);
        this.scene.add(directionalLight);
    }

    addDivision(position, size) {
        const division = {
            position: position,
            size: size,
            layout: []
        };
        this.divisions.push(division);
        return division;
    }

    addEntrance(position) {
        this.entrances.push(position);
    }

    addExit(position) {
        this.exits.push(position);
    }

    addObstacle(position, size) {
        const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const obstacle = new THREE.Mesh(geometry, material);
        obstacle.position.set(position.x, position.y, position.z);
        this.scene.add(obstacle);
        this.obstacles.push(obstacle);
        
        // Update pathfinding grid
        this.pathfinder.setObstacle(position.x, position.z);
    }

    getRandomEntrance() {
        return this.entrances[Math.floor(Math.random() * this.entrances.length)];
    }

    getRandomExit() {
        return this.exits[Math.floor(Math.random() * this.exits.length)];
    }
}