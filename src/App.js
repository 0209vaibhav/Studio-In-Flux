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
    numberOfDivisions: 4,
    layoutArrangement: 'grid',
    numberOfEntrances: 2,
    numberOfExits: 2,
    numberOfPeople: 50,
    cameraAngle: { x: 45, y: 45, z: 45 },
    speed: 1,
    showTrails: true,
    colorByDistance: true,
    colorByDensity: true,
    isRunning: false
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
        <Simulation params={simulationParams} />
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