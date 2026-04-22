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
  Settings,
} from '@/pages/placeholders';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/relationships" replace />} />
      <Route path="/signin" element={<SignInPage />} />

      <Route
        path="/relationships"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="people" element={<PeopleDirectory />} />
        <Route path="people/new" element={<AddPerson />} />
        <Route path="people/:id" element={<PersonProfile />} />
        <Route path="people/:id/memories" element={<PersonMemories />} />
        <Route path="people/:id/gifts" element={<PersonGifts />} />
        <Route path="people/:id/messages" element={<PersonMessages />} />
        <Route path="dates" element={<DatesCalendar />} />
        <Route path="health" element={<Health />} />
        <Route path="events" element={<Events />} />
        <Route path="events/new" element={<CreateEvent />} />
        <Route path="events/:id" element={<EventDetail />} />
        <Route path="gifts" element={<GiftHub />} />
        <Route path="memories" element={<MemoryLog />} />
        <Route path="couples" element={<Couples />} />
        <Route path="advisor" element={<Advisor />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
