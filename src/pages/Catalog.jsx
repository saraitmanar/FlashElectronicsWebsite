import { useState } from "react";
import "../App.css";
import shirtImage from "../assets/Black.png"; 
import shoesImage from "../assets/shoes.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
  
function Catalog () {
  const [search, setSearch] = useState("");

  const shirt = {
    id: 1,
    name: "Black Shirt",
    price: 5.99,
    available: true,
    image: shirtImage,
  };

  const shoes = {
    id: 2,
    name: "Shoes",
    price: 5.99,
    available: true,
    image: shoesImage,
  };

  const products = [shirt, shoes];

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h1>Catalog</h1>

      <input
        type="text"
        placeholder="search products"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="grid">
        {filteredProducts.map((p) => (
          <div className="card" key={p.id}>
            <img src={p.image} alt={p.name} />
            <h2>{p.name}</h2>
            <p>${p.price}</p>
            <p>{p.available ? "In Stock" : "Out of Stock"}</p>
          </div>
        ))}
      </div>

      <h2>To place an order or for any inquiries, contact us!</h2>
<a
  href="https://wa.me/7867070092"
  target="_blank"
  rel="noopener noreferrer"
>
  <FontAwesomeIcon
    icon={faWhatsapp}
    size="4x"
    style={{ color: "#25D366" }}
  />
</a>


      </div>
    //</div>
  );
}
export default Catalog