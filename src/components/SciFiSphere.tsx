import React, {
  useRef,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export interface SciFiSphereHandle {
  paint: (color: number) => void;
}

interface SciFiSphereProps {
  position: [number, number, number];
  scale?: number;
}

const SciFiSphere = forwardRef<SciFiSphereHandle, SciFiSphereProps>(
  ({ position, scale = 0.3 }, ref) => {
    const liquidRef = useRef<THREE.Mesh>(null);
    const liquidMaterial = useRef(
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color1: { value: new THREE.Color(0x00ff44) },
          color2: { value: new THREE.Color(0x00ff44).multiplyScalar(0.66) },
          glowColor: { value: new THREE.Color(0x00ff44).multiplyScalar(1.5) },
        },
        vertexShader: `
          uniform float time;
          varying vec3 vNormal;
          varying vec3 vPosition;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position + normal * (
              sin(position.y*4.0 + time*2.0)*0.06 +
              sin(position.x*3.0 + time*1.3)*0.04 +
              cos(position.z*3.5 - time*1.7)*0.04
            );
            gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition,1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform vec3 color1;
          uniform vec3 color2;
          uniform vec3 glowColor;
          varying vec3 vNormal;
          varying vec3 vPosition;
          void main() {
            float pattern = sin(vPosition.y*8.0+time*2.0)*0.5+0.5;
            vec3 baseColor = mix(color1,color2,pattern);
            vec3 viewDir = normalize(cameraPosition - vPosition);
            float fresnel = pow(1.0 - dot(viewDir, vNormal), 2.0);
            gl_FragColor = vec4(baseColor + glowColor*fresnel*1.5,1.0);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
      })
    );

    // Disable depth write for liquid
    useEffect(() => {
      if (liquidMaterial.current) {
        liquidMaterial.current.depthWrite = false;
        liquidMaterial.current.toneMapped = false;
      }
    }, []);

    const glassMaterial = useRef(
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
      })
    );

    const visible = useRef(false);

    useImperativeHandle(ref, () => ({
      paint(color: number) {
        const mat = liquidMaterial.current;
        if (color === 0) {
          // Remove liquid color by making it transparent and invisible
          mat.uniforms.color1.value.setRGB(0, 0, 0);
          mat.uniforms.color2.value.setRGB(0, 0, 0);
          mat.uniforms.glowColor.value.setRGB(0, 0, 0);
          if (liquidRef.current) liquidRef.current.visible = false;
          visible.current = false;
          return;
        }
        mat.uniforms.color1.value.setHex(color);
        mat.uniforms.color2.value.setHex(color).multiplyScalar(0.66);
        mat.uniforms.glowColor.value.setHex(color).multiplyScalar(1.5);

        if (liquidRef.current) liquidRef.current.visible = true;
        visible.current = true;
      },
    }));

    useFrame((_, delta) => {
      if (!visible.current) return;
      liquidMaterial.current.uniforms.time.value += delta;
      if (liquidRef.current) {
        liquidRef.current.rotation.y += 0.004;
        liquidRef.current.rotation.x =
          Math.sin(liquidMaterial.current.uniforms.time.value * 0.3) * 0.2;
      }
    });

    return (
      <group position={position} scale={scale}>
        <mesh material={glassMaterial.current} renderOrder={0}>
          <sphereGeometry args={[1, 64, 64]} />
        </mesh>

        <mesh
          ref={liquidRef}
          material={liquidMaterial.current}
          visible={false}
          renderOrder={1}
          scale={[0.85, 0.85, 0.85]}
        >
          <sphereGeometry args={[1, 64, 64]} />
        </mesh>
      </group>
    );
  }
);

export default SciFiSphere;
