# Live Activity Demo App

A comprehensive demo showcasing iOS Dynamic Island and Live Activities with expo-targets.

## Features

This demo app demonstrates three different Live Activity implementations:

### 🍕 Delivery Tracking
- Real-time order status updates
- Driver assignment
- ETA countdown
- Multi-stage progress (Order → Preparing → Pickup → Delivery)

### 🏃 Workout Tracking
- Distance tracking
- Pace monitoring
- Elapsed time
- Calorie counter
- Auto-updating simulation

### ⏱️ Countdown Timer
- Customizable durations (10s, 1m, 5m)
- Progress visualization
- Remaining time display
- Auto-completion

## Dynamic Island Features Demonstrated

Each activity showcases all Dynamic Island states:

1. **Compact View** - When running in background
   - Leading: Icon
   - Trailing: Key metric

2. **Minimal View** - When multiple activities active
   - Single representative icon

3. **Expanded View** - When long-pressed
   - Leading: Activity identifier
   - Trailing: Primary metric
   - Center: Status/details
   - Bottom: Action buttons

## Requirements

- iOS 16.1+ (Dynamic Island requires iPhone 14 Pro+)
- Expo SDK 50+
- Development build
- macOS with Xcode 14+

## Installation

```bash
# Install dependencies
npm install

# Run prebuild to generate native projects
npx expo prebuild

# Run on iOS
npx expo run:ios
```

## Usage

1. **Start an Activity**: Tap any "Start" button
2. **View in Dynamic Island**: Long-press the pill at the top
3. **Update Activity**: Use stage buttons (for delivery) or wait for auto-updates
4. **End Activity**: Tap "Complete" or wait for timer to finish
5. **Check Active**: See all running Live Activities

## Project Structure

```
live-activity-demo/
├── App.tsx                    # Main app with controls
├── targets/
│   ├── delivery-tracker/
│   │   ├── expo-target.config.json
│   │   ├── index.ts
│   │   └── ios/
│   │       ├── DeliveryTrackerAttributes.swift
│   │       ├── DeliveryTrackerLiveActivity.swift
│   │       └── DeliveryTrackerBundle.swift
│   ├── workout-tracker/
│   │   └── ... (similar structure)
│   └── timer-activity/
│       └── ... (similar structure)
└── package.json
```

## Testing

### On iPhone 14 Pro+ (Dynamic Island)
- Long-press the Dynamic Island to see expanded view
- Tap compact view to open app
- Multiple activities will show minimal view

### On Other iOS 16.1+ Devices
- Live Activities appear on Lock Screen
- Swipe down from top to see in notification center
- Tap to open app

## Code Examples

### Starting an Activity

```typescript
import { createLiveActivity } from 'expo-targets';

const delivery = createLiveActivity('DeliveryTracker', 'group.com.yourapp');

const token = await delivery.start(
  { orderId: '12345', restaurantName: 'Pizza Palace' },
  { status: 'Order Received', eta: '30 min' }
);
```

### Updating an Activity

```typescript
await delivery.update({
  status: 'Out for Delivery',
  eta: '5 min',
  driverName: 'John Doe'
});
```

### Ending an Activity

```typescript
await delivery.end('default'); // or 'immediate' or 'after'
```

## Customization

### Colors

Edit `expo-target.config.json` in each target folder:

```json
{
  "ios": {
    "colors": {
      "AccentColor": "#FF6B00",
      "Primary": "#FF6B00"
    }
  }
}
```

### Layout

Edit the Swift files in `targets/*/ios/` to customize:
- Expanded regions
- Compact views
- Lock screen appearance
- Progress indicators
- Button actions

## Best Practices Demonstrated

✅ Check if activities are enabled before starting  
✅ Handle activity state in app  
✅ Provide meaningful updates  
✅ End activities when complete  
✅ Design for both Dynamic Island and Lock Screen  
✅ Use appropriate dismissal policies  
✅ Include deep linking  

## Troubleshooting

### Activity doesn't appear
- Verify iOS 16.1+ and development build
- Check App Group matches in all configs
- Ensure activity started successfully (check token)

### Updates not showing
- Verify activity hasn't ended
- Check that you're passing new data
- Wait a moment - updates may be batched

### Build errors
```bash
npx expo prebuild --clean
cd ios && pod install && cd ..
npx expo run:ios
```

## Resources

- [Live Activities Documentation](../../docs/live-activities.md)
- [Configuration Reference](../../docs/configuration.md)
- [API Reference](../../docs/api.md)

## License

MIT
