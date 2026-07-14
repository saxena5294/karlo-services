import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/public/Home";
import PublicLayout from "./components/layout/PublicLayout";
import Services from "./pages/public/Services";
import ServiceDetails from "./pages/public/ServiceDetails";
import ApplyService from "./pages/public/ApplyService";
import TrackApplication from "./pages/public/TrackApplication";
import About from "./pages/public/About";
import Contact from "./pages/public/Contact";
import AuthPlaceholder from "./pages/public/AuthPlaceholder";
import NotFound from "./pages/public/NotFound";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/:slug" element={<ServiceDetails />} />
          <Route path="/services/:slug/apply" element={<ApplyService />} />
          <Route path="/track" element={<TrackApplication />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<AuthPlaceholder mode="login" />} />
          <Route path="/register" element={<AuthPlaceholder mode="register" />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
