import { Stack } from 'expo-router';
import { View } from 'react-native';

import { ConnectionBanner } from '@/features/game/online/connection-banner';
import { getConvexClient } from '@/services/convex/client';

export default function OnlineLayout() {
  // The banner's hook needs a ConvexProvider; only mount it when configured.
  const hasClient = getConvexClient() !== null;
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      {hasClient && <ConnectionBanner />}
    </View>
  );
}
