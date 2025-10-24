import { defineTarget } from 'expo-targets';

export const funStickers = defineTarget({
  type: 'imessage',
  name: 'FunStickers',
  displayName: 'Fun Stickers',
  platforms: ['ios'],
  ios: {
    deploymentTarget: '17.0',
    bundleIdentifier: 'com.test.imessagestickers.stickers',
    displayName: 'Fun Stickers',
  },
});

// Track sticker usage
export const trackStickerUsage = async (stickerName: string) => {
  const currentCount = await funStickers.get(`sticker_${stickerName}_count`);
  const count = currentCount ? parseInt(currentCount) + 1 : 1;
  await funStickers.set(`sticker_${stickerName}_count`, count.toString());
  await funStickers.set('last_used_sticker', stickerName);
  await funStickers.set('last_used_timestamp', Date.now().toString());
};

// Get sticker statistics
export const getStickerStats = async () => {
  const lastUsed = await funStickers.get('last_used_sticker');
  const timestamp = await funStickers.get('last_used_timestamp');

  return {
    lastUsedSticker: lastUsed || 'None',
    lastUsedTime: timestamp ? new Date(parseInt(timestamp)) : null,
  };
};
