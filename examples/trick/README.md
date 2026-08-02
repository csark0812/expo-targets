# ET Trick

Showcase host packing the four deepened Apple targets:

| Target        | Appex display name | Extension point                       |
| ------------- | ------------------ | ------------------------------------- |
| `trick-nse`   | ET Trick NSE       | `usernotifications.service`           |
| `trick-nce`   | ET Trick NCE       | `usernotifications.content-extension` |
| `trick-photo` | ET Trick Photo     | `com.apple.photo-editing`             |
| `trick-files` | ET Trick Files     | `fileprovider-nonui`                  |

Shared app group: `group.com.expotargets.example.trick`.

```bash
cd examples/trick
npx expo prebuild --platform ios
npx expo run:ios --configuration Release --device <UDID> --no-bundler
```
