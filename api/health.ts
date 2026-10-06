import {healthRequest} from '../backend/http.js';
import {nodeHandler} from '../backend/vercel_handler.js';
export default nodeHandler(healthRequest);
