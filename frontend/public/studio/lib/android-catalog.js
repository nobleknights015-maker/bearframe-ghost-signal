// Reference-inspired wardrobe recipes, independently editable after selection.
export const OUTFITS=['none','bearframe','command','research','explorer','engineer','community','visuals','support','watchtower'];
export const HEADGEAR=['none','crest','goggles','swept'];
const colors=(glow,cloth='#d3d3d5',accent='#b29c71',armor='#d7d5ce')=>({armor,trim:'#3c414b',under:'#141820',glow,cloak:cloth,outfit:cloth,accent,scarf:cloth,hood:cloth,drapery:cloth,leather:'#52483d'});
const recipe=(chassis,outfit,glow,cloth,extra={})=>({chassis,outfit,head:'visor',facePanel:'smooth',fins:false,modules:true,armor:'light',cloak:'none',scarf:'none',hood:'none',drapery:'none',clothWear:0,overgrowth:0,damage:0,pouches:false,harness:false,backpack:false,ring:'none',expression:'calm',headgear:'none',colors:colors(glow,cloth),...extra});
export const CHARACTER_PRESETS={
 'Bearframe — male':recipe('lean-male','bearframe','#51c8e2','#596672'),
 'Bearframe — female':recipe('lean-female','bearframe','#51c8e2','#596672'),
 'Nexus':recipe('lean-male','support','#f293aa','#bb8291',{headgear:'crest',expression:'friendly'}),
 'Founder':recipe('lean-male','command','#56cfe1','#263f50',{armor:'plated',cloak:'long',headgear:'crest',pouches:true,colors:colors('#56cfe1','#263f50','#c8ac70')}),
 'Vera':recipe('lean-female','visuals','#d57df1','#a879af',{headgear:'crest',expression:'focused'}),
 'Sentinel':recipe('broad','watchtower','#f34d49','#4d242d',{headgear:'crest',armor:'heavy',cloak:'long',expression:'focused',colors:colors('#f34d49','#4d242d','#b74c4b','#747b86')}),
 'Penney':recipe('lean-female','community','#f3a6b2','#d8a0a6',{expression:'friendly',colors:colors('#f3a6b2','#d8a0a6','#c3a067','#e1dbcf')}),
 'Vale':recipe('lean-male','research','#659df0','#cbd0da',{headgear:'swept',pouches:true}),
 'Eira':recipe('lean-female','research','#78b8f5','#d7dce0',{headgear:'swept',outfitVariant:'asymmetric',idTag:true}),
 'Mira':recipe('lean-female','explorer','#66ddd1','#2f7377',{headgear:'goggles',scarf:'wrap',backpack:true,pouches:true,expression:'friendly',colors:colors('#66ddd1','#2f7377','#d5a34c')}),
 'Brix':recipe('broad','engineer','#e7a64e','#46484a',{scarf:'cowl',backpack:true,pouches:true,damage:1,colors:colors('#e7a64e','#46484a','#b88b4d','#cec5b7')}),
 'Auren':recipe('lean-male','research','#669fe9','#d1d6df',{headgear:'swept',outfitVariant:'long',idTag:true}),
 'Atlas':recipe('broad','engineer','#efbc61','#82715a',{armor:'heavy',expression:'friendly',outfitVariant:'harness',pouches:true,colors:colors('#efbc61','#82715a','#c29a51','#c6b18c')}),
};
