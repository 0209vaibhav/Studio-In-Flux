import React, { useState } from 'react';
import styled from 'styled-components';
import Simulation from './components/Simulation';
import Controls from './components/Controls';

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
  width: 100vw;
`;

const SimulationContainer = styled.div`
  flex: 1;
  position: relative;
`;

const ControlsContainer = styled.div`
  width: 300px;
  padding: 20px;
  background: #f5f5f5;
  border-left: 1px solid #ddd;
`;

const App = () => {
  const [simulationParams, setSimulationParams] = useState({
    numberOfPeople: 20, // Reduced number for better visibility in the studio
    cameraAngle: { x: 45, y: 45, z: 45 },
    speed: 1,
    showTrails: true,
    colorByDistance: true,
    colorByDensity: true,
    isRunning: true
  });

  const handleParamChange = (param, value) => {
    setSimulationParams(prev => ({
      ...prev,
      [param]: value
    }));
  };

  return (
    <AppContainer>
      <SimulationContainer>
        <Simulation 
          params={simulationParams} 
          useCustomModel={true}
          modelPath="/models/columbia_studio.glb"
        />
      </SimulationContainer>
      <ControlsContainer>
        <Controls
          params={simulationParams}
          onParamChange={handleParamChange}
        />
      </ControlsContainer>
    </AppContainer>
  );
};

export default App; 