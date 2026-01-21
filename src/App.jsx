import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'


function App() {
    const [search, setSearch] = useState("");

        console.log(search);
  const product = [
    {id:1, name:"Polo shirt", price:3.99, available:true},
    {id:2, name: "Jeans", price: 12.99, available:false},
    { id: 3, name: "Cap", price: 2.5, available: true }
  ];

  const filteredProducts = product.filter((p)=>
  p.name.toLowerCase().includes(search.toLowerCase())
  );

  return ( // this is just what the function above will return to the screen. So technically the UI
    <div>
      <h1>Catalog </h1>

    <input
    type="text"
    placeholder="search products"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    />

    

      {filteredProducts.map((p) => (
//{product.map((p) => ( //If you use .map(), you must add a key
        <div key={p.id}>

<h2>{p.name}</h2>
<p>{p.price}</p>
<p>{p.available ? "In Stock" : "Out of Stock"}</p>
    </div>
))}
    </div>
  );
  
}



export default App
