/**
 * Home-screen "rejoin" entry. Shows a button when the player has a saved online
 * room that still exists and they still hold a seat in it; tapping it routes back
 * to the room. Self-cleans the saved pointer when the room is gone, finished, or
 * the player is no longer seated.
 *
 * Guarded so the Convex `useRoom` hook only runs when a client is configured —
 * in the pass-and-play-only build (no `convexUrl`) the card renders nothing.
 */
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useIdentity } from '@/services/auth';
import { useRoom } from '@/services/convex';
import { getConvexClient } from '@/services/convex/client';
import { clearLastRoom, getLastRoom } from '@/services/storage';
import { Button } from '@/shared/ui/button';

export function ResumeOnlineCard() {
  // Both checks are stable for the session, so the conditional return below never
  // changes the hook order of the rendered <ResumeInner>.
  if (!getConvexClient()) return null;
  const code = getLastRoom();
  if (!code) return null;
  return <ResumeInner code={code} />;
}

function ResumeInner({ code }: { code: string }) {
  const { t } = useTranslation();
  const { userId } = useIdentity();
  const { room, loading } = useRoom(code);

  const seated = !!room && room.seats.some((s) => s.identityId === userId);
  const valid = !!room && room.status !== 'finished' && seated;

  useEffect(() => {
    if (!loading && !valid) clearLastRoom();
  }, [loading, valid]);

  if (loading || !valid) return null;

  return (
    <Button
      label={t('resumeRoom', { code })}
      variant="outline"
      onPress={() => router.push(`/online/${code}`)}
    />
  );
}
