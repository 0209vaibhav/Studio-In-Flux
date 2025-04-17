import React from 'react';
import styled from 'styled-components';

const ControlGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
`;

const Input = styled.input`
  width: 100%;
  margin-bottom: 10px;
`;

const Select = styled.select`
  width: 100%;
  margin-bottom: 10px;
  padding: 5px;
`;

const Button = styled.button`
  width: 100%;
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 10px;

  &:hover {
    background-color: #0056b3;
  }
`;

const Controls = ({ params, onParamChange }) => {
  const handleChange = (param) => (e) => {
    const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    onParamChange(param, value);
  };

  return (
    <div>
      <h2>Simulation Controls</h2>
      
      <ControlGroup>
        <Label>Number of Divisions</Label>
        <Input
          type="number"
          min="1"
          max="10"
          value={params.numberOfDivisions}
          onChange={handleChange('numberOfDivisions')}
        />
      </ControlGroup>

      <ControlGroup>
        <Label>Layout Arrangement</Label>
        <Select
          value={params.layoutArrangement}
          onChange={handleChange('layoutArrangement')}
        >
          <option value="grid">Grid</option>
          <option value="random">Random</option>
          <option value="cluster">Cluster</option>
        </Select>
      </ControlGroup>

      <ControlGroup>
        <Label>Number of Entrances</Label>
        <Input
          type="number"
          min="1"
          max="5"
          value={params.numberOfEntrances}
          onChange={handleChange('numberOfEntrances')}
        />
      </ControlGroup>

      <ControlGroup>
        <Label>Number of Exits</Label>
        <Input
          type="number"
          min="1"
          max="5"
          value={params.numberOfExits}
          onChange={handleChange('numberOfExits')}
        />
      </ControlGroup>

      <ControlGroup>
        <Label>Number of People</Label>
        <Input
          type="number"
          min="1"
          max="200"
          value={params.numberOfPeople}
          onChange={handleChange('numberOfPeople')}
        />
      </ControlGroup>

      <ControlGroup>
        <Label>Speed</Label>
        <Input
          type="range"
          min="0.1"
          max="2"
          step="0.1"
          value={params.speed}
          onChange={handleChange('speed')}
        />
      </ControlGroup>

      <ControlGroup>
        <Label>
          <input
            type="checkbox"
            checked={params.showTrails}
            onChange={(e) => onParamChange('showTrails', e.target.checked)}
          />
          Show Trails
        </Label>
      </ControlGroup>

      <ControlGroup>
        <Label>
          <input
            type="checkbox"
            checked={params.colorByDistance}
            onChange={(e) => onParamChange('colorByDistance', e.target.checked)}
          />
          Color by Distance
        </Label>
      </ControlGroup>

      <ControlGroup>
        <Label>
          <input
            type="checkbox"
            checked={params.colorByDensity}
            onChange={(e) => onParamChange('colorByDensity', e.target.checked)}
          />
          Color by Density
        </Label>
      </ControlGroup>

      <Button onClick={() => onParamChange('isRunning', !params.isRunning)}>
        {params.isRunning ? 'Stop' : 'Start'} Simulation
      </Button>
    </div>
  );
};

export default Controls; 