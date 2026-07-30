import { Router } from 'express';
import { getStates, getLgas, getCities, getHierarchy, getNearestCity } from '../controllers/locationController.js';

const router = Router();

router.get('/states', getStates);
router.get('/states/:stateId/lgas', getLgas);
router.get('/cities', getCities);
router.get('/hierarchy', getHierarchy);
router.get('/nearest-city', getNearestCity);

export default router;
