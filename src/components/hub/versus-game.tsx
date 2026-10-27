import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Scientist } from '@/components/avatar/scientist';
import { AppText } from '@/components/ui/app-text';
import { useSession } from '@/context/session';
import { FRIENDLY_PROBLEMS } from '@/data/friendly-problems';
import { CLASSES } from '@/data/classes';
import problemBank from '@/data/versus-problems.json';
import { lookFor } from '@/lib/avatar-look';

type Rank = keyof typeof problemBank;
type Problem = { topic: string; prompt: string; options: string[]; answer: number; explanation: string };
type Side = 'player' | 'bot';
type Phase = 'fight' | 'attack' | 'result' | 'finished';

const RANKS: Rank[] = ['beginner', 'intermediate', 'advanced', 'nightmare'];
const RANK_INFO: Record<Rank, { label: string; speed: string; min: number; max: number; damage: number; color: string }> = {
  beginner: { label: 'Beginner', speed: '8–10 сек', min: 8, max: 10, damage: 15, color: '#8FE388' },
  intermediate: { label: 'Intermediate', speed: '6–8 сек', min: 6, max: 8, damage: 30, color: '#69D5FF' },
  advanced: { label: 'Advanced', speed: '4–6 сек', min: 4, max: 6, damage: 50, color: '#FFC857' },
  nightmare: { label: 'Nightmare', speed: '2–3 сек', min: 2, max: 3, damage: 80, color: '#FF6E69' },
};
const MAX_HP = 100;
const STARTING_XP = 100;
const ATTACK_DURATION_MS = 820;
const BOT_SCIENTISTS: Record<Rank, { name: string; title: string }> = {
  beginner: { name: 'Лаборант Бот', title: 'ШИНЭ СУРАГЧ · AI' },
  intermediate: { name: 'Лаборант Эрдэнэ', title: 'ХИМИЙН БАГШ · AI' },
  advanced: { name: 'Профессор Алберт', title: 'ГҮНЗГИЙ ШАТНЫ БАГШ · AI' },
  nightmare: { name: 'Доктор Мэндлээ', title: 'ОЛИМПИАДЫН БОДЛОГО ЗОХИОГЧ · AI' },
};
const ATTACKS = ['ACID SPLASH!', 'FLASK THROW!', 'EXOTHERMIC BLAST!'];

function timestampNow() {
  return Date.now();
}

interface Match {
  phase: Phase;
  playerRank: Rank;
  botRank: Rank;
  playerHp: number;
  botHp: number;
  playerXp: number;
  botXp: number;
  round: number;
  botThinkMs: number;
  botSolveMs: number;
  playerProblem: Problem;
  botProblem: Problem;
  usedProblemKeys: string[];
  stunnedUntil: number;
  answerFeedback: string;
  result: string;
  winner: Side | null;
  roundWinner: Side | null;
}

const THEORY_AND_FRIENDLY: Problem[] = [
  ...CLASSES.flatMap((chemClass) => chemClass.lessons.flatMap((lesson) => lesson.steps
    .filter((step) => step.type === 'quiz')
    .map((step) => ({ topic: `Онол · ${lesson.title}`, prompt: step.question, options: step.options, answer: step.answer, explanation: step.explanation })))),
  ...FRIENDLY_PROBLEMS.map((problem) => ({ topic: `Бодлого · ${problem.category}`, prompt: problem.question, options: problem.choices, answer: problem.answer, explanation: problem.explanation })),
];

function problemKey(problem: Problem): string {
  return problem.prompt.trim().toLocaleLowerCase();
}

function pickProblem(rank: Rank, usedProblemKeys: string[]): Problem {
  // Mix rank-specific Versus questions with theory and practice without repeating
  // a prompt during the same match (including between the player and bot).
  const pool = Math.random() < 0.5
    ? [...THEORY_AND_FRIENDLY, ...(problemBank[rank] as Problem[])]
    : [...(problemBank[rank] as Problem[]), ...THEORY_AND_FRIENDLY];
  const unseen = pool.filter((problem) => !usedProblemKeys.includes(problemKey(problem)));
  if (unseen.length === 0) throw new Error(`No new Versus questions remain for ${rank}.`);
  const selected = unseen[Math.floor(Math.random() * unseen.length)];
  usedProblemKeys.push(problemKey(selected));
  return selected;
}

function botThinkingTime(rank: Rank): number {
  const { min, max } = RANK_INFO[rank];
  return (min + Math.random() * (max - min)) * 1000;
}

function botThinkingWindow(rank: Rank): number {
  return RANK_INFO[rank].max * 1000;
}

function newMatch(playerRank: Rank, botRank: Rank): Match {
  const usedProblemKeys: string[] = [];
  const playerProblem = pickProblem(playerRank, usedProblemKeys);
  const botProblem = pickProblem(botRank, usedProblemKeys);
  return {
    phase: 'fight', playerRank, botRank, playerHp: MAX_HP, botHp: MAX_HP,
    playerXp: STARTING_XP, botXp: STARTING_XP, round: 1,
    botThinkMs: botThinkingWindow(botRank), botSolveMs: botThinkingTime(botRank),
    playerProblem, botProblem, usedProblemKeys,
    stunnedUntil: 0, answerFeedback: '', result: '', winner: null, roundWinner: null,
  };
}

function FighterCharacter({ side, rank = 'beginner', nickname, classId, height }: {
  side: Side;
  rank?: Rank;
  nickname: string;
  classId: 'beginner' | 'medium' | 'hard' | null;
  height: number;
}) {
  const isPlayer = side === 'player';
  const bot = BOT_SCIENTISTS[rank];
  const look = isPlayer
    ? lookFor(nickname, classId)
    : { ...lookFor(bot.name, null), shirt: RANK_INFO[rank].color };

  return (
    <View style={[styles.character, { transform: [{ scaleX: isPlayer ? -1 : 1 }] }]} accessibilityLabel={isPlayer ? `${nickname}, ?????????? ???` : `${bot.name}, ?????`}>
      <Scientist look={look} height={height} />
    </View>
  );
}

function LabFlask({ style, color = '#48DFF2' }: { style?: StyleProp<ViewStyle>; color?: string }) {
  return (
    <View style={[styles.flask, style]}>
      <View style={styles.flaskNeck} />
      <View style={styles.flaskShoulder} />
      <View style={styles.flaskBase} />
      <View style={[styles.flaskLiquid, { backgroundColor: color }]} />
      <View style={[styles.flaskBubble, styles.flaskBubbleOne]} />
      <View style={[styles.flaskBubble, styles.flaskBubbleTwo]} />
    </View>
  );
}

function LabTube({ style, color }: { style?: StyleProp<ViewStyle>; color: string }) {
  return (
    <View style={[styles.labTube, style]}>
      <View style={styles.tubeLip} />
      <View style={[styles.tubeLiquid, { backgroundColor: color }]} />
    </View>
  );
}

function PixelVapor({ left, bottom, color, delay }: { left: `${number}%`; bottom: number; color: string; delay: number }) {
  const [rise] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(rise, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [delay, rise]);
  const style = {
    opacity: rise.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.12, 0.75, 0.05] }),
    transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [0, -26] }) }],
  };
  return (
    <Animated.View pointerEvents="none" style={[styles.vapor, { left, bottom }, style]}>
      <View style={[styles.vaporPixel, { backgroundColor: color }]} />
      <View style={[styles.vaporPixel, styles.vaporPixelOffset, { backgroundColor: color }]} />
    </Animated.View>
  );
}

function ChemicalLabBackground() {
  return (
    <View pointerEvents="none" style={styles.labScene}>
      <View style={styles.labWall} />
      <View style={styles.reactorFrame}>
        <View style={styles.reactorCoil}><View style={styles.reactorCore} /></View>
        <View style={styles.reactorLegLeft} />
        <View style={styles.reactorLegRight} />
      </View>
      <View style={styles.labTiles}>
        {Array.from({ length: 8 }, (_, index) => <View key={index} style={styles.wallTile} />)}
      </View>
      <View style={styles.shelf} />
      <LabTube style={styles.tubeLeft} color="#A6E86D" />
      <LabTube style={styles.tubeCenter} color="#FFCA55" />
      <LabTube style={styles.tubeRight} color="#5ADBF4" />
      <LabFlask style={styles.flaskLeft} color="#75DF85" />
      <LabFlask style={styles.flaskRight} color="#BB81E8" />
      <PixelVapor left="22%" bottom={142} color="#8DF1A4" delay={0} />
      <PixelVapor left="50%" bottom={157} color="#79E8F5" delay={480} />
      <PixelVapor left="80%" bottom={145} color="#E6C9FF" delay={220} />
      <View style={styles.benchTop} />
      <View style={styles.benchFront}>
        <View style={styles.drawer} />
        <View style={styles.drawer} />
        <View style={styles.drawer} />
      </View>
      <LabFlask style={styles.benchFlask} color="#FFE86B" />
      <View style={styles.labShade} />
    </View>
  );
}

function AttackBurst({ side, round }: { side: Side; round: number }) {
  const [progress] = useState(() => new Animated.Value(0));
  const toward = side === 'player' ? 1 : -1;
  useEffect(() => {
    progress.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(320),
      Animated.timing(progress, { toValue: 2, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [progress, round]);

  const translateX = progress.interpolate({ inputRange: [0, 1, 2], outputRange: [-toward * 26, toward * 66, toward * 74] });
  const opacity = progress.interpolate({ inputRange: [0, 0.12, 0.72, 1, 2], outputRange: [0, 1, 1, 0.85, 0] });
  const scale = progress.interpolate({ inputRange: [0, 0.7, 1, 2], outputRange: [0.55, 1.3, 1.05, 0.65] });
  const label = ATTACKS[(round - 1) % ATTACKS.length];
  return (
    <Animated.View pointerEvents="none" style={[styles.attackBurst, { opacity, transform: [{ translateX }, { scale }] }]}>
      <View style={styles.attackSparkRow}>
        <View style={styles.attackSpark} />
        <View style={[styles.attackSpark, styles.attackSparkLarge]} />
        <View style={styles.attackSpark} />
      </View>
      <AppText style={styles.attackText} color="#FFE86B">{label}</AppText>
    </Animated.View>
  );
}

function HpBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.hpTrack}>
      <View style={[styles.hpFill, { width: `${Math.max(0, value)}%`, backgroundColor: color }]} />
    </View>
  );
}

export function VersusGame() {
  const { user } = useSession();
  const insets = useSafeAreaInsets();
  const playerName = user?.nickname ?? 'Scientist';
  const playerClass = user?.classId ?? null;
  const [playerRank, setPlayerRank] = useState<Rank>('beginner');
  const [botRank, setBotRank] = useState<Rank>('beginner');
  const [match, setMatch] = useState<Match | null>(null);
  const [now, setNow] = useState(0);
  const [botClock, setBotClock] = useState({ round: 0, elapsed: 0 });
  const matchRef = useRef<Match | null>(null);

  const commit = useCallback((next: Match) => {
    matchRef.current = next;
    setMatch(next);
  }, []);

  const resolveRound = useCallback((winner: Side) => {
    const current = matchRef.current;
    if (!current || current.phase !== 'attack' || current.roundWinner !== winner) return;

    const isPlayer = winner === 'player';
    const attackRank = isPlayer ? current.playerRank : current.botRank;
    const damage = RANK_INFO[attackRank].damage;
    let playerXp = current.playerXp;
    let botXp = current.botXp;
    let stolen = 0;
    let bonus = 0;

    if (isPlayer) {
      const underdog = current.playerRank === 'beginner' && current.botRank === 'advanced';
      stolen = Math.min(underdog ? 50 : 30, botXp);
      playerXp += stolen;
      botXp -= stolen;
      if (current.playerRank === 'advanced' && current.botRank === 'beginner') {
        bonus = 5;
        playerXp += bonus;
      }
    } else {
      stolen = Math.min(30, playerXp);
      botXp += stolen;
      playerXp -= stolen;
    }

    const playerHp = Math.max(0, current.playerHp - (isPlayer ? 0 : damage));
    const botHp = Math.max(0, current.botHp - (isPlayer ? damage : 0));
    const winnerName = isPlayer ? 'ЧИ' : 'AI БОТ';
    const transferLine = isPlayer
      ? `+${stolen} XP хулгайлав${bonus ? ` · Advanced бонус +${bonus} XP` : ''}`
      : `−${stolen} XP · Бот чамаас хулгайлав`;
    const result = `${winnerName} түрүүллээ! ${damage} damage · ${transferLine}`;
    const done = playerHp === 0 || botHp === 0;
    commit({
      ...current,
      phase: done ? 'finished' : 'result',
      playerHp,
      botHp,
      playerXp,
      botXp,
      result,
      winner: done ? (playerHp === 0 ? 'bot' : 'player') : null,
      answerFeedback: '',
      roundWinner: winner,
    });
  }, [commit]);

  const triggerAttack = useCallback((winner: Side) => {
    const current = matchRef.current;
    if (!current || current.phase !== 'fight') return;
    commit({ ...current, phase: 'attack', roundWinner: winner });
  }, [commit]);

  const activeRound = match?.phase === 'fight' ? match.round : null;
  const activeBotSolveMs = match?.phase === 'fight' ? match.botSolveMs : 0;
  useEffect(() => {
    if (activeRound === null) return;
    const delay = activeBotSolveMs;
    const startedAt = Date.now();
    const botTimeout = setTimeout(() => triggerAttack('bot'), delay);
    const ticker = setInterval(() => {
      const current = Date.now();
      setBotClock({ round: activeRound, elapsed: current - startedAt });
      setNow(current);
    }, 100);
    return () => {
      clearTimeout(botTimeout);
      clearInterval(ticker);
    };
  }, [activeRound, activeBotSolveMs, triggerAttack]);

  const attackingRound = match?.phase === 'attack' ? match.round : null;
  const attackWinner = match?.phase === 'attack' ? match.roundWinner : null;
  useEffect(() => {
    if (attackingRound === null || attackWinner === null) return;
    const timeout = setTimeout(() => resolveRound(attackWinner), ATTACK_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [attackingRound, attackWinner, resolveRound]);

  const start = () => commit(newMatch(playerRank, botRank));
  const nextRound = () => {
    const current = matchRef.current;
    if (!current || current.phase !== 'result') return;
    const usedProblemKeys = [...current.usedProblemKeys];
    commit({
      ...current,
      phase: 'fight',
      round: current.round + 1,
      botThinkMs: botThinkingWindow(current.botRank),
      botSolveMs: botThinkingTime(current.botRank),
      playerProblem: pickProblem(current.playerRank, usedProblemKeys),
      botProblem: pickProblem(current.botRank, usedProblemKeys),
      usedProblemKeys,
      stunnedUntil: 0,
      answerFeedback: '',
      result: '',
      roundWinner: null,
    });
  };

  const answer = (optionIndex: number) => {
    const current = matchRef.current;
    if (!current || current.phase !== 'fight' || timestampNow() < current.stunnedUntil) return;
    if (optionIndex === current.playerProblem.answer) {
      triggerAttack('player');
      return;
    }
    commit({ ...current, stunnedUntil: timestampNow() + 3000, answerFeedback: 'БУРУУ! 3 СЕКУНД STUN' });
  };

  const stunned = Boolean(match && now < match.stunnedUntil);
  const botMsLeft = match?.phase === 'fight' ? Math.max(0, match.botThinkMs - (botClock.round === match.round ? botClock.elapsed : 0)) : 0;
  const botProgress = match && match.phase === 'fight' ? Math.max(0, 1 - botMsLeft / match.botThinkMs) : 0;
  const endTitle = match?.phase === 'finished' ? (match.winner === 'player' ? '\u0422\u0410 \u042f\u041b\u041b\u0410\u0410!' : 'AI \u042f\u041b\u041b\u0410\u0410!') : '';

  return (
    <View style={styles.root}>
      <ChemicalLabBackground />
      <ScrollView style={styles.pageLayer} contentContainerStyle={[styles.page, { paddingTop: insets.top + 8, paddingBottom: Math.max(24, insets.bottom + 16) }]}>
        <View style={styles.topLine}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Буцах">
            <AppText style={styles.mono} color="#FFE86B">{'< БУЦАХ'}</AppText>
          </Pressable>
          <AppText style={styles.logo} color="#FFE86B">VERSUS HUB</AppText>
          <View style={styles.backSpacer} />
        </View>

        {!match ? (
          <View style={styles.setup}>
            <AppText style={styles.kicker} color="#FFF">ХИМИЙН ТУЛААНД БЭЛД</AppText>
            <AppText style={styles.bodyCopy}>Онолын quiz болон бодлогууд тулаанд холилдон гарна.</AppText>
            <View style={styles.introBox}>
              <View style={styles.introFighter}>
                <FighterCharacter side="player" nickname={playerName} classId={playerClass} height={68} />
                <AppText style={styles.miniName} color="#FFF">{playerName.toUpperCase()}</AppText>
                <AppText style={styles.miniTitle}>ЛАБОРАТОРИЙН ТУСЛАХ</AppText>
              </View>
              <AppText style={styles.vsText} color="#FFE86B">VS</AppText>
              <View style={styles.introFighter}>
                <FighterCharacter side="bot" rank={botRank} nickname={playerName} classId={playerClass} height={68} />
                <AppText style={styles.miniName} color={RANK_INFO[botRank].color}>{BOT_SCIENTISTS[botRank].name.toUpperCase()}</AppText>
                <AppText style={styles.miniTitle}>{BOT_SCIENTISTS[botRank].title}</AppText>
              </View>
            </View>
            <AppText style={styles.bodyCopy}>Өөрийн болон AI ботын rank-ийг тус тус сонго. Бодлого бүр дээр түрүүлж зөв хариулсан нь damage өгнө.</AppText>
            <RankPicker title="ТАНЫ RANK" selected={playerRank} onSelect={setPlayerRank} />
            <RankPicker title="AI БОТЫН RANK" selected={botRank} onSelect={setBotRank} />
            <View style={styles.ruleBox}>
              <AppText style={styles.ruleText}>ADV vs BGN: +5 XP · BGN vs ADV: 50 XP STEAL</AppText>
              <AppText style={styles.ruleText}>ЭХЛЭХ XP  100 / 100</AppText>
              <AppText style={styles.ruleText}>ЗӨВ ХАРИУЛТ  XP ХУЛГАЙЛНА</AppText>
              <AppText style={styles.ruleText}>БУРУУ ХАРИУЛТ  3 СЕКУНД STUN</AppText>
            </View>
            <PixelButton title="ТУЛААН ЭХЛҮҮЛЭХ" onPress={start} />
          </View>
        ) : (
          <View style={styles.battle}>
            <View style={styles.fighters}>
              <FighterStatus side="player" rank={match.playerRank} hp={match.playerHp} xp={match.playerXp} name={playerName} title="Your scientist" />
              <AppText style={styles.vsText} color="#FFE86B">VS</AppText>
              <FighterStatus side="bot" rank={match.botRank} hp={match.botHp} xp={match.botXp} name={BOT_SCIENTISTS[match.botRank].name} title={BOT_SCIENTISTS[match.botRank].title} />
            </View>

            <View style={styles.stage}>
              <FighterCharacter side="player" nickname={playerName} classId={playerClass} height={112} />
              <View style={styles.stageMiddle}>
                <AppText style={styles.roundText} color="#FFE86B">ROUND {match.round}</AppText>
                <AppText style={styles.stageCaption}>{match.phase === 'finished' ? endTitle : 'ХУРДНЫ ТУЛААН'}</AppText>
              </View>
              <FighterCharacter side="bot" rank={match.botRank} nickname={playerName} classId={playerClass} height={112} />
              {(match.phase === 'attack' || match.phase === 'result' || match.phase === 'finished') && match.roundWinner && (
                <AttackBurst key={match.round} side={match.roundWinner} round={match.round} />
              )}
            </View>

            {match.phase === 'fight' && (
              <>
                <View style={styles.timerPanel}>
                  <View style={styles.timerLabels}>
                    <AppText style={styles.smallMono}>AI БОДОЖ БАЙНА</AppText>
                    <AppText style={styles.smallMono} color="#FFE86B">{(botMsLeft / 1000).toFixed(1)}s</AppText>
                  </View>
                  <View style={styles.timerTrack}><View style={[styles.timerFill, { width: `${botProgress * 100}%`, backgroundColor: RANK_INFO[match.botRank].color }]} /></View>
                </View>
                <View style={styles.problemBox}>
                  <AppText style={styles.problemMeta} color={RANK_INFO[match.playerRank].color}>ТАНЫ БОДЛОГО · {RANK_INFO[match.playerRank].label.toUpperCase()} · {RANK_INFO[match.playerRank].damage} DMG</AppText>
                  <AppText style={styles.smallMono}>{match.playerProblem.topic}</AppText>
                  <AppText style={styles.problemText}>{match.playerProblem.prompt}</AppText>
                  {match.playerProblem.options.map((option, i) => (
                    <Pressable key={`${match.round}-${i}`} onPress={() => answer(i)} disabled={stunned} style={[styles.answerButton, stunned && styles.disabledButton]} accessibilityRole="button">
                      <AppText style={styles.answerText} color={stunned ? '#777' : '#FFF'}>{String.fromCharCode(65 + i)}.  {option}</AppText>
                    </Pressable>
                  ))}
                  {stunned && <AppText style={styles.stunText} color="#FF6E69">ТҮГЖИГДЛЭЭ · {Math.ceil((match.stunnedUntil - now) / 1000)}s</AppText>}
                  {!stunned && match.answerFeedback !== '' && <AppText style={styles.stunText} color="#FF6E69">STUN COMPLETE · TRY AGAIN</AppText>}
                  <View style={styles.botProblem}>
                    <AppText style={styles.problemMeta} color="#FF7771">БОТЫН БОДЛОГО · {RANK_INFO[match.botRank].label.toUpperCase()}</AppText>
                    <AppText style={styles.smallMono}>{match.botProblem.topic}</AppText>
                    <AppText style={styles.botQuestion}>{match.botProblem.prompt}</AppText>
                  </View>
                </View>
              </>
            )}

            {match.phase === 'attack' && (
              <View style={styles.attackStatus}>
                <AppText style={styles.attackStatusTitle} color="#FFE86B">{match.roundWinner === 'bot' ? 'AI РАУНДАД ЯЛЛАА!' : 'ТА РАУНДАД ЯЛЛАА!'}</AppText>
                <AppText style={styles.attackStatusText}>{match.roundWinner === 'bot' ? `AI answer: ${match.botProblem.options[match.botProblem.answer]}` : 'Your answer is correct.'}</AppText>
                <AppText style={styles.attackStatusText}>Damage: {RANK_INFO[match.roundWinner === 'bot' ? match.botRank : match.playerRank].damage} HP</AppText>
              </View>
            )}

            {match.phase === 'result' && (
              <View style={styles.resultBox}>
                <AppText style={styles.resultTitle} color="#FFE86B">{match.result}</AppText>
                {match.roundWinner === 'bot' && (
                  <AppText style={styles.explanation}>AI answer: {match.botProblem.options[match.botProblem.answer]}</AppText>
                )}
                <AppText style={styles.explanation}>{(match.roundWinner === 'player' ? match.playerProblem : match.botProblem).explanation}</AppText>
                <PixelButton title="ДАРААГИЙН БОДЛОГО" onPress={nextRound} />
              </View>
            )}

            {match.phase === 'finished' && (
              <View style={styles.resultBox}>
                <AppText style={styles.endTitle} color={match.winner === 'player' ? '#FFE86B' : '#FF6E69'}>{endTitle}</AppText>
                <AppText style={styles.resultTitle}>{match.result}</AppText>
                <AppText style={styles.bodyCopy}>Эцсийн XP  ·  ЧИ {match.playerXp}  —  БОТ {match.botXp}</AppText>
                <PixelButton title="ДАХИН ТУЛАЛДАХ" onPress={() => setMatch(null)} />
              </View>
            )}
            <View style={styles.damageLegend}>
              <AppText style={styles.smallMono}>DMG  BGN 15 · INT 30 · ADV 50 · NGT 80</AppText>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function RankPicker({ title, selected, onSelect }: { title: string; selected: Rank; onSelect: (rank: Rank) => void }) {
  return (
    <View style={styles.rankGroup}>
      <AppText style={styles.rankHeading} color="#FFE86B">{title}</AppText>
      <View style={styles.rankGrid}>
        {RANKS.map((rank) => {
          const info = RANK_INFO[rank];
          const active = selected === rank;
          return (
            <Pressable key={rank} onPress={() => onSelect(rank)} style={[styles.rankCard, active && { borderColor: info.color, backgroundColor: '#171717' }]} accessibilityRole="button" accessibilityState={{ selected: active }}>
              <AppText style={styles.rankName} color={active ? info.color : '#FFF'}>{info.label.toUpperCase()}</AppText>
              <AppText style={styles.rankDetails}>{info.speed}  ·  {info.damage} DMG</AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function FighterStatus({ side, rank, hp, xp, name, title }: { side: Side; rank: Rank; hp: number; xp: number; name: string; title: string }) {
  const isPlayer = side === 'player';
  const color = isPlayer ? '#FFE86B' : '#FF7771';
  return (
    <View style={styles.statusCard}>
      <AppText style={styles.statusName} color={color} numberOfLines={1}>{name}</AppText>
      <AppText style={styles.statusTitle} numberOfLines={1}>{title}</AppText>
      <AppText style={styles.statusRank}>{RANK_INFO[rank].label.toUpperCase()}</AppText>
      <HpBar value={hp} color={isPlayer ? '#E2D55D' : '#E65C55'} />
      <AppText style={styles.statLine}>HP {hp}/{MAX_HP}</AppText>
      <AppText style={styles.statLine} color="#FFE86B">XP {xp}</AppText>
    </View>
  );
}

function PixelButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.mainButton, pressed && styles.buttonPressed]} accessibilityRole="button">
      <AppText style={styles.buttonText} color="#FFE86B">{title}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#655F53' },
  labScene: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 0, overflow: 'hidden', backgroundColor: '#655F53', opacity: 0.72 },
  labWall: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 126, backgroundColor: '#746D5E' },
  reactorFrame: { position: 'absolute', top: 22, alignSelf: 'center', width: 124, height: 96, alignItems: 'center', justifyContent: 'center' },
  reactorCoil: { width: 70, height: 70, borderRadius: 35, borderWidth: 9, borderColor: '#737968', backgroundColor: 'rgba(164, 184, 107, 0.2)', alignItems: 'center', justifyContent: 'center' },
  reactorCore: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#A9C96F', opacity: 0.76 },
  reactorLegLeft: { position: 'absolute', left: 8, bottom: 2, width: 12, height: 48, borderWidth: 3, borderColor: '#8D8A76', backgroundColor: 'rgba(154, 185, 105, 0.34)' },
  reactorLegRight: { position: 'absolute', right: 8, bottom: 2, width: 12, height: 48, borderWidth: 3, borderColor: '#8D8A76', backgroundColor: 'rgba(154, 185, 105, 0.34)' },
  labTiles: { position: 'absolute', top: 66, left: 0, right: 0, height: 112, flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 2, borderBottomWidth: 3, borderColor: '#928B78', opacity: 0.48 },
  wallTile: { height: '100%', width: '12.5%', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#8A8371' },
  shelf: { position: 'absolute', top: 174, left: '5%', right: '5%', height: 6, backgroundColor: '#756D5B', borderWidth: 1, borderColor: '#A6A08A' },
  labTube: { position: 'absolute', width: 14, height: 49, borderWidth: 2, borderColor: '#7BA5A0', backgroundColor: 'rgba(98,201,195,0.18)', alignItems: 'center', overflow: 'visible' },
  tubeLip: { position: 'absolute', top: -4, width: 18, height: 5, backgroundColor: '#789087', borderWidth: 1, borderColor: '#B9D5C6' },
  tubeLiquid: { position: 'absolute', left: 1, right: 1, bottom: 1, height: 15, opacity: 0.76 },
  tubeLeft: { top: 123, left: '15%', transform: [{ rotate: '-7deg' }] },
  tubeCenter: { top: 127, left: '44%', transform: [{ rotate: '5deg' }] },
  tubeRight: { top: 120, right: '15%', transform: [{ rotate: '-4deg' }] },
  flask: { position: 'absolute', width: 40, height: 53, alignItems: 'center' },
  flaskNeck: { width: 12, height: 18, borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 2, borderColor: '#8EB5AD', backgroundColor: 'rgba(95,196,188,0.14)' },
  flaskShoulder: { width: 24, height: 8, backgroundColor: 'rgba(95,196,188,0.22)', borderTopWidth: 2, borderColor: '#8EB5AD' },
  flaskBase: { width: 34, height: 24, borderWidth: 2, borderTopWidth: 0, borderColor: '#8EB5AD', backgroundColor: 'rgba(95,196,188,0.14)' },
  flaskLiquid: { position: 'absolute', bottom: 3, left: 5, right: 5, height: 10, opacity: 0.72 },
  flaskBubble: { position: 'absolute', width: 4, height: 4, backgroundColor: '#D9FFFF' },
  flaskBubbleOne: { bottom: 12, left: 13 },
  flaskBubbleTwo: { bottom: 17, right: 13 },
  flaskLeft: { top: 117, left: '30%' },
  flaskRight: { top: 116, right: '29%' },
  vapor: { position: 'absolute', width: 22, height: 30 },
  vaporPixel: { position: 'absolute', left: 3, bottom: 3, width: 7, height: 7 },
  vaporPixelOffset: { left: 12, bottom: 15, width: 5, height: 5 },
  benchTop: { position: 'absolute', left: 0, right: 0, bottom: 119, height: 9, backgroundColor: '#766854', borderTopWidth: 2, borderColor: '#A69A7D' },
  benchFront: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 120, backgroundColor: '#52483B', borderTopWidth: 3, borderColor: '#766A56', flexDirection: 'row', justifyContent: 'space-evenly', paddingTop: 22 },
  drawer: { width: '25%', height: 52, borderWidth: 2, borderColor: '#817560', backgroundColor: '#5B5042' },
  benchFlask: { bottom: 124, left: '48%' },
  labShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(30,25,18,0.04)' },
  pageLayer: { zIndex: 1 },
  page: { flexGrow: 1, width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 16 },
  topLine: { height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#5A512B', marginBottom: 14 },
  backButton: { width: 88, paddingVertical: 8 },
  backSpacer: { width: 88 },
  logo: { fontFamily: 'monospace', fontWeight: '700', fontSize: 16, letterSpacing: 2 },
  setup: { flex: 1, gap: 14, paddingBottom: 18 },
  kicker: { fontFamily: 'monospace', fontSize: 14, textAlign: 'center', letterSpacing: 1.2 },
  introBox: { minHeight: 138, borderWidth: 2, borderColor: '#E5DDCA', backgroundColor: 'rgba(38,36,31,0.94)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', padding: 12 },
  introFighter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  miniName: { maxWidth: '100%', fontFamily: 'monospace', fontWeight: '700', fontSize: 10, lineHeight: 14, textAlign: 'center' },
  miniTitle: { maxWidth: '100%', fontFamily: 'monospace', color: '#D8D0BE', fontSize: 8, lineHeight: 11, textAlign: 'center' },
  vsText: { fontFamily: 'monospace', fontSize: 21, fontWeight: '700' },
  bodyCopy: { fontFamily: 'monospace', color: '#F0EBDF', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  rankGroup: { gap: 7 },
  rankHeading: { fontFamily: 'monospace', fontSize: 14, letterSpacing: 1 },
  rankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rankCard: { width: '46%', flexGrow: 1, minHeight: 68, borderWidth: 1, borderColor: '#A79E8B', backgroundColor: 'rgba(39,37,32,0.96)', paddingHorizontal: 11, paddingVertical: 10, justifyContent: 'center', gap: 6 },
  rankName: { fontFamily: 'monospace', fontWeight: '700', fontSize: 13, letterSpacing: 0.4 },
  rankDetails: { fontFamily: 'monospace', color: '#E1DBCE', fontSize: 11 },
  ruleBox: { borderWidth: 1, borderColor: '#6E622C', padding: 9, gap: 5 },
  ruleText: { fontFamily: 'monospace', color: '#E7DB9C', fontSize: 10, lineHeight: 15 },
  mainButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFE86B', backgroundColor: '#16140C', paddingHorizontal: 14 },
  buttonPressed: { backgroundColor: '#353014' },
  buttonText: { fontFamily: 'monospace', fontWeight: '700', fontSize: 14, letterSpacing: 1 },
  battle: { flex: 1, gap: 12, paddingBottom: 22 },
  fighters: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  statusCard: { flex: 1, borderWidth: 1, borderColor: '#777', padding: 8, gap: 4, minWidth: 0 },
  statusName: { fontFamily: 'monospace', fontSize: 12, fontWeight: '700' },
  statusTitle: { fontFamily: 'monospace', color: '#E0D9CA', fontSize: 9, lineHeight: 12 },
  statusRank: { fontFamily: 'monospace', color: '#D4CCBC', fontSize: 10 },
  hpTrack: { height: 8, borderWidth: 1, borderColor: '#AAA', backgroundColor: '#242424', marginTop: 2 },
  hpFill: { height: '100%' },
  statLine: { fontFamily: 'monospace', color: '#DDD', fontSize: 10 },
  stage: { position: 'relative', minHeight: 112, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#A79A7E', backgroundColor: 'rgba(74,66,53,0.52)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, overflow: 'hidden' },
  attackBurst: { position: 'absolute', left: '28%', right: '28%', top: 8, bottom: 8, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  attackSparkRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  attackSpark: { width: 7, height: 7, backgroundColor: '#7DFF9A' },
  attackSparkLarge: { width: 18, height: 18, backgroundColor: '#FFE86B', borderWidth: 3, borderColor: '#FF7A47' },
  attackText: { fontFamily: 'monospace', fontWeight: '700', fontSize: 9, textAlign: 'center', textShadowColor: '#F45B34', textShadowRadius: 6 },
  attackStatus: { alignItems: 'center', justifyContent: 'center', minHeight: 76, borderWidth: 1, borderColor: '#A28A35', backgroundColor: 'rgba(5,10,10,0.86)', gap: 6 },
  attackStatusTitle: { fontFamily: 'monospace', fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  attackStatusText: { fontFamily: 'monospace', color: '#C5C5C5', fontSize: 9 },
  stageMiddle: { alignItems: 'center', gap: 5 },
  roundText: { fontFamily: 'monospace', fontWeight: '700', fontSize: 14 },
  stageCaption: { fontFamily: 'monospace', color: '#AAA', fontSize: 9, letterSpacing: 0.5 },
  timerPanel: { gap: 5 },
  timerLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  smallMono: { fontFamily: 'monospace', fontSize: 9, color: '#C9C9C9', letterSpacing: 0.3 },
  timerTrack: { height: 7, backgroundColor: '#282828', borderWidth: 1, borderColor: '#666' },
  timerFill: { height: '100%' },
  problemBox: { borderWidth: 2, borderColor: '#D8D0BF', backgroundColor: 'rgba(31,29,25,0.97)', padding: 14, gap: 10 },
  problemMeta: { fontFamily: 'monospace', fontWeight: '700', fontSize: 11, letterSpacing: 0.5 },
  problemText: { fontFamily: 'monospace', color: '#FFFDF7', fontSize: 16, lineHeight: 24, marginBottom: 2 },
  answerButton: { minHeight: 48, justifyContent: 'center', borderWidth: 1, borderColor: '#B8B09F', backgroundColor: '#35322C', paddingHorizontal: 12, paddingVertical: 10 },
  disabledButton: { borderColor: '#393939' },
  answerText: { fontFamily: 'monospace', fontSize: 14, lineHeight: 20 },
  stunText: { fontFamily: 'monospace', fontWeight: '700', textAlign: 'center', fontSize: 12, paddingVertical: 4 },
  botProblem: { borderTopWidth: 1, borderColor: '#555', marginTop: 5, paddingTop: 8, gap: 4 },
  botQuestion: { fontFamily: 'monospace', color: '#BDBDBD', fontSize: 10, lineHeight: 15 },
  resultBox: { borderWidth: 2, borderColor: '#FFE86B', padding: 14, gap: 12 },
  resultTitle: { fontFamily: 'monospace', color: '#FFF', textAlign: 'center', fontSize: 12, lineHeight: 19 },
  endTitle: { fontFamily: 'monospace', fontWeight: '700', textAlign: 'center', fontSize: 24, letterSpacing: 2 },
  explanation: { fontFamily: 'monospace', color: '#CCC', fontSize: 11, lineHeight: 17, textAlign: 'center' },
  damageLegend: { alignItems: 'center', paddingTop: 2 },
  mono: { fontFamily: 'monospace', fontSize: 10 },
  character: { alignItems: 'center', justifyContent: 'center', zIndex: 1 },
});
