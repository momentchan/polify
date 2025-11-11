import { CameraControls } from "@react-three/drei";
import EnvironmentSetup from "./EnvironmentSetup";
import Effects from "./Effects";
import BackgroundDrop from "./Background/BackgroundDrop";
import ShardSystem from "./Shards/ShardSystem";

export default function Scene() {
    return (
        <>

            <color attach="background" args={['#000000']} />
            <fogExp2 attach="fog"  args={['#000000', 0.05]} />

            <directionalLight position={[10, 10, 10]} intensity={10} />
            {/* <CameraControls maxDistance={30} makeDefault /> */}

            <BackgroundDrop position={[0, 0, -30]} scale={[30, 30, 30]} />
            <EnvironmentSetup />

            <ShardSystem animationDuration={3} position={[0, 0, -5]} />

            <Effects />
        </>
    )
}