export function createRedBox(random = Math.random) {
  let boxes=[],refreshAt=0,nextId=0;
  function pickParts() {
    let choices=[];
    for(const box of boxes) {
      if(!choices.length) choices=[0,1,2,3];
      const eligible=choices.filter(part=>part!==box.part);
      const pool=eligible.length?eligible:choices;
      box.part=pool[Math.floor(random()*pool.length)];
      choices.splice(choices.indexOf(box.part),1);
    }
  }
  function reset(now=0) { boxes=[{id:nextId++,x:.5,y:.5,part:-1}];pickParts();refreshAt=now+4000; }
  function add(now) {
    const size=8/Math.sqrt(boxes.length+1);
    let best,leastOverlap=Infinity;
    for(let attempt=0;attempt<20;attempt++) {
      const candidate={id:nextId,x:random(),y:random(),part:-1};
      const x=candidate.x*(24-size),y=candidate.y*(12-size);
      const overlap=boxes.reduce((sum,box)=>{
        const bx=box.x*(24-size),by=box.y*(12-size);
        return sum+Math.max(0,Math.min(x+size,bx+size)-Math.max(x,bx))*Math.max(0,Math.min(y+size,by+size)-Math.max(y,by));
      },0);
      if(overlap<leastOverlap){best=candidate;leastOverlap=overlap;}
      if(!overlap)break;
    }
    nextId++;boxes.push(best);pickParts();refreshAt=now+4000;
  }
  function remove(now) {
    if(!boxes.length)return null;
    const [removed]=boxes.splice(Math.floor(random()*boxes.length),1);
    pickParts();refreshAt=now+4000;
    return removed.id;
  }
  function get(now) {
    if(now>=refreshAt){pickParts();refreshAt=now+4000;}
    if(!boxes.length)return [];
    const size=8/Math.sqrt(boxes.length);
    return boxes.map(box=>({id:box.id,x:box.x*(24-size),y:box.y*(12-size),size,part:box.part}));
  }
  reset();return {reset,add,remove,get};
}