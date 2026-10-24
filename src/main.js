import { START_FEN, fromFEN, toFEN, sqName, legalMoves, makeMove, colorOf, inCheck, gameStatus, positionKey, sanForMove } from './chess.js';
import { chooseBotMove } from './ai.js';

const PIECES={K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
const PIECE_NAMES={k:'king',q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn'};
const INITIAL={mode:'ai',difficulty:'medium',orientation:'w',sound:true,positions:[START_FEN],moves:[],manualOutcome:null,recorded:false,startedAt:Date.now()};
const STORAGE='fabric-chess-arena-game-v1', STATS='fabric-chess-arena-stats-v1';
const $=id=>document.getElementById(id);
let game=load(), position=fromFEN(game.positions.at(-1)), selected=null,pendingPromotion=null, thinking=false, botTimer=null, gameToken=0;
let stats=loadStats(), toastTimer=null;

function load() {
  try {
    const parsed=JSON.parse(localStorage.getItem(STORAGE));
    if(parsed && ['ai','local'].includes(parsed.mode) && ['easy','medium','hard'].includes(parsed.difficulty) && ['w','b'].includes(parsed.orientation) && Array.isArray(parsed.positions) && parsed.positions.length>0 && Array.isArray(parsed.moves) && parsed.positions.length===parsed.moves.length+1) {
      parsed.positions.forEach(fromFEN);return {...INITIAL,...parsed};
    }
  } catch(e) {console.warn('Unable to recover prior game',e);}
  return {...INITIAL,positions:[START_FEN],moves:[]};
}
function loadStats(){try{const s=JSON.parse(localStorage.getItem(STATS));return {played:Math.max(0,Number(s.played)||0),wins:Math.max(0,Number(s.wins)||0),losses:Math.max(0,Number(s.losses)||0),draws:Math.max(0,Number(s.draws)||0)};}catch{return {played:0,wins:0,losses:0,draws:0};}}
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(game));}catch(e){console.warn('Save not available',e);}}
function saveStats(){try{localStorage.setItem(STATS,JSON.stringify(stats));}catch(e){console.warn('Stats save not available',e);}}
function keys(){return game.positions.map(fen=>positionKey(fromFEN(fen)));}
function status(){return game.manualOutcome || gameStatus(position,keys());}
function cancelBot(){gameToken++;clearTimeout(botTimer);botTimer=null;thinking=false;}
function commitResult(s) {
  if(!s.over || game.recorded)return;
  game.recorded=true;
  if(game.mode==='ai') {
    stats.played++;
    if(s.result==='1-0')stats.wins++;
    else if(s.result==='0-1')stats.losses++;
    else stats.draws++;
  }
  saveStats();save();
}
function toast(text){const el=$('toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);}
function beep(capture=false){if(!game.sound)return;try{const ac=new (window.AudioContext||window.webkitAudioContext)(),o=ac.createOscillator(),gain=ac.createGain();o.connect(gain);gain.connect(ac.destination);o.type='sine';o.frequency.setValueAtTime(capture?450:600,ac.currentTime);o.frequency.exponentialRampToValueAtTime(capture?250:400,ac.currentTime+.095);gain.gain.setValueAtTime(.055,ac.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.11);o.start();o.stop(ac.currentTime+.12);o.onended=()=>ac.close();}catch{}}
function render(){
  const s=status();commitResult(s);
  $('stat-total').textContent=stats.played;$('stat-wins').textContent=stats.wins;$('stat-rate').textContent=stats.played?Math.round(100*stats.wins/stats.played)+'%':'0%';
  $('badge-status').textContent= s.over?'Game over':thinking?'Bot thinking':s.reason==='Check'?'In check':'Playing';
  $('meta-type').textContent=game.mode==='ai'?'Vs. Fabric Bot':'Local 2-player';
  document.querySelectorAll('[data-mode]').forEach(el=>el.classList.toggle('selected',el.dataset.mode===game.mode));
  $('difficulty').value=game.difficulty;$('difficulty').disabled=game.mode!=='ai';
  const isFlipped=game.orientation==='b', whiteBottom=!isFlipped;
  const topColor=whiteBottom?'b':'w', bottomColor=whiteBottom?'w':'b';
  const who=(color)=>game.mode==='local'?(color==='w'?'Player 1':'Player 2'):(color==='w'?'You':'Fabric Bot');
  const secondary=(color)=>color==='w'?'White pieces':'Black pieces';
  $('top-name').textContent=who(topColor);$('bottom-name').textContent=who(bottomColor);
  $('top-tag').textContent=(game.mode==='ai' && topColor==='b')?`Your opponent · ${game.difficulty[0].toUpperCase()+game.difficulty.slice(1)}`:secondary(topColor);
  $('bottom-tag').textContent=(game.mode==='ai' && bottomColor==='b')?`Your opponent · ${game.difficulty[0].toUpperCase()+game.difficulty.slice(1)}`:secondary(bottomColor)+(position.turn===bottomColor && !s.over?' · Your move':'');
  $('top-avatar').textContent=topColor==='b'?(game.mode==='ai'?'✦':'2'):'1';
  $('bottom-avatar').textContent=bottomColor==='b'?(game.mode==='ai'?'✦':'2'):'1';
  $('top-turn').textContent=topColor==='w'?'WHITE':'BLACK';$('bottom-turn').textContent=bottomColor==='w'?'WHITE':'BLACK';
  $('top-turn').classList.toggle('active-turn',!s.over && position.turn===topColor);
  $('bottom-turn').classList.toggle('active-turn',!s.over && position.turn===bottomColor);
  $('btn-undo').disabled=!game.moves.length||thinking;
  $('btn-resign').disabled=s.over||thinking;
  $('btn-sound').innerHTML=`<span>♫</span> Sound ${game.sound?'on':'off'}`;
  $('btn-sound').setAttribute('aria-pressed',String(game.sound));
  renderBoard(s);renderMoves();renderHint(s);
}
function renderBoard(s){
  const board=$('chess-board'),isFlipped=game.orientation==='b';board.replaceChildren();
  const legal=selected===null?[]:legalMoves(position).filter(m=>m.from===selected);
  const last=game.moves.at(-1);
  const checkSquare=inCheck(position)?position.board.findIndex(p=>p===(position.turn==='w'?'K':'k')):-1;
  for(let visualRow=0;visualRow<8;visualRow++)for(let visualCol=0;visualCol<8;visualCol++){
    const row=isFlipped?7-visualRow:visualRow,col=isFlipped?7-visualCol:visualCol,i=row*8+col;
    const p=position.board[i],isLight=(row+col)%2===0;
    const b=document.createElement('button');b.type='button';b.className='square '+(isLight?'light':'dark');b.dataset.square=String(i);
    const isLegal=legal.some(m=>m.to===i);
    if(last&&(last.from===i||last.to===i))b.classList.add('last-move');
    if(selected===i)b.classList.add('selected-square');
    if(checkSquare===i)b.classList.add('check-square');
    if(isLegal)b.classList.add(p?'can-capture':'legal-square');
    b.setAttribute('aria-label',sqName(i)+(p?', '+(colorOf(p)==='w'?'white ':'black ')+PIECE_NAMES[p.toLowerCase()]:' empty')+(isLegal?', legal destination':''));
    b.setAttribute('role','gridcell');
    if(p){const span=document.createElement('span');span.className='piece '+(colorOf(p)==='w'?'white-piece':'black-piece');span.textContent=PIECES[p];span.setAttribute('aria-hidden','true');b.append(span);}
    if(visualCol===0){const rank=document.createElement('span');rank.className='rank-label';rank.textContent=8-row;b.append(rank);}
    if(visualRow===7){const file=document.createElement('span');file.className='file-label';file.textContent='abcdefgh'[col];b.append(file);}
    b.addEventListener('click',()=>squareClick(i));board.append(b);
  }
}
function renderMoves(){
  $('moves-count').textContent=`${game.moves.length} ${game.moves.length===1?'move':'moves'}`;
  $('move-counter').textContent=`Move ${position.fullmove}`;
  const el=$('moves-list');el.replaceChildren();
  if(!game.moves.length){el.innerHTML='<div class="moves-empty"><div>♙</div><strong>It\'s your opening move</strong><small>Every great game starts with one.</small></div>';return;}
  for(let i=0;i<game.moves.length;i+=2){
    const row=document.createElement('div');row.className='notation-row';
    const index=document.createElement('span');index.className='notation-number';index.textContent=`${Math.floor(i/2)+1}.`;
    row.append(index);
    for(const record of [game.moves[i],game.moves[i+1]]){
      const item=document.createElement('span');item.className='notation-move'+(record===game.moves.at(-1)?' latest':'');item.textContent=record?.san||'···';row.append(item);
    }
    el.append(row);
  }
  el.scrollTop=el.scrollHeight;
}
const TIPS=[['A little tip','Control the center of the board and develop your pieces early.'],['Protect your king','Castle early to improve king safety and connect your rooks.'],['Think one move ahead','Before moving, check whether your opponent has a capture or a check.'],['Piece coordination','Knights and bishops work best when they support one another.'],['Space is power','A pawn in the center often gives your pieces more room to breathe.']];
function renderHint(s){let head,body;
  if(s.over){head=s.reason;body=s.result==='1/2-1/2'?'An even contest. Fancy a rematch?':s.result==='1-0'?'White takes the victory. Beautifully played!':'Black takes the victory. Another round?';}
  else if(s.reason==='Check'){head='Your king is in check';body='You must move out of check, capture the attacker, or block the attack.';}
  else [head,body]=TIPS[Math.floor(game.moves.length/5)%TIPS.length];
  $('hint-title').textContent=head;$('hint-body').textContent=body;
}
function squareClick(i){
  if(thinking||status().over||pendingPromotion)return;
  if(game.mode==='ai' && position.turn==='b')return;
  const piece=position.board[i],own=piece && colorOf(piece)===position.turn;
  if(selected!==null){
    if(i===selected){selected=null;render();return;}
    const matching=legalMoves(position).filter(m=>m.from===selected&&m.to===i);
    if(matching.length){
      if(matching.some(m=>m.promotion)) {pendingPromotion=matching;showPromotion();return;}
      executeMove(matching[0]);return;
    }
  }
  selected=own?i:null;render();
}
function executeMove(move){
  const before=position, legal=legalMoves(before), chosen=legal.find(m=>m.from===move.from&&m.to===move.to&&(m.promotion||'')===(move.promotion||''));
  if(!chosen)return;
  const san=sanForMove(before,chosen,legal);
  const captured=chosen.ep?before.board[chosen.to+(before.turn==='w'?8:-8)]:before.board[chosen.to];
  position=makeMove(before,chosen);
  game.moves.push({from:chosen.from,to:chosen.to,promotion:chosen.promotion||'',san,uci:sqName(chosen.from)+sqName(chosen.to)+(chosen.promotion||''),captured:captured||null});
  game.positions.push(toFEN(position));game.manualOutcome=null;game.recorded=false;
  selected=null;pendingPromotion=null;hideDialog();beep(!!captured);save();render();
  const s=status();if(s.over){showResult(s);return;}
  if(game.mode==='ai' && position.turn==='b')queueBot();
}
function queueBot(){
  if(status().over||thinking)return;thinking=true;const token=++gameToken;render();
  botTimer=setTimeout(()=>{
    if(token!==gameToken)return;
    try{const m=chooseBotMove(position,game.difficulty);thinking=false;if(m)executeMove(m);else render();}
    catch(e){thinking=false;console.error(e);toast('Bot ran into an issue. Try undoing the move.');render();}
  },320);
}
function resetGame(){cancelBot();selected=null;pendingPromotion=null;hideDialog();game={...game,positions:[START_FEN],moves:[],manualOutcome:null,recorded:false,startedAt:Date.now()};position=fromFEN();save();render();toast('New game started. White moves first!');}
function undo(){if(!game.moves.length||thinking)return;cancelBot();const num=game.mode==='ai' && game.moves.length>=2 && position.turn==='w'?2:1;
  game.moves.splice(-num);game.positions.splice(-num);position=fromFEN(game.positions.at(-1));game.manualOutcome=null;selected=null;pendingPromotion=null;
  // Completed matches already counted stay in lifetime statistics.
  game.recorded=false;save();render();toast(num===2?'Last turn undone':'Move undone');
}
function showDialog({eyebrow='FABRIC CHESS ARENA',title,desc,content,actions=[]}){
  $('dialog-eyebrow').textContent=eyebrow;$('dialog-title').textContent=title;$('dialog-desc').textContent=desc;
  $('dialog-content').replaceChildren();if(content)$('dialog-content').append(content);
  $('dialog-actions').replaceChildren();
  for(const a of actions){const b=document.createElement('button');b.type='button';b.className=a.primary?'primary-btn':'secondary-btn';b.textContent=a.text;b.addEventListener('click',a.onClick);$('dialog-actions').append(b);}
  $('overlay').classList.remove('hidden');$('dialog-close').focus();
}
function hideDialog(){if(pendingPromotion)return;$('overlay').classList.add('hidden');}
function showPromotion(){
  const content=document.createElement('div');content.className='promotion-choices';
  const color=position.turn;
  for(const type of ['q','r','b','n']){const b=document.createElement('button');b.type='button';b.className='promotion-choice';b.innerHTML=`<span>${PIECES[color==='w'?type.toUpperCase():type]}</span><small>${PIECE_NAMES[type]}</small>`;b.addEventListener('click',()=>{const m=pendingPromotion?.find(x=>x.promotion===type);pendingPromotion=null;if(m)executeMove(m);});content.append(b);}
  showDialog({eyebrow:'PAWN PROMOTION',title:'Choose your piece',desc:'Your pawn reached the last rank. What should it become?',content});
  $('dialog-close').style.display='none';
}
function showResult(s){$('dialog-close').style.display='block';let title=s.result==='1/2-1/2'?"It's a draw!":s.result==='1-0'?'White wins!':'Black wins!';showDialog({eyebrow:'MATCH COMPLETE',title,desc:`${s.reason} · ${s.result}. Ready to challenge yourself again?`,actions:[{text:'Close',onClick:hideDialog},{text:'Play again →',primary:true,onClick:resetGame}]});}
function offerResign(){if(status().over||thinking)return;showDialog({eyebrow:'END MATCH',title:'Resign this game?',desc:'The other player will win this match. This can’t be undone.',actions:[{text:'Keep playing',onClick:hideDialog},{text:'Confirm resignation',primary:true,onClick:()=>{cancelBot();game.manualOutcome={over:true,result:position.turn==='w'?'0-1':'1-0',reason:'Resignation'};save();render();showResult(status());}}]});}
function showGuide(){if(pendingPromotion)return;$('dialog-close').style.display='block';const c=document.createElement('div');c.className='guide-copy';c.innerHTML='<p><strong>Move pieces:</strong> Tap or click a piece, then choose a highlighted square. Captures have a visible ring.</p><p><strong>Rules:</strong> Check, checkmate, castling, en passant, promotion, stalemate, repetition, and the 50-move rule are enforced.</p><p><strong>Game modes:</strong> Face Fabric Bot on three difficulty levels, or choose 2 Players to take turns on the same device.</p><p><strong>Your games:</strong> Progress is saved in this browser. Use Copy FEN or Export PGN to share the position or entire game.</p>';showDialog({title:'How to play',desc:'Chess made simple, one brilliant move at a time.',content:c,actions:[{text:'Let\'s play →',primary:true,onClick:hideDialog}]});}
function pgnText(){const s=status();const d=new Date(game.startedAt);const date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('.');
  const headers=[['Event','Fabric Chess Arena'],['Site','Microsoft Fabric App'],['Date',date],['White',game.mode==='ai'?'You':'Player 1'],['Black',game.mode==='ai'?'Fabric Bot':'Player 2'],['Result',s.result]];
  const movetext=game.moves.map((m,i)=>(i%2===0?`${Math.floor(i/2)+1}. `:'')+m.san).join(' ')+' '+s.result;
  return headers.map(([k,v])=>`[${k} "${v}"]`).join('\n')+'\n\n'+movetext.trim()+'\n';
}
async function copyText(text,success){try{await navigator.clipboard.writeText(text);toast(success);}catch{const area=document.createElement('textarea');area.value=text;document.body.append(area);area.select();try{document.execCommand('copy');toast(success);}catch{toast('Unable to copy. Try downloading PGN instead.');}area.remove();}}
function downloadPGN(){const b=new Blob([pgnText()],{type:'application/x-chess-pgn'});const url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;a.download=`fabric-chess-${new Date().toISOString().slice(0,10)}.pgn`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('PGN exported');}
function init(){
  $('hero-new').addEventListener('click',resetGame);$('setup-new').addEventListener('click',resetGame);
  $('sidebar-guide').addEventListener('click',showGuide);
  document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{if(game.mode!==b.dataset.mode){game.mode=b.dataset.mode;resetGame();}}));
  $('difficulty').addEventListener('change',e=>{game.difficulty=e.target.value;resetGame();});
  $('btn-undo').addEventListener('click',undo);
  $('btn-resign').addEventListener('click',offerResign);
  $('btn-flip').addEventListener('click',()=>{game.orientation=game.orientation==='w'?'b':'w';save();render();});
  $('btn-fen').addEventListener('click',()=>copyText(toFEN(position),'FEN copied to clipboard'));
  $('btn-sound').addEventListener('click',()=>{game.sound=!game.sound;save();render();});
  $('btn-pgn').addEventListener('click',downloadPGN);
  $('dialog-close').addEventListener('click',hideDialog);
  $('overlay').addEventListener('click',e=>{if(e.target===$('overlay'))hideDialog();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!pendingPromotion)hideDialog();selected=null;render();}});
  render();if(game.mode==='ai'&&position.turn==='b'&&!status().over)queueBot();
}
init();
