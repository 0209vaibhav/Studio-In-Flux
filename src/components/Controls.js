import React from 'react';
import styled from 'styled-components';

const ControlsPanel = styled.div`
  padding: 20px;
`;

const Title = styled.h2`
  margin-bottom: 20px;
  color: #333;
  font-size: 1.5rem;
`;

const InfoText = styled.p`
  color: #666;
  margin-bottom: 15px;
  font-size: 0.9rem;
  line-height: 1.4;
`;

const SliderContainer = styled.div`
  margin: 20px 0;
  padding: 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`;

const SliderLabel = styled.label`
  display: block;
  margin-bottom: 10px;
  color: #333;
  font-weight: 500;
`;

const Slider = styled.input`
  width: 100%;
  margin: 10px 0;
  -webkit-appearance: none;
  height: 4px;
  background: #ddd;
  border-radius: 2px;
  outline: none;
  opacity: 0.7;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: #007bff;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #0056b3;
      transform: scale(1.1);
    }
  }

  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: #007bff;
    border-radius: 50%;
    cursor: pointer;
    border: none;
    transition: all 0.2s;

    &:hover {
      background: #0056b3;
      transform: scale(1.1);
    }
  }
`;

const SpeedValue = styled.div`
  text-align: right;
  color: #666;
  font-size: 0.9rem;
  margin-top: 5px;
`;

const Controls = ({ params, onParamChange }) => {
  return (
    <ControlsPanel>
      <Title>Studio Space Simulation</Title>
      <InfoText>
        Active Agents: {params.numberOfPeople}
      </InfoText>
      <InfoText>
        Simulation Status: {params.isRunning ? 'Running' : 'Paused'}
      </InfoText>
      
      <SliderContainer>
        <SliderLabel>Number of Operators</SliderLabel>
        <Slider
          type="range"
          min="1"
          max="50"
          step="1"
          value={params.numberOfPeople}
          onChange={(e) => onParamChange('numberOfPeople', parseInt(e.target.value))}
        />
        <SpeedValue>{params.numberOfPeople} operators</SpeedValue>
      </SliderContainer>

      <SliderContainer>
        <SliderLabel>Agent Speed Control</SliderLabel>
        <Slider
          type="range"
          min="0.1"
          max="3"
          step="0.1"
          value={params.speed}
          onChange={(e) => onParamChange('speed', parseFloat(e.target.value))}
        />
        <SpeedValue>{params.speed.toFixed(1)}x</SpeedValue>
      </SliderContainer>
    </ControlsPanel>
  );
};

export default Controls; 