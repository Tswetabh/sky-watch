import modelConfig from './modelConfig.json';

export interface ModelEnvironment {
  ollamaHost: string;
  model: string;
  temperature: number;
  timeoutMs: number;
}

const STORAGE_KEY_MODEL = 'skywatch_llm_model';
const STORAGE_KEY_HOST = 'skywatch_ollama_host';

export function getModelConfig(): ModelEnvironment {
  // Check localStorage if available in browser
  if (typeof window !== 'undefined' && window.localStorage) {
    const overrideModel = window.localStorage.getItem(STORAGE_KEY_MODEL);
    const overrideHost = window.localStorage.getItem(STORAGE_KEY_HOST);
    return {
      ollamaHost: overrideHost || modelConfig.ollamaHost,
      model: overrideModel || modelConfig.model,
      temperature: modelConfig.temperature,
      timeoutMs: modelConfig.timeoutMs,
    };
  }

  return {
    ollamaHost: modelConfig.ollamaHost,
    model: modelConfig.model,
    temperature: modelConfig.temperature,
    timeoutMs: modelConfig.timeoutMs,
  };
}

export function setRuntimeModel(modelName: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY_MODEL, modelName);
  }
}

export function resetRuntimeModel(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(STORAGE_KEY_MODEL);
  }
}
