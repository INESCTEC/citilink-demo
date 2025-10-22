import { useState, useEffect } from "react";

const DevGate = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5059";

  useEffect(() => {
    // Check if user has authenticated before (valid for 1 hour)
    const authStatus = localStorage.getItem("site_access_auth");
    const authTime = localStorage.getItem("site_access_time");
    
    if (authStatus === "granted" && authTime && (Date.now() - parseInt(authTime) < 3600000)) {
      setIsAuthenticated(true);
    }
    
    // Add noindex meta tag to prevent search engines from indexing
    const metaRobots = document.createElement("meta");
    metaRobots.name = "robots";
    metaRobots.content = "noindex, nofollow";
    document.head.appendChild(metaRobots);
    
    return () => {
      // Clean up on unmount - only if the element still exists in the DOM
      if (metaRobots && metaRobots.parentNode) {
        metaRobots.parentNode.removeChild(metaRobots);
      }
    };
  }, []);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const nameType = import.meta.env.VITE_DEMO_MODE === "1" ? "demo" : "prod"; // "demo" or "custom"
    
    try {
      const response = await fetch(`${API_URL}/v0/devgate/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: password,
          name: nameType
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        localStorage.setItem("site_access_auth", "granted");
        localStorage.setItem("site_access_time", Date.now().toString());
        setIsAuthenticated(true);
        setError("");
      } else {
        setError(data.error || "Não foi possível autenticar. Por favor, tente novamente.");
        setPassword("");
      }
    } catch (err) {
      console.error('DevGate verification error:', err);
      setError("Erro de conexão. Por favor, tente novamente.");
      setPassword("");
    } finally {
      setLoading(false);
    }
  };
  

  if (isAuthenticated) {
    return children;
  }
  
  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-lg shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8 text-white font-montserrat">
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="">
              Este site tem o seu acesso restrito.
              Por favor, insira a senha para continuar.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-2">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-1 font-montserrat">
                Senha
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                className="w-full px-3 py-2 border text-white border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
                required
                />
            </div>
            
            {error && (
              <div className="rounded-sm text-red-400 mb-6 font-montserrat text-center">
                <p>{error}</p>
              </div>
            )}
                
            <div className="font-montserrat">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-stone-950 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Entrar" : "Entrar"}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default DevGate;