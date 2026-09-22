import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface TextToSpeechButtonProps {
  textToRead?: string;
  text?: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

const LANG_VOICE_MAP: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  bn: 'bn-IN'
};

export const TextToSpeechButton: React.FC<TextToSpeechButtonProps> = ({
  textToRead,
  text,
  label,
  className = '',
  size = 'md'
}) => {
  const contentToSpeak = textToRead || text || '';
  const { language } = useLanguage();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setIsSupported(false);
    }

    return () => {
      if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleSpeak = () => {
    if (!isSupported) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel(); // Stop any ongoing speech

    const utterance = new SpeechSynthesisUtterance(contentToSpeak);
    const targetLang = LANG_VOICE_MAP[language] || 'en-IN';
    utterance.lang = targetLang;
    utterance.rate = 0.95; // Slightly slower for clarity

    // Try finding matching voice
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => v.lang === targetLang || v.lang.startsWith(language));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={handleToggleSpeak}
      title={isSpeaking ? 'Stop Reading' : 'Read Out Loud (Text-to-Speech)'}
      className={`inline-flex items-center space-x-1.5 rounded-xl font-bold transition ${
        isSpeaking
          ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
          : 'bg-coop-50 hover:bg-coop-100 text-coop-800 border border-coop-200'
      } ${
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs'
      } ${className}`}
    >
      {isSpeaking ? (
        <>
          <VolumeX className="w-4 h-4 text-amber-700" />
          <span>{label ? `Stop (${label})` : 'Stop Audio'}</span>
        </>
      ) : (
        <>
          <Volume2 className="w-4 h-4 text-coop-600" />
          <span>{label || '🔊 Listen'}</span>
        </>
      )}
    </button>
  );
};
