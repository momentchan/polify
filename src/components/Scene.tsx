import { CameraControls } from "@react-three/drei";
import EnvironmentSetup from "./EnvironmentSetup";
import Shards from "./Shards/Shards";
import BackgroundSphere from "./Background/BackgroundSphere";
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
            <EnvironmentSetup/>
            <Shards />
            <Particles />

            <Effects />
        </>
    )
}