import {
  MOVENET_MODEL_NAMES,
  resolvePoseModelVariant,
} from '@/core/inference/inference.constants';

describe('inference model variant helpers', () => {
  it('defaults to lightning when no valid model variant is provided', () => {
    expect(resolvePoseModelVariant(null)).toBe('lightning');
    expect(resolvePoseModelVariant('unexpected')).toBe('lightning');
  });

  it('supports selecting thunder as the alternate accuracy mode', () => {
    expect(resolvePoseModelVariant('thunder')).toBe('thunder');
    expect(MOVENET_MODEL_NAMES.thunder).toMatch(/Thunder/i);
  });
});
