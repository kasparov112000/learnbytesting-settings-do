// import { DbMicroServiceBase, UnauthorizedException } from 'hipolito-framework';
import { Setting, RoleType, MdrApplicationUser } from 'hipolito-models';

import * as rp from 'request-promise';
import { serviceConfigs } from '../../config/global.config';
import { DbMicroServiceBase } from './db-micro-service-base';
import { LoggerWrapper } from 'wrapper/loggerWrapper';

export class SettingService extends DbMicroServiceBase { // eslint-disable-line

  private _logger: LoggerWrapper;
  constructor(dbService, logger: LoggerWrapper) {
    super(dbService);
    this._logger = logger;
  }

  public async put(req: any, res: any): Promise<any> {
    //  const currentUser: MdrApplicationUser = await this.getCurrentUser(req);
    //  console.log('currentUser: ', currentUser);
    //  const userRoles = currentUser.permissions.map(permission => permission.roleType.toString());

    //   console.log('userRoles: ', userRoles);

    // if (!userRoles.includes('0')) {
    //   throw new UnauthorizedException('Only System Administrators may change the settings.');
    // }

    try {
      const result = await this.dbService.update(req);
      this._logger.info('settings', 'test', '')
      return this.handleResponse(result, res);
    } catch (error) {
      return this.handleErrorResponse(error, res);
    }
  }

  public async checkCreate(req, res) {
    let shouldWriteAuditLog = false;
    let settings: Setting;

    try {
      let settingsList =
        await this.dbService
          .find<Array<Setting>>(req)
          .catch(error => { throw error });

      if (settingsList.length) {
        settings = settingsList[0];
        var options = {
          resolveWithFullResponse: true,
          rejectUnauthorized: false,
        };

        let createAvailable = (await rp.get(serviceConfigs.createPingEndpoint, options)).statusCode === 200;
        if (createAvailable !== settings.createAvailable) {
          settings.createAvailable = createAvailable;
          req.params['id'] = settings._id;
          req.body = settings;

          settings = await this.dbService
            .update(req)
            .catch(error => { throw error });
          shouldWriteAuditLog = true;
        }
      }

      // TODO: Audit Logs need to be moved to an event instead of relying on the BODY of the response that should know nothing about it.
      if (settings) {
        settings['shouldWriteAuditLog'] = shouldWriteAuditLog;
      }
    } catch (err) {
      this._logger.error('settings checkCreate', { text: 'checkCreate has failed', error: JSON.stringify(err) }, null)
    }
    return res.status(200).json(settings);
  }
}
