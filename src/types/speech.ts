export interface ISpeechRecognitionListener {
  onResult: (transcript: string) => void;
  onError?: (error: string) => void;
  onListeningChange?: (isListening: boolean) => void;
}

export interface ISpeechService {
  speak(text: string): Promise<void>;
  stopSpeaking(): void;
  startListening(listener: ISpeechRecognitionListener): boolean;
  stopListening(): void;
  isAvailable(): { tts: boolean; stt: boolean };
}
