// Aeon Circuit side-view battler art registry.
// EMPTY ON PURPOSE until licensed, QA-approved native pixel sheets are delivered.
// Art team: follow docs/SIDE_VIEW_BATTLE_ASSET_STANDARD_20261115.md.
// To bind one sheet later add, for example:
// 'party:sleeper': {src:'assets/battlers/sleeper.png',frameWidth:64,frameHeight:64,
//   scale:1,animations:{idle:{row:0,frames:4,fps:5},attack:{row:1,frames:6,fps:12},...}}
// Use the exact id for the in-game combatant. No code-generation or runtime eval.
import {RPG_GENERATED_BATTLERS} from './rpg-generated-registrations.js';
export const RPG_BATTLER_ART=Object.freeze({...RPG_GENERATED_BATTLERS});
