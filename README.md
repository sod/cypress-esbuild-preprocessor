# cypress-esbuild-preprocessor

Uses https://github.com/evanw/esbuild to bundle your specs. Around 50x faster than a webpack + babel/typescript based preprocessor.

## Usage

Install via

```bash
npm install -D esbuild cypress-esbuild-preprocessor
```

Use in your `cypress/plugins/index.js`

```javascript
const {cypressEsbuildPreprocessor} = require('cypress-esbuild-preprocessor');
const path = require('path');

module.exports = (on, config) => {
    on(
        'file:preprocessor',
        cypressEsbuildPreprocessor({
            esbuild: {
                tsconfig: path.resolve(__dirname, '../../tsconfig.json'),
            },
        }),
    );
};
```
