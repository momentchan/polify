// ImagePlaneHelper.tsx
import * as THREE from 'three'
import { forwardRef } from 'react'

export const ImagePlaneHelper = forwardRef<THREE.Group, React.JSX.IntrinsicElements['group'] & { map: THREE.Texture, debug: boolean }>(
  function ImagePlaneHelper(props, ref) {
    return (
      <group ref={ref} {...props}>
        <mesh visible={props.debug}>
          <planeGeometry args={[1,1]} />
          <meshBasicMaterial map={props.map} />
        </mesh>
      </group>
    )
  }
)
