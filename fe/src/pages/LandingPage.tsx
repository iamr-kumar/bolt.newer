import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Wand2, AlertCircle, Loader2 } from "lucide-react";
import axios from "axios";
import { BACKEND_URL } from "../config";

export default function LandingPage() {
  const [prompt, setPrompt] = useState("");
  const [tokenError, setTokenError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkTokenUsage();
  }, []);

  const checkTokenUsage = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${BACKEND_URL}/test`);

      if (response.status !== 200) {
        setTokenError(true);
      }
    } catch (error) {
      console.error("Failed to check token usage:", error);
      setTokenError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !tokenError && !isLoading) {
      navigate("/editor", { state: { prompt } });
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Wand2 className="w-8 h-8 text-purple-500" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            WebSmith
          </h1>
        </div>
        <p className="text-gray-400 text-lg max-w-md mx-auto">
          Create beautiful websites instantly with the power of AI. Just describe what you want.
        </p>
        <p className="text-gray-500 text-sm mt-2">
          Currently supporting React and Node.js applications only.
        </p>
        <p className="text-gray-500 text-sm mt-1">
          All code can be exported as a ZIP file with one click.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Checking API availability...</span>
        </div>
      ) : tokenError ? (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-center max-w-2xl mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h3 className="text-red-200 font-semibold">API Token Limit Reached</h3>
          </div>
          <p className="text-red-200">
            Sorry, I have run out of tokens for you to be able to see a demo of this.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full max-w-2xl">
          <div className="relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your dream website..."
              className="w-full px-6 py-4 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              disabled={tokenError || isLoading}
            />
            <button
              type="submit"
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 ${
                tokenError || isLoading
                  ? "bg-gray-700 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700"
              } text-white rounded-md transition-colors`}
              disabled={tokenError || isLoading}
            >
              Create
            </button>
          </div>
        </form>
      )}

      {!tokenError && !isLoading && (
        <div className="mt-8 text-gray-500 text-sm">
          Press Enter or click Create to start building
        </div>
      )}
    </div>
  );
}
