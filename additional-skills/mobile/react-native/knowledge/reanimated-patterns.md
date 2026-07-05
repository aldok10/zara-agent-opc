# Reanimated Patterns (2026)

## Core Concepts

React Native Reanimated 3.x runs animations on the UI thread via worklets -- small JS functions compiled to run outside the JS thread.

## Shared Values

Shared values live on the UI thread and can be read/written from both JS and UI threads without bridge serialization.

```typescript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

function ExpandableCard() {
  const height = useSharedValue(80);
  const expanded = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    overflow: 'hidden',
  }));

  const toggle = () => {
    expanded.value = !expanded.value;
    height.value = withSpring(expanded.value ? 200 : 80, {
      damping: 15,
      stiffness: 120,
    });
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable onPress={toggle}>
        <CardContent />
      </Pressable>
    </Animated.View>
  );
}
```

Key rules:
- Never read `.value` in the render function (causes re-render) -- only in worklets/animated styles
- Use `useAnimatedStyle` for derived animated properties
- Use `useDerivedValue` for computed shared values

## Worklets

Functions marked with `'worklet'` directive run on the UI thread:

```typescript
import { runOnUI, runOnJS } from 'react-native-reanimated';

function processGesture(translationX: number) {
  'worklet';
  if (translationX > 200) {
    runOnJS(onSwipeComplete)();
  }
}
```

Rules:
- Worklets can't access JS thread state directly (use `runOnJS` to call back)
- Only serializable values can cross the thread boundary
- Worklets have access to shared values without serialization

## Gesture Integration

Reanimated + react-native-gesture-handler for fluid gesture-driven animations:

```typescript
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  clamp,
} from 'react-native-reanimated';

function SwipeableRow({ onDelete }: { onDelete: () => void }) {
  const translateX = useSharedValue(0);
  const contextX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      contextX.value = translateX.value;
    })
    .onUpdate((event) => {
      translateX.value = clamp(contextX.value + event.translationX, -150, 0);
    })
    .onEnd((event) => {
      if (translateX.value < -100) {
        translateX.value = withSpring(-150);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={animatedStyle}>
        <RowContent />
      </Animated.View>
    </GestureDetector>
  );
}
```

## Animation Modifiers

```typescript
// Spring (physics-based)
withSpring(targetValue, { damping: 15, stiffness: 100, mass: 1 })

// Timing (duration-based)
withTiming(targetValue, { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })

// Decay (momentum-based, from gesture velocity)
withDecay({ velocity: event.velocityX, clamp: [0, maxWidth] })

// Sequence
withSequence(
  withTiming(1.2, { duration: 100 }),
  withSpring(1, { damping: 4 })
)

// Repeat
withRepeat(withTiming(1, { duration: 500 }), -1, true) // infinite, alternating

// Delay
withDelay(200, withSpring(1))
```

## Layout Animations

Automatic enter/exit animations without manual management:

```typescript
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';

function AnimatedList({ items }) {
  return (
    <View>
      {items.map((item) => (
        <Animated.View
          key={item.id}
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          layout={Layout.springify()}
        >
          <ListItem item={item} />
        </Animated.View>
      ))}
    </View>
  );
}
```

Built-in transitions: `FadeIn`, `SlideInRight`, `ZoomIn`, `BounceIn`, etc.
Custom: `FadeIn.delay(index * 50).springify()` for staggered entrance.

## Performance Tips

- Avoid `useAnimatedStyle` that depends on non-shared values (causes re-render)
- Use `useAnimatedReaction` instead of `useEffect` for reacting to shared value changes
- Minimize `runOnJS` calls during active gestures (crosses thread boundary)
- For scroll-driven animations, use `useAnimatedScrollHandler` (runs entirely on UI thread)
- Use `cancelAnimation(sharedValue)` before starting new animation on same value

## Scroll-Driven Animations

```typescript
const scrollY = useSharedValue(0);

const scrollHandler = useAnimatedScrollHandler({
  onScroll: (event) => {
    scrollY.value = event.contentOffset.y;
  },
});

const headerStyle = useAnimatedStyle(() => ({
  opacity: interpolate(scrollY.value, [0, 100], [1, 0], Extrapolation.CLAMP),
  transform: [{ translateY: interpolate(scrollY.value, [0, 100], [0, -50], Extrapolation.CLAMP) }],
}));
```
