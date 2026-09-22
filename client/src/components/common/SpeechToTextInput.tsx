import React, { useState, useEffect } from 'react';
import { Mic, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface SpeechToTextInputProps {
  onTranscript: (text: string) => void;
  className?: string;
  tooltip?: string;
}

const LANG_SPEECH_MAP: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  bn: 'bn-IN'
};

export const SpeechToTextInput: React.FC<SpeechToTextInputProps> = ({
  onTranscript,
  className = '',
  tooltip = 'Click to speak'
}) => {
  const { language } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setErrorMessage('');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        onTranscript(transcript);
      }
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setErrorMessage('Microphone access blocked. Please allow mic permissions.');
      } else if (event.error === 'no-speech') {
        setErrorMessage('No speech detected. Please try again.');
      } else {
        setErrorMessage(`Speech error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    setRecognitionInstance(recognition);

    return () => {
      try {
        recognition.abort();
      } catch (e) {}
    };
  }, [language]);

  const toggleListening = () => {
    if (!recognitionInstance) {
      setErrorMessage('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionInstance.stop();
      setIsListening(false);
    } else {
      setErrorMessage('');
      const targetLocale = LANG_SPEECH_MAP[language] || 'en-IN';
      recognitionInstance.lang = targetLocale;
      try {
        recognitionInstance.start();
      } catch (err: any) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  if (!isSupported) return null;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={toggleListening}
        title={isListening ? 'Listening... click to stop' : tooltip}
        className={`p-2 rounded-xl border transition flex items-center justify-center ${
          isListening
            ? 'bg-red-500 text-white border-red-600 shadow-md animate-pulse'
            : 'bg-slate-100 hover:bg-coop-50 text-slate-700 hover:text-coop-700 border-slate-200'
        } ${className}`}
      >
        {isListening ? (
          <Mic className="w-4 h-4 text-white animate-bounce" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>

      {errorMessage && (
        <div className="absolute z-30 bottom-full mb-1 left-0 w-48 p-2 bg-red-800 text-white text-[10px] rounded-lg shadow-lg flex items-center space-x-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
