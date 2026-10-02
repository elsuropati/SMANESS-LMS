const OpenAICompatibleAdapter = require('./OpenAICompatibleAdapter');

class OpenAIAdapter extends OpenAICompatibleAdapter {
  constructor(config = {}) {
    super({
      ...config,
      endpoint: config.endpoint || 'https://api.openai.com/v1',
      model: config.model || 'gpt-4o'
    });
  }
}

module.exports = OpenAIAdapter;
