/**
 * Post-processing (Medium/High presets): subtle N8AO ambient occlusion (half resolution on
 * Medium), Bloom that only
 * catches HDR emissives (LEDs, lamps, screens; threshold 1.0), ACES tone mapping and SMAA.
 */
import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { EffectComposer, N8AO, Bloom, SMAA, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode, type EffectComposer as EffectComposerImpl } from 'postprocessing';
import { HalfFloatType } from 'three';
import { QUALITY_PRESETS, useSettingsStore } from '../store/useSettingsStore';

export function Effects() {
  const quality = useSettingsStore((s) => s.quality);
  const preset = QUALITY_PRESETS[quality];
  const composer = useRef<EffectComposerImpl>(null);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  // The composer only resizes on CSS-size changes; keep its buffers in step with DPR
  // changes from the PerformanceMonitor, or AO/bloom would sample misaligned buffers.
  useEffect(() => {
    composer.current?.setSize(size.width, size.height);
  }, [dpr, size.width, size.height]);
  if (!preset.postprocessing) return null;
  return (
    <EffectComposer ref={composer} multisampling={0} frameBufferType={HalfFloatType} enableNormalPass={false}>
      {preset.ao ? <N8AO aoRadius={0.45} distanceFalloff={0.6} intensity={quality === 'high' ? 1.6 : 1.3} quality={quality === 'high' ? 'medium' : 'performance'} halfRes={preset.aoHalfRes} /> : <></>}
      <Bloom luminanceThreshold={1.0} luminanceSmoothing={0.15} intensity={0.75} mipmapBlur radius={0.6} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
    </EffectComposer>
  );
}
