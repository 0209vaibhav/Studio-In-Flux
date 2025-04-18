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
  width: 250px;
  padding: 20px;
  background: #f5f5f5;
  border-left: 1px solid #ddd;
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
`;

const App = () => {
  const [simulationParams, setSimulationParams] = useState({
    numberOfPeople: 10,
    speed: 1,
    showTrails: true,
    colorByDensity: true,
    isRunning: true
  });

  const handleParamChange = (param, value) => {
    if (param === 'numberOfPeople') {
      value = Math.max(1, Math.min(50, value));
    }
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