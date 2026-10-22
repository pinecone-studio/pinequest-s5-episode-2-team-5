import { router } from 'expo-router';

import { LabScene } from '@/components/openlab/lab-scene';

export default function OpenLabScreen() {
  return <LabScene onExit={() => router.replace('/')} />;
}
