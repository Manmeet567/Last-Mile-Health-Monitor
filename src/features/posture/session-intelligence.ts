import type { BehaviorEngineState } from '@/features/posture/behavior-engine';
import { materializeBehaviorMetrics } from '@/features/posture/behavior-engine';

export type SessionScoreLabel = 'Good' | 'Okay' | 'Needs improvement';

export type SessionIntelligenceSummary = {
  durationMs: number;
  goodPostureMs: number;
  slouchMs: number;
  breakCount: number;
  nudgeCount: number;
  longestSlouchStreakMs: number;
  goodPosturePercent: number;
  sessionScoreLabel: SessionScoreLabel;
  insights: string[];
  reflectionLine: string;
  recoverySuggestion: string;
};

export function buildSessionIntelligence(
  state: BehaviorEngineState,
  timestamp: number,
): SessionIntelligenceSummary {
  const metrics = materializeBehaviorMetrics(state, timestamp);
  const durationMs = metrics.totalSessionDurationSec * 1000;
  const goodPostureMs = metrics.totalGoodPostureSec * 1000;
  const slouchMs = metrics.totalSlouchSec * 1000;
  const goodPosturePercent = metrics.goodPosturePercent;
  const longestSlouchStreakMs = metrics.longestSlouchStreakSec * 1000;
  const scoreLabel = calculateSessionScoreLabel({
    breakCount: metrics.breakCount,
    goodPosturePercent,
    nudgeCount: metrics.nudgeCount,
    slouchMs,
    durationMs,
  });
  const insights = buildSessionInsights({
    breakCount: metrics.breakCount,
    goodPosturePercent,
    nudgeCount: metrics.nudgeCount,
    scoreLabel,
    longestSlouchStreakMs,
  });
  const reflectionLine = buildReflectionLine({
    breakCount: metrics.breakCount,
    durationMs,
    goodPosturePercent,
    insights,
    longestSlouchStreakMs,
    nudgeCount: metrics.nudgeCount,
    scoreLabel,
    slouchMs,
  });
  const recoverySuggestion = buildRecoverySuggestion({
    breakCount: metrics.breakCount,
    durationMs,
    goodPosturePercent,
    insights,
    longestSlouchStreakMs,
    nudgeCount: metrics.nudgeCount,
    reflectionLine,
    scoreLabel,
    slouchMs,
  });

  return {
    durationMs,
    goodPostureMs,
    slouchMs,
    breakCount: metrics.breakCount,
    nudgeCount: metrics.nudgeCount,
    longestSlouchStreakMs,
    goodPosturePercent,
    sessionScoreLabel: scoreLabel,
    insights,
    reflectionLine,
    recoverySuggestion,
  };
}

export function calculateSessionScoreLabel(options: {
  durationMs: number;
  goodPosturePercent: number;
  slouchMs: number;
  breakCount: number;
  nudgeCount: number;
}): SessionScoreLabel {
  const { goodPosturePercent, breakCount, nudgeCount, slouchMs, durationMs } =
    options;
  const slouchPercent =
    durationMs > 0 ? Math.round((slouchMs / durationMs) * 100) : 0;

  if (
    goodPosturePercent >= 70 &&
    slouchPercent <= 25 &&
    (breakCount > 0 || durationMs < 30 * 60 * 1000) &&
    nudgeCount <= 2
  ) {
    return 'Good';
  }

  if (
    goodPosturePercent >= 45 &&
    slouchPercent <= 50 &&
    nudgeCount <= 4
  ) {
    return 'Okay';
  }

  return 'Needs improvement';
}

export function buildSessionInsights(options: {
  scoreLabel: SessionScoreLabel;
  goodPosturePercent: number;
  breakCount: number;
  nudgeCount: number;
  longestSlouchStreakMs: number;
}): string[] {
  const insights: string[] = [];

  if (options.scoreLabel === 'Good' && options.goodPosturePercent >= 75) {
    insights.push('Great job maintaining good posture this session.');
  }

  if (options.goodPosturePercent < 45) {
    insights.push('You spent a lot of time slouching this session.');
  }

  if (options.breakCount === 0) {
    insights.push("You didn't take a break this session.");
  } else if (options.breakCount >= 2 && insights.length < 2) {
    insights.push('You gave yourself at least one useful reset break.');
  }

  if (options.nudgeCount >= 3 && insights.length < 2) {
    insights.push('Frequent reminders suggest your posture drifted over time.');
  }

  if (
    options.longestSlouchStreakMs >= 2 * 60 * 1000 &&
    insights.length < 2 &&
    !insights.some((insight) => insight.includes('slouching'))
  ) {
    insights.push('Long slouch stretches stood out in this session.');
  }

  return insights.slice(0, 2);
}

export function buildReflectionLine(options: {
  scoreLabel: SessionScoreLabel;
  durationMs: number;
  goodPosturePercent: number;
  slouchMs: number;
  breakCount: number;
  nudgeCount: number;
  longestSlouchStreakMs: number;
  insights: string[];
}) {
  const {
    scoreLabel,
    durationMs,
    goodPosturePercent,
    slouchMs,
    breakCount,
    nudgeCount,
    longestSlouchStreakMs,
    insights,
  } = options;
  const slouchPercent =
    durationMs > 0 ? Math.round((slouchMs / durationMs) * 100) : 0;
  const blockedThemes = detectInsightThemes(insights);
  const candidates: Array<{ theme: string; line: string }> = [];

  if (scoreLabel === 'Good' && goodPosturePercent >= 75 && nudgeCount <= 2) {
    candidates.push({
      theme: 'good-posture',
      line: 'You stayed consistent through most of this session.',
    });
  }

  if (
    scoreLabel === 'Needs improvement' ||
    goodPosturePercent < 45 ||
    slouchPercent >= 45 ||
    longestSlouchStreakMs >= 2 * 60_000
  ) {
    candidates.push({
      theme: 'slouch',
      line: 'Your posture drifted for a large part of this session.',
    });
  }

  if (
    scoreLabel === 'Okay' ||
    (goodPosturePercent >= 45 && goodPosturePercent < 75) ||
    nudgeCount >= 2
  ) {
    candidates.push({
      theme: 'mixed',
      line: 'This session had a mix of steadiness and drift.',
    });
  }

  if (breakCount === 0 && durationMs >= 30 * 60_000) {
    candidates.push({
      theme: 'seated',
      line: 'You remained seated through the full session.',
    });
  }

  candidates.push({
    theme: 'steady',
    line: 'This session settled into a fairly even rhythm.',
  });

  return chooseDistinctLine(candidates, blockedThemes);
}

export function buildRecoverySuggestion(options: {
  scoreLabel: SessionScoreLabel;
  durationMs: number;
  goodPosturePercent: number;
  slouchMs: number;
  breakCount: number;
  nudgeCount: number;
  longestSlouchStreakMs: number;
  insights: string[];
  reflectionLine: string;
}) {
  const {
    scoreLabel,
    durationMs,
    goodPosturePercent,
    slouchMs,
    breakCount,
    nudgeCount,
    longestSlouchStreakMs,
    insights,
    reflectionLine,
  } = options;
  const slouchPercent =
    durationMs > 0 ? Math.round((slouchMs / durationMs) * 100) : 0;
  const blockedThemes = new Set<string>([
    ...detectInsightThemes(insights),
    detectReflectionTheme(reflectionLine),
  ]);
  const candidates: Array<{ theme: string; line: string }> = [];

  if (
    (longestSlouchStreakMs >= 2 * 60_000 || nudgeCount >= 3) &&
    scoreLabel !== 'Good'
  ) {
    candidates.push({
      theme: 'posture-check',
      line: 'A small posture check-in can help stabilize earlier.',
    });
  }

  if (durationMs >= 30 * 60_000 && breakCount === 0) {
    candidates.push({
      theme: 'break',
      line: 'Consider taking a short break midway.',
    });
  }

  if (scoreLabel === 'Okay' || (goodPosturePercent >= 45 && slouchPercent >= 30)) {
    candidates.push({
      theme: 'reset',
      line: 'Try a quick reset earlier next time.',
    });
  }

  if (scoreLabel === 'Needs improvement' && durationMs >= 45 * 60_000) {
    candidates.push({
      theme: 'session-length',
      line: 'Shorter sessions may help maintain consistency.',
    });
  }

  if (scoreLabel === 'Good' && nudgeCount <= 1) {
    candidates.push({
      theme: 'keep-rhythm',
      line: 'A light reset can help the next session start just as smoothly.',
    });
  }

  candidates.push({
    theme: 'general-reset',
    line: 'A light reset can help the next session begin more steadily.',
  });

  return chooseDistinctLine(candidates, blockedThemes);
}

function detectInsightThemes(insights: string[]) {
  const themes = new Set<string>();

  for (const insight of insights) {
    const lowerInsight = insight.toLocaleLowerCase();

    if (lowerInsight.includes('good posture')) {
      themes.add('good-posture');
    }
    if (lowerInsight.includes('slouch')) {
      themes.add('slouch');
      if (lowerInsight.includes('long slouch')) {
        themes.add('long-slouch');
      }
    }
    if (lowerInsight.includes('break')) {
      themes.add('break');
    }
    if (lowerInsight.includes('reminder')) {
      themes.add('reminders');
    }
  }

  return themes;
}

function detectReflectionTheme(reflectionLine: string) {
  const lowerReflection = reflectionLine.toLocaleLowerCase();

  if (lowerReflection.includes('consistent')) {
    return 'good-posture';
  }
  if (lowerReflection.includes('drifted')) {
    return 'slouch';
  }
  if (lowerReflection.includes('mix')) {
    return 'mixed';
  }
  if (lowerReflection.includes('seated')) {
    return 'seated';
  }

  return 'steady';
}

function chooseDistinctLine(
  candidates: Array<{ theme: string; line: string }>,
  blockedThemes: Set<string>,
) {
  return (
    candidates.find((candidate) => !blockedThemes.has(candidate.theme)) ??
    candidates[0]
  ).line;
}
