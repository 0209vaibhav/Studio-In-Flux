class Controls {
    constructor(simulation) {
        this.simulation = simulation;
        this.gui = new dat.GUI();
        this.initControls();
    }

    initControls() {
        // Simulation parameters
        const simFolder = this.gui.addFolder('Simulation');
        const simParams = {
            numAgents: this.simulation.numAgents,
            agentSpeed: this.simulation.agentSpeed,
            trailLength: this.simulation.trailLength,
            showTrails: this.simulation.showTrails,
            isRunning: this.simulation.isRunning
        };

        simFolder.add(simParams, 'numAgents', 1, 100).name('Number of People')
            .onChange(value => {
                this.simulation.numAgents = value;
                this.simulation.updateParameters();
            });
        
        simFolder.add(simParams, 'agentSpeed', 0.1, 5.0).name('Agent Speed')
            .onChange(value => {
                this.simulation.agentSpeed = value;
                this.simulation.updateParameters();
            });
        
        simFolder.add(simParams, 'trailLength', 0, 100).name('Trail Length')
            .onChange(value => {
                this.simulation.trailLength = value;
                this.simulation.updateParameters();
            });
        
        simFolder.add(simParams, 'showTrails').name('Show Trails')
            .onChange(value => {
                this.simulation.showTrails = value;
                this.simulation.updateParameters();
            });
        
        simFolder.add(simParams, 'isRunning').name('Start/Stop')
            .onChange(value => {
                this.simulation.isRunning = value;
            });

        // Environment parameters
        const envFolder = this.gui.addFolder('Environment');
        const envParams = {
            numDivisions: this.simulation.numDivisions,
            numEntrances: this.simulation.numEntrances,
            numExits: this.simulation.numExits
        };

        envFolder.add(envParams, 'numDivisions', 1, 10).name('Number of Divisions')
            .onChange(value => {
                this.simulation.numDivisions = value;
                this.simulation.updateEnvironment();
            });
        
        envFolder.add(envParams, 'numEntrances', 1, 5).name('Number of Entrances')
            .onChange(value => {
                this.simulation.numEntrances = value;
                this.simulation.updateEnvironment();
            });
        
        envFolder.add(envParams, 'numExits', 1, 5).name('Number of Exits')
            .onChange(value => {
                this.simulation.numExits = value;
                this.simulation.updateEnvironment();
            });

        // Camera controls
        const cameraFolder = this.gui.addFolder('Camera');
        const cameraParams = {
            x: this.simulation.camera.position.x,
            y: this.simulation.camera.position.y,
            z: this.simulation.camera.position.z,
            fov: this.simulation.camera.fov
        };

        cameraFolder.add(cameraParams, 'x', -50, 50).name('Camera X')
            .onChange(value => {
                this.simulation.camera.position.x = value;
            });
        
        cameraFolder.add(cameraParams, 'y', 1, 50).name('Camera Y')
            .onChange(value => {
                this.simulation.camera.position.y = value;
            });
        
        cameraFolder.add(cameraParams, 'z', -50, 50).name('Camera Z')
            .onChange(value => {
                this.simulation.camera.position.z = value;
            });
        
        cameraFolder.add(cameraParams, 'fov', 30, 90).name('Field of View')
            .onChange(value => {
                this.simulation.camera.fov = value;
                this.simulation.camera.updateProjectionMatrix();
            });
    }
}