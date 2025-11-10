import type { CameraOffset, Position, ShardDefinition, ShardInstance, Vector3Tuple } from "./types";

const DEFAULT_MIN_DISTANCE = 2;
const DEFAULT_MAX_POSITION_ATTEMPTS = 100;
const DEFAULT_CENTER: Position = [0, 0, -6];
const DEFAULT_RADIUS = 3;
const DEFAULT_RIM = 0.1;

export interface ShardGenerationConfig {
    minDistance?: number;
    bounds?: number;
    maxPositionAttempts?: number;
    center?: Position;
    radius?: number;
    rim?: number;
}

function generateRandomPosition(radius: number, rim: number, center: Position): Position {
    // Generate random spherical coordinates
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u; // Azimuth angle [0, 2π]
    const phi = Math.acos(2 * v - 1); // Polar angle [0, π]
    
    // Generate radius within rim range: [radius * (1 - rim), radius]
    const minRadius = radius * (1 - rim);
    const maxRadius = radius;
    const r = minRadius + Math.random() * (maxRadius - minRadius);

    // Convert spherical to Cartesian coordinates
    const sinPhi = Math.sin(phi);
    const x = r * sinPhi * Math.cos(theta) + center[0];
    const y = r * sinPhi * Math.sin(theta) + center[1];
    const z = r * Math.cos(phi) + center[2];

    return [x, y, z];
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

function generatePositions(count: number, minDistance: number, radius: number, rim: number, maxAttempts: number, center: Position): Position[] {
    const positions: Position[] = [];

    for (let i = 0; i < count; i++) {
        let attempts = 0;
        let position: Position | null = null;
        let valid = false;

        while (!valid && attempts < maxAttempts) {
            position = generateRandomPosition(radius, rim, center);
            valid = isValidPosition(position, positions, minDistance);
            attempts++;
        }

        positions.push(position || generateRandomPosition(radius, rim, center));
    }

    return positions;
}

function generateCameraOffset(): CameraOffset {
    return [
        (Math.random() - 0.5) * Math.PI * 0.5,
        (Math.random() - 0.5) * Math.PI * 0.5,
        0,
    ];
}

function generateScales(count: number): Vector3Tuple[] {
    return Array.from({ length: count }, () => {
        const xy = Math.random() * 0.2 + 2;
        return [xy, xy, 1] as Vector3Tuple;
    });
}

function generateBaseRotationZ(): number {
    return (Math.random() - 0.5) * Math.PI * 2;
}

export function createShardInstances(
    database: ShardDefinition[],
    config: ShardGenerationConfig = {}
): ShardInstance[] {
    const {
        minDistance = DEFAULT_MIN_DISTANCE,
        maxPositionAttempts = DEFAULT_MAX_POSITION_ATTEMPTS,
        center = DEFAULT_CENTER,
        radius = DEFAULT_RADIUS,
        rim = DEFAULT_RIM,
    } = config;

    const count = database.length;
    const positions = generatePositions(count, minDistance, radius, rim, maxPositionAttempts, center);
    const scales = generateScales(count);

    return database.map((entry, index) => ({
        ...entry,
        id: `${entry.image}-${entry.shape}-${index}`,
        position: positions[index],
        scale: scales[index],
        cameraOffset: generateCameraOffset(),
        baseRotationZ: generateBaseRotationZ(),
    }));
}
