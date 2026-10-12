// Use the observed periods as-is: months without data are never invented.
export function nextPlaybackPeriod(periods,current,repeat=false){
 if(periods.length<2)return null;
 const index=periods.indexOf(current);
 if(index<0)return periods[0];
 if(index<periods.length-1)return periods[index+1];
 return repeat?periods[0]:null;
}
