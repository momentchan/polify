import type { CameraOffset, Position, ShardDefinition, ShardInstance, Vector3Tuple } from "./types";

const DEFAULT_MIN_DISTANCE = 0.1;
const DEFAULT_MAX_POSITION_ATTEMPTS = 100;
const DEFAULT_RADIUS = 0.5;
const DEFAULT_RIM = 0.5;

export interface ShardGenerationConfig {
    minDistance?: number;
    bounds?: number;
    maxPositionAttempts?: number;
    center?: Position;
    radius?: number;
    rim?: number;
}

function generateRandomPosition(radius: number, rim: number): Position {
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
    const x = r * sinPhi * Math.cos(theta);
    const y = r * sinPhi * Math.sin(theta);
    const z = r * Math.cos(phi);

    return [x, y, z];
}

function calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos1[0] - pos2[0];
    const dy = pos1[1] - pos2[1];
    const dz = pos1[2] - pos2[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function getMinDistanceToExisting(position: Position, existingPositions: Position[]): number {
    if (existingPositions.length === 0) return Infinity;
    return Math.min(...existingPositions.map(existing => calculateDistance(position, existing)));
}

function generatePositions(count: number, minDistance: number, radius: number, rim: number, maxAttempts: number): Position[] {
    const positions: Position[] = [];
    const minRadius = radius * (1 - rim);
    const maxRadius = radius;
    
    // Sample candidate positions on the sphere surface
    const candidateCount = Math.max(100, count * 20); // Generate many candidates
    const candidates: Position[] = [];
    
    for (let i = 0; i < candidateCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        
        // Sample radius uniformly within rim range
        const r = minRadius + Math.random() * (maxRadius - minRadius);
        
        const sinPhi = Math.sin(phi);
        candidates.push([
            r * sinPhi * Math.cos(theta),
            r * sinPhi * Math.sin(theta),
            r * Math.cos(phi)
        ]);
    }
    
    // Farthest point sampling: iteratively add the point that maximizes minimum distance
    for (let i = 0; i < count; i++) {
        if (i === 0) {
            // First point: choose randomly
            positions.push(generateRandomPosition(radius, rim));
        } else {
            // Find the candidate that is farthest from all existing points
            let bestCandidate: Position | null = null;
            let maxMinDistance = -1;
            
            for (const candidate of candidates) {
                const minDist = getMinDistanceToExisting(candidate, positions);
                if (minDist > maxMinDistance) {
                    maxMinDistance = minDist;
                    bestCandidate = candidate;
                }
            }
            
            // If we found a good candidate, use it; otherwise fall back to random
            if (bestCandidate && maxMinDistance >= minDistance) {
                positions.push(bestCandidate);
            } else {
                // Fallback: try random positions with distance check
                let attempts = 0;
                let position: Position | null = null;
                let valid = false;
                
                while (!valid && attempts < maxAttempts) {
                    position = generateRandomPosition(radius, rim);
                    valid = getMinDistanceToExisting(position, positions) >= minDistance;
                    attempts++;
                }
                
                positions.push(position || generateRandomPosition(radius, rim));
            }
        }
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
        radius = DEFAULT_RADIUS,
        rim = DEFAULT_RIM,
    } = config;

    const count = database.length;
    const positions = generatePositions(count, minDistance, radius, rim, maxPositionAttempts);
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
