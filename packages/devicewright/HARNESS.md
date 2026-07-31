# Harness cutover

`@expo-targets/ios-harness` (when present on a feature branch) should import Devicewright for **device ops only**:

- `acquireDeviceLock` / `acquireSimLock` from `@expo-targets/devicewright`
- Boot / resolve simulator via `devices.launch({ platform: 'ios', ... })` or `ios/simctl` helpers

**Keep** XCUITest attach + `xcodebuild test` for Share Sheet / MobileSMS **proof bars** (App Group / Release) until Devicewright can match rigor.

Suggested diff once harness is on the same branch:

```ts
// before
import { acquireSimLock } from './lock';
import { bootSimulator, resolveSimUdid } from './sim';

// after
import {
  acquireDeviceLock as acquireSimLock,
  devices,
} from '@expo-targets/devicewright';
```

Do **not** delete XCUITest fixtures as part of Devicewright Phase 2.
