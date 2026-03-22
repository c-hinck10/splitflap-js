# Changelog

## 0.2.0 - 2026-03-22

### Added
- `flipDirection` option with `forward` and `shortest` modes
- responsive board mode for smaller and coarse-pointer layouts
- auto performance mode for lighter animation timing on mobile-style layouts
- reduced-motion handling via `respectReducedMotion`
- autoplay pause/resume behavior for hidden tabs via `pauseWhenHidden`
- demo controls for responsive mode, performance mode, and flip direction
- expanded test coverage for mobile behavior, wrapper prop forwarding, and face-wheel traversal

### Changed
- improved mobile/touch CSS behavior and rendering performance
- React wrapper now forwards additional core options correctly, including `staggerMode`, `flipDirection`, responsive settings, and motion/visibility options
- demo layout is more usable on phone-sized screens

### Notes
- default behavior remains classic forward-only flap traversal
- use `flipDirection: 'shortest'` for quickest-path behavior similar to bidirectional split-flap boards
