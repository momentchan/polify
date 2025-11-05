// ImagePlaneHelper.tsx
import * as THREE from 'three'
import { forwardRef } from 'react'

export const ImagePlaneHelper = forwardRef<THREE.Group, React.JSX.IntrinsicElements['group'] & { map: THREE.Texture, debug: boolean }>(
  function ImagePlaneHelper(props, ref) {
    return (
      <group ref={ref} {...props}>
        <mesh>
          <planeGeometry args={[1,1]} />
          <meshBasicMaterial map={props.map} transparent opacity={props.debug ? 1 : 0} />
        </mesh>
      </group>
    )
  }
)
