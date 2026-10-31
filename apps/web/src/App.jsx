import { Navigate, Route, Routes } from "react-router-dom";
import { token } from "./api.js";
import { Shell } from "./shell.jsx";
import { Login } from "./pages/Login.jsx";
import { Dashboard } from "./pages/Dashboard.jsx";
import { Calendar } from "./pages/Calendar.jsx";
import { Posts } from "./pages/Posts.jsx";
import { Composer } from "./pages/Composer.jsx";
import { MediaLibrary } from "./pages/MediaLibrary.jsx";
import { Brands } from "./pages/Brands.jsx";
import { History } from "./pages/History.jsx";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={token() ? <Shell /> : <Navigate to="/login" replace />}>
        <Route index element={<Dashboard />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="posts" element={<Posts />} />
        <Route path="posts/new" element={<Composer />} />
        <Route path="posts/:id" element={<Composer />} />
        <Route path="media" element={<MediaLibrary />} />
        <Route path="brands" element={<Brands />} />
        <Route path="history" element={<History />} />
      </Route>
    </Routes>
  );
}
