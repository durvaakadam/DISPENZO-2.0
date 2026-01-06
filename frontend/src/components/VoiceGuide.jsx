import React, { useState, useEffect } from "react";
import "./VoiceGuide.css";

function VoiceGuide({ scripts }) {
  const [lang, setLang] = useState("en-IN");
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);

  // Load voices safely (Chrome async fix)
  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) setVoices(v);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const getBestVoice = () => {
    if (!voices.length) return null;

    // Exact language match
    let voice =
      voices.find(v => v.lang === lang) ||
      voices.find(v => v.lang.startsWith(lang.split("-")[0]));

    // Indian English fallback
    if (!voice && lang === "en-IN") {
      voice = voices.find(v => v.lang.includes("en"));
    }

    // Last fallback
    return voice || voices[0];
  };

  const speak = () => {
    if (!window.speechSynthesis || !scripts?.[lang]) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(scripts[lang]);

    const selectedVoice = getBestVoice();
    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.lang = lang;
    utterance.rate = 1.2;   // slower for rural clarity
    utterance.pitch = 3;
    utterance.volume = 3;

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
        <option value="ta-IN">தமிழ்</option>
        <option value="te-IN">తెలుగు</option>
        <option value="kn-IN">ಕನ್ನಡ</option>
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
