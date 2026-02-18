const { runTool } = require('./src/ToolNexus.Web/wwwroot/js/tools/url-decode.js');

async function test() {
  console.log('Testing url-decode implementation...');

  try {
    const input = 'Hello%20World%21';
    const result = await runTool('decode', input);
    console.log(`Input: ${input}`);
    console.log(`Output: ${result}`);

    if (result === 'Hello World!') {
      console.log('SUCCESS: Basic decoding works.');
    } else {
      console.log('FAILURE: Basic decoding failed.');
    }
  } catch (e) {
    console.log('ERROR:', e.message);
  }
}

test();
