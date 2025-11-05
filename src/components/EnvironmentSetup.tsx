import { Lightformer, Environment } from "@react-three/drei";
import { useThree } from "@react-three/fiber";

interface EnvironmentSetupProps {
    quality?: number;
}

export default function EnvironmentSetup({ quality = 256 }: EnvironmentSetupProps) {
    return (
        <>
            {/* <Environment preset="city"> */}
            <Environment resolution={quality} environmentIntensity={0.5} >
                <group rotation={[-Math.PI / 2, 0, 0]}>
                    <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={[10, 10, 1]} />
                    {[2, 0, 2, 0, 2, 0, 2, 0].map((x, i) => (
                        <Lightformer key={i} form="circle" intensity={4} rotation={[Math.PI / 2, 0, 0]} position={[x, 4, i * 4]} scale={[4, 1, 1]} />
                    ))}
                    <Lightformer intensity={1} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={[50, 2, 1]} />
                    <Lightformer intensity={1} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={[50, 2, 1]} />
                    <Lightformer intensity={1} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[50, 2, 1]} />
                </group>
            </Environment>
        </>
    )
}