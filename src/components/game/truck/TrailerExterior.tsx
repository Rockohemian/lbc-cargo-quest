import * as THREE from 'three'

interface Props {
  trailerBody: THREE.Material
  trailerFrame: THREE.Material
  redLight: THREE.Material
  amberLight: THREE.Material
  sideAccent: THREE.Material
  logo: THREE.Texture
}

export function TrailerExterior({ trailerBody, trailerFrame, redLight, amberLight, sideAccent, logo }: Props) {
  return (
    <group>
      <mesh position={[-2.0, 1.92, 0]} castShadow receiveShadow material={trailerBody}>
        <boxGeometry args={[9.4, 2.55, 2.45]} />
      </mesh>

      <mesh position={[-2.0, 0.55, 0]} castShadow material={trailerFrame}>
        <boxGeometry args={[9.5, 0.2, 2.12]} />
      </mesh>

      <mesh position={[-6.7, 1.92, 0]} material={trailerFrame}>
        <boxGeometry args={[0.04, 2.52, 2.48]} />
      </mesh>
      <mesh position={[-6.72, 1.92, 0]} material={trailerFrame}>
        <boxGeometry args={[0.02, 2.52, 0.04]} />
      </mesh>

      <mesh position={[-2.0, 2.55, 1.24]} material={sideAccent}>
        <planeGeometry args={[9.35, 0.06]} />
      </mesh>
      <mesh position={[-2.0, 2.55, -1.24]} rotation={[0, Math.PI, 0]} material={sideAccent}>
        <planeGeometry args={[9.35, 0.06]} />
      </mesh>

      <mesh position={[-2.0, 1.95, 1.235]}>
        <planeGeometry args={[4.9, 1.4]} />
        <meshBasicMaterial map={logo} transparent alphaTest={0.06} />
      </mesh>
      <mesh position={[-2.0, 1.95, -1.235]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[4.9, 1.4]} />
        <meshBasicMaterial map={logo} transparent alphaTest={0.06} />
      </mesh>

      {[-4.8, -2.4, 0.0, 2.4].map((x) => (
        <mesh key={`marker-l-${x}`} position={[x, 1.1, 1.24]} material={amberLight}>
          <boxGeometry args={[0.06, 0.08, 0.05]} />
        </mesh>
      ))}
      {[-4.8, -2.4, 0.0, 2.4].map((x) => (
        <mesh key={`marker-r-${x}`} position={[x, 1.1, -1.24]} material={amberLight}>
          <boxGeometry args={[0.06, 0.08, 0.05]} />
        </mesh>
      ))}

      <mesh position={[-6.72, 0.96, 1.02]} material={redLight}>
        <boxGeometry args={[0.05, 0.44, 0.32]} />
      </mesh>
      <mesh position={[-6.72, 0.96, -1.02]} material={redLight}>
        <boxGeometry args={[0.05, 0.44, 0.32]} />
      </mesh>

      <mesh position={[-6.71, 0.76, 0]} material={trailerFrame}>
        <boxGeometry args={[0.03, 0.16, 0.58]} />
      </mesh>

      <mesh position={[2.55, 0.6, 0.86]} castShadow material={trailerFrame}>
        <boxGeometry args={[0.14, 0.7, 0.12]} />
      </mesh>
      <mesh position={[2.55, 0.6, -0.86]} castShadow material={trailerFrame}>
        <boxGeometry args={[0.14, 0.7, 0.12]} />
      </mesh>

      <mesh position={[-5.95, 0.3, 1.05]} castShadow material={trailerFrame}>
        <boxGeometry args={[0.12, 0.4, 0.18]} />
      </mesh>
      <mesh position={[-5.95, 0.3, -1.05]} castShadow material={trailerFrame}>
        <boxGeometry args={[0.12, 0.4, 0.18]} />
      </mesh>
    </group>
  )
}
