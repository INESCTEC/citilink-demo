import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button, Label, TextInput, Alert } from "flowbite-react";
import { FiChevronRight } from "react-icons/fi";
import { useLangNavigate } from "../hooks/useLangNavigate";

function AdminLogin({ setToken }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useLangNavigate();

  const API_URL = import.meta.env.VITE_API_URL;
  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/v0/auth/login?demo=${DEMO_MODE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        localStorage.setItem("role", data.role);
        localStorage.setItem("user_id", data.id);
        localStorage.setItem("municipio_id", data.municipio_id);
        setToken(data.access_token);

        if (data.role === "admin") {
          navigate("/admin/dashboard");
        } else if (data.role === "municipio") {
          navigate("/municipio/gestao");
        } else {
          navigate("/admin");
          setMessage("Tipo de utilizador desconhecido.");
        }
      } else {
        setMessage(data.error || "Erro ao fazer login.");
      }
    } catch (error) {
      setMessage(`Erro: ${error}`);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-sky-700 px-4 font-montserrat">
      {/* Top-right CitiLink Logo */}
      <h1 className="absolute top-6 right-6 text-2xl font-semibold text-white tracking-wide">CitiLink</h1>

      {/* Login Box */}
      <div className="w-full max-w-md rounded-md bg-white p-6">
        <div className="flex items-center justify-between mb-2">
        <h1 className="font-semibold text-xl text-sky-950">Login</h1>
        <p className="font-light text-xs uppercase tracking-widest text-sky-950">
          Área Reservada
        </p>
        </div>

        {message && (
          <Alert color="failure" className="mb-4 text-sm text-center">
            {message}
          </Alert>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email" value="Email" className="mb-1 text-sm" />
            <TextInput
              id="email"
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="password" value="Password" className="mb-1 text-sm" />
            <TextInput
              id="password"
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            className="w-full text-base font-medium group cursor-pointer bg-sky-700 hover:bg-sky-800 transition-colors duration-300"
          >
            <span className="flex items-center justify-center text-sm">
              Continuar
              <FiChevronRight className="ml-1 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </Button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;