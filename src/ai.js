import { legalMoves, makeMove, inCheck, PIECE_VALUES } from './chess.js';
const isBlack = piece => piece === piece.toLowerCase();
function evaluate(s) {
  let score=0;
  for(let i=0;i<64;i++) {
    const piece=s.board[i];if(!piece)continue;
    const t=piece.toLowerCase();
    const row=Math.floor(i/8),col=i%8;
    const dist=Math.abs(3.5-row)+Math.abs(3.5-col);
    const central=(7-dist)* (t==='p'?2:t==='n'?5:t==='b'?2:1);
    const advancement=t==='p'? (isBlack(piece)?row-1:6-row)*3:0;
    score+=(isBlack(piece)?1:-1)*(PIECE_VALUES[t]+central+advancement);
  }
  return score;
}
function ordering(s,m) {
  const victim=s.board[m.to];
  const attacker=s.board[m.from]?.toLowerCase();
  return (victim?10*PIECE_VALUES[victim.toLowerCase()]-PIECE_VALUES[attacker]:0)+(m.promotion?PIECE_VALUES[m.promotion]:0)+(m.castle?25:0);
}
function search(s,depth,alpha,beta,ply) {
  const moves=legalMoves(s);
  if(!moves.length) return inCheck(s)? (s.turn==='b'?-100000+ply:100000-ply):0;
  if(depth===0) return evaluate(s);
  moves.sort((a,b)=>ordering(s,b)-ordering(s,a));
  if(s.turn==='b') {
    let best=-Infinity;
    for(const m of moves) {best=Math.max(best,search(makeMove(s,m),depth-1,alpha,beta,ply+1));alpha=Math.max(alpha,best);if(beta<=alpha)break;}
    return best;
  }
  let best=Infinity;
  for(const m of moves) {best=Math.min(best,search(makeMove(s,m),depth-1,alpha,beta,ply+1));beta=Math.min(beta,best);if(beta<=alpha)break;}
  return best;
}
/** Simple deterministic alpha-beta engine. Fabric Bot plays Black. */
export function chooseBotMove(s, difficulty='medium') {
  const depth=difficulty==='hard'?3:difficulty==='medium'?2:1;
  const moves=legalMoves(s);
  if(!moves.length)return null;
  const ranked=moves.map(m=>({m,score:ordering(s,m)})).sort((a,b)=>b.score-a.score);
  let alpha=-Infinity,beta=Infinity;
  for(const item of ranked) {
    item.score=search(makeMove(s,item.m),depth-1,alpha,beta,1);
    alpha=Math.max(alpha,item.score);
  }
  ranked.sort((a,b)=>b.score-a.score);
  if(difficulty==='easy') return ranked[Math.floor(Math.random()*Math.min(3,ranked.length))].m;
  return ranked[0].m;
}
