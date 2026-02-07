import React, { useState, useEffect, useRef } from "react";
import "./VoiceGuide.css";

function VoiceGuide({ scripts, autoPlay = false, defaultLanguage = "en-IN" }) {
  const [lang, setLang] = useState(defaultLanguage);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const lastPlayedScriptRef = useRef(null);

  // Load voices safely (Chrome async fix)
  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        setVoices(v);
        // Debug: Log available voices
        console.log("🎤 Available Voices:", v.map(voice => `${voice.name} (${voice.lang})`));
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Auto-play when autoPlay is enabled - only trigger once per new script
  useEffect(() => {
    if (autoPlay && scripts?.[lang] && voices.length > 0) {
      // Check if this script hasn't been played yet
      const scriptContent = scripts[lang];
      const scriptKey = `${lang}:${scriptContent}`;
      
      if (lastPlayedScriptRef.current !== scriptKey) {
        lastPlayedScriptRef.current = scriptKey;
        
        // Smaller delay to reduce lag
        const timer = setTimeout(() => {
          window.speechSynthesis.cancel();
          
          const utterance = new SpeechSynthesisUtterance(scriptContent);
          const bestVoice = getBestVoice();
          if (bestVoice) utterance.voice = bestVoice;
          utterance.lang = lang;
          utterance.rate = 1.3; // ✅ Changed from 0.85
          utterance.pitch = 1;
          utterance.volume = 1;
          
          utterance.onstart = () => setSpeaking(true);
          utterance.onend = () => setSpeaking(false);
          utterance.onerror = () => setSpeaking(false);
          
          window.speechSynthesis.speak(utterance);
        }, 200); // Reduced from 500ms to decrease lag
        
        return () => {
          clearTimeout(timer);
        };
      }
    }
  }, [autoPlay, lang, voices]);

  // Update language when defaultLanguage changes
  useEffect(() => {
    setLang(defaultLanguage);
  }, [defaultLanguage]);

  const getBestVoice = () => {
    if (!voices.length) return null;

    // For Marathi - try to find Google or Microsoft voice first (better quality)
    if (lang === "mr-IN") {
      // First try native Marathi voices (Google/Microsoft are better)
      let voice = voices.find(v => v.lang === "mr-IN" && (v.name.includes("Google") || v.name.includes("Microsoft")));
      if (voice) return voice;
      
      // Try any Marathi voice
      voice = voices.find(v => v.lang === "mr-IN" || v.lang.startsWith("mr"));
      if (voice) return voice;
      
      // Fallback to Hindi (closest language) - prefer Google/Microsoft
      voice = voices.find(v => (v.lang === "hi-IN" || v.lang.startsWith("hi")) && (v.name.includes("Google") || v.name.includes("Microsoft")));
      if (voice) return voice;
      
      voice = voices.find(v => v.lang === "hi-IN" || v.lang.startsWith("hi"));
      if (voice) return voice;
    }

    // Exact language match - prefer Google/Microsoft voices
    let voice = voices.find(v => v.lang === lang && (v.name.includes("Google") || v.name.includes("Microsoft")));
    if (voice) return voice;
    
    voice = voices.find(v => v.lang === lang) ||
      voices.find(v => v.lang.startsWith(lang.split("-")[0]));

    // Intelligent fallback for Indian languages
    if (!voice) {
      const languageFallbacks = {
        "mr-IN": ["hi-IN", "hi"], // Marathi → Hindi
        "ta-IN": ["en-IN", "en"], // Tamil → English
        "te-IN": ["en-IN", "en"], // Telugu → English
        "kn-IN": ["en-IN", "en"], // Kannada → English
        "hi-IN": ["en-IN", "en"], // Hindi → English
        "en-IN": ["en"],           // English → English
      };

      const fallbacks = languageFallbacks[lang] || [];
      for (const fallbackLang of fallbacks) {
        voice = voices.find(v => v.lang === fallbackLang || v.lang.startsWith(fallbackLang));
        if (voice) break;
      }
    }

    // Last fallback: use any available voice
    return voice || voices[0];
  };

  const speak = () => {
    if (!window.speechSynthesis || !scripts?.[lang]) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(scripts[lang]);

    const bestVoice = getBestVoice();
    if (bestVoice) utterance.voice = bestVoice;
    utterance.lang = lang;
    utterance.rate = 1.0; // ✅ Changed from 0.85
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  return (
    <div className="voice-guide-container">
      <div className="voice-guide-icon">🔊</div>

      <select
        className="voice-guide-select"
        value={lang}
        onChange={(e) => setLang(e.target.value)}
      >
        <option value="en-IN">English</option>
        <option value="hi-IN">हिन्दी</option>
        <option value="mr-IN">मराठी</option>
        <option value="ta-IN">Tamil</option>
        <option value="te-IN">Telugu</option>
        <option value="kn-IN">Kannada</option>
      </select>

      {!speaking ? (
        <button className="voice-guide-btn listen-btn" onClick={speak}>
          ▶ Listen
        </button>
      ) : (
        <button className="voice-guide-btn stop-btn" onClick={stopSpeech}>
          ⏸ Stop
        </button>
      )}
    </div>
  );
}

export default VoiceGuide;
