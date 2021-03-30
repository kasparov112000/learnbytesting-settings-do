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
