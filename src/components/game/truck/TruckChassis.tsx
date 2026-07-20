import * as THREE from 'three'

interface Props {
  chassis: THREE.Material
  electricPanel: THREE.Material
  electricAccent: THREE.Material
}

export function TruckChassis({ chassis, electricPanel, electricAccent }: Props) {
  return (
    <group>
      <mesh position={[1.18, 0.46, 0]} castShadow material={chassis}>
        <boxGeometry args={[8.05, 0.18, 1.46]} />
      </mesh>

      <mesh position={[1.22, 0.64, 0]} castShadow material={chassis}>
        <boxGeometry args={[7.55, 0.08, 1.24]} />
      </mesh>

      <mesh position={[2.22, 0.78, 0.86]} castShadow material={electricPanel}>
        <boxGeometry args={[1.62, 0.42, 0.34]} />
      </mesh>
      <mesh position={[2.22, 0.78, -0.86]} castShadow material={electricPanel}>
        <boxGeometry args={[1.62, 0.42, 0.34]} />
      </mesh>

      <mesh position={[0.64, 0.76, 0.86]} castShadow material={electricPanel}>
        <boxGeometry args={[1.28, 0.38, 0.3]} />
      </mesh>
      <mesh position={[0.64, 0.76, -0.86]} castShadow material={electricPanel}>
        <boxGeometry args={[1.28, 0.38, 0.3]} />
      </mesh>

      <mesh position={[1.42, 0.75, 0.86]} material={electricAccent}>
        <planeGeometry args={[2.52, 0.06]} />
      </mesh>
      <mesh position={[1.42, 0.75, -0.86]} rotation={[0, Math.PI, 0]} material={electricAccent}>
        <planeGeometry args={[2.52, 0.06]} />
      </mesh>

      <mesh position={[0.38, 0.74, 1.17]} castShadow material={chassis}>
        <boxGeometry args={[0.16, 0.32, 0.08]} />
      </mesh>
      <mesh position={[0.38, 0.74, -1.17]} castShadow material={chassis}>
        <boxGeometry args={[0.16, 0.32, 0.08]} />
      </mesh>

      <mesh position={[0.38, 0.86, 1.195]} material={electricAccent}>
        <sphereGeometry args={[0.035, 8, 8]} />
      </mesh>
      <mesh position={[0.38, 0.86, -1.195]} material={electricAccent}>
        <sphereGeometry args={[0.035, 8, 8]} />
      </mesh>
    </group>
  )
}
