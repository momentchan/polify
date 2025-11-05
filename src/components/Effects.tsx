'use client';

import { EffectComposer, Bloom, DepthOfField, SMAA, ToneMapping } from '@react-three/postprocessing';
import { useControls } from 'leva';

interface EffectsProps {
  enabled?: boolean;
}

export default function Effects({ enabled = true }: EffectsProps) {
  const bloomParams = useControls('Effects.Bloom', {
    enabled: { value: enabled, label: 'Enable Bloom' },
    intensity: { value: 0.1, min: 0, max: 3, step: 0.01 },
    luminanceThreshold: { value: 0.5, min: 0, max: 1, step: 0.01 },
    luminanceSmoothing: { value: 0.025, min: 0, max: 0.1, step: 0.001 },
    mipmapBlur: true
  }, { collapsed: true });

  const dofParams = useControls('Effects.Depth of Field', {
    enabled: { value: enabled, label: 'Enable Depth of Field' },
    focusDistance: { value: 0.2, min: 0, max: 1, step: 0.01 },
    focalLength: { value: 0.024, min: 0.001, max: 1, step: 0.001 },
    bokehScale: { value: 2, min: 0, max: 10, step: 0.1 },
    focusRange: { value: 0.3, min: 0.01, max: 1, step: 0.01 },
    blur: { value: 0.5, min: 0, max: 2, step: 0.01 }
  }, { collapsed: true });

  const smaaParams = useControls('Effects.SMAA', {
    enabled: { value: enabled, label: 'Enable SMAA' }
  }, { collapsed: true });

  if (!enabled) return null;

  const effects = [];

  if (bloomParams.enabled) {
    effects.push(
      <Bloom
        key="bloom"
        intensity={bloomParams.intensity}
        luminanceThreshold={bloomParams.luminanceThreshold}
        luminanceSmoothing={bloomParams.luminanceSmoothing}
        mipmapBlur={bloomParams.mipmapBlur}
      />
    );
  }

  if (dofParams.enabled) {
    effects.push(
      <DepthOfField
        key="dof"
        focusDistance={dofParams.focusDistance}
        focalLength={dofParams.focalLength}
        bokehScale={dofParams.bokehScale}
        focusRange={dofParams.focusRange}
        blur={dofParams.blur}
      />
    );
  }

  if (smaaParams.enabled) {
    effects.push(
      <SMAA key="smaa" />
    );
  }

  return (<EffectComposer
    multisampling={0}
  >{effects}
  </EffectComposer>
  );
}