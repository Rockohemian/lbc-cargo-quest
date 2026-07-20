import { useMemo } from 'react'
import * as THREE from 'three'

interface AxleProps {
  x: number
  zOffset?: number
  dual?: boolean
  roll: number
  tireMat: THREE.Material
  rimMat: THREE.Material
}

function WheelUnit({ roll, tireMat, rimMat }: { roll: number; tireMat: THREE.Material; rimMat: THREE.Material }) {
  return (
    <group rotation={[Math.PI / 2, 0, roll]}>
      <mesh castShadow material={tireMat}>
        <cylinderGeometry args={[0.44, 0.44, 0.34, 20]} />
      </mesh>
      <mesh position={[0, 0.12, 0]} castShadow material={rimMat}>
        <cylinderGeometry args={[0.24, 0.24, 0.1, 18]} />
      </mesh>
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.03, 12]} />
        <meshStandardMaterial color="#0b0d0c" metalness={0.58} roughness={0.38} />
      </mesh>
    </group>
  )
}

export function WheelAxle({ x, zOffset = 1.15, dual = false, roll, tireMat, rimMat }: AxleProps) {
  const offsets = useMemo(() => (dual ? [-0.09, 0.09] : [0]), [dual])

  return (
    <group position={[x, 0.44, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.06, 0.06, zOffset * 2.05, 10]} />
        <meshStandardMaterial color="#2a2e2b" metalness={0.55} roughness={0.45} />
      </mesh>

      {offsets.map((inner) => (
        <group key={`l-${inner}`} position={[0, 0, zOffset + inner]}>
          <WheelUnit roll={roll} tireMat={tireMat} rimMat={rimMat} />
        </group>
      ))}

      {offsets.map((inner) => (
        <group key={`r-${inner}`} position={[0, 0, -zOffset + inner]}>
          <WheelUnit roll={roll} tireMat={tireMat} rimMat={rimMat} />
        </group>
      ))}
    </group>
  )
}
