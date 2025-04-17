import React, { useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import styled from 'styled-components';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SimulationContainer = styled.div`
  width: 100%;
  height: 100%;
`;

const Agent = ({ position, color, destination }) => {
  const meshRef = useRef();
  const trailRef = useRef([]);
  const maxTrailLength = 50;
  const bounds = { min: -10, max: 10 }; // Define movement bounds

  useFrame((state, delta) => {
    if (meshRef.current && destination) {
      const currentPos = meshRef.current.position;
      const dest = new THREE.Vector3(...destination);
      
      // Calculate direction and distance
      const direction = new THREE.Vector3().subVectors(dest, currentPos);
      const distance = direction.length();
      
      if (distance > 0.1) { // Only move if not too close to destination
        direction.normalize();
        const moveAmount = Math.min(0.01, distance); // Prevent overshooting
        currentPos.add(direction.multiplyScalar(moveAmount));
        
        // Ensure position stays within bounds
        currentPos.x = Math.max(bounds.min, Math.min(bounds.max, currentPos.x));
        currentPos.y = Math.max(bounds.min, Math.min(bounds.max, currentPos.y));
        currentPos.z = Math.max(bounds.min, Math.min(bounds.max, currentPos.z));
        
        // Update trail with valid position
        if (isFinite(currentPos.x) && isFinite(currentPos.y) && isFinite(currentPos.z)) {
          trailRef.current.push(currentPos.clone());
          if (trailRef.current.length > maxTrailLength) {
            trailRef.current.shift();
          }
        }
      }
    }
  });

  return (
    <group>
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {trailRef.current.length > 1 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={trailRef.current.length}
              array={new Float32Array(trailRef.current.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={color} />
        </line>
      )}
    </group>
  );
};

const StudioSpace = ({ params }) => {
  const { numberOfDivisions, layoutArrangement, numberOfEntrances, numberOfExits } = params;
  
  // Generate agents based on parameters
  const agents = Array.from({ length: params.numberOfPeople }, (_, i) => ({
    id: i,
    position: [Math.random() * 10 - 5, 0, Math.random() * 10 - 5],
    color: params.colorByDensity ? '#00ff00' : '#ffffff',
    destination: [Math.random() * 10 - 5, 0, Math.random() * 10 - 5]
  }));

  return (
    <group>
      {/* Studio space floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>

      {/* Division walls */}
      {Array.from({ length: numberOfDivisions - 1 }, (_, i) => (
        <mesh key={`wall-${i}`} position={[0, 1, (i + 1) * (20 / numberOfDivisions) - 10]}>
          <boxGeometry args={[20, 2, 0.2]} />
          <meshStandardMaterial color="#cccccc" />
        </mesh>
      ))}

      {/* Agents */}
      {agents.map(agent => (
        <Agent
          key={agent.id}
          position={agent.position}
          color={agent.color}
          destination={agent.destination}
        />
      ))}
    </group>
  );
};

const Simulation = ({ params }) => {
  return (
    <SimulationContainer>
      <Canvas>
        <PerspectiveCamera makeDefault position={[10, 10, 10]} />
        <OrbitControls />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <StudioSpace params={params} />
      </Canvas>
    </SimulationContainer>
  );
};

export default Simulation; 