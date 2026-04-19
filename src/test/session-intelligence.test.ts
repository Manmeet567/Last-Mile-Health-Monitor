import {
  buildSessionInsights,
  buildSessionIntelligence,
  buildRecoverySuggestion,
  buildReflectionLine,
  calculateSessionScoreLabel,
} from '@/features/posture/session-intelligence';
import { createBehaviorEngineState } from '@/features/posture/behavior-engine';

describe('session-intelligence', () => {
  it('computes derived session metrics from behavior state', () => {
    const state = createBehaviorEngineState();
    state.sessionStartedAt = 0;
    state.totalsMs.GOOD_POSTURE = 180_000;
    state.totalsMs.MILD_SLOUCH = 60_000;
    state.totalsMs.DEEP_SLOUCH = 30_000;
    state.breakCount = 1;
    state.nudgeCount = 2;
    state.longestSlouchStreakMs = 55_000;

    const summary = buildSessionIntelligence(state, 270_000);

    expect(summary.durationMs).toBe(270_000);
    expect(summary.goodPostureMs).toBe(180_000);
    expect(summary.slouchMs).toBe(90_000);
    expect(summary.goodPosturePercent).toBe(67);
    expect(summary.longestSlouchStreakMs).toBe(55_000);
    expect(typeof summary.reflectionLine).toBe('string');
    expect(summary.reflectionLine.length).toBeGreaterThan(0);
    expect(typeof summary.recoverySuggestion).toBe('string');
    expect(summary.recoverySuggestion.length).toBeGreaterThan(0);
  });

  it('generates the correct score label', () => {
    expect(
      calculateSessionScoreLabel({
        durationMs: 20 * 60_000,
        goodPosturePercent: 78,
        slouchMs: 3 * 60_000,
        breakCount: 0,
        nudgeCount: 1,
      }),
    ).toBe('Good');

    expect(
      calculateSessionScoreLabel({
        durationMs: 35 * 60_000,
        goodPosturePercent: 55,
        slouchMs: 12 * 60_000,
        breakCount: 0,
        nudgeCount: 3,
      }),
    ).toBe('Okay');

    expect(
      calculateSessionScoreLabel({
        durationMs: 40 * 60_000,
        goodPosturePercent: 28,
        slouchMs: 20 * 60_000,
        breakCount: 0,
        nudgeCount: 5,
      }),
    ).toBe('Needs improvement');
  });

  it('limits generated insights to two', () => {
    const insights = buildSessionInsights({
      scoreLabel: 'Needs improvement',
      goodPosturePercent: 30,
      breakCount: 0,
      nudgeCount: 4,
      longestSlouchStreakMs: 4 * 60_000,
    });

    expect(insights.length).toBeLessThanOrEqual(2);
  });

  it('generates exactly one reflection and one recovery suggestion', () => {
    const insights = buildSessionInsights({
      scoreLabel: 'Okay',
      goodPosturePercent: 56,
      breakCount: 0,
      nudgeCount: 2,
      longestSlouchStreakMs: 90_000,
    });
    const reflectionLine = buildReflectionLine({
      scoreLabel: 'Okay',
      durationMs: 35 * 60_000,
      goodPosturePercent: 56,
      slouchMs: 14 * 60_000,
      breakCount: 0,
      nudgeCount: 2,
      longestSlouchStreakMs: 90_000,
      insights,
    });
    const recoverySuggestion = buildRecoverySuggestion({
      scoreLabel: 'Okay',
      durationMs: 35 * 60_000,
      goodPosturePercent: 56,
      slouchMs: 14 * 60_000,
      breakCount: 0,
      nudgeCount: 2,
      longestSlouchStreakMs: 90_000,
      insights,
      reflectionLine,
    });

    expect(reflectionLine.trim().split(/\.\s+/)).toHaveLength(1);
    expect(recoverySuggestion.trim().split(/\.\s+/)).toHaveLength(1);
    expect(recoverySuggestion.toLocaleLowerCase()).not.toContain('you should');
  });

  it('changes reflection with session quality and keeps recovery distinct from insights', () => {
    const strongSummary = buildSessionIntelligence(
      Object.assign(createBehaviorEngineState(), {
        sessionStartedAt: 0,
        totalsMs: {
          GOOD_POSTURE: 240_000,
          MILD_SLOUCH: 30_000,
          DEEP_SLOUCH: 0,
          AWAY: 0,
          NO_PERSON: 0,
          DETECTING: 0,
          MOVING: 0,
        },
        breakCount: 1,
        nudgeCount: 1,
        longestSlouchStreakMs: 20_000,
      }),
      270_000,
    );
    const weakSummary = buildSessionIntelligence(
      Object.assign(createBehaviorEngineState(), {
        sessionStartedAt: 0,
        totalsMs: {
          GOOD_POSTURE: 60_000,
          MILD_SLOUCH: 120_000,
          DEEP_SLOUCH: 90_000,
          AWAY: 0,
          NO_PERSON: 0,
          DETECTING: 0,
          MOVING: 0,
        },
        breakCount: 0,
        nudgeCount: 4,
        longestSlouchStreakMs: 180_000,
      }),
      270_000,
    );

    expect(strongSummary.reflectionLine).not.toBe(weakSummary.reflectionLine);
    expect(weakSummary.recoverySuggestion.length).toBeGreaterThan(0);
    expect(weakSummary.insights).toHaveLength(2);
    expect(weakSummary.insights).not.toContain(weakSummary.reflectionLine);
    expect(weakSummary.insights).not.toContain(weakSummary.recoverySuggestion);
    expect(weakSummary.reflectionLine).not.toBe(weakSummary.recoverySuggestion);
  });
});
