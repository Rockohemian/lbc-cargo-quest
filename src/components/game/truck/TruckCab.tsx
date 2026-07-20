import * as THREE from 'three'

interface Props {
  cabBody: THREE.Material
  cabTrim: THREE.Material
  glass: THREE.Material
  electricPanel: THREE.Material
  electricAccent: THREE.Material
  whiteLight: THREE.Material
  amberLight: THREE.Material
  electricLabel: THREE.Texture
}

export function TruckCab({ cabBody, cabTrim, glass, electricPanel, electricAccent, whiteLight, amberLight, electricLabel }: Props) {
  return (
    <group>
      <mesh position={[4.2, 2.24, 0]} castShadow receiveShadow material={cabBody}>
        <boxGeometry args={[2.9, 2.68, 2.55]} />
      </mesh>

      <mesh position={[5.67, 1.98, 0]} castShadow material={cabBody}>
        <boxGeometry args={[0.54, 2.04, 2.46]} />
      </mesh>

      <mesh position={[5.95, 1.8, 0]} castShadow material={electricPanel}>
        <boxGeometry args={[0.08, 1.36, 2.02]} />
      </mesh>

      <mesh position={[5.9, 0.74, 0]} castShadow material={cabTrim}>
        <boxGeometry args={[0.34, 0.4, 2.52]} />
      </mesh>

      <group position={[5.69, 2.66, 0]} rotation={[0, Math.PI / 2, -0.19]}>
        <mesh material={cabTrim}>
          <planeGeometry args={[2.3, 1.24]} />
        </mesh>
        <mesh position={[0, 0, 0.004]} material={glass}>
          <planeGeometry args={[2.12, 1.08]} />
        </mesh>
        <mesh position={[0.02, 0, 0.007]} material={cabTrim}>
          <planeGeometry args={[0.05, 1.08]} />
        </mesh>
        <mesh position={[-0.58, -0.52, 0.008]} rotation={[0, 0, 0.4]} material={cabTrim}>
          <planeGeometry args={[0.64, 0.03]} />
        </mesh>
        <mesh position={[0.56, -0.52, 0.008]} rotation={[0, 0, 0.4]} material={cabTrim}>
          <planeGeometry args={[0.64, 0.03]} />
        </mesh>
      </group>

      <mesh position={[4.14, 2.38, 1.285]} material={glass}>
        <planeGeometry args={[1.86, 0.84]} />
      </mesh>
      <mesh position={[4.14, 2.38, -1.285]} rotation={[0, Math.PI, 0]} material={glass}>
        <planeGeometry args={[1.86, 0.84]} />
      </mesh>

      <mesh position={[4.14, 3.04, 0]} castShadow material={cabBody}>
        <cylinderGeometry args={[1.22, 1.18, 0.18, 16, 1, false, 0, Math.PI]} />
      </mesh>

      <mesh position={[4.11, 2.3, 1.29]} material={cabTrim}>
        <planeGeometry args={[0.04, 0.84]} />
      </mesh>
      <mesh position={[4.11, 2.3, -1.29]} rotation={[0, Math.PI, 0]} material={cabTrim}>
        <planeGeometry args={[0.04, 0.84]} />
      </mesh>

      <mesh position={[3.24, 2.3, 1.29]} material={cabTrim}>
        <planeGeometry args={[0.04, 0.84]} />
      </mesh>
      <mesh position={[3.24, 2.3, -1.29]} rotation={[0, Math.PI, 0]} material={cabTrim}>
        <planeGeometry args={[0.04, 0.84]} />
      </mesh>

      <mesh position={[3.68, 1.86, 1.3]} material={cabTrim}>
        <planeGeometry args={[1.28, 0.03]} />
      </mesh>
      <mesh position={[3.68, 1.86, -1.3]} rotation={[0, Math.PI, 0]} material={cabTrim}>
        <planeGeometry args={[1.28, 0.03]} />
      </mesh>

      <mesh position={[3.78, 1.98, 1.3]} material={cabTrim}>
        <planeGeometry args={[0.02, 0.56]} />
      </mesh>
      <mesh position={[3.78, 1.98, -1.3]} rotation={[0, Math.PI, 0]} material={cabTrim}>
        <planeGeometry args={[0.02, 0.56]} />
      </mesh>

      <mesh position={[4.52, 2.1, 1.34]} castShadow material={cabTrim}>
        <boxGeometry args={[0.18, 0.42, 0.12]} />
      </mesh>
      <mesh position={[4.52, 2.1, -1.34]} castShadow material={cabTrim}>
        <boxGeometry args={[0.18, 0.42, 0.12]} />
      </mesh>

      <mesh position={[3.52, 1.3, 1.3]} castShadow material={cabTrim}>
        <boxGeometry args={[0.72, 0.1, 0.16]} />
      </mesh>
      <mesh position={[3.52, 1.3, -1.3]} castShadow material={cabTrim}>
        <boxGeometry args={[0.72, 0.1, 0.16]} />
      </mesh>

      <mesh position={[4.52, 0.94, 1.12]} castShadow material={cabTrim}>
        <boxGeometry args={[0.92, 0.55, 0.22]} />
      </mesh>
      <mesh position={[4.52, 0.94, -1.12]} castShadow material={cabTrim}>
        <boxGeometry args={[0.92, 0.55, 0.22]} />
      </mesh>

      <mesh position={[2.92, 1.32, 1.3]} material={cabTrim}>
        <planeGeometry args={[0.72, 0.03]} />
      </mesh>
      <mesh position={[2.92, 1.32, -1.3]} rotation={[0, Math.PI, 0]} material={cabTrim}>
        <planeGeometry args={[0.72, 0.03]} />
      </mesh>

      <mesh position={[3.26, 1.54, 1.3]} material={electricPanel}>
        <planeGeometry args={[0.04, 0.62]} />
      </mesh>
      <mesh position={[3.26, 1.54, -1.3]} rotation={[0, Math.PI, 0]} material={electricPanel}>
        <planeGeometry args={[0.04, 0.62]} />
      </mesh>

      <mesh position={[3.68, 1.52, 1.3]} material={electricAccent}>
        <planeGeometry args={[1.86, 0.08]} />
      </mesh>
      <mesh position={[3.68, 1.52, -1.3]} rotation={[0, Math.PI, 0]} material={electricAccent}>
        <planeGeometry args={[1.86, 0.08]} />
      </mesh>

      <mesh position={[2.82, 1.3, 1.3]} material={cabTrim}>
        <planeGeometry args={[0.46, 0.18]} />
      </mesh>
      <mesh position={[2.82, 1.3, -1.3]} rotation={[0, Math.PI, 0]} material={cabTrim}>
        <planeGeometry args={[0.46, 0.18]} />
      </mesh>

      <mesh position={[2.815, 1.3, 1.302]}>
        <planeGeometry args={[0.42, 0.14]} />
        <meshBasicMaterial map={electricLabel} transparent alphaTest={0.1} />
      </mesh>
      <mesh position={[2.815, 1.3, -1.302]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.42, 0.14]} />
        <meshBasicMaterial map={electricLabel} transparent alphaTest={0.1} />
      </mesh>

      <mesh position={[2.82, 1.28, 1.301]} material={electricAccent}>
        <planeGeometry args={[0.08, 0.08]} />
      </mesh>
      <mesh position={[2.82, 1.28, -1.301]} rotation={[0, Math.PI, 0]} material={electricAccent}>
        <planeGeometry args={[0.08, 0.08]} />
      </mesh>

      <mesh position={[5.98, 1.08, 0.78]} material={whiteLight}>
        <boxGeometry args={[0.04, 0.09, 0.66]} />
      </mesh>
      <mesh position={[5.98, 1.08, -0.78]} material={whiteLight}>
        <boxGeometry args={[0.04, 0.09, 0.66]} />
      </mesh>

      <mesh position={[5.98, 0.88, 1.24]} material={amberLight}>
        <boxGeometry args={[0.04, 0.08, 0.12]} />
      </mesh>
      <mesh position={[5.98, 0.88, -1.24]} material={amberLight}>
        <boxGeometry args={[0.04, 0.08, 0.12]} />
      </mesh>

      <mesh position={[5.99, 0.68, 0]} material={cabTrim}>
        <boxGeometry args={[0.03, 0.16, 0.58]} />
      </mesh>

      <mesh position={[5.99, 0.58, 0]} material={cabTrim}>
        <boxGeometry args={[0.03, 0.03, 1.55]} />
      </mesh>

      <mesh position={[3.84, 0.72, 1.31]} material={cabTrim}>
        <boxGeometry args={[1.96, 0.16, 0.08]} />
      </mesh>
      <mesh position={[3.84, 0.72, -1.31]} material={cabTrim}>
        <boxGeometry args={[1.96, 0.16, 0.08]} />
      </mesh>
    </group>
  )
}
