import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import CreateEvent from './pages/CreateEvent';
import MyEvents from './pages/MyEvents';
import BrowseEvents from './pages/BrowseEvents';
import MyBookings from './pages/MyBookings';
import AuditLog from './pages/AuditLog';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/create-event" element={<CreateEvent />} />
        <Route path="/my-events" element={<MyEvents />} />
        <Route path="/events" element={<BrowseEvents />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/audit" element={<AuditLog />} />
      </Routes>
    </Router>
  );
}

export default App;
