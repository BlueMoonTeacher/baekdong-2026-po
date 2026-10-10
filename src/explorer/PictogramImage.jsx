import React from 'react';
const characters={birth:'pregnancy-2d',baby:'young-child-2d',child:'student-2d',youth:'worker-2d',middle:'middle-aged-2d',senior:'senior-2d'};
export default function PictogramImage({name,className=''}){
 const character=characters[name],src=['common','growth'].includes(name)?'/images/yangsan-city-logo.png':character?`/explore/pictograms/${character}.png`:`/explore/pictograms/${name}.svg`;
 return <img className={`theme-pictogram ${character?'character-pictogram':''} ${className}`} src={src} width="64" height="64" alt="" aria-hidden="true"/>;
}
