// app/game.tsx
import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import { Button, Dimensions, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useFrameCallback,
    useSharedValue,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

const FRUIT_W = 140;
const FRUIT_H = 84;
const GRAVITY = 0.2; // gentler gravity (unchanged)
const FRUIT_COUNT = 3; // fewer fruits so less chaos (unchanged)
const TRAIL_KEEP = 16;

// ---------- geometry ----------
function segIntersect(x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number) {
  const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (d === 0) return false;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}
function segIntersectsRect(x1: number, y1: number, x2: number, y2: number,
  rx: number, ry: number, rw: number, rh: number) {
  const xA = rx, xB = rx + rw, yA = ry, yB = ry + rh;
  return (
    segIntersect(x1, y1, x2, y2, xA, yA, xB, yA) ||
    segIntersect(x1, y1, x2, y2, xB, yA, xB, yB) ||
    segIntersect(x1, y1, x2, y2, xB, yB, xA, yB) ||
    segIntersect(x1, y1, x2, y2, xA, yB, xA, yA)
  );
}

// ---------- SlicedHalf ----------
type HalfProps = {
  x0: number; y0: number; vx0: number; vy0: number;
  rotateDeg: number; label: string; onDone: () => void;
};
function SlicedHalf({ x0, y0, vx0, vy0, rotateDeg, label, onDone }: HalfProps) {
  const x = useSharedValue(x0);
  const y = useSharedValue(y0);
  const vx = useSharedValue(vx0);
  const vy = useSharedValue(vy0);
  const rot = useSharedValue(rotateDeg);

  useFrameCallback(() => {
    x.value += vx.value;
    y.value += vy.value;
    vy.value += GRAVITY;
    rot.value += 2;
    if (y.value > height + 200) runOnJS(onDone)();
  });

  const style = useAnimatedStyle(() => ({
    position: "absolute",
    left: x.value,
    top: y.value,
    transform: [{ rotate: `${rot.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.half, style]}>
      <Text style={styles.halfText}>{label}</Text>
    </Animated.View>
  );
}

// ---------- FruitBubble ----------
export type FruitHandle = {
  rect: () => { x: number; y: number; w: number; h: number };
};
type FruitProps = {
  label: string; seed: number; hidden: boolean;
  onFall: () => void; x0: number;
};

const FruitBubble = forwardRef<FruitHandle, FruitProps>(function FruitBubble(
  { label, seed, hidden, onFall, x0 },
  ref
) {
  const x: SharedValue<number> = useSharedValue(x0);
  const y: SharedValue<number> = useSharedValue(height - 60);
  const vy: SharedValue<number> = useSharedValue(-20 - Math.random() * 3); // initial launch (your value)
  const fell = useRef(false);

  useEffect(() => {
    fell.current = false;
    x.value = x0;
    y.value = height - 60;
    vy.value = -12.5 - Math.random() * 3; // your gentler velocity
  }, [seed, x0]);

  useFrameCallback(() => {
    if (hidden) return;
    y.value += vy.value;
    vy.value += GRAVITY;

    // cap height (kept as-is, just a style change elsewhere)
    if (y.value < height * 0.10 && vy.value < 0) {
      vy.value = 0;
    }

    if (!fell.current && y.value > height + 120) {
      fell.current = true;
      runOnJS(onFall)();
    }
  });

  useImperativeHandle(ref, () => ({
    rect() {
      return { x: x.value, y: y.value, w: FRUIT_W, h: FRUIT_H };
    },
  }));

  const style = useAnimatedStyle(() => ({
    position: "absolute",
    left: x.value,
    top: y.value,
    width: FRUIT_W,
    height: FRUIT_H,
    opacity: hidden ? 0 : 1,
  }));

  return (
    <Animated.View style={[styles.fruit, style]}>
      <Text style={styles.fruitText}>{label}</Text>
    </Animated.View>
  );
});

// ---------- GameScreen ----------
export default function GameScreen() {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);

  const [waveId, setWaveId] = useState(0);
  const [labels, setLabels] = useState<string[]>(Array(FRUIT_COUNT).fill(""));
  const [answers, setAnswers] = useState<number[]>(Array(FRUIT_COUNT).fill(0));
  const [correctIdx, setCorrectIdx] = useState(0);
  const [hidden, setHidden] = useState<boolean[]>(Array(FRUIT_COUNT).fill(false));

  type HalfItem = { id: number; left: boolean; x: number; y: number; leftText: string; rightText: string };
  const [halves, setHalves] = useState<HalfItem[]>([]);

  const fallenCountRef = useRef(0);
  const fruitRefs = useRef<Array<FruitHandle | null>>(Array(FRUIT_COUNT).fill(null));

  const hiddenRef = useRef(hidden);
  const labelsRef = useRef(labels);
  const correctIdxRef = useRef(correctIdx);
  const gameOverRef = useRef(gameOver);
  useEffect(() => { hiddenRef.current = hidden; }, [hidden]);
  useEffect(() => { labelsRef.current = labels; }, [labels]);
  useEffect(() => { correctIdxRef.current = correctIdx; }, [correctIdx]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

  const [segments, setSegments] = useState<{ id: number; x1: number; y1: number; x2: number; y2: number }[]>([]);
  const lastX = useSharedValue(0);
  const lastY = useSharedValue(0);
  const segId = useRef(1);

  function buildWave() {
    const a = Math.floor(Math.random() * 10);
    const b = Math.floor(Math.random() * 10);
    const correct = a + b;

    const pool = new Set<number>([correct]);
    while (pool.size < FRUIT_COUNT) {
      const delta = Math.floor(Math.random() * 5) - 2;
      const candidate = correct + delta + (delta === 0 ? 1 : 0);
      pool.add(candidate);
    }
    const arr = Array.from(pool);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    setAnswers(arr);
    setLabels(arr.map((v) => `${a} + ${b} = ${v}`));
    setCorrectIdx(arr.indexOf(correct));
    setHidden(Array(FRUIT_COUNT).fill(false));
    setHalves([]);
    fallenCountRef.current = 0;
  }

  useEffect(() => { buildWave(); }, []);

  const handleFruitFall = () => {
    fallenCountRef.current += 1;
    if (fallenCountRef.current >= FRUIT_COUNT && !gameOverRef.current) {
      setLives((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setGameOver(true);
          return 0;
        }
        setTimeout(() => {
          setWaveId((id) => id + 1);
          buildWave();
        }, 250);
        return next;
      });
    }
  };

  function spawnHalves(cx: number, cy: number, fullLabel: string) {
    const [leftText, rightTextRaw] = fullLabel.split("=");
    const rightText = (rightTextRaw ?? "").trim();
    const left = (leftText ?? "").trim();
    const idBase = Date.now() + Math.floor(Math.random() * 1000);
    setHalves((prev) => [
      ...prev,
      { id: idBase, left: true,  x: cx - 20, y: cy, leftText: left, rightText },
      { id: idBase + 1, left: false, x: cx + 20, y: cy, leftText: left, rightText },
    ]);
  }
  function removeHalf(id: number) {
    setHalves((prev) => prev.filter((h) => h.id !== id));
  }

  // swipe helpers
  const jsResetTrail = () => setSegments([]);
  const jsAddTrail = (x1: number, y1: number, x2: number, y2: number) => {
    setSegments((prev) => {
      const next = [...prev, { id: segId.current++, x1, y1, x2, y2 }];
      return next.length > TRAIL_KEEP ? next.slice(-TRAIL_KEEP) : next;
    });
  };
  const jsHandleSlice = (x1: number, y1: number, x2: number, y2: number) => {
    if (gameOverRef.current) return;
    const hidden = hiddenRef.current;
    const labels = labelsRef.current;
    const correctIdx = correctIdxRef.current;
    for (let i = 0; i < FRUIT_COUNT; i++) {
      try {
        if (hidden[i]) continue;
        const ref = fruitRefs.current[i];
        if (!ref) continue;
        const { x, y, w, h } = ref.rect();
        if (segIntersectsRect(x1, y1, x2, y2, x - 12, y - 12, w + 24, h + 24)) {
          setHidden((prev) => {
            const copy = [...prev];
            copy[i] = true;
            return copy;
          });
          spawnHalves(x + w / 2, y + h / 2, labels[i] || "");
          if (i === correctIdx) setScore((s) => s + 1);
          else {
            setLives((prev) => {
              const next = prev - 1;
              if (next <= 0) { setGameOver(true); return 0; }
              return next;
            });
          }
          setTimeout(() => {
            setWaveId((id) => id + 1);
            buildWave();
          }, 200);
          break;
        }
      } catch {}
    }
  };

  const swipe = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(0)
    .shouldCancelWhenOutside(false)
    .minDistance(6)
    .onStart((e) => {
      lastX.value = e.absoluteX;
      lastY.value = e.absoluteY;
      runOnJS(jsResetTrail)();
    })
    .onUpdate((e) => {
      const x1 = lastX.value, y1 = lastY.value;
      const x2 = e.absoluteX, y2 = e.absoluteY;
      runOnJS(jsAddTrail)(x1, y1, x2, y2);
      runOnJS(jsHandleSlice)(x1, y1, x2, y2);
      lastX.value = x2;
      lastY.value = y2;
    })
    .onEnd(() => runOnJS(jsResetTrail)());

  const restart = () => {
    setScore(0); setLives(3); setGameOver(false);
    setWaveId((id) => id + 1);
    buildWave();
  };

  // pre-spaced slots to avoid overlap
  const slots = Array.from({ length: FRUIT_COUNT }, (_, i) =>
    (i + 0.5) * (width / FRUIT_COUNT) - FRUIT_W / 2
  );

  return (
    <GestureDetector gesture={swipe}>
      <View style={styles.container}>
        {/* Decorative pastel bubbles (no deps) */}
        <View style={styles.bg}/>
        <View style={[styles.dot, { top: 80, left: -40, backgroundColor: "#DCFCE7" }]} />
        <View style={[styles.dot, { top: 260, right: -30, backgroundColor: "#DBEAFE", width: 220, height: 220 }]} />
        <View style={[styles.dot, { bottom: 120, left: 40, backgroundColor: "#FEF3C7", width: 140, height: 140 }]} />

        {/* HUD badges */}
        <View style={styles.hud}>
          <View style={[styles.badge, { backgroundColor: "#34D399" }]}>
            <Text style={styles.badgeText}>⭐ {score}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: "#F87171" }]}>
            <Text style={styles.badgeText}>❤️ {lives}</Text>
          </View>
        </View>

        {!gameOver &&
          Array.from({ length: FRUIT_COUNT }).map((_, i) =>
            !hidden[i] ? (
              <FruitBubble
                key={`${waveId}-${i}`}
                ref={(r) => { fruitRefs.current[i] = r; }}
                label={labels[i] || ""}
                seed={waveId}
                hidden={hidden[i]}
                onFall={handleFruitFall}
                x0={slots[i]} // use slot position
              />
            ) : null
          )}

        {halves.map((h) =>
          h.left ? (
            <SlicedHalf key={h.id} x0={h.x} y0={h.y}
              vx0={-6 - Math.random() * 3}
              vy0={-8 - Math.random() * 6}
              rotateDeg={-15} label={h.leftText}
              onDone={() => removeHalf(h.id)} />
          ) : (
            <SlicedHalf key={h.id} x0={h.x} y0={h.y}
              vx0={6 + Math.random() * 3}
              vy0={-8 - Math.random() * 6}
              rotateDeg={15} label={h.rightText}
              onDone={() => removeHalf(h.id)} />
          )
        )}

        {segments.map((s, idx) => {
          const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
          const len = Math.max(1, Math.hypot(dx, dy));
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          const opacity = 0.12 + 0.58 * (idx / Math.max(1, segments.length - 1));
          return (
            <View key={s.id} style={[
              styles.trailSeg,
              { left: s.x1, top: s.y1, width: len, opacity, transform: [{ rotateZ: `${angle}deg` }] }
            ]}/>
          );
        })}

        {gameOver && (
          <View style={styles.overlay}>
            <Text style={styles.gameOver}>Great try! 🎉</Text>
            <Text style={styles.finalScore}>Score: {score}</Text>
            <Button title="Play again" onPress={restart} />
          </View>
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  // Soft pastel background + overflow hidden so dots don’t scroll
  container: { flex: 1, backgroundColor: "#F8FAFC", overflow: "hidden" },
  bg: { ...StyleSheet.absoluteFillObject, backgroundColor: "#F8FAFC" },
  dot: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 9999,
    opacity: 0.65,
  },

  // HUD badges
  hud: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  badge: {
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  badgeText: { color: "#fff", fontWeight: "800", fontSize: 18 },

  // Fruit / halves — rounded “pills”
  fruit: {
    backgroundColor: "#93C5FD", // light blue pill
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  fruitText: {
    color: "#0F172A", // deep slate for readability
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  half: {
    backgroundColor: "#93C5FD",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  halfText: { color: "#0F172A", fontWeight: "900", fontSize: 18 },

  // Swipe trail (subtle)
  trailSeg: {
    position: "absolute",
    height: 6,
    backgroundColor: "#fff",
    borderRadius: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: "rgba(15,23,42,0.25)",
  },
  gameOver: { fontSize: 32, fontWeight: "900", color: "#0F172A" },
  finalScore: { fontSize: 18, color: "#0F172A" },
});
