import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { COLORS } from "./utils";

export interface Connection {
  from: [number, number, number];
  to: [number, number, number];
}

interface InstancedElevatorThreadsProps {
  connections: Connection[];

  threadRefs: React.MutableRefObject<Map<string, any>>;
}

const InstancedElevatorThreads: React.FC<InstancedElevatorThreadsProps> = ({
  connections,

  threadRefs,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.InstancedMesh>(null);

  // Color arrays for each thread
  const visibilityArray = useMemo(
    () => new Float32Array(connections.length).fill(1), // 1 = visible by default
    [connections.length]
  );

  // Set default colors
  const colorArray = useMemo(() => {
    const arr = new Float32Array(connections.length * 3);
    const defaultColor = new THREE.Color(COLORS.THREAD_DEFAULT);
    for (let i = 0; i < connections.length; i++) {
      arr[i * 3] = defaultColor.r;
      arr[i * 3 + 1] = defaultColor.g;
      arr[i * 3 + 2] = defaultColor.b;
    }
    return arr;
  }, [connections.length]);

  const glowColorArray = useMemo(() => {
    const arr = new Float32Array(connections.length * 3);
    const glowColor = new THREE.Color(0x4444ff).multiplyScalar(2.0);
    for (let i = 0; i < connections.length; i++) {
      arr[i * 3] = glowColor.r;
      arr[i * 3 + 1] = glowColor.g;
      arr[i * 3 + 2] = glowColor.b;
    }
    return arr;
  }, [connections.length]);
  const flowOffsets = useMemo(
    () => connections.map(() => Math.random() * Math.PI * 2),
    [connections]
  );

  // Compute positions and rotations for each thread
  const threadData = useMemo(() => {
    return connections.map(({ from, to }) => {
      const fromPos = new THREE.Vector3(from[0], from[2], from[1]);
      const toPos = new THREE.Vector3(to[0], to[2], to[1]);

      const midPoint = new THREE.Vector3()
        .addVectors(fromPos, toPos)
        .multiplyScalar(0.5);
      const distance = fromPos.distanceTo(toPos);

      // Calculate rotation to point from 'from' to 'to'
      const direction = new THREE.Vector3()
        .subVectors(toPos, fromPos)
        .normalize();
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

      return { midPoint, distance, quaternion };
    });
  }, [connections]);

  // Shader material for threads with flow animation
  const threadMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
        },
        vertexShader: `
          uniform float time;
          attribute vec3 instanceColor;
          attribute vec3 instanceGlowColor;
          attribute float instanceVisible;
          attribute float instanceFlowOffset;
          
          varying vec3 vColor;
          varying vec3 vGlowColor;
          varying float vVisible;
          varying vec2 vUv;
          varying float vFlow;
          
          void main() {
            vColor = instanceColor;
            vGlowColor = instanceGlowColor;
            vVisible = instanceVisible;
            vUv = uv;
            
            // Flow animation along the thread
            vFlow = mod(uv.y + time * 0.5 + instanceFlowOffset, 1.0);
            
            vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform float time;
          varying vec3 vColor;
          varying vec3 vGlowColor;
          varying float vVisible;
          varying vec2 vUv;
          varying float vFlow;
          
          void main() {
            if (vVisible < 0.5) discard;
            
            // Create flowing energy effect
            float flow = smoothstep(0.0, 0.2, vFlow) * smoothstep(1.0, 0.8, vFlow);
            
            // Pulsing glow
            float pulse = sin(time * 3.0) * 0.3 + 0.7;
            
            // Radial fade from center
            float radial = 1.0 - length(vUv - 0.5) * 2.0;
            radial = smoothstep(0.0, 1.0, radial);
            
            vec3 finalColor = vColor + vGlowColor * flow * pulse;
            float alpha = radial * vVisible * (0.6 + flow * 0.4);
            
            gl_FragColor = vec4(finalColor, alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    []
  );

  // Initialize thread instances
  useEffect(() => {
    if (!meshRef.current) return;

    const dummy = new THREE.Object3D();

    threadData.forEach((data, i) => {
      dummy.position.copy(data.midPoint);
      dummy.quaternion.copy(data.quaternion);
      dummy.scale.set(0.15, data.distance, 0.15); // Thicker cylinder
      dummy.updateMatrix();

      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;

    // Add custom attributes
    const geometry = meshRef.current.geometry;
    geometry.setAttribute(
      "instanceColor",
      new THREE.InstancedBufferAttribute(colorArray, 3)
    );
    geometry.setAttribute(
      "instanceGlowColor",
      new THREE.InstancedBufferAttribute(glowColorArray, 3)
    );
    geometry.setAttribute(
      "instanceVisible",
      new THREE.InstancedBufferAttribute(visibilityArray, 1)
    );
    geometry.setAttribute(
      "instanceFlowOffset",
      new THREE.InstancedBufferAttribute(new Float32Array(flowOffsets), 1)
    );
  }, [threadData, colorArray, glowColorArray, visibilityArray, flowOffsets]);

  // Register paint functions for threads
  useEffect(() => {
    const paintThread = (index: number, colorHex: number) => {
      if (colorHex === 0) {
        // Instead of invisible, paint default color (cyan-ish blue glow)
        visibilityArray[index] = 1;
        const defaultColor = new THREE.Color(COLORS.THREAD_DEFAULT);
        colorArray[index * 3] = defaultColor.r;
        colorArray[index * 3 + 1] = defaultColor.g;
        colorArray[index * 3 + 2] = defaultColor.b;

        const glowColor = defaultColor.clone().multiplyScalar(2.0);
        glowColorArray[index * 3] = glowColor.r;
        glowColorArray[index * 3 + 1] = glowColor.g;
        glowColorArray[index * 3 + 2] = glowColor.b;
      } else {
        const color = new THREE.Color(colorHex);
        visibilityArray[index] = 1;

        colorArray[index * 3] = color.r;
        colorArray[index * 3 + 1] = color.g;
        colorArray[index * 3 + 2] = color.b;

        const glowColor = color.clone().multiplyScalar(2.0);
        glowColorArray[index * 3] = glowColor.r;
        glowColorArray[index * 3 + 1] = glowColor.g;
        glowColorArray[index * 3 + 2] = glowColor.b;
      }

      if (meshRef.current) {
        const geometry = meshRef.current.geometry;
        geometry.attributes.instanceColor.needsUpdate = true;
        geometry.attributes.instanceGlowColor.needsUpdate = true;
        geometry.attributes.instanceVisible.needsUpdate = true;
      }
    };

    connections.forEach((connection, index) => {
      const key = `${connection.from.join("-")}-${connection.to.join("-")}`;
      threadRefs.current.set(key, {
        paint: (color: number) => paintThread(index, color),
      });
    });

    return () => {
      connections.forEach((connection) => {
        const key = `${connection.from.join("-")}-${connection.to.join("-")}`;
        threadRefs.current.delete(key);
      });
    };
  }, [connections, threadRefs, colorArray, glowColorArray, visibilityArray]);

  // Animation loop
  useFrame((state) => {
    if (!meshRef.current) return;
    threadMaterial.uniforms.time.value = state.clock.elapsedTime;
  });

  if (connections.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, connections.length]}
      material={threadMaterial}
      renderOrder={2}
    >
      <cylinderGeometry args={[1, 1, 1, 8, 1]} />
    </instancedMesh>
  );
};

export default InstancedElevatorThreads;
