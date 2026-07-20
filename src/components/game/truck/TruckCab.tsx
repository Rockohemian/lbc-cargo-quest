import * as THREE from 'three'

interface Props {
  cabBody: THREE.Material
  cabTrim: THREE.Material
  glass: THREE.Material
  electricPanel: THREE.Material
  electricAccent: THREE.Material
  whiteLight: THREE.Material
  amberLight: THREE.Material
}

export function TruckCab({ cabBody, cabTrim, glass, electricPanel, electricAccent, whiteLight, amberLight }: Props) {
  return (
    <group>
      <mesh position={[3.82, 2.15, 0]} castShadow receiveShadow material={cabBody}>
        <boxGeometry args={[2.45, 2.5, 2.35]} />
      </mesh>

      <mesh position={[5.04, 1.95, 0]} castShadow material={cabBody}>
        <boxGeometry args={[0.62, 2.1, 2.3]} />
      </mesh>

      <mesh position={[5.37, 1.74, 0]} castShadow material={electricPanel}>
        <boxGeometry args={[0.08, 1.2, 1.95]} />
      </mesh>

      <mesh position={[5.35, 0.72, 0]} castShadow material={cabTrim}>
        <boxGeometry args={[0.3, 0.36, 2.35]} />
      </mesh>

      <group position={[5.08, 2.57, 0]} rotation={[0, Math.PI / 2, -0.13]}>
        <mesh material={cabTrim}>
          <planeGeometry args={[2.05, 1.02]} />
        </mesh>
        <mesh position={[0, 0, 0.004]} material={glass}>
          <planeGeometry args={[1.88, 0.86]} />
        </mesh>
        <mesh position={[0.02, 0, 0.007]} material={cabTrim}>
          <planeGeometry args={[0.05, 0.86]} />
        </mesh>
        <mesh position={[-0.46, -0.43, 0.008]} rotation={[0, 0, 0.36]} material={cabTrim}>
          <planeGeometry args={[0.52, 0.025]} />
        </mesh>
        <mesh position={[0.44, -0.43, 0.008]} rotation={[0, 0, 0.36]} material={cabTrim}>
          <planeGeometry args={[0.52, 0.025]} />
        </mesh>
      </group>

      <mesh position={[3.8, 2.3, 1.18]} material={glass}>
        <planeGeometry args={[1.45, 0.72]} />
      </mesh>
      <mesh position={[3.8, 2.3, -1.18]} rotation={[0, Math.PI, 0]} material={glass}>
        <planeGeometry args={[1.45, 0.72]} />
      </mesh>

      <mesh position={[3.78, 2.2, 1.185]} material={cabTrim}>
        <planeGeometry args={[0.04, 0.72]} />
      </mesh>
      <mesh position={[3.78, 2.2, -1.185]} rotation={[0, Math.PI, 0]} material={cabTrim}>
        <planeGeometry args={[0.04, 0.72]} />
      </mesh>

      <mesh position={[3.13, 2.2, 1.185]} material={cabTrim}>
        <planeGeometry args={[0.04, 0.72]} />
      </mesh>
      <mesh position={[3.13, 2.2, -1.185]} rotation={[0, Math.PI, 0]} material={cabTrim}>
        <planeGeometry args={[0.04, 0.72]} />
      </mesh>

      <mesh position={[3.48, 1.8, 1.19]} material={cabTrim}>
        <planeGeometry args={[0.98, 0.03]} />
      </mesh>
      <mesh position={[3.48, 1.8, -1.19]} rotation={[0, Math.PI, 0]} material={cabTrim}>
        <planeGeometry args={[0.98, 0.03]} />
      </mesh>

      <mesh position={[3.58, 1.9, 1.19]} material={cabTrim}>
        <planeGeometry args={[0.02, 0.48]} />
      </mesh>
      <mesh position={[3.58, 1.9, -1.19]} rotation={[0, Math.PI, 0]} material={cabTrim}>
        <planeGeometry args={[0.02, 0.48]} />
      </mesh>

      <mesh position={[4.12, 2.0, 1.22]} castShadow material={cabTrim}>
        <boxGeometry args={[0.18, 0.42, 0.12]} />
      </mesh>
      <mesh position={[4.12, 2.0, -1.22]} castShadow material={cabTrim}>
        <boxGeometry args={[0.18, 0.42, 0.12]} />
      </mesh>

      <mesh position={[3.3, 1.2, 1.2]} castShadow material={cabTrim}>
        <boxGeometry args={[0.55, 0.08, 0.15]} />
      </mesh>
      <mesh position={[3.3, 1.2, -1.2]} castShadow material={cabTrim}>
        <boxGeometry args={[0.55, 0.08, 0.15]} />
      </mesh>

      <mesh position={[3.5, 0.82, 1.16]} castShadow material={cabTrim}>
        <boxGeometry args={[0.62, 0.24, 0.1]} />
      </mesh>
      <mesh position={[3.5, 0.82, -1.16]} castShadow material={cabTrim}>
        <boxGeometry args={[0.62, 0.24, 0.1]} />
      </mesh>

      <mesh position={[3.02, 0.76, 1.16]} castShadow material={electricPanel}>
        <boxGeometry args={[0.3, 0.36, 0.1]} />
      </mesh>
      <mesh position={[3.02, 0.76, -1.16]} castShadow material={electricPanel}>
        <boxGeometry args={[0.3, 0.36, 0.1]} />
      </mesh>

      <mesh position={[3.78, 1.45, 1.2]} material={electricAccent}>
        <planeGeometry args={[1.45, 0.08]} />
      </mesh>
      <mesh position={[3.78, 1.45, -1.2]} rotation={[0, Math.PI, 0]} material={electricAccent}>
        <planeGeometry args={[1.45, 0.08]} />
      </mesh>

      <mesh position={[2.95, 1.25, 1.2]} material={cabTrim}>
        <planeGeometry args={[0.42, 0.18]} />
      </mesh>
      <mesh position={[2.95, 1.25, -1.2]} rotation={[0, Math.PI, 0]} material={cabTrim}>
        <planeGeometry args={[0.42, 0.18]} />
      </mesh>

      <mesh position={[2.95, 1.24, 1.201]} material={electricAccent}>
        <planeGeometry args={[0.08, 0.08]} />
      </mesh>
      <mesh position={[2.95, 1.24, -1.201]} rotation={[0, Math.PI, 0]} material={electricAccent}>
        <planeGeometry args={[0.08, 0.08]} />
      </mesh>

      <mesh position={[5.38, 1.1, 0.72]} material={whiteLight}>
        <boxGeometry args={[0.05, 0.26, 0.44]} />
      </mesh>
      <mesh position={[5.38, 1.1, -0.72]} material={whiteLight}>
        <boxGeometry args={[0.05, 0.26, 0.44]} />
      </mesh>

      <mesh position={[5.38, 0.86, 1.18]} material={amberLight}>
        <boxGeometry args={[0.04, 0.08, 0.12]} />
      </mesh>
      <mesh position={[5.38, 0.86, -1.18]} material={amberLight}>
        <boxGeometry args={[0.04, 0.08, 0.12]} />
      </mesh>

      <mesh position={[5.39, 0.68, 0]} material={cabTrim}>
        <boxGeometry args={[0.03, 0.16, 0.58]} />
      </mesh>
    </group>
  )
}
