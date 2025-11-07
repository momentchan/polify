// ImagePlane.tsx
import * as THREE from 'three'
import { forwardRef } from 'react'

type GroupProps = React.JSX.IntrinsicElements['group'];

export const ImagePlane = forwardRef<THREE.Group, GroupProps & { map: THREE.Texture; debug: boolean }>(
    function ImagePlane({ map, debug, children, ...groupProps }, ref) {
        return (
            <group ref={ref} {...groupProps}>
                <mesh visible={debug}>
                    <planeGeometry args={[1, 1]} />
                    <meshBasicMaterial map={map} />
                </mesh>
                {children}
            </group>
        )
    }
)
