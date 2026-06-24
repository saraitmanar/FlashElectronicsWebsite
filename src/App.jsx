import { BrowserRouter, Routes, Route } from "react-router-dom";
import Catalog from "./pages/catalog";
import Home from "./pages/homePage";
import Navbar from "./Navbar";

function App() {

  return (
    <div>
    <BrowserRouter>
       <Navbar/>

      <Routes>
        <Route path="/" element={<homePage />} />
        <Route path="/Catalog" element={<Catalog />} />
      </Routes>
    </BrowserRouter>

                <h1>Welcome to Flash Electronics International! </h1>

    </div>
   

  );
}


export default App