import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import Swal from 'sweetalert2';
import './index.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef(null);
  const navigate = useNavigate(); 
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    // Entrance animation
    if (formRef.current) {
      formRef.current.style.opacity = 0;
      formRef.current.style.transform = 'translateY(20px)';
      formRef.current.style.transition = 'opacity 1.5s ease-out, transform 1.5s ease-out';
      
      setTimeout(() => {
        if (formRef.current) {
          formRef.current.style.opacity = 1;
          formRef.current.style.transform = 'translateY(0)';
        }
      }, 50);
    }
  }, []);

  const handleSubmit = async () => {
    try {
      if (!email || !password) {
        Swal.fire({
          icon: 'warning',
          title: 'Missing fields',
          text: 'Please enter both email and password',
          timer: 1800,
          showConfirmButton: false,
          customClass: {
            popup: 'swal2-minimalist',
            title: 'swal2-minimalist-title',
            icon: 'swal2-minimalist-icon',
            htmlContainer: 'swal2-minimalist-html'
          }
        });
        return;
      }

      setIsLoading(true);
      
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        Swal.fire({
          icon: 'error',
          title: 'Login failed',
          text: data.error || "Login failed",
          timer: 2000,
          showConfirmButton: false,
          customClass: {
            popup: 'swal2-minimalist'
          }
        });
        setIsLoading(false);
        return;
      }

      localStorage.setItem("admin", JSON.stringify(data));
      navigate("/dashboard");
    } catch (err) {
      setIsLoading(false);
      Swal.fire({
        icon: 'error',
        title: 'Network error',
        text: 'Please try again.',
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: 'swal2-minimalist',
          title: 'swal2-minimalist-title',
          icon: 'swal2-minimalist-icon',
          htmlContainer: 'swal2-minimalist-html'
        }
      });
    }
  };

  // Keyboard event handler for Enter key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Enter' && !isLoading) {
        event.preventDefault();
        handleSubmit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, handleSubmit]);

  return (
    <div className="min-h-screen flex items-center justify-center py-10 px-4 bg-[FDFDFD]">
      <div 
        ref={formRef}
        className="flex w-full max-w-3xl h-[400px] bg-white shadow-lg rounded-lg overflow-hidden opacity-0"
      >
        {/* Left Side */}
        <div className="w-1/2 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,_rgba(20,96,162,0.70)_0%,_#1460A2_100%)] flex items-center justify-center p-6">
          <div className="flex flex-col items-center space-y-4">
            <img src="/logoWithLabel.png" alt="Logo" className="w-32 h-32" />
            <h1 className="text-white text-[14px] font-bold tracking-wider text-center">
              E-LOGBOOK: INCOMING & OUTGOING TRACKER
            </h1>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-1/2 p-8 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-sky-700 mb-10 text-center">
            Log In
          </h2>

          <div className="mb-8 relative">
            <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold z-10">
              Email
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full h-10 pl-5.5 pr-4 rounded-full border-2 border-sky-700 placeholder:text-sky-950/50 text-[12px] focus:border-[#004077] focus:outline-none focus:ring-1 focus:ring-[#004077] focus:[border-width:1px]"
            />
          </div>

          <div className="relative mb-2">
            <label className="absolute -top-2 left-5 bg-white px-1 text-sky-700 text-xs font-bold z-10">
              Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full h-10 pl-5.5 pr-4 rounded-full border-2 border-sky-700 placeholder:text-sky-950/50 text-[12px] focus:border-[#004077] focus:outline-none focus:ring-1 focus:ring-[#004077] focus:[border-width:1px]"
            />
          </div>

          <div className="flex items-center mb-8 ml-3">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="mr-1 text-sky-700 w-3 h-3 cursor-pointer"
            />
            <label className="text-xs text-sky-700">Show Password</label>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className={`cursor-pointer w-26 h-8 bg-sky-700 text-white font-semibold rounded-2xl transition text-sm ${
                isLoading ? 'opacity-75' : 'hover:bg-sky-800'
              }`}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;