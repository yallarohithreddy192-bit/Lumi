import React, { useState } from 'react';
import { LogIn, Phone, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';

export function AuthOverlay() {
  const [view, setView] = useState<'options' | 'phone' | 'otp'>('options');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const setupRecaptcha = () => {
    if ((window as any).recaptchaVerifier) return;
    (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
    });
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      setupRecaptcha();
      const verifier = (window as any).recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      setConfirmationResult(result);
      setView('otp');
    } catch (error) {
      console.error("Phone login failed:", error);
      alert("Failed to send OTP. Ensure phone number includes country code (e.g., +91).");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    setIsLoading(true);
    try {
      await confirmationResult.confirm(otp);
    } catch (error) {
      console.error("OTP verification failed:", error);
      alert("Invalid OTP code.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      <div id="recaptcha-container" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative glass p-8 rounded-3xl w-full max-w-md text-center flex flex-col items-center"
      >
        <AnimatePresence mode="wait">
          {view === 'options' ? (
            <motion.div 
              key="options"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full flex flex-col items-center"
            >
              <div className="w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center text-brand mb-6">
                <LogIn size={32} />
              </div>
              
              <h1 className="text-3xl font-serif mb-2 italic">VoxAI</h1>
              <p className="text-white/60 mb-8 leading-relaxed text-sm">
                Connect your account to sync your voice conversations across all your devices.
              </p>
              
              <div className="w-full space-y-3">
                <button
                  onClick={handleGoogleLogin}
                  className="w-full bg-white text-black font-semibold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/90 transition-all text-sm"
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                  Continue with Google
                </button>
                
                <button
                  onClick={() => setView('phone')}
                  className="w-full bg-white/5 text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all text-sm border border-white/10"
                >
                  <Phone size={18} />
                  Phone Number
                </button>
              </div>
            </motion.div>
          ) : view === 'phone' ? (
            <motion.div 
              key="phone"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full"
            >
              <button 
                onClick={() => setView('options')}
                className="absolute top-0 left-0 p-2 text-white/40 hover:text-white"
              >
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-xl font-bold mb-6">Enter Phone Number</h2>
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <input 
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 focus:border-brand outline-none text-center text-lg"
                  required
                />
                <button
                  disabled={isLoading}
                  className="w-full bg-brand text-white font-semibold py-4 rounded-xl hover:bg-brand/90 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div 
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full"
            >
              <button 
                onClick={() => setView('phone')}
                className="absolute top-0 left-0 p-2 text-white/40 hover:text-white"
              >
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-xl font-bold mb-6">Verify OTP</h2>
              <p className="text-white/40 text-sm mb-6">Sent to {phoneNumber}</p>
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <input 
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 focus:border-brand outline-none text-center text-2xl tracking-[0.5em]"
                  required
                />
                <button
                  disabled={isLoading}
                  className="w-full bg-brand text-white font-semibold py-4 rounded-xl hover:bg-brand/90 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Continue'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
        
        <p className="mt-8 text-[10px] text-white/30 uppercase tracking-widest font-bold">
          Secure • Encrypted • VoxAI
        </p>
      </motion.div>
    </div>
  );
}
