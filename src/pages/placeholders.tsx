// Route-level page exports. Most are now real modules; placeholders remain
// only for routes the spec describes but we haven't built screens for yet.

export { default as PeopleDirectory } from '@/features/people/PeopleDirectoryPage';
export { default as AddPerson } from '@/features/people/AddPersonPage';
export { default as PersonProfile } from '@/features/people/PersonProfilePage';
export { default as PersonMemories } from '@/features/memories/PersonMemoriesPage';
export { default as PersonGifts } from '@/features/gifts/PersonGiftsPage';
export { default as PersonMessages } from '@/features/outreach/ComposerPage';
export { default as DatesCalendar } from '@/features/dates/DatesPage';
export { default as Health } from '@/features/health/HealthPage';
export { default as Events } from '@/features/events/EventsPage';
export { default as CreateEvent } from '@/features/events/CreateEventPage';
export { default as EventDetail } from '@/features/events/EventDetailPage';
export { default as GiftHub } from '@/features/gifts/GiftHubPage';
export { default as MemoryLog } from '@/features/memories/MemoryLogPage';
export { default as Couples } from '@/features/couples/CouplesPage';
export { default as Advisor } from '@/features/advisor/AdvisorPage';
export { default as Settings } from '@/features/settings/SettingsPage';

import ModulePlaceholder from '@/components/layout/ModulePlaceholder';

export const NotFound = () => (
  <ModulePlaceholder
    title="Not found"
    tagline="This page wandered off."
    invitation="Head back to the dashboard — the people are waiting."
  />
);
