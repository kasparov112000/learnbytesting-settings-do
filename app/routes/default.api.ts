export default function (app, express, serviceobject) {
  let router = express.Router();

  /* Initial route for testing!! */
  router.get('/settings', (req, res) => {
    serviceobject.get(req, res);
  });

  router.get('/settings/check/create', (req, res) => {
    serviceobject.checkCreate(req, res);
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
