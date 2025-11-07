'use client';

import { EffectComposer, Bloom, DepthOfField, SMAA, Noise, ToneMapping } from '@react-three/postprocessing';
import { useControls } from 'leva';
import { BlendFunction } from 'postprocessing';
import type { JSX } from 'react';

export default function Effects() {
  const smaaParams = useControls('Effects.SMAA', {
    enabled: { value: true, label: 'Enable SMAA' }
  }, { collapsed: true });

  const dofParams = useControls('Effects.Depth of Field', {
    enabled: { value: true, label: 'Enable Depth of Field' },
    focusDistance: { value: 0.67, min: 0, max: 1, step: 0.01 },
    focalLength: { value: 0.024, min: 0.001, max: 1, step: 0.001 },
    bokehScale: { value: 2, min: 0, max: 10, step: 0.1 },
    focusRange: { value: 0.3, min: 0.01, max: 1, step: 0.01 },
    blur: { value: 0.5, min: 0, max: 2, step: 0.01 }
  }, { collapsed: true });


  const bloomParams = useControls('Effects.Bloom', {
    enabled: { value: false, label: 'Enable Bloom' },
    intensity: { value: 0.1, min: 0, max: 3, step: 0.01 },
    luminanceThreshold: { value: 0.5, min: 0, max: 1, step: 0.01 },
    luminanceSmoothing: { value: 0.025, min: 0, max: 0.1, step: 0.001 },
    mipmapBlur: true
  }, { collapsed: true });

  const toneMappingParams = useControls('Effects.Tone Mapping', {
    enabled: { value: true, label: 'Enable Tone Mapping' },
    adaptive: { value: true, label: 'Adaptive' },
    resolution: { value: 128, min: 64, max: 512, step: 16 },
    middleGrey: { value: 0.6, min: 0, max: 1, step: 0.01 },
    maxLuminance: { value: 16.0, min: 1, max: 32, step: 0.1 },
    averageLuminance: { value: 1.0, min: 0.1, max: 10, step: 0.1 },
    adaptationRate: { value: 1.0, min: 0.01, max: 5, step: 0.01 }
  }, { collapsed: true });

  const noiseParams = useControls('Effects.Noise', {
    enabled: { value: true, label: 'Enable Noise' },
    opacity: { value: 0.25, min: 0, max: 1, step: 0.01 }
  }, { collapsed: true });

  const effects: JSX.Element[] = [];

  if (smaaParams.enabled) {
    effects.push(
      <SMAA key="smaa" />
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

  if (toneMappingParams.enabled) {
    effects.push(
      <ToneMapping
        key="toneMapping"
        adaptive={toneMappingParams.adaptive}
        resolution={toneMappingParams.resolution}
        middleGrey={toneMappingParams.middleGrey}
        maxLuminance={toneMappingParams.maxLuminance}
        averageLuminance={toneMappingParams.averageLuminance}
        adaptationRate={toneMappingParams.adaptationRate}
      />
    );
  }

  if (noiseParams.enabled) {
    effects.push(
      <Noise key="noise" blendFunction={BlendFunction.OVERLAY} opacity={noiseParams.opacity} />
    );
  }

  return (<EffectComposer
    multisampling={0}
  >{effects}
  </EffectComposer>
  );
}