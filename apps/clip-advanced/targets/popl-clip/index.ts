import { createTarget } from 'expo-targets';

export const poplClip = createTarget('PoplClip');

export const storeContactData = async (contactUrl: string) => {
  await poplClip.set('lastContactUrl', contactUrl);
  await poplClip.set('timestamp', Date.now().toString());
};

export const getLastContact = async () => {
  const contactUrl = await poplClip.get('lastContactUrl');
  const timestamp = await poplClip.get('timestamp');

  return {
    contactUrl,
    timestamp: timestamp ? parseInt(timestamp) : null,
  };
};
