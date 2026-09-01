/**
 * Domain type re-exports.
 *
 * `../config` stays the source of the public, user-facing config types; the
 * domain layer re-exports the subset it reasons about so downstream modules can
 * depend on `domain/` instead of reaching into the config surface.
 */

export type {
  Color,
  ExtensionType,
  IntentsConfig,
  IOSTargetConfig,
  IOSTargetConfigNativeOnly,
  IOSTargetConfigWithReactNative,
  NativeLinkMode,
  NativeOnlyType,
  ReactNativeCompatibleType,
  ShareExtensionActivationRule,
  ShareExtensionContentType,
  StickerPack,
  TargetConfig,
  WalletConfig,
} from '../config';
