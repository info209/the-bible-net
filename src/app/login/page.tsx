"use client";
import { useState } from "react";
import { auth } from "../../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  OAuthProvider,
  signInWithPopup,
} from "firebase/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Email/Password Sign In
  const handleEmailSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Email/Password Sign Up
  const handleEmailSignUp = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Google Sign In
  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Facebook Sign In
  const handleFacebookSignIn = async () => {
    try {
      const provider = new FacebookAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Twitter (X) Sign In
  const handleTwitterSignIn = async () => {
    try {
      const provider = new TwitterAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Apple Sign In
  const handleAppleSignIn = async () => {
    try {
      const provider = new OAuthProvider('apple.com');
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Sign In / Sign Up</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="w-full mb-2 p-2 border rounded"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="w-full mb-4 p-2 border rounded"
      />
      <div className="flex gap-2 mb-4">
        <button onClick={handleEmailSignIn} className="bg-blue-500 text-white px-4 py-2 rounded">Sign In</button>
        <button onClick={handleEmailSignUp} className="bg-green-500 text-white px-4 py-2 rounded">Sign Up</button>
      </div>
      <div className="flex flex-col gap-2">
        <button onClick={handleGoogleSignIn} className="bg-red-500 text-white px-4 py-2 rounded">Sign in with Google</button>
        <button onClick={handleFacebookSignIn} className="bg-blue-700 text-white px-4 py-2 rounded">Sign in with Facebook</button>
        <button onClick={handleTwitterSignIn} className="bg-sky-500 text-white px-4 py-2 rounded">Sign in with X (Twitter)</button>
        <button onClick={handleAppleSignIn} className="bg-black text-white px-4 py-2 rounded">Sign in with Apple</button>
      </div>
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
}

