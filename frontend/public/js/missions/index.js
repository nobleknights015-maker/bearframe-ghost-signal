// Mission registry. Add future missions here: export them and list them in MISSIONS.
import { mission1 } from './mission1.js';
import { mission2 } from './mission2.js';
import { mission3 } from './mission3.js';
import { mission4 } from './mission4.js';
import { mission5 } from './mission5.js';
import { mission6 } from './mission6.js';

export const MISSIONS = { [mission1.id]: mission1, [mission2.id]: mission2, [mission3.id]: mission3, [mission4.id]: mission4, [mission5.id]: mission5, [mission6.id]: mission6 };
export const FIRST_MISSION = mission1.id;
