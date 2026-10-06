import {searchRequest} from '../backend/http.js';
import {nodeHandler} from '../backend/vercel_handler.js';
export default nodeHandler(searchRequest);
