import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface InstancedSciFiSpheresProps {
  nodes: number[][];
  positions: { x: number; y: number; z: number }[];
  sphereRefs: React.MutableRefObject<Map<string, any>>;
}

const InstancedSciFiSpheres: React.FC<InstancedSciFiSpheresProps> = ({
  nodes,
  positions,
  sphereRefs,
}) => {
  const glassRef = useRef<THREE.InstancedMesh>(null);
  const liquidRef = useRef<THREE.InstancedMesh>(null);

  // Color arrays for each instance
  const color1Array = useMemo(
    () => new Float32Array(nodes.length * 3),
    [nodes.length]
  );
  const color2Array = useMemo(
    () => new Float32Array(nodes.length * 3),
    [nodes.length]
  );
  const glowColorArray = useMemo(
    () => new Float32Array(nodes.length * 3),
    [nodes.length]
  );
  const visibilityArray = useMemo(
    () => new Float32Array(nodes.length).fill(0),
    [nodes.length]
  );
  const timeOffsets = useMemo(
    () => nodes.map(() => Math.random() * Math.PI * 2),
    [nodes]
  );

  // Shader material for liquid with instancing support
  const liquidMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
        },
        vertexShader: `
          uniform float time;
          attribute vec3 instanceColor1;
          attribute vec3 instanceColor2;
          attribute vec3 instanceGlowColor;
          attribute float instanceVisible;
          varying vec3 vNormal;
          varying vec3 vPosition;
          varying vec3 vColor1;
          varying vec3 vColor2;
          varying vec3 vGlowColor;
          varying float vVisible;
          
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position + normal * (
              sin(position.y*4.0 + time*2.0)*0.06 +
              sin(position.x*3.0 + time*1.3)*0.04 +
              cos(position.z*3.5 - time*1.7)*0.04
            );
            vColor1 = instanceColor1;
            vColor2 = instanceColor2;
            vGlowColor = instanceGlowColor;
            vVisible = instanceVisible;
            
            vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(vPosition * 0.85, 1.0);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform float time;
          varying vec3 vNormal;
          varying vec3 vPosition;
          varying vec3 vColor1;
          varying vec3 vColor2;
          varying vec3 vGlowColor;
          varying float vVisible;
          
          void main() {
            if (vVisible < 0.5) discard;
            
            float pattern = sin(vPosition.y*8.0+time*2.0)*0.5+0.5;
            vec3 baseColor = mix(vColor1, vColor2, pattern);
            vec3 viewDir = normalize(cameraPosition - vPosition);
            float fresnel = pow(1.0 - dot(viewDir, vNormal), 2.0);
            gl_FragColor = vec4(baseColor + vGlowColor*fresnel*1.5, 1.0);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  );

  // Glass material
  const glassMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0,
        transmission: 0.98,
        thickness: 0.2,
        transparent: true,
        opacity: 0.3,
        clearcoat: 1,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  );

  // Initialize positions and matrices
  useEffect(() => {
    if (!glassRef.current || !liquidRef.current) return;

    const dummy = new THREE.Object3D();

    positions.forEach((pos, i) => {
      dummy.position.set(pos.x, pos.y, pos.z);
      dummy.updateMatrix();

      glassRef.current!.setMatrixAt(i, dummy.matrix);
      liquidRef.current!.setMatrixAt(i, dummy.matrix);

      // Initialize all as invisible (black)
      color1Array[i * 3] = 0;
      color1Array[i * 3 + 1] = 0;
      color1Array[i * 3 + 2] = 0;

      color2Array[i * 3] = 0;
      color2Array[i * 3 + 1] = 0;
      color2Array[i * 3 + 2] = 0;

      glowColorArray[i * 3] = 0;
      glowColorArray[i * 3 + 1] = 0;
      glowColorArray[i * 3 + 2] = 0;

      visibilityArray[i] = 0;
    });

    glassRef.current.instanceMatrix.needsUpdate = true;
    liquidRef.current.instanceMatrix.needsUpdate = true;

    // Add custom attributes to liquid geometry
    const geometry = liquidRef.current.geometry;
    geometry.setAttribute(
      "instanceColor1",
      new THREE.InstancedBufferAttribute(color1Array, 3)
    );
    geometry.setAttribute(
      "instanceColor2",
      new THREE.InstancedBufferAttribute(color2Array, 3)
    );
    geometry.setAttribute(
      "instanceGlowColor",
      new THREE.InstancedBufferAttribute(glowColorArray, 3)
    );
    geometry.setAttribute(
      "instanceVisible",
      new THREE.InstancedBufferAttribute(visibilityArray, 1)
    );
  }, [positions, color1Array, color2Array, glowColorArray, visibilityArray]);

  // Register paint functions
  useEffect(() => {
    const paintInstance = (index: number, colorHex: number) => {
      if (colorHex === 0) {
        // Make invisible
        visibilityArray[index] = 0;
        color1Array[index * 3] = 0;
        color1Array[index * 3 + 1] = 0;
        color1Array[index * 3 + 2] = 0;
      } else {
        // Set color and make visible
        const color = new THREE.Color(colorHex);
        visibilityArray[index] = 1;

        color1Array[index * 3] = color.r;
        color1Array[index * 3 + 1] = color.g;
        color1Array[index * 3 + 2] = color.b;

        const color2 = color.clone().multiplyScalar(0.66);
        color2Array[index * 3] = color2.r;
        color2Array[index * 3 + 1] = color2.g;
        color2Array[index * 3 + 2] = color2.b;

        const glowColor = color.clone().multiplyScalar(1.5);
        glowColorArray[index * 3] = glowColor.r;
        glowColorArray[index * 3 + 1] = glowColor.g;
        glowColorArray[index * 3 + 2] = glowColor.b;
      }

      if (liquidRef.current) {
        const geometry = liquidRef.current.geometry;
        geometry.attributes.instanceColor1.needsUpdate = true;
        geometry.attributes.instanceColor2.needsUpdate = true;
        geometry.attributes.instanceGlowColor.needsUpdate = true;
        geometry.attributes.instanceVisible.needsUpdate = true;
      }
    };

    nodes.forEach((node, index) => {
      const key = node.join("-");
      sphereRefs.current.set(key, {
        paint: (color: number) => paintInstance(index, color),
      });
    });

    return () => {
      nodes.forEach((node) => {
        const key = node.join("-");
        sphereRefs.current.delete(key);
      });
    };
  }, [
    nodes,
    sphereRefs,
    color1Array,
    color2Array,
    glowColorArray,
    visibilityArray,
  ]);

  // Animation loop
  useFrame((state) => {
    if (!liquidRef.current) return;

    const time = state.clock.elapsedTime;
    liquidMaterial.uniforms.time.value = time;

    const dummy = new THREE.Object3D();

    positions.forEach((pos, i) => {
      const offset = timeOffsets[i];

      // Rotation animation for liquid
      const rotY = time * 0.4 + offset;
      const rotX = Math.sin(time * 0.3 + offset) * 0.2;

      dummy.position.set(pos.x, pos.y, pos.z);
      dummy.rotation.set(rotX, rotY, 0);
      dummy.updateMatrix();

      liquidRef.current!.setMatrixAt(i, dummy.matrix);
    });

    liquidRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      {/* Glass spheres */}
      <instancedMesh
        ref={glassRef}
        args={[undefined, undefined, nodes.length]}
        material={glassMaterial}
        renderOrder={0}
      >
        <sphereGeometry args={[0.4, 32, 32]} />
      </instancedMesh>

      {/* Liquid spheres with shader */}
      <instancedMesh
        ref={liquidRef}
        args={[undefined, undefined, nodes.length]}
        material={liquidMaterial}
        renderOrder={1}
      >
        <sphereGeometry args={[0.4, 32, 32]} />
      </instancedMesh>
    </>
  );
};

export default InstancedSciFiSpheres;
