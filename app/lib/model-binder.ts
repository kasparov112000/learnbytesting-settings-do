
// import { logger } from '@easydevops/pwc-us-agc-logger';
import * as fs from 'fs';
import * as path from 'path';

export default function bindModels(type) {
  let pathToModels = '';
  switch (type) {
    case 'SQL':
      pathToModels = path.join(__dirname, '..', 'models', 'sql');
      break;
    case 'NOSQL':
      pathToModels = path.join(__dirname, '..', 'models', 'nosql');
      break;
    default:
      throw new Error('Database not implemented');
  }
  let fileArray = [];
  try {
    if (pathToModels) {
      fileArray = fs
        .readdirSync(pathToModels)
        .filter(file => (file.indexOf('.') !== 0)
          && (file.slice(-3) === '.ts') ||
          (file.slice(-3) === '.js'))
        .map(file => {
          const modelFile = require(`${pathToModels}/${file}`);
          return file;
        });
    }
  } catch (err) {
    console.log('error', `Unable to bind models! ${err}`);
  }
  return fileArray;
}
