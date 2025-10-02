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

  protected onPrePost(model: any): void {
    // Override the base class method to handle settings-specific logic
    // Extract user from JWT or use SYSTEM as fallback
    const user = 'SYSTEM'; // For now, use SYSTEM. In production, extract from JWT
    
    // Use the field names that match the Mongoose schema
    model.createdBy = user;
    model.updatedBy = user;
    // The schema has timestamps: true, so createdAt and updatedAt are handled automatically
    // But we'll also set the base class fields for compatibility
    model.createdByGuid = user;
    model.createdDate = new Date();
    model.modifiedDate = new Date();
    model.modifiedByGuid = user;
  }

  protected onPrePut(req: any): void {
    // Override the base class method to handle settings-specific logic
    const user = 'SYSTEM'; // For now, use SYSTEM. In production, extract from JWT
    
    // Use the field names that match the Mongoose schema
    req.body.updatedBy = user;
    // The schema has timestamps: true, so updatedAt is handled automatically
    // But we'll also set the base class fields for compatibility
    req.body.modifiedDate = new Date();
    req.body.modifiedByGuid = user;
  }

  public async post(req: any, res: any): Promise<any> {
    try {
      console.log('[SettingService] POST method called');
      console.log('[SettingService] Request body:', JSON.stringify(req.body, null, 2));
      console.log('[SettingService] Request params:', req.params);
      console.log('[SettingService] Request query:', req.query);
      
      this._logger.info('settings post', { 
        text: 'POST request received', 
        body: JSON.stringify(req.body),
        headers: req.headers,
        url: req.url,
        originalUrl: req.originalUrl
      }, null);
      
      // Log the exact data before processing
      const originalBody = JSON.parse(JSON.stringify(req.body));
      console.log('[SettingService] Original body before onPrePost:', originalBody);
      
      // Call our overridden onPrePost to set created/modified fields
      this.onPrePost(req.body);
      
      this._logger.info('settings post', { 
        text: 'After onPrePost', 
        body: JSON.stringify(req.body),
        originalBody: JSON.stringify(originalBody)
      }, null);
      
      console.log('[SettingService] Body after onPrePost:', JSON.stringify(req.body, null, 2));
      console.log('[SettingService] Calling dbService.create with:', req.body);
      
      const result = await this.dbService.create(req.body);
      
      console.log('[SettingService] dbService.create returned:', JSON.stringify(result, null, 2));
      
      this._logger.info('settings post', { 
        text: 'Create result', 
        result: JSON.stringify(result),
        resultType: typeof result,
        resultKeys: result ? Object.keys(result) : 'null'
      }, null);
      
      console.log('[SettingService] About to call handleResponse with:', {
        result: result,
        resStatus: res.statusCode
      });
      
      const response = this.handleResponse(result, res);
      console.log('[SettingService] handleResponse returned, status:', res.statusCode);
      
      return response;
    } catch (error) {
      console.error('[SettingService] POST error:', error);
      console.error('[SettingService] Error stack:', error.stack);
      console.error('[SettingService] Error details:', {
        message: error.message,
        code: error.code,
        name: error.name
      });
      
      this._logger.error('settings post', { 
        text: 'Create failed', 
        error: JSON.stringify(error),
        message: error.message,
        stack: error.stack
      }, null);
      return this.handleErrorResponse(error, res);
    }
  }

  public async put(req: any, res: any): Promise<any> {
    try {
      this._logger.info('settings put', { 
        text: 'PUT request received', 
        body: JSON.stringify(req.body),
        params: req.params
      }, null);
      
      // Call our overridden onPrePut to set modified fields
      this.onPrePut(req);
      
      const result = await this.dbService.update(req);
      
      this._logger.info('settings put', { 
        text: 'Update result', 
        result: JSON.stringify(result)
      }, null);
      
      return this.handleResponse(result, res);
    } catch (error) {
      this._logger.error('settings put', { 
        text: 'Update failed', 
        error: JSON.stringify(error),
        message: error.message
      }, null);
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
