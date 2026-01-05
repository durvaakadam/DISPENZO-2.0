import React, { useState } from "react";

function VoiceGuide({ scripts }) {
  const [lang, setLang] = useState("en-IN");

  const speak = () => {
    if (!scripts || !scripts[lang]) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(scripts[lang]);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <select value={lang} onChange={(e) => setLang(e.target.value)}>
        <option value="en-IN">English</option>
        <option value="hi-IN">हिन्दी</option>
        <option value="mr-IN">मराठी</option>
      </select>

      <button onClick={speak}>🔊 Listen</button>
    </div>
  );
}

export default VoiceGuide;
