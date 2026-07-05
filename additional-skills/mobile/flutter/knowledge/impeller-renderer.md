# Impeller Renderer (2026)

## Impeller vs Skia

Impeller is Flutter's modern rendering engine, replacing Skia as the default on iOS (stable since Flutter 3.16) and Android (stable since Flutter 3.22).

| Aspect | Skia | Impeller |
|--------|------|---------|
| Shader compilation | JIT (causes jank on first use) | AOT (pre-compiled, no runtime jank) |
| Architecture | Immediate mode | Retained mode with display list |
| Platform support | All | iOS (default), Android (default), macOS |
| Antialiasing | MSAA | MSAA + new path rendering (Tessellation on Android, Stencil-then-Cover) |
| Text rendering | Skia text | Uses platform text APIs directly |
| Backend | OpenGL/Vulkan/Metal | Metal (iOS/macOS), Vulkan/OpenGL ES (Android) |

## Key Performance Characteristics

**Eliminated first-frame jank**: Impeller pre-compiles all shaders during app build. No runtime shader compilation stalls.

**Predictable frame timing**: Retained display list means the engine can diff and only repaint changed regions.

**Trade-offs**:
- Slightly higher baseline GPU usage (always uses GPU paths)
- Some custom shader effects (FragmentProgram) may behave differently
- Complex path rendering (many bezier curves) uses different tessellation strategy

## Debugging Performance with Impeller

### DevTools Integration

```dart
// Enable Impeller performance overlay
flutter run --enable-impeller  // default on iOS/Android now
```

In Flutter DevTools:
- Frame timing chart shows raster/UI thread separately
- Impeller surfaces "GPU time" more accurately than Skia did
- Look for "raster thread" spikes -- indicates overdraw or complex compositing

### Common Performance Issues

**Overdraw**: Too many overlapping translucent layers.
- Diagnose: DevTools > Performance Overlay > show repaint rainbow
- Fix: reduce `Opacity` widgets, use `ColorFiltered` instead, flatten layer tree

**Large image decoding**: Blocking raster thread.
- Fix: Use `ResizeImage` or `cacheWidth`/`cacheHeight` in `Image` widget
- Pre-decode off main isolate for large images

**Complex clipping**: Nested `ClipRRect`/`ClipPath`.
- Impeller handles clips better than Skia, but deep nesting still costs
- Prefer `Container(decoration: BoxDecoration(borderRadius: ...))` over explicit clips

**Custom painters**: `CustomPaint` still works but path complexity matters.
- Keep path point count low
- Cache paths in `shouldRepaint` returning false when possible

### Measuring

```dart
// Timeline events in Dart DevTools
import 'dart:developer';
Timeline.startSync('expensive_operation');
// ... work ...
Timeline.finishSync();
```

Use `flutter run --profile` for accurate performance measurements (debug mode has overhead).

## Impeller-Specific APIs

### Fragment Shaders (GLSL)

```dart
// pubspec.yaml
flutter:
  shaders:
    - shaders/blur.frag

// Usage
final program = await FragmentProgram.fromAsset('shaders/blur.frag');
final shader = program.fragmentShader()
  ..setFloat(0, radius)
  ..setFloat(1, size.width)
  ..setFloat(2, size.height);
```

Impeller compiles these at build time. Shader must be GLSL ES 100/300 compatible.

## Disabling Impeller (escape hatch)

If you hit a rendering bug:
```
// iOS - Info.plist
<key>FLTEnableImpeller</key>
<false/>

// Android - AndroidManifest.xml
<meta-data android:name="io.flutter.embedding.android.EnableImpeller" android:value="false" />

// Command line
flutter run --no-enable-impeller
```

Report bugs at github.com/flutter/flutter with `[Impeller]` tag -- the team actively fixes rendering regressions.

## Best Practices

1. Profile in `--profile` mode, not debug (debug adds significant overhead)
2. Use DevTools timeline to identify raster thread bottlenecks
3. Avoid `saveLayer` calls (triggered by Opacity, ShaderMask, ColorFilter in certain configurations)
4. Pre-cache images at display resolution: `precacheImage(ResizeImage(provider, width: w), context)`
5. For lists: use `ListView.builder` with `addAutomaticKeepAlives: false` for large lists
6. Test on lowest-spec target device, not just emulator
