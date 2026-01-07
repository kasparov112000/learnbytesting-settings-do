// import { DbMicroServiceBase, UnauthorizedException } from 'hipolito-framework';
import { Setting, RoleType, MdrApplicationUser } from 'hipolito-models';

import * as rp from 'request-promise';
import { serviceConfigs } from '../../config/global.config';
import { DbMicroServiceBase } from './db-micro-service-base';
import { LoggerWrapper } from 'wrapper/loggerWrapper';

// Environment type for settings targeting
type SettingEnvironment = 'prod' | 'local' | 'both';

// Interfaces for aggregate pipeline responses
interface SettingStats {
  totalCount: number;
  adminOnlyCount: number;
  regularCount: number;
  byCategory: { _id: string; count: number }[];
  byType: { _id: string; count: number }[];
  byEnvironment?: { _id: string; count: number }[];
}

interface PaginatedSettings {
  settings: Setting[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class SettingService extends DbMicroServiceBase { // eslint-disable-line

  private _logger: LoggerWrapper;
  public fileLogger: LoggerWrapper; // Expose for route logging

  constructor(dbService, logger: LoggerWrapper) {
    super(dbService);
    this._logger = logger;
    this.fileLogger = logger;
  }

  // ==========================================
  // Aggregate Pipeline Methods
  // ==========================================

  /**
   * Get settings using aggregate pipeline with filtering and pagination
   */
  public async getSettingsAggregate(
    options: {
      adminOnly?: boolean;
      isAdmin?: boolean;
      category?: string;
      type?: string;
      search?: string;
      page?: number;
      pageSize?: number;
      sortField?: string;
      sortOrder?: 'asc' | 'desc';
      environment?: SettingEnvironment;
      currentEnv?: 'prod' | 'local'; // The current running environment
    } = {}
  ): Promise<PaginatedSettings> {
    const {
      adminOnly,
      isAdmin = false,
      category,
      type,
      search,
      page = 1,
      pageSize = 50,
      sortField = 'name',
      sortOrder = 'asc',
      environment,
      currentEnv
    } = options;

    const pipeline: any[] = [];

    // Stage 1: Match - filter by access control
    const matchStage: any = {};

    console.log('[SettingService.getSettingsAggregate] Starting with options:', {
      isAdmin, adminOnly, category, type, search, page, pageSize, sortField, sortOrder, environment, currentEnv
    });

    // If not admin, exclude adminOnly settings
    if (!isAdmin) {
      matchStage.adminOnly = { $ne: true };
    } else if (adminOnly !== undefined) {
      // Admin can filter by adminOnly flag
      matchStage.adminOnly = adminOnly;
    }

    // Environment filtering
    if (isAdmin && environment) {
      // Admin can filter by specific environment
      matchStage.environment = environment;
    } else if (!isAdmin && currentEnv) {
      // Non-admin users only see settings for their current environment or 'both'
      matchStage.$or = [
        { environment: currentEnv },
        { environment: 'both' },
        { environment: { $exists: false } } // Legacy settings without environment field
      ];
    }

    // Filter by category
    if (category) {
      matchStage.category = category;
      console.log('[SettingService.getSettingsAggregate] Filtering by category:', category);
    }

    // Filter by type (Site/User)
    if (type) {
      matchStage.type = type;
    }

    if (Object.keys(matchStage).length > 0) {
      console.log('[SettingService.getSettingsAggregate] Match stage:', JSON.stringify(matchStage));
      pipeline.push({ $match: matchStage });
    }

    // Stage 2: Search - text search on name and description
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Stage 3: Add computed fields
    pipeline.push({
      $addFields: {
        valueType: { $type: '$value' },
        hasDescription: { $cond: [{ $ifNull: ['$description', false] }, true, false] }
      }
    });

    // Use facet for pagination and count
    const sortDirection = sortOrder === 'desc' ? -1 : 1;

    pipeline.push({
      $facet: {
        settings: [
          { $sort: { [sortField]: sortDirection } },
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize }
        ],
        totalCount: [
          { $count: 'count' }
        ]
      }
    });

    // Execute pipeline
    const result = await this.dbService.dbModel.aggregate(pipeline).allowDiskUse(true);

    let settings = result[0]?.settings || [];
    const total = result[0]?.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(total / pageSize);

    // Strip admin-only fields from non-admin responses
    if (!isAdmin) {
      settings = settings.map(setting => {
        const { environment, ...rest } = setting;
        return rest;
      });
    }

    this._logger.info('getSettingsAggregate', {
      text: 'Aggregate pipeline executed',
      options,
      resultCount: settings.length,
      total
    }, null);

    return {
      settings,
      total,
      page,
      pageSize,
      totalPages
    };
  }

  /**
   * Get settings statistics using aggregate pipeline
   */
  public async getSettingsStats(isAdmin: boolean = false): Promise<SettingStats> {
    const matchStage: any = {};

    // If not admin, exclude adminOnly settings from stats
    if (!isAdmin) {
      matchStage.adminOnly = { $ne: true };
    }

    const pipeline: any[] = [];

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Build facet with optional byEnvironment for admins
    const facetStages: any = {
      totalCount: [{ $count: 'count' }],
      adminOnlyCount: [
        { $match: { adminOnly: true } },
        { $count: 'count' }
      ],
      regularCount: [
        { $match: { $or: [{ adminOnly: false }, { adminOnly: { $exists: false } }] } },
        { $count: 'count' }
      ],
      byCategory: [
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ],
      byType: [
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]
    };

    // Only include environment stats for admins
    if (isAdmin) {
      facetStages.byEnvironment = [
        { $group: { _id: '$environment', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ];
    }

    pipeline.push({ $facet: facetStages });

    const result = await this.dbService.dbModel.aggregate(pipeline);

    const stats: SettingStats = {
      totalCount: result[0]?.totalCount[0]?.count || 0,
      adminOnlyCount: result[0]?.adminOnlyCount[0]?.count || 0,
      regularCount: result[0]?.regularCount[0]?.count || 0,
      byCategory: result[0]?.byCategory || [],
      byType: result[0]?.byType || []
    };

    // Only include environment stats for admins
    if (isAdmin) {
      stats.byEnvironment = result[0]?.byEnvironment || [];
    }

    return stats;
  }

  /**
   * Bulk update adminOnly flag for multiple settings
   */
  public async bulkUpdateAdminOnly(
    settingIds: string[],
    adminOnly: boolean
  ): Promise<{ modifiedCount: number }> {
    const { ObjectId } = require('mongodb');

    const result = await this.dbService.dbModel.updateMany(
      { _id: { $in: settingIds.map(id => new ObjectId(id)) } },
      {
        $set: {
          adminOnly,
          updatedAt: new Date(),
          updatedBy: 'SYSTEM'
        }
      }
    );

    this._logger.info('bulkUpdateAdminOnly', {
      text: 'Bulk update completed',
      settingIds,
      adminOnly,
      modifiedCount: result.modifiedCount
    }, null);

    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Bulk update environment field for multiple settings (admin only)
   */
  public async bulkUpdateEnvironment(
    settingIds: string[],
    environment: SettingEnvironment
  ): Promise<{ modifiedCount: number }> {
    const { ObjectId } = require('mongodb');

    const result = await this.dbService.dbModel.updateMany(
      { _id: { $in: settingIds.map(id => new ObjectId(id)) } },
      {
        $set: {
          environment,
          updatedAt: new Date(),
          updatedBy: 'SYSTEM'
        }
      }
    );

    this._logger.info('bulkUpdateEnvironment', {
      text: 'Bulk environment update completed',
      settingIds,
      environment,
      modifiedCount: result.modifiedCount
    }, null);

    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Get all settings for regular users (excludes adminOnly)
   * Strips environment field from results
   */
  public async getPublicSettings(currentEnv?: 'prod' | 'local'): Promise<Setting[]> {
    const matchStage: any = {
      $or: [{ adminOnly: false }, { adminOnly: { $exists: false } }]
    };

    // Filter by current environment if provided
    if (currentEnv) {
      matchStage.$and = [
        { $or: [{ adminOnly: false }, { adminOnly: { $exists: false } }] },
        {
          $or: [
            { environment: currentEnv },
            { environment: 'both' },
            { environment: { $exists: false } }
          ]
        }
      ];
      delete matchStage.$or;
    }

    const pipeline = [
      { $match: matchStage },
      { $sort: { category: 1, name: 1 } },
      // Remove environment field from results for non-admins
      { $project: { environment: 0 } }
    ];

    return await this.dbService.dbModel.aggregate(pipeline);
  }

  /**
   * Get admin-only settings
   */
  public async getAdminSettings(): Promise<Setting[]> {
    const pipeline = [
      { $match: { adminOnly: true } },
      { $sort: { category: 1, name: 1 } }
    ];

    return await this.dbService.dbModel.aggregate(pipeline);
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

  public async getByName(req: any, res: any): Promise<any> {
    try {
      const settingName = req.params.name;
      this._logger.info('settings getByName', {
        text: 'GET by name request received',
        name: settingName
      }, null);

      // Query the database for a setting with this name
      const query = { name: settingName };
      const settings = await this.dbService.dbModel.findOne(query);

      if (!settings) {
        this._logger.info('settings getByName', {
          text: 'Setting not found',
          name: settingName,
          level: 'warning'
        }, null);
        return res.status(404).json({
          statusCode: 404,
          version: '1.0.0.0',
          message: `Setting '${settingName}' not found`,
          result: null
        });
      }

      this._logger.info('settings getByName', {
        text: 'Setting found',
        name: settingName,
        value: settings.value
      }, null);

      return res.status(200).json({
        statusCode: 200,
        version: '1.0.0.0',
        message: 'Request successful',
        result: settings
      });
    } catch (error) {
      this._logger.error('settings getByName', {
        text: 'Get by name failed',
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
