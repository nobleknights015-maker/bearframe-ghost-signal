// Test-sector item data. In the final game these rows belong in the authored equipment database.
// Lineage labels deliberately distinguish ancient Sleepers, old Echo Frames and modern Foundry frames.
export const LAB_GEAR=Object.freeze({
  'legacy-tool':Object.freeze({slot:'weapon',attack:0,allowedLineages:['sleeper'],label:'Legacy tool'}),
  'legacy-blade':Object.freeze({slot:'weapon',attack:4,allowedLineages:['sleeper'],label:'Ancient blade'}),
  'echo-link':Object.freeze({slot:'weapon',attack:2,speed:1,allowedLineages:['echo'],label:'Echo link'}),
  'foundry-module':Object.freeze({slot:'weapon',attack:9,allowedLineages:['modern'],label:'Foundry module'})
});
