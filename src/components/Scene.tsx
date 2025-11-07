import { CameraControls } from "@react-three/drei";
import EnvironmentSetup from "./EnvironmentSetup";
import Shards from "./Shards/Shards";
import BackgroundSphere from "./BackgroundSphere";
import Effects from "./Effects";
import BackgroundDrop from "./BackgroundDrop";

export default function Scene() {
    return (
        <>
            <color attach="background" args={['#000000']} />
            {/* <fog attach="fog" args={['#222222', 0, 30]} /> */}
            {/* <BasicMesh/> */}

            <directionalLight position={[10, 10, 10]} intensity={10} />
            {/* <EnvironmentSetup/> */}

            <CameraControls maxDistance={30} makeDefault />
            <Shards />
            {/* <BackgroundSphere /> */}
            <BackgroundDrop position={[0, 0, -10]} scale={[10, 10, 10]} />

            <Effects />

        </>
    )
}