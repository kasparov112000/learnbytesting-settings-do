import * as mongoose from 'mongoose';

import { connection } from '../../config/connection';
import { DbServiceBase } from './db-service-base';
import { LoggerWrapper } from 'wrapper/loggerWrapper';

export class DbService extends DbServiceBase {

  private _logger: LoggerWrapper;
  
  constructor(logger: LoggerWrapper) {
    super(connection, mongoose);
    this._logger = logger;
  }
}
  