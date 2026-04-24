import { Navigate, Route, Routes } from 'react-router-dom';
import SignInPage from '@/features/auth/SignInPage';
import RequireAuth from '@/features/auth/RequireAuth';
import AppShell from '@/components/layout/AppShell';
import Dashboard from '@/pages/Dashboard';
import {
  AddPerson,
  Advisor,
  Couples,
  CreateEvent,
  DatesCalendar,
  EventDetail,
  Events,
  GiftHub,
  Health,
  MemoryLog,
  NotFound,
  PeopleDirectory,
  PersonGifts,
  PersonMemories,
  PersonMessages,
  PersonProfile,
} from '@/pages/placeholders';
import NotificationsPage from '@/features/notifications/NotificationsPage';
import TodayPage from '@/features/today/TodayPage';
import RelationshipMapPage from '@/features/map/RelationshipMapPage';
import ForecastPage from '@/features/health/ForecastPage';
import AurzoAuthGate from '@/services/aurzo/AurzoAuthGate';
import AurzoLoginPage from '@/pages/AurzoLoginPage';
import AurzoOnboardingPage from '@/pages/AurzoOnboardingPage';
import AurzoSettingsPage from '@/pages/AurzoSettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/relationships" replace />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/login" element={<AurzoLoginPage />} />
      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <AurzoOnboardingPage />
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <AurzoAuthGate>
              <AurzoSettingsPage />
            </AurzoAuthGate>
          </RequireAuth>
        }
      />

      <Route
        path="/relationships"
        element={
          <RequireAuth>
            <AurzoAuthGate>
              <AppShell />
            </AurzoAuthGate>
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="today" element={<TodayPage />} />
        <Route path="map" element={<RelationshipMapPage />} />
        <Route path="people" element={<PeopleDirectory />} />
        <Route path="people/new" element={<AddPerson />} />
        <Route path="people/:id" element={<PersonProfile />} />
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
        <Route path="settings" element={<AurzoSettingsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
