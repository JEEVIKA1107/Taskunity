/**
 * Bhashini National Language Translation Mission Provider Abstraction
 * Supports Translation, Speech-to-Text, and Text-to-Speech
 * When API credentials are not configured, gracefully falls back to native Web Speech API
 * and cooperative translation matrices with transparent status reporting.
 */

export interface BhashiniConfig {
  apiKey?: string;
  userId?: string;
  pipelineId?: string;
  inferenceUrl?: string;
}

export interface TranslationProvider {
  translate(text: string, sourceLang: string, targetLang: string): Promise<string>;
  isLiveApi(): boolean;
}

export interface SpeechToTextProvider {
  transcribe(audioBlob: Blob, lang: string): Promise<string>;
  isLiveApi(): boolean;
}

export interface TextToSpeechProvider {
  synthesize(text: string, lang: string): Promise<string | null>;
  isLiveApi(): boolean;
}

class BhashiniIntegrationService
  implements TranslationProvider, SpeechToTextProvider, TextToSpeechProvider {
  private config: BhashiniConfig;

  constructor() {
    this.config = {
      apiKey: (import.meta as any).env?.VITE_BHASHINI_API_KEY,
      userId: (import.meta as any).env?.VITE_BHASHINI_USER_ID,
      pipelineId: (import.meta as any).env?.VITE_BHASHINI_PIPELINE_ID
    };
  }

  isLiveApi(): boolean {
    return Boolean(this.config.apiKey && this.config.userId);
  }

  getProviderStatus(): { name: string; mode: 'LIVE_BHASHINI' | 'COOPERATIVE_OFFLINE_MATRIX'; description: string } {
    if (this.isLiveApi()) {
      return {
        name: 'BHASHINI Government of India AI Language Services',
        mode: 'LIVE_BHASHINI',
        description: 'Authorized Bhashini ULCA Pipeline Connected'
      };
    }
    return {
      name: 'Task Unity Cooperative Offline Language Matrix',
      mode: 'COOPERATIVE_OFFLINE_MATRIX',
      description: 'Standard Web Speech & 7-Language Cooperative Lexicon (Bhashini API key not configured)'
    };
  }

  async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
    if (this.isLiveApi()) {
      try {
        const response = await fetch('https://dhruva-api.bhashini.gov.in/services/inference/pipeline', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.config.apiKey!
          },
          body: JSON.stringify({
            pipelineTasks: [
              {
                taskType: 'translation',
                config: {
                  language: {
                    sourceLanguage: sourceLang,
                    targetLanguage: targetLang
                  }
                }
              }
            ],
            inputData: {
              input: [{ source: text }]
            }
          })
        });
        const data = await response.json();
        const translatedText = data?.pipelineResponse?.[0]?.output?.[0]?.target;
        if (translatedText) return translatedText;
      } catch (err) {
        console.warn('Bhashini live translation call failed, falling back to local matrix:', err);
      }
    }
    // Fallback: Return original text (will be resolved by local translation matrix)
    return text;
  }

  async transcribe(audioBlob: Blob, lang: string): Promise<string> {
    if (this.isLiveApi()) {
      // Live Bhashini ASR endpoint dispatch
      try {
        // Prepare base64 audio
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(audioBlob);
        });
        const base64Audio = await base64Promise;

        const response = await fetch('https://dhruva-api.bhashini.gov.in/services/inference/pipeline', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.config.apiKey!
          },
          body: JSON.stringify({
            pipelineTasks: [
              {
                taskType: 'asr',
                config: {
                  language: { sourceLanguage: lang }
                }
              }
            ],
            inputData: {
              audio: [{ audioContent: base64Audio }]
            }
          })
        });
        const data = await response.json();
        return data?.pipelineResponse?.[0]?.output?.[0]?.source || '';
      } catch (err) {
        console.warn('Bhashini ASR call failed, falling back to browser SpeechRecognition:', err);
      }
    }
    return '';
  }

  async synthesize(text: string, lang: string): Promise<string | null> {
    if (this.isLiveApi()) {
      try {
        const response = await fetch('https://dhruva-api.bhashini.gov.in/services/inference/pipeline', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.config.apiKey!
          },
          body: JSON.stringify({
            pipelineTasks: [
              {
                taskType: 'tts',
                config: {
                  language: { sourceLanguage: lang },
                  gender: 'female'
                }
              }
            ],
            inputData: {
              input: [{ source: text }]
            }
          })
        });
        const data = await response.json();
        const audioContent = data?.pipelineResponse?.[0]?.audio?.[0]?.audioContent;
        if (audioContent) {
          return `data:audio/wav;base64,${audioContent}`;
        }
      } catch (err) {
        console.warn('Bhashini TTS call failed, falling back to browser speechSynthesis:', err);
      }
    }
    return null;
  }
}

export const bhashiniService = new BhashiniIntegrationService();
