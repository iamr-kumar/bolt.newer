import { BrowserRouter, Route, Routes } from "react-router-dom";
import EditorPage from "./pages/EditorPage";
import LandingPage from "./pages/LandingPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/editor" element={<EditorPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
