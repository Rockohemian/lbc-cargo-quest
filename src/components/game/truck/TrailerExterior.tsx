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
      <mesh position={[-2.0, 1.96, 0]} castShadow receiveShadow material={trailerBody}>
        <boxGeometry args={[9.8, 2.62, 2.52]} />
      </mesh>

      <mesh position={[-2.0, 0.55, 0]} castShadow material={trailerFrame}>
        <boxGeometry args={[9.9, 0.2, 2.18]} />
      </mesh>

      <mesh position={[-6.9, 1.96, 1.23]} material={trailerFrame}>
        <boxGeometry args={[0.06, 2.58, 0.06]} />
      </mesh>
      <mesh position={[-6.9, 1.96, -1.23]} material={trailerFrame}>
        <boxGeometry args={[0.06, 2.58, 0.06]} />
      </mesh>
      <mesh position={[2.9, 1.96, 1.23]} material={trailerFrame}>
        <boxGeometry args={[0.06, 2.58, 0.06]} />
      </mesh>
      <mesh position={[2.9, 1.96, -1.23]} material={trailerFrame}>
        <boxGeometry args={[0.06, 2.58, 0.06]} />
      </mesh>

      <mesh position={[-2.0, 2.6, 1.27]} material={sideAccent}>
        <planeGeometry args={[9.72, 0.06]} />
      </mesh>
      <mesh position={[-2.0, 2.6, -1.27]} rotation={[0, Math.PI, 0]} material={sideAccent}>
        <planeGeometry args={[9.72, 0.06]} />
      </mesh>

      <mesh position={[-1.8, 2.0, 1.265]}>
        <planeGeometry args={[5.1, 1.42]} />
        <meshBasicMaterial map={logo} transparent alphaTest={0.06} />
      </mesh>
      <mesh position={[-1.8, 2.0, -1.265]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[5.1, 1.42]} />
        <meshBasicMaterial map={logo} transparent alphaTest={0.06} />
      </mesh>

      <mesh position={[-6.9, 1.96, 0]} material={trailerFrame}>
        <boxGeometry args={[0.03, 2.56, 2.52]} />
      </mesh>
      <mesh position={[-6.915, 1.96, 0]} material={trailerFrame}>
        <boxGeometry args={[0.012, 2.56, 0.04]} />
      </mesh>

      {[-6.9].map((x) => (
        <mesh key={`door-l-${x}`} position={[x, 1.96, -0.64]} material={trailerFrame}>
          <boxGeometry args={[0.01, 2.3, 0.02]} />
        </mesh>
      ))}
      {[-6.9].map((x) => (
        <mesh key={`door-r-${x}`} position={[x, 1.96, 0.64]} material={trailerFrame}>
          <boxGeometry args={[0.01, 2.3, 0.02]} />
        </mesh>
      ))}

      {[-6.92, -6.88].map((x, i) => (
        <mesh key={`hinge-a-${i}`} position={[x, 2.7, 1.18]} material={trailerFrame}>
          <boxGeometry args={[0.02, 0.12, 0.08]} />
        </mesh>
      ))}
      {[-6.92, -6.88].map((x, i) => (
        <mesh key={`hinge-b-${i}`} position={[x, 1.96, 1.18]} material={trailerFrame}>
          <boxGeometry args={[0.02, 0.12, 0.08]} />
        </mesh>
      ))}
      {[-6.92, -6.88].map((x, i) => (
        <mesh key={`hinge-c-${i}`} position={[x, 1.22, 1.18]} material={trailerFrame}>
          <boxGeometry args={[0.02, 0.12, 0.08]} />
        </mesh>
      ))}
      {[-6.92, -6.88].map((x, i) => (
        <mesh key={`hinge-d-${i}`} position={[x, 2.7, -1.18]} material={trailerFrame}>
          <boxGeometry args={[0.02, 0.12, 0.08]} />
        </mesh>
      ))}
      {[-6.92, -6.88].map((x, i) => (
        <mesh key={`hinge-e-${i}`} position={[x, 1.96, -1.18]} material={trailerFrame}>
          <boxGeometry args={[0.02, 0.12, 0.08]} />
        </mesh>
      ))}
      {[-6.92, -6.88].map((x, i) => (
        <mesh key={`hinge-f-${i}`} position={[x, 1.22, -1.18]} material={trailerFrame}>
          <boxGeometry args={[0.02, 0.12, 0.08]} />
        </mesh>
      ))}

      <mesh position={[-6.88, 1.95, 0.32]} material={trailerFrame}>
        <boxGeometry args={[0.03, 0.82, 0.06]} />
      </mesh>
      <mesh position={[-6.88, 1.95, -0.32]} material={trailerFrame}>
        <boxGeometry args={[0.03, 0.82, 0.06]} />
      </mesh>

      {[-4.8, -2.4, 0.0, 2.4].map((x) => (
        <mesh key={`marker-l-${x}`} position={[x, 1.1, 1.27]} material={amberLight}>
          <boxGeometry args={[0.06, 0.08, 0.05]} />
        </mesh>
      ))}
      {[-4.8, -2.4, 0.0, 2.4].map((x) => (
        <mesh key={`marker-r-${x}`} position={[x, 1.1, -1.27]} material={amberLight}>
          <boxGeometry args={[0.06, 0.08, 0.05]} />
        </mesh>
      ))}

      <mesh position={[-6.92, 0.96, 1.06]} material={redLight}>
        <boxGeometry args={[0.05, 0.44, 0.32]} />
      </mesh>
      <mesh position={[-6.92, 0.96, -1.06]} material={redLight}>
        <boxGeometry args={[0.05, 0.44, 0.32]} />
      </mesh>

      <mesh position={[-6.91, 0.76, 0]} material={trailerFrame}>
        <boxGeometry args={[0.03, 0.16, 0.58]} />
      </mesh>

      <mesh position={[-6.9, 0.76, 1.28]} material={redLight}>
        <boxGeometry args={[0.02, 0.1, 0.08]} />
      </mesh>
      <mesh position={[-6.9, 0.76, -1.28]} material={redLight}>
        <boxGeometry args={[0.02, 0.1, 0.08]} />
      </mesh>

      <mesh position={[2.75, 0.62, 0.9]} castShadow material={trailerFrame}>
        <boxGeometry args={[0.16, 0.74, 0.12]} />
      </mesh>
      <mesh position={[2.75, 0.62, -0.9]} castShadow material={trailerFrame}>
        <boxGeometry args={[0.16, 0.74, 0.12]} />
      </mesh>

      <mesh position={[-6.2, 0.28, 1.08]} castShadow material={trailerFrame}>
        <boxGeometry args={[0.14, 0.45, 0.18]} />
      </mesh>
      <mesh position={[-6.2, 0.28, -1.08]} castShadow material={trailerFrame}>
        <boxGeometry args={[0.14, 0.45, 0.18]} />
      </mesh>

      <mesh position={[-6.2, 0.1, 1.08]} castShadow material={trailerFrame}>
        <boxGeometry args={[0.22, 0.26, 0.06]} />
      </mesh>
      <mesh position={[-6.2, 0.1, -1.08]} castShadow material={trailerFrame}>
        <boxGeometry args={[0.22, 0.26, 0.06]} />
      </mesh>
    </group>
  )
}
