const config = require('../../config/config');
const GeminiAdapter = require('./GeminiAdapter');
const OpenAIAdapter = require('./OpenAIAdapter');
const OpenAICompatibleAdapter = require('./OpenAICompatibleAdapter');

class AiService {
  getAdapter(providerConfig = {}) {
    const provider = (providerConfig.provider || 'gemini').toLowerCase();
    
    // Determine mock mode:
    // If MOCK_AI=true in env, always mock.
    // If MOCK_AI=false, use real call if apiKey or endpoint is supplied.
    const isMock = config.mockAi === true && !providerConfig.forceReal;

    const adapterConfig = {
      ...providerConfig,
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
