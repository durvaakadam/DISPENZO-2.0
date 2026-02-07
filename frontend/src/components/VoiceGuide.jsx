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
          const selectedVoice = getBestVoice();
          if (selectedVoice) {
            utterance.voice = selectedVoice;
            console.log(`🗣️ Speaking ${lang} with voice: ${selectedVoice.name} (${selectedVoice.lang})`);
          } else {
            console.warn(`⚠️ No voice found for ${lang}, using system default`);
          }
          
          utterance.lang = lang;
          utterance.rate = 0.85; // Slower, clearer speech for rural users
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

    // Exact language match
    let voice =
      voices.find(v => v.lang === lang) ||
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

    const selectedVoice = getBestVoice();
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log(`🗣️ Speaking ${lang} with voice: ${selectedVoice.name} (${selectedVoice.lang})`);
    } else {
      console.warn(`⚠️ No voice found for ${lang}, using system default`);
    }

    utterance.lang = lang;
    utterance.rate = 1.2;   // Slower, clearer speech for rural users
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
