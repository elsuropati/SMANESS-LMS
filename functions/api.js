const serverless = require('serverless-http');
const app = require('../backend/server');

const serverlessHandler = serverless(app);

module.exports.handler = async (event, context = {}) => {
  if (context) {
    context.callbackWaitsForEmptyEventLoop = false;
  }

  // Normalize path
  if (event.path && event.path.startsWith('/.netlify/functions/api')) {
    event.path = event.path.replace('/.netlify/functions/api', '');
    if (!event.path.startsWith('/')) {
      event.path = '/' + event.path;
    }
  }

  try {
    return await serverlessHandler(event, context);
  } catch (err) {
    console.error('Netlify Function Handler Error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, message: 'Serverless Function Error: ' + err.message })
    };
  }
};
