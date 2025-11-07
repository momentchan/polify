import { useMemo } from "react";
import Shard from "./Shard";

type Position = [number, number, number];
type CameraOffset = [number, number, number];

interface ShardConfig {
    textureUrl: string;
    cameraOffset: CameraOffset;
}

const SHARD_COUNT = 1;
const MIN_DISTANCE = 2.5;
const BOUNDS = 6;
const MAX_POSITION_ATTEMPTS = 100;
const TEXTURE_BASE_PATH = "textures";
const TEXTURE_EXTENSION = ".avif";

function generateRandomPosition(bounds: number): Position {
    return [
        (Math.random() - 0.5) * bounds * 2 * 0,
        (Math.random() - 0.5) * bounds * 2 * 0,
        (Math.random() - 0.5) * bounds * 2 * 0,
    ];
}

function calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos1[0] - pos2[0];
    const dy = pos1[1] - pos2[1];
    const dz = pos1[2] - pos2[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function isValidPosition(position: Position, existingPositions: Position[], minDistance: number): boolean {
    return existingPositions.every(existing => calculateDistance(position, existing) >= minDistance);
}

function generatePositions(count: number, minDistance: number, bounds: number): Position[] {
    const positions: Position[] = [];
    
    for (let i = 0; i < count; i++) {
        let attempts = 0;
        let position: Position | null = null;
        let valid = false;
        
        while (!valid && attempts < MAX_POSITION_ATTEMPTS) {
            position = generateRandomPosition(bounds);
            valid = isValidPosition(position, positions, minDistance);
            attempts++;
        }
        
        positions.push(position || generateRandomPosition(bounds));
    }
    
    return positions;
}

function generateCameraOffset(): CameraOffset {
    return [
        (Math.random() -0.5) * Math.PI * 0,
        (Math.random() -0.5) * Math.PI * 0,    
        0,
    ];
}

function generateTextureUrl(index: number): string {
    return `${TEXTURE_BASE_PATH}/img${index + 1}${TEXTURE_EXTENSION}`;
}

function generateShardConfigs(count: number): ShardConfig[] {
    return Array.from({ length: count }, (_, index) => ({
        textureUrl: generateTextureUrl(index),
        cameraOffset: generateCameraOffset(),
    }));
}

export default function Shards() {
    const shardConfigs = useMemo(() => generateShardConfigs(SHARD_COUNT), []);
    const positions = useMemo(() => generatePositions(SHARD_COUNT, MIN_DISTANCE, BOUNDS), []);

    return (
        <>
            {shardConfigs.map((config, index) => (
                <Shard 
                    key={config.textureUrl}
                    textureUrl={config.textureUrl} 
                    position={positions[index]} 
                    cameraOffset={config.cameraOffset}
                    debug={false} 
                />
            ))}
        </>
    );
}