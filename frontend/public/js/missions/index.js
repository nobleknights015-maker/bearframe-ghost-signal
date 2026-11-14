// Mission registry. Add future missions here: export them and list them in MISSIONS.
import { mission1 } from './mission1.js';
import { mission2 } from './mission2.js';

export const MISSIONS = { [mission1.id]: mission1, [mission2.id]: mission2 };
export const FIRST_MISSION = mission1.id;
