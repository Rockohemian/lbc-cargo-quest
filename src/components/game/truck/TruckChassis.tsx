import * as THREE from 'three'

interface Props {
  chassis: THREE.Material
  electricPanel: THREE.Material
  electricAccent: THREE.Material
}

export function TruckChassis({ chassis, electricPanel, electricAccent }: Props) {
  return (
    <group>
      <mesh position={[1.38, 0.46, 0]} castShadow material={chassis}>
        <boxGeometry args={[8.45, 0.18, 1.5]} />
      </mesh>

      <mesh position={[1.42, 0.64, 0]} castShadow material={chassis}>
        <boxGeometry args={[7.95, 0.08, 1.28]} />
      </mesh>

      <mesh position={[2.7, 0.8, 0.88]} castShadow material={electricPanel}>
        <boxGeometry args={[1.9, 0.44, 0.34]} />
      </mesh>
      <mesh position={[2.7, 0.8, -0.88]} castShadow material={electricPanel}>
        <boxGeometry args={[1.9, 0.44, 0.34]} />
      </mesh>

      <mesh position={[1.0, 0.77, 0.88]} castShadow material={electricPanel}>
        <boxGeometry args={[1.36, 0.4, 0.3]} />
      </mesh>
      <mesh position={[1.0, 0.77, -0.88]} castShadow material={electricPanel}>
        <boxGeometry args={[1.36, 0.4, 0.3]} />
      </mesh>

      <mesh position={[1.86, 0.76, 0.88]} material={electricAccent}>
        <planeGeometry args={[2.9, 0.06]} />
      </mesh>
      <mesh position={[1.86, 0.76, -0.88]} rotation={[0, Math.PI, 0]} material={electricAccent}>
        <planeGeometry args={[2.9, 0.06]} />
      </mesh>

      <mesh position={[0.78, 0.74, 1.2]} castShadow material={chassis}>
        <boxGeometry args={[0.16, 0.32, 0.08]} />
      </mesh>
      <mesh position={[0.78, 0.74, -1.2]} castShadow material={chassis}>
        <boxGeometry args={[0.16, 0.32, 0.08]} />
      </mesh>

      <mesh position={[0.78, 0.86, 1.215]} material={electricAccent}>
        <sphereGeometry args={[0.035, 8, 8]} />
      </mesh>
      <mesh position={[0.78, 0.86, -1.215]} material={electricAccent}>
        <sphereGeometry args={[0.035, 8, 8]} />
      </mesh>

      <mesh position={[0.98, 0.83, 0.9]} material={electricPanel}>
        <planeGeometry args={[0.4, 0.12]} />
      </mesh>
      <mesh position={[0.98, 0.83, -0.9]} rotation={[0, Math.PI, 0]} material={electricPanel}>
        <planeGeometry args={[0.4, 0.12]} />
      </mesh>
    </group>
  )
}
