import { CameraControls } from "@react-three/drei";
import EnvironmentSetup from "./EnvironmentSetup";
import Shards from "./Shards/Shards";
import Effects from "./Effects";
import BackgroundDrop from "./Background/BackgroundDrop";
import Particles from "./Shards/Particles/Particles";

export default function Scene() {
    return (
        <>
            <color attach="background" args={['#000000']} />

            <directionalLight position={[10, 10, 10]} intensity={10} />
            <CameraControls maxDistance={30} makeDefault />

            <BackgroundDrop position={[0, 0, -30]} scale={[30, 30, 30]} />
            <EnvironmentSetup />

            <group position={[0, 0, -6]}>
                <Shards />
                <Particles shapePath="textures/shape1.svg" count={32} />
                <Particles shapePath="textures/shape2.svg" count={32} />
                <Particles shapePath="textures/shape3.svg" count={32} />
                <Particles shapePath="textures/shape4.svg" count={32} />
                <Particles shapePath="textures/shape5.svg" count={32} />
            </group>

            <Effects />
        </>
    )
}