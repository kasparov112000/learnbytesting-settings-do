import * as path from 'path';
import { ConnectionConfig } from 'hipolito-framework';

const environment = process.env.ENV_NAME || 'LOCAL';
let database = process.env.MONGO_NAME || 'mdr-settings';

const host = process.env.MONGO_HOST || '127.0.0.1';
const mongoport = process.env.MONGO_PORT || 27017;
const password = process.env.MONGO_PASSWORD || '';  
const username = process.env.MONGO_USER || '';
const ssl = process.env.MONGO_SSL || false;
const credentials = username ? `${username}:${encodeURIComponent(password)}@` : '';
const poolSize = process.env.MONGO_POOL_SIZE ? parseInt(process.env.MONGO_POOL_SIZE, 10) : 100;

const connection = new ConnectionConfig({
  env: environment,
  host: host,
  modelName: 'Settings',
  schemaPath: path.join(__dirname, '..', 'app', 'models'),
   dbUrl: (process.env.ENV_NAME || 'LOCAL') !== 'LOCAL' ?
    `mongodb+srv://${credentials}${host}/${database}?retryWrites=true` :
    `mongodb://${credentials}${host}:${mongoport}/${database}?ssl=${ssl}`,
  //dbUrl: 'mongodb+srv://dbAdmin:ramos111@cluster0.tvmkw.mongodb.net/mdr-settings?retryWrites=true&w=majority',
    options: {
    poolSize: poolSize,
    useNewUrlParser: true,
    useUnifiedTopology: true
  },
});

export { connection };
