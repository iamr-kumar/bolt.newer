import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wand2 } from "lucide-react";

export default function LandingPage() {
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      navigate("/editor", { state: { prompt } });
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Wand2 className="w-8 h-8 text-purple-500" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            Bolt.Newer
          </h1>
        </div>
        <p className="text-gray-400 text-lg max-w-md mx-auto">
          Create beautiful websites instantly with the power of AI. Just
          describe what you want.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-2xl">
        <div className="relative">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your dream website..."
            className="w-full px-6 py-4 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            Create
          </button>
        </div>
      </form>

      <div className="mt-8 text-gray-500 text-sm">
        Press Enter or click Create to start building
      </div>
    </div>
  );
}
