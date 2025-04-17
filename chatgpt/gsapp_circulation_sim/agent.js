class Agent {
    constructor(scene, environment, startPosition) {
        this.scene = scene;
        this.environment = environment;
        this.position = startPosition;
        this.target = null;
        this.path = [];
        this.speed = 1.0;
        this.color = new THREE.Color(0x00ff00); // Default green
        this.trail = [];
        this.maxTrailLength = 50;
        this.distanceToOthers = 0;
        
        // Create agent visualization
        this.createVisualization();
    }

    createVisualization() {
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshStandardMaterial({ 
            color: this.color,
            emissive: this.color,
            emissiveIntensity: 0.5
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    update(deltaTime) {
        if (this.path.length > 0) {
            const nextPoint = this.path[0];
            const direction = nextPoint.clone().sub(this.position);
            const distance = direction.length();
            
            if (distance < 0.1) {
                this.path.shift();
            } else {
                direction.normalize();
                this.position.add(direction.multiplyScalar(this.speed * deltaTime));
                this.mesh.position.copy(this.position);
                
                // Update trail
                this.trail.push(this.position.clone());
                if (this.trail.length > this.maxTrailLength) {
                    this.trail.shift();
                }
            }
        } else if (this.target) {
            // Find new path to target
            this.path = this.environment.pathfinder.findPath(this.position, this.target);
        }

        // Update color based on proximity to others
        this.updateColor();
    }

    updateColor() {
        // Color gradient from green (far) to red (close)
        const maxDistance = 5.0;
        const normalizedDistance = Math.min(this.distanceToOthers / maxDistance, 1.0);
        this.color.setRGB(1.0, 1.0 - normalizedDistance, 1.0 - normalizedDistance);
        this.mesh.material.color.copy(this.color);
        this.mesh.material.emissive.copy(this.color);
    }

    setTarget(target) {
        this.target = target;
        this.path = this.environment.pathfinder.findPath(this.position, target);
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    setTrailLength(length) {
        this.maxTrailLength = length;
    }
}