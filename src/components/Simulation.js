import React, { useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Bounds } from '@react-three/drei';
import styled from 'styled-components';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SimulationContainer = styled.div`
  width: 100%;
  height: 100%;
  background: #f0f0f0;
`;

// Constants
const TOTAL_HUMAN_MODELS = 22;
const COLLISION_RADIUS = 0.5;

// Helper Functions
const findWalkableArea = (scene) => {
  let floorMesh = null;
  let walls = [];
  
  scene.traverse((child) => {
    if (child.isMesh) {
      const normal = new THREE.Vector3();
      child.geometry.computeVertexNormals();
      child.geometry.normalizeNormals();
      
      for (let i = 0; i < child.geometry.attributes.normal.count; i++) {
        normal.add(new THREE.Vector3(
          child.geometry.attributes.normal.array[i * 3],
          child.geometry.attributes.normal.array[i * 3 + 1],
          child.geometry.attributes.normal.array[i * 3 + 2]
        ));
      }
      normal.divideScalar(child.geometry.attributes.normal.count);
      
      if (Math.abs(normal.y) > 0.8) {
        if (!floorMesh || child.position.y < floorMesh.position.y) {
          floorMesh = child;
        }
      } else {
        walls.push(child);
      }
    }
  });
  
  return { floorMesh, walls };
};

const checkWallCollision = (position, walls) => {
  for (const wall of walls) {
    const wallBounds = new THREE.Box3().setFromObject(wall);
    wallBounds.min.y = -Infinity;
    wallBounds.max.y = Infinity;
    
    wallBounds.min.x -= COLLISION_RADIUS;
    wallBounds.min.z -= COLLISION_RADIUS;
    wallBounds.max.x += COLLISION_RADIUS;
    wallBounds.max.z += COLLISION_RADIUS;
    
    if (wallBounds.containsPoint(position)) {
      return true;
    }
  }
  return false;
};

const findNewDestination = (modelBounds, walls, currentPosition = null) => {
  let attempts = 0;
  const maxAttempts = 50;
  
  while (attempts < maxAttempts) {
    const newDest = new THREE.Vector3(
      modelBounds.min.x + Math.random() * (modelBounds.max.x - modelBounds.min.x),
      0,
      modelBounds.min.z + Math.random() * (modelBounds.max.z - modelBounds.min.z)
    );
    
    if (!checkWallCollision(newDest, walls)) {
      return newDest;
    }
    attempts++;
  }
  
  return currentPosition || new THREE.Vector3(0, 0, 0);
};

// Preload human models
const humanModels = Array.from({ length: TOTAL_HUMAN_MODELS }, (_, i) => {
  const modelNumber = i + 1;
  return `/models/humans/human ${modelNumber}.glb`;
});

humanModels.forEach(path => useGLTF.preload(path));

const CustomHumanModel = ({ color, modelPath }) => {
  const { scene } = useGLTF(modelPath);
  
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.color.lerp(new THREE.Color(color), 0.3);
      }
    });
  }, [scene, color]);

  return (
    <primitive 
      object={scene.clone()} 
      scale={[1, 1, 1]}
      position={[0, 0, 0]}
    />
  );
};

const Agent = ({ position, color, destination, modelBounds, modelPath, walls }) => {
  const groupRef = useRef();
  const trailRef = useRef([]);
  const maxTrailLength = 50;
  const [currentDestination, setCurrentDestination] = useState(destination);
  const [rotation, setRotation] = useState(0);

  useFrame((state, delta) => {
    if (groupRef.current && currentDestination) {
      const currentPos = groupRef.current.position;
      const dest = new THREE.Vector3(...currentDestination);
      
      const direction = new THREE.Vector3().subVectors(dest, currentPos);
      const distance = direction.length();
      
      if (distance > 0.1) {
        const angle = Math.atan2(direction.x, direction.z);
        setRotation(angle);

        direction.normalize();
        const moveAmount = Math.min(0.05, distance);
        const newPosition = currentPos.clone().add(direction.multiplyScalar(moveAmount));
        newPosition.y = 0;
        
        if (!checkWallCollision(newPosition, walls)) {
          currentPos.copy(newPosition);
          
          if (isFinite(currentPos.x) && isFinite(currentPos.y) && isFinite(currentPos.z)) {
            trailRef.current.push(currentPos.clone());
            if (trailRef.current.length > maxTrailLength) {
              trailRef.current.shift();
            }
          }
        } else {
          const newDest = findNewDestination(modelBounds, walls, currentPos);
          setCurrentDestination([newDest.x, newDest.y, newDest.z]);
        }
      } else {
        const newDest = findNewDestination(modelBounds, walls, currentPos);
        setCurrentDestination([newDest.x, newDest.y, newDest.z]);
      }
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
      <CustomHumanModel color={color} modelPath={modelPath} />
      {trailRef.current.length > 1 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={trailRef.current.length}
              array={new Float32Array(trailRef.current.flatMap(p => [p.x, 0.1, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={color} transparent opacity={0.3} />
        </line>
      )}
    </group>
  );
};

const CustomModel = ({ modelPath, onModelLoaded }) => {
  const { scene } = useGLTF(modelPath);
  
  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const { floorMesh, walls } = findWalkableArea(scene);
    
    const bounds = {
      min: box.min,
      max: box.max,
      walls: walls
    };
    
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material.side = THREE.DoubleSide;
        child.castShadow = true;
        child.receiveShadow = true;
        
        if (child.material.color.r === 0 && child.material.color.g === 0 && child.material.color.b === 0) {
          child.material.color.set('#cccccc');
        }
      }
    });
    
    if (onModelLoaded) {
      onModelLoaded(bounds);
    }
  }, [scene, onModelLoaded]);

  return <primitive object={scene} />;
};

const StudioSpace = ({ params, useCustomModel, modelPath }) => {
  const [modelBounds, setModelBounds] = useState(null);
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    if (modelBounds && modelBounds.walls) {
      const validStartPositions = Array.from({ length: params.numberOfPeople }, () => {
        return findNewDestination(modelBounds, modelBounds.walls);
      });

      const newAgents = validStartPositions.map((position, i) => {
        const randomModelIndex = Math.floor(Math.random() * TOTAL_HUMAN_MODELS);
        return {
          id: i,
          position: [position.x, 0, position.z],
          color: params.colorByDensity ? '#4287f5' : '#2c5282',
          destination: [position.x, 0, position.z],
          modelPath: humanModels[randomModelIndex]
        };
      });
      
      setAgents(newAgents);
    }
  }, [modelBounds, params.numberOfPeople, params.colorByDensity]);

  return (
    <group>
      {useCustomModel && (
        <CustomModel 
          modelPath={modelPath} 
          onModelLoaded={setModelBounds}
        />
      )}

      {agents.map(agent => (
        <Agent
          key={agent.id}
          position={agent.position}
          color={agent.color}
          destination={agent.destination}
          modelBounds={modelBounds}
          modelPath={agent.modelPath}
          walls={modelBounds?.walls || []}
        />
      ))}
    </group>
  );
};

const Simulation = ({ params, useCustomModel = false, modelPath = '/models/columbia_studio.glb' }) => {
  return (
    <SimulationContainer>
      <Canvas shadows camera={{ position: [20, 20, 20], fov: 50 }}>
        <color attach="background" args={['#f0f0f0']} />
        
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-10, 10, -5]} intensity={0.5} />
        <directionalLight position={[0, -10, 0]} intensity={0.2} />
        
        <Environment preset="studio" />
        
        <Bounds fit clip observe margin={1.2}>
          <StudioSpace 
            params={params} 
            useCustomModel={useCustomModel}
            modelPath={modelPath}
          />
        </Bounds>
        
        <OrbitControls 
          makeDefault 
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 2} 
          enableDamping 
        />
      </Canvas>
    </SimulationContainer>
  );
};

export default Simulation; 