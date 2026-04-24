import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from '@/features/auth/LoginPage';
import RequireAuth from '@/features/auth/RequireAuth';
import { AuthProvider } from '@/features/auth/AuthProvider';
import AppShell from '@/components/layout/AppShell';
import SetupRequired from '@/components/SetupRequired';
import TitleWatcher from '@/components/TitleWatcher';
import { CardSkeleton } from '@/components/Skeleton';
import { supabaseConfigured } from '@/services/supabase';
import Dashboard from '@/pages/Dashboard';

// Route-level code splitting. Dashboard + LoginPage stay eager because
// one of them is the landing frame for every session; everything else
// pulls down as a separate chunk on first navigation. First-paint
// bundle drops materially, especially on mobile.
const TodayPage          = lazy(() => import('@/features/today/TodayPage'));
const RelationshipMapPage = lazy(() => import('@/features/map/RelationshipMapPage'));
const PeopleDirectory    = lazy(() => import('@/features/people/PeopleDirectoryPage'));
const AddPerson          = lazy(() => import('@/features/people/AddPersonPage'));
const EditPerson         = lazy(() => import('@/features/people/EditPersonPage'));
const PersonProfile      = lazy(() => import('@/features/people/PersonProfilePage'));
const PersonMemories     = lazy(() => import('@/features/memories/PersonMemoriesPage'));
const PersonGifts        = lazy(() => import('@/features/gifts/PersonGiftsPage'));
const PersonMessages     = lazy(() => import('@/features/outreach/ComposerPage'));
const DatesCalendar      = lazy(() => import('@/features/dates/DatesPage'));
const Health             = lazy(() => import('@/features/health/HealthPage'));
const ForecastPage       = lazy(() => import('@/features/health/ForecastPage'));
const Events             = lazy(() => import('@/features/events/EventsPage'));
const CreateEvent        = lazy(() => import('@/features/events/CreateEventPage'));
const EventDetail        = lazy(() => import('@/features/events/EventDetailPage'));
const GiftHub            = lazy(() => import('@/features/gifts/GiftHubPage'));
const MemoryLog          = lazy(() => import('@/features/memories/MemoryLogPage'));
const Couples            = lazy(() => import('@/features/couples/CouplesPage'));
const Advisor            = lazy(() => import('@/features/advisor/AdvisorPage'));
const Settings           = lazy(() => import('@/features/settings/SettingsPage'));
const NotificationsPage  = lazy(() => import('@/features/notifications/NotificationsPage'));
const NotFound           = lazy(() => import('@/pages/NotFoundPage'));

function PageFallback() {
  // Matches the dashboard silhouette closely enough that chunk-fetch latency
  // reads as "the page is painting" rather than "something is broken".
  return (
    <section className="animate-bloom">
      <CardSkeleton bodyLines={4} />
    </section>
  );
}

export default function App() {
  if (!supabaseConfigured) return <SetupRequired />;
  return (
    <AuthProvider>
      <TitleWatcher />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/relationships" replace />} />
          <Route path="/login" element={<LoginPage />} />
          {/* Back-compat: old magic-link route. Preserve query params for expired redirects. */}
          <Route path="/signin" element={<Navigate to="/login" replace />} />

          <Route
            path="/relationships"
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="today" element={<TodayPage />} />
            <Route path="map" element={<RelationshipMapPage />} />
            <Route path="people" element={<PeopleDirectory />} />
            <Route path="people/new" element={<AddPerson />} />
            <Route path="people/:id" element={<PersonProfile />} />
            <Route path="people/:id/edit" element={<EditPerson />} />
            <Route path="people/:id/memories" element={<PersonMemories />} />
            <Route path="people/:id/gifts" element={<PersonGifts />} />
            <Route path="people/:id/messages" element={<PersonMessages />} />
            <Route path="dates" element={<DatesCalendar />} />
            <Route path="health" element={<Health />} />
            <Route path="forecast" element={<ForecastPage />} />
            <Route path="events" element={<Events />} />
            <Route path="events/new" element={<CreateEvent />} />
            <Route path="events/:id" element={<EventDetail />} />
            <Route path="gifts" element={<GiftHub />} />
            <Route path="memories" element={<MemoryLog />} />
            <Route path="couples" element={<Couples />} />
            <Route path="advisor" element={<Advisor />} />
            <Route path="settings" element={<Settings />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
