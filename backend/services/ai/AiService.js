const config = require('../../config/config');
const GeminiAdapter = require('./GeminiAdapter');
const OpenAIAdapter = require('./OpenAIAdapter');
const OpenAICompatibleAdapter = require('./OpenAICompatibleAdapter');

class AiService {
  getAdapter(providerConfig = {}) {
    const provider = (providerConfig.provider || process.env.AI_PROVIDER || 'gemini').toLowerCase();
    
    // API key dari setting user ATAU dari environment variable server (Netlify/local)
    const apiKey = providerConfig.api_key || 
                   providerConfig.apiKey || 
                   process.env.GEMINI_API_KEY || 
                   process.env.AI_API_KEY || 
                   process.env.OPENAI_API_KEY || '';

    // Jika API key ada, WAJIB gunakan real AI (bukan mock)
    // Hanya gunakan mock jika benar-benar tidak ada API key di server maupun profil
    const isMock = !apiKey && config.mockAi;

    const adapterConfig = {
      ...providerConfig,
      api_key: apiKey,
      mock: isMock
    };

    switch (provider) {
      case 'gemini':
        return new GeminiAdapter(adapterConfig);
      case 'openai':
        return new OpenAIAdapter(adapterConfig);
      case 'anthropic':
      case 'openrouter':
      case 'ollama':
      case 'custom':
      default:
        return new OpenAICompatibleAdapter(adapterConfig);
    }
  }

  async listModels(providerConfig) {
    const adapter = this.getAdapter(providerConfig);
    if (typeof adapter.listModels === 'function') {
      return await adapter.listModels();
    }
    return [];
  }

  async testConnection(providerConfig) {
    const adapter = this.getAdapter(providerConfig);
    return await adapter.testConnection();
  }

  async generate(prompt, providerConfig, options) {
    const adapter = this.getAdapter(providerConfig);
    return await adapter.generate(prompt, options);
  }

  async generateStructured(prompt, schema, providerConfig, options) {
    const adapter = this.getAdapter(providerConfig);
    return await adapter.generateStructured(prompt, schema, options);
  }

  async evaluate(studentAnswers, rubric, providerConfig, options) {
    const adapter = this.getAdapter(providerConfig);
    return await adapter.evaluate(studentAnswers, rubric, options);
  }
}

module.exports = new AiService();
