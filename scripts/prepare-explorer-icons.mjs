import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
import {LayoutGrid,UsersRound,Heart,PersonStanding,MessageCircle,Search,Sprout} from 'lucide-react';
const green='#009f43',red='#d20b19',blue='#003c96';
const icons={all:[LayoutGrid,green],common:[UsersRound,green],birth:[Heart,red],conversation:[MessageCircle,blue],research:[Search,blue],growth:[Sprout,green],voice:[PersonStanding,red]};
const h=React.createElement;
const path=(d,color)=>h('path',{d,...(color?{stroke:color}:{})});
function person(kind){
 const color=kind==='baby'?green:kind==='child'?blue:kind==='senior'?blue:green;
 const face=h('circle',{cx:31,cy:14,r:6});
 let shapes;
 if(kind==='baby')shapes=[h('circle',{cx:31,cy:18,r:7}),path('M25 14q2-6 6-3m0 0q5-3 7 3',red),path('M23 31q8-5 16 0l3 12H20z M23 32l-7 9m23-9 7 9 M26 43v12m10-12v12')];
 else if(kind==='child')shapes=[h('rect',{x:37,y:28,width:12,height:19,rx:4,stroke:red}),path('M41 33h5m-5 5h5',red),face,path('M24 26h14l3 19H21z M24 28l-8 15m23-15 6 16 M27 45v13m8-13v13'),path('M24 26v13m12-13v13',red)];
 else if(kind==='senior')shapes=[face,path('M25 12q5-7 12 0 M25 25q9-2 13 6l-4 13H23z M26 28l-8 13m20-10 6 5 M27 44l-2 14m8-14 3 14'),path('M42 36q4-4 6 0v22',red)];
 else shapes=[face,path('M24 26h14l5 18H19z M25 44l-1 14m13-14 1 14 M23 29l-8 13m25-13 6 12'),path('M28 26l3 4 3-4m-3 4-2 10 2 3 2-3z',blue),h('rect',{x:42,y:43,width:12,height:11,rx:1.5,stroke:blue}),path('M45 43v-3h6v3',blue)];
 return h('g',{fill:'none',stroke:color,strokeWidth:2.5,strokeLinecap:'round',strokeLinejoin:'round'},...shapes);
}
await mkdir('public/explore/pictograms',{recursive:true});
for(const [name,[Icon,color]] of Object.entries(icons)){
 const graphic=h('svg',{xmlns:'http://www.w3.org/2000/svg',viewBox:'0 0 64 64',width:64,height:64},h(Icon,{x:9,y:9,width:46,height:46,color,strokeWidth:1.85}));
 await writeFile(`public/explore/pictograms/${name}.svg`,renderToStaticMarkup(graphic));
}
for(const name of ['baby','child','youth','middle','senior'])await writeFile(`public/explore/pictograms/${name}.svg`,renderToStaticMarkup(h('svg',{xmlns:'http://www.w3.org/2000/svg',viewBox:'0 0 64 64',width:64,height:64},person(name))));
await copyFile('node_modules/lucide-react/LICENSE','public/explore/pictograms/LUCIDE-LICENSE');
await writeFile('public/explore/pictograms/SOURCE.txt','Current character assets: six individually generated transparent 2D PNGs from the built-in image_gen tool. See GENERATED-IMAGES.json for filenames and full prompts.\nSVG symbols and legacy fallback figures: locally authored or composed from lucide-react 0.468.x (ISC license). No decorative heart badges.\nPalette sampled from the Yangsan city logo: green #009f43, red #d20b19, blue #003c96.\nAll uses the four-square layout-grid symbol. Common and growth use /images/yangsan-city-logo.png.\nRegenerate SVG symbols only: node scripts/prepare-explorer-icons.mjs (does not overwrite PNG illustrations).\n');
