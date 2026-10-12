import { ISpeechRecognitionListener, ISpeechService } from '../../types/speech';

export class BrowserSpeechService implements ISpeechService {
  private recognition: any = null;
  private isListeningActive: boolean = false;
  private currentListener: ISpeechRecognitionListener | null = null;

  constructor() {
    this.initRecognition();
  }

  private initRecognition(): void {
    if (typeof window === 'undefined') return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        const lastIndex = event.results.length - 1;
        const transcript = event.results[lastIndex][0].transcript.trim();
        if (this.currentListener) {
          this.currentListener.onResult(transcript);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        if (this.currentListener?.onError) {
          this.currentListener.onError(event.error === 'not-allowed' ? 'Mic permission denied' : event.error);
        }
      };

      this.recognition.onend = () => {
        // If meant to keep listening during active watch session, gently restart unless manually stopped
        if (this.isListeningActive) {
          try {
            this.recognition.start();
          } catch {
            // Ignore if already active
          }
        } else {
          this.currentListener?.onListeningChange?.(false);
        }
      };
    }
  }

  public async speak(text: string): Promise<void> {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.log('[Mock TTS]:', text);
      return;
    }

    return new Promise((resolve) => {
      window.speechSynthesis.cancel(); // Stop overlapping speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95; // Calm, steady cadence for outdoor dark listening
      utterance.pitch = 1.0;

      // Select natural English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
      );
      if (preferred) {
        utterance.voice = preferred;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve(); // Always resolve so callers don't hang

      window.speechSynthesis.speak(utterance);
    });
  }

  public stopSpeaking(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  public startListening(listener: ISpeechRecognitionListener): boolean {
    this.currentListener = listener;

    if (!this.recognition) {
      listener.onError?.('Speech recognition not supported in this browser. Use quick-action voice cards.');
      return false;
    }

    try {
      this.isListeningActive = true;
      this.recognition.start();
      listener.onListeningChange?.(true);
      return true;
    } catch {
      // Might already be active
      return true;
    }
  }

  public stopListening(): void {
    this.isListeningActive = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore
      }
    }
    this.currentListener?.onListeningChange?.(false);
    this.currentListener = null;
  }

  public isAvailable(): { tts: boolean; stt: boolean } {
    const hasTts = typeof window !== 'undefined' && 'speechSynthesis' in window;
    const hasStt = typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    return { tts: hasTts, stt: hasStt };
  }
}

export const speechService = new BrowserSpeechService();
