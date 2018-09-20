import * as express from 'express';
import apiAuth from './auth';

// Create Express Router
const apiRouter = express.Router();

// Login handler / token generator
apiRouter.post('/login', async (req, res, next) => {
  return apiAuth.login(req.body.access_token)
    .then((data) => {
      res.json(data);
    })
    .catch(next);
});

// Require yoken auth for all other routes
apiRouter.use(apiAuth.isAuthedMiddleware);

apiRouter.get('/profile', apiAuth.getAccessProfile);

export default apiRouter;
