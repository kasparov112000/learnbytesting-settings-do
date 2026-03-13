import * as mongoose from 'mongoose';
import '../models/translation';

export default function (app, express, serviceobject) {
  let router = express.Router();

  const Translation = mongoose.model('Translation');

  // ==========================================
  // i18n Translation Endpoints
  // ==========================================

  /**
   * GET /settings/i18n/version/:app/:lang
   * Lightweight version check for cache invalidation
   * MUST be before /settings/i18n/:app/:lang to avoid "version" matching as :app
   */
  router.get('/settings/i18n/version/:app/:lang', async (req, res) => {
    try {
      const { app: appName, lang } = req.params;
      const doc = await Translation.findOne({ app: appName, lang }, { version: 1 }).lean();
      if (!doc) {
        return res.status(404).json({ statusCode: 404, message: 'Not found', result: null });
      }
      res.status(200).json({ statusCode: 200, message: 'Request successful', result: { version: doc.version } });
    } catch (error) {
      console.error('[Settings] i18n version check error:', error);
      res.status(500).json({ statusCode: 500, message: error.message, result: null });
    }
  });

  /**
   * GET /settings/i18n/:app/:lang
   * Returns translation keys for a given app and language
   */
  router.get('/settings/i18n/:app/:lang', async (req, res) => {
    try {
      const { app: appName, lang } = req.params;
      const doc = await Translation.findOne({ app: appName, lang }).lean();
      if (!doc) {
        return res.status(404).json({
          statusCode: 404,
          message: `No translations found for ${appName}/${lang}`,
          result: null
        });
      }
      res.status(200).json({ statusCode: 200, message: 'Request successful', result: doc });
    } catch (error) {
      console.error('[Settings] i18n GET error:', error);
      res.status(500).json({ statusCode: 500, message: error.message, result: null });
    }
  });

  /**
   * PUT /settings/i18n/:app/:lang
   * Upsert translation keys for seeding and admin edits
   * Body: { keys: {...}, version?: number }
   */
  router.put('/settings/i18n/:app/:lang', async (req, res) => {
    try {
      const { app: appName, lang } = req.params;
      const { keys, version } = req.body;

      if (!keys || typeof keys !== 'object') {
        return res.status(400).json({ statusCode: 400, message: 'keys must be an object', result: null });
      }

      const doc = await Translation.findOneAndUpdate(
        { app: appName, lang },
        version !== undefined
          ? { $set: { keys, version }, $setOnInsert: { app: appName, lang } }
          : { $set: { keys }, $inc: { version: 1 }, $setOnInsert: { app: appName, lang } },
        { upsert: true, new: true, lean: true }
      );

      res.status(200).json({ statusCode: 200, message: 'Translation upserted', result: doc });
    } catch (error) {
      console.error('[Settings] i18n PUT error:', error);
      res.status(500).json({ statusCode: 500, message: error.message, result: null });
    }
  });

  // ==========================================
  // Aggregate Pipeline Endpoints (new)
  // ==========================================

  /**
   * GET /settings/aggregate
   * Get settings using aggregate pipeline with filtering and pagination
   * Query params:
   *   - isAdmin: boolean (if true, includes adminOnly settings)
   *   - adminOnly: boolean (filter by adminOnly flag - requires isAdmin=true)
   *   - category: string (filter by category)
   *   - type: string (filter by type: Site or User)
   *   - search: string (search in name, description, category)
   *   - page: number (default: 1)
   *   - pageSize: number (default: 50)
   *   - sortField: string (default: 'name')
   *   - sortOrder: 'asc' | 'desc' (default: 'asc')
   *   - environment: 'prod' | 'local' | 'both' (admin only - filter by environment)
   *   - currentEnv: 'prod' | 'local' (for non-admin users - filters to matching environment)
   */
  router.get('/settings/aggregate', async (req, res) => {
    try {
      console.log('[Settings Microservice] /settings/aggregate called');
      console.log('[Settings Microservice] Query params:', req.query);

      const options = {
        isAdmin: req.query.isAdmin === 'true',
        adminOnly: req.query.adminOnly !== undefined ? req.query.adminOnly === 'true' : undefined,
        category: req.query.category as string,
        type: req.query.type as string,
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        pageSize: parseInt(req.query.pageSize as string) || 50,
        sortField: req.query.sortField as string || 'name',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc',
        environment: req.query.environment as 'prod' | 'local' | 'both',
        currentEnv: req.query.currentEnv as 'prod' | 'local'
      };

      console.log('[Settings Microservice] Aggregate options:', options);

      const result = await serviceobject.getSettingsAggregate(options);

      console.log('[Settings Microservice] Aggregate result count:', result.settings?.length, 'total:', result.total);

      res.status(200).json({
        statusCode: 200,
        version: '1.0.0.0',
        message: 'Request successful',
        result
      });
    } catch (error) {
      console.error('[Settings] Aggregate error:', error);
      res.status(500).json({
        statusCode: 500,
        version: '1.0.0.0',
        message: error.message,
        result: null
      });
    }
  });

  /**
   * GET /settings/stats
   * Get settings statistics
   * Query params:
   *   - isAdmin: boolean (if true, includes adminOnly settings in stats)
   */
  router.get('/settings/stats', async (req, res) => {
    try {
      const isAdmin = req.query.isAdmin === 'true';
      const result = await serviceobject.getSettingsStats(isAdmin);
      res.status(200).json({
        statusCode: 200,
        version: '1.0.0.0',
        message: 'Request successful',
        result
      });
    } catch (error) {
      console.error('[Settings] Stats error:', error);
      res.status(500).json({
        statusCode: 500,
        version: '1.0.0.0',
        message: error.message,
        result: null
      });
    }
  });

  /**
   * GET /settings/public
   * Get all settings visible to regular users (excludes adminOnly)
   * Query params:
   *   - currentEnv: 'prod' | 'local' (filters to matching environment)
   */
  router.get('/settings/public', async (req, res) => {
    try {
      const currentEnv = req.query.currentEnv as 'prod' | 'local';
      const result = await serviceobject.getPublicSettings(currentEnv);
      res.status(200).json({
        statusCode: 200,
        version: '1.0.0.0',
        message: 'Request successful',
        result
      });
    } catch (error) {
      console.error('[Settings] Public settings error:', error);
      res.status(500).json({
        statusCode: 500,
        version: '1.0.0.0',
        message: error.message,
        result: null
      });
    }
  });

  /**
   * GET /settings/admin
   * Get admin-only settings (requires admin access)
   */
  router.get('/settings/admin', async (req, res) => {
    try {
      const result = await serviceobject.getAdminSettings();
      res.status(200).json({
        statusCode: 200,
        version: '1.0.0.0',
        message: 'Request successful',
        result
      });
    } catch (error) {
      console.error('[Settings] Admin settings error:', error);
      res.status(500).json({
        statusCode: 500,
        version: '1.0.0.0',
        message: error.message,
        result: null
      });
    }
  });

  /**
   * PUT /settings/bulk/admin-only
   * Bulk update adminOnly flag for multiple settings
   * Body: { settingIds: string[], adminOnly: boolean }
   */
  router.put('/settings/bulk/admin-only', async (req, res) => {
    try {
      const { settingIds, adminOnly } = req.body;

      if (!Array.isArray(settingIds) || settingIds.length === 0) {
        return res.status(400).json({
          statusCode: 400,
          version: '1.0.0.0',
          message: 'settingIds must be a non-empty array',
          result: null
        });
      }

      if (typeof adminOnly !== 'boolean') {
        return res.status(400).json({
          statusCode: 400,
          version: '1.0.0.0',
          message: 'adminOnly must be a boolean',
          result: null
        });
      }

      const result = await serviceobject.bulkUpdateAdminOnly(settingIds, adminOnly);
      res.status(200).json({
        statusCode: 200,
        version: '1.0.0.0',
        message: `Updated ${result.modifiedCount} settings`,
        result
      });
    } catch (error) {
      console.error('[Settings] Bulk update error:', error);
      res.status(500).json({
        statusCode: 500,
        version: '1.0.0.0',
        message: error.message,
        result: null
      });
    }
  });

  /**
   * PUT /settings/bulk/environment
   * Bulk update environment field for multiple settings (admin only)
   * Body: { settingIds: string[], environment: 'prod' | 'local' | 'both' }
   */
  router.put('/settings/bulk/environment', async (req, res) => {
    try {
      const { settingIds, environment } = req.body;

      if (!Array.isArray(settingIds) || settingIds.length === 0) {
        return res.status(400).json({
          statusCode: 400,
          version: '1.0.0.0',
          message: 'settingIds must be a non-empty array',
          result: null
        });
      }

      const validEnvironments = ['prod', 'local', 'both'];
      if (!validEnvironments.includes(environment)) {
        return res.status(400).json({
          statusCode: 400,
          version: '1.0.0.0',
          message: 'environment must be one of: prod, local, both',
          result: null
        });
      }

      const result = await serviceobject.bulkUpdateEnvironment(settingIds, environment);
      res.status(200).json({
        statusCode: 200,
        version: '1.0.0.0',
        message: `Updated environment for ${result.modifiedCount} settings`,
        result
      });
    } catch (error) {
      console.error('[Settings] Bulk environment update error:', error);
      res.status(500).json({
        statusCode: 500,
        version: '1.0.0.0',
        message: error.message,
        result: null
      });
    }
  });

  // ==========================================
  // Existing Endpoints
  // ==========================================

  /* Initial route for testing!! */
  router.get('/settings', (req, res) => {
    serviceobject.get(req, res);
  });

  router.get('/settings/check/create', (req, res) => {
    serviceobject.checkCreate(req, res);
  });

  router.get('/settings/name/:name', (req, res) => {
    serviceobject.getByName(req, res);
  });

  router.get('/settings/:id', (req, res) => {
    serviceobject.getById(req, res);
  });

  router.post('/settings', (req, res) => {
    console.log('[Settings Microservice] POST /settings received:', {
      body: req.body,
      headers: req.headers,
      query: req.query,
      params: req.params,
      url: req.url,
      originalUrl: req.originalUrl,
      path: req.path,
      baseUrl: req.baseUrl,
      timestamp: new Date().toISOString()
    });

    // Log to file for audit
    if (serviceobject.fileLogger) {
      serviceobject.fileLogger.info('SettingsMicroservice', 'POST /settings received', {
        body: req.body,
        headers: {
          'content-type': req.headers['content-type'],
          'content-length': req.headers['content-length'],
          'x-request-id': req.headers['x-request-id']
        },
        timestamp: new Date().toISOString()
      });
    }

    serviceobject.post(req, res);
  });

  router.put('/settings/:id', (req, res) => {
    serviceobject.put(req, res);
  });

  router.delete('/settings/:id', (req, res) => {
    serviceobject.delete(req, res);
  });

  return router;
}
