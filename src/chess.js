/**
 * Fabric Chess Arena — self-contained chess rules engine.
 * Square indexing: a8=0, h8=7, a1=56, h1=63.
 * No network access, packages, or external services required.
 */
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const FILES = 'abcdefgh';
const KNIGHT = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const DIAG = [[-1,-1],[-1,1],[1,-1],[1,1]];
const ORTHO = [[-1,0],[1,0],[0,-1],[0,1]];
const KING = [...DIAG, ...ORTHO];
export const PIECE_VALUES = {p:100,n:320,b:335,r:500,q:900,k:20000};

export const sqName = i => FILES[i % 8] + (8 - Math.floor(i/8));
export const sqIndex = s => /^[a-h][1-8]$/.test(s) ? (8-Number(s[1]))*8+FILES.indexOf(s[0]) : -1;
export const colorOf = p => !p ? null : p === p.toUpperCase() ? 'w' : 'b';
const other = c => c === 'w' ? 'b' : 'w';
const at = (r,c) => r >= 0 && r < 8 && c >= 0 && c < 8 ? r*8+c : -1;
const moveObj = (from,to,extra={}) => ({from,to,...extra});

export function fromFEN(fen = START_FEN) {
  const [placement,turn,castling,ep,halfmove,fullmove] = fen.trim().split(/\s+/);
  if (!placement || !['w','b'].includes(turn)) throw new Error('Invalid FEN');
  const rows = placement.split('/');
  if (rows.length !== 8) throw new Error('Invalid FEN rows');
  const board = [];
  for (const row of rows) {
    let count = 0;
    for (const c of row) {
      if (/^[1-8]$/.test(c)) { for(let j=0;j<Number(c);j++) board.push(null); count += Number(c); }
      else if (/^[prnbqkPRNBQK]$/.test(c)) {board.push(c); count++;}
      else throw new Error('Invalid FEN piece');
    }
    if (count !== 8) throw new Error('Invalid FEN columns');
  }
  if (board.length !== 64 || board.filter(x=>x==='K').length !== 1 || board.filter(x=>x==='k').length !== 1) throw new Error('Missing king');
  const epIndex = ep === '-' ? -1 : sqIndex(ep);
  if (epIndex < -1) throw new Error('Invalid en passant');
  return {board, turn, castling:castling === '-' ? '' : castling, ep:epIndex, halfmove:Number(halfmove)||0, fullmove:Number(fullmove)||1};
}
export function toFEN(state) {
  const rows = [];
  for(let r=0;r<8;r++) {
    let row='', empty=0;
    for(let c=0;c<8;c++) {
      const p=state.board[r*8+c];
      if (!p) empty++;
      else {if(empty) row+=empty; empty=0;row+=p;}
    }
    if(empty) row+=empty;
    rows.push(row);
  }
  return `${rows.join('/')} ${state.turn} ${state.castling||'-'} ${state.ep < 0 ? '-' : sqName(state.ep)} ${state.halfmove} ${state.fullmove}`;
}

/** Square attacked by a piece of byColor; does not depend on whose turn it is. */
export function isAttacked(b, i, byColor) {
  const row=Math.floor(i/8), col=i%8;
  const pawn = byColor === 'w' ? 'P':'p';
  // White pawn moves up (-1), so an attacking white pawn is one row below.
  const pawnSourceRow = row + (byColor==='w' ? 1 : -1);
  for(const dc of [-1,1]) {const j=at(pawnSourceRow,col+dc);if(j!==-1 && b[j]===pawn) return true;}
  for(const [dr,dc] of KNIGHT) {const j=at(row+dr,col+dc);if(j!==-1 && b[j] === (byColor==='w'?'N':'n')) return true;}
  for(const [dr,dc] of KING) {const j=at(row+dr,col+dc);if(j!==-1 && b[j] === (byColor==='w'?'K':'k')) return true;}
  for(const [dr,dc] of KING) {
    let r=row+dr,c=col+dc;
    while(at(r,c)!==-1) {
      const p=b[at(r,c)];
      if(p) {
        if(colorOf(p)===byColor) {
          const t=p.toLowerCase();
          if(t==='q' || (dr && dc ? t==='b' : t==='r')) return true;
        }
        break;
      }
      r+=dr; c+=dc;
    }
  }
  return false;
}
export function inCheck(s, color=s.turn) {
  const k=s.board.indexOf(color==='w'?'K':'k');
  return k===-1 || isAttacked(s.board,k,other(color));
}

export function pseudoMoves(s) {
  const b=s.board, moves=[], color=s.turn;
  for(let i=0;i<64;i++) {
    const p=b[i];if(!p || colorOf(p)!==color) continue;
    const r=Math.floor(i/8),c=i%8,t=p.toLowerCase();
    const push = (to,more={}) => {if(to<0 || (b[to] && colorOf(b[to])===color) || (b[to] && b[to].toLowerCase()==='k')) return;
      moves.push(moveObj(i,to,more));};
    if(t==='p') {
      const step=color==='w'?-1:1, promoteRow=color==='w'?0:7, startRow=color==='w'?6:1;
      const single=at(r+step,c);
      const pawnPush = (dest,opts={}) => {if(Math.floor(dest/8)===promoteRow) for(const promotion of ['q','r','b','n']) push(dest,{...opts,promotion});else push(dest,opts);};
      if(single!==-1 && !b[single]) {
        pawnPush(single);
        const double=at(r+2*step,c);
        if(r===startRow && !b[double]) push(double,{double:true});
      }
      for(const dc of [-1,1]) {
        const j=at(r+step,c+dc);
        if(j<0) continue;
        if(b[j] && colorOf(b[j])===other(color)) pawnPush(j);
        else if(s.ep===j && !b[j] && b[at(r,c+dc)]===(color==='w'?'p':'P')) push(j,{ep:true});
      }
    } else if(t==='n' || t==='k') {
      for(const [dr,dc] of (t==='n'?KNIGHT:KING)) push(at(r+dr,c+dc));
      if(t==='k' && !inCheck(s,color)) {
        if(color==='w' && i===60) {
          if(s.castling.includes('K') && b[63]==='R' && !b[61] && !b[62] && !isAttacked(b,61,'b') && !isAttacked(b,62,'b')) push(62,{castle:'k'});
          if(s.castling.includes('Q') && b[56]==='R' && !b[59] && !b[58] && !b[57] && !isAttacked(b,59,'b') && !isAttacked(b,58,'b')) push(58,{castle:'q'});
        } else if(color==='b' && i===4) {
          if(s.castling.includes('k') && b[7]==='r' && !b[5] && !b[6] && !isAttacked(b,5,'w') && !isAttacked(b,6,'w')) push(6,{castle:'k'});
          if(s.castling.includes('q') && b[0]==='r' && !b[3] && !b[2] && !b[1] && !isAttacked(b,3,'w') && !isAttacked(b,2,'w')) push(2,{castle:'q'});
        }
      }
    } else {
      const dirs=t==='b'?DIAG:t==='r'?ORTHO:KING;
      for(const [dr,dc] of dirs) {
        let nr=r+dr,nc=c+dc;
        while(at(nr,nc)!==-1) {
          const j=at(nr,nc);
          if(b[j]) {if(colorOf(b[j])!==color) push(j);break;}
          push(j);nr+=dr;nc+=dc;
        }
      }
    }
  }
  return moves;
}

/** Applies an already selected pseudo/legal move without modifying input state. */
export function makeMove(s,m) {
  const b=[...s.board], p=b[m.from], opponent=other(s.turn);
  if(!p || colorOf(p)!==s.turn) throw new Error('Invalid moving piece');
  const captured=m.ep ? b[m.to+(s.turn==='w'?8:-8)] : b[m.to];
  b[m.from]=null;
  b[m.to]=m.promotion ? (s.turn==='w'?m.promotion.toUpperCase():m.promotion.toLowerCase()) : p;
  if(m.ep) b[m.to+(s.turn==='w'?8:-8)]=null;
  if(m.castle) {
    if(m.to===62) {b[61]=b[63];b[63]=null;}
    if(m.to===58) {b[59]=b[56];b[56]=null;}
    if(m.to===6) {b[5]=b[7];b[7]=null;}
    if(m.to===2) {b[3]=b[0];b[0]=null;}
  }
  let rights=s.castling;
  const revoke=(flag)=>{rights=rights.replace(flag,'');};
  if(p==='K') {revoke('K');revoke('Q');}
  if(p==='k') {revoke('k');revoke('q');}
  if(m.from===63||m.to===63) revoke('K');
  if(m.from===56||m.to===56) revoke('Q');
  if(m.from===7||m.to===7) revoke('k');
  if(m.from===0||m.to===0) revoke('q');
  return {board:b,turn:opponent,castling:rights,ep:m.double?(m.from+m.to)/2:-1,halfmove:p.toLowerCase()==='p'||captured?0:s.halfmove+1,fullmove:s.fullmove+(s.turn==='b'?1:0)};
}
export function legalMoves(s) {
  const c=s.turn;
  return pseudoMoves(s).filter(m=>!inCheck(makeMove(s,m),c));
}
export function positionKey(s) {
  // En passant only affects repetition when a side-to-move pawn can capture there.
  let ep = s.ep;
  if(ep!==-1) {
    const r=Math.floor(ep/8)+(s.turn==='w'?1:-1),c=ep%8;
    const pawn=s.turn==='w'?'P':'p';
    if(![-1,1].some(dc=>{const i=at(r,c+dc);return i>=0 && s.board[i]===pawn;})) ep=-1;
  }
  return toFEN({...s,ep}).split(' ').slice(0,4).join(' ');
}
export function insufficientMaterial(s) {
  const pieces = s.board.map((p,i)=>p?{p:p.toLowerCase(),color:colorOf(p),square:i}:null).filter(Boolean).filter(p=>p.p!=='k');
  if(!pieces.length) return true;
  if(pieces.length===1 && ['n','b'].includes(pieces[0].p)) return true;
  if(pieces.length===2 && pieces.every(p=>p.p==='b')) {
    // Each side can have one bishop, only same square color is automatically dead.
    return pieces[0].color!==pieces[1].color && pieces.every(p=>((Math.floor(p.square/8)+p.square%8)%2)===((Math.floor(pieces[0].square/8)+pieces[0].square%8)%2));
  }
  return false;
}
export function gameStatus(s, keys=[]) {
  const legal=legalMoves(s);
  if(!legal.length) return inCheck(s)?{over:true,result:s.turn==='w'?'0-1':'1-0',reason:'Checkmate'}:{over:true,result:'1/2-1/2',reason:'Stalemate'};
  if(s.halfmove>=100) return {over:true,result:'1/2-1/2',reason:'50-move rule'};
  if(insufficientMaterial(s)) return {over:true,result:'1/2-1/2',reason:'Insufficient material'};
  if(keys.filter(k=>k===positionKey(s)).length>=3) return {over:true,result:'1/2-1/2',reason:'Threefold repetition'};
  return {over:false,result:'*',reason:inCheck(s)?'Check':s.turn==='w'?'White to move':'Black to move'};
}
export function sanForMove(s,m,legalBefore) {
  const piece=s.board[m.from], p=piece.toLowerCase(), cap=!!(s.board[m.to]||m.ep);
  let san='';
  if(m.castle) san=m.castle==='k'?'O-O':'O-O-O';
  else {
    if(p!=='p') {
      san+=p.toUpperCase();
      const others=legalBefore.filter(x=>x!==m && x.from!==m.from && x.to===m.to && s.board[x.from]?.toLowerCase()===p);
      if(others.length) {
        const sameFile=others.some(x=>x.from%8===m.from%8);
        const sameRank=others.some(x=>Math.floor(x.from/8)===Math.floor(m.from/8));
        san+=!sameFile?FILES[m.from%8]:!sameRank?String(8-Math.floor(m.from/8)):sqName(m.from);
      }
    } else if(cap) san+=FILES[m.from%8];
    san+=(cap?'x':'')+sqName(m.to)+(m.promotion?'='+m.promotion.toUpperCase():'');
  }
  const next=makeMove(s,m);
  if(inCheck(next)) san+=legalMoves(next).length?'+' : '#';
  return san;
}
export function moveFromUci(s,uci) {
  const from=sqIndex(uci.slice(0,2)), to=sqIndex(uci.slice(2,4)), promotion=uci[4];
  return legalMoves(s).find(m=>m.from===from && m.to===to && (m.promotion||'')===(promotion||''));
}
export function perft(s,depth) {
  if(depth===0) return 1;
  let n=0;
  for(const m of legalMoves(s)) n+=perft(makeMove(s,m),depth-1);
  return n;
}
