//import Catalog from "./Catalog";
import { Link } from "react-router-dom";


function Home() {
  return (
    <div>
      <h1>Flash Electronics International</h1>
      <h3>Welcome to our website! Bienvenidos
      </h3>
      

     <Link to="/Catalog">
  <button>View Catalog</button>
    </Link>
    </div>
  );
}

export default Home;