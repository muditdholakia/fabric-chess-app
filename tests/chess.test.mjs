import test from 'node:test';
import assert from 'node:assert/strict';
import { START_FEN, fromFEN, toFEN, sqIndex, sqName, legalMoves, moveFromUci, makeMove, perft, gameStatus, inCheck, positionKey, sanForMove } from '../src/chess.js';
import { chooseBotMove } from '../src/ai.js';
const play=(s,uci)=>{const m=moveFromUci(s,uci);assert.ok(m,`Expected legal ${uci} in ${toFEN(s)}`);return makeMove(s,m);};

test('starting FEN round-trips, square mapping',()=>{
  assert.equal(toFEN(fromFEN()),START_FEN);
  assert.equal(sqName(sqIndex('a1')),'a1');
  assert.equal(sqName(sqIndex('h8')),'h8');
});
test('opening perft: 20 / 400 / 8902 positions',()=>{
  const s=fromFEN();assert.equal(perft(s,1),20);assert.equal(perft(s,2),400);assert.equal(perft(s,3),8902);
});
test('complex pawn and rook endgame perft: 14 / 191 / 2812',()=>{
  const s=fromFEN('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1');
  assert.equal(perft(s,1),14);assert.equal(perft(s,2),191);assert.equal(perft(s,3),2812);
});
test('fools mate is detected and SAN marks checkmate',()=>{
  let s=fromFEN();for(const u of ['f2f3','e7e5','g2g4'])s=play(s,u);
  const m=moveFromUci(s,'d8h4');assert.equal(sanForMove(s,m,legalMoves(s)),'Qh4#');s=makeMove(s,m);
  assert.deepEqual(gameStatus(s),{over:true,result:'0-1',reason:'Checkmate'});
});
test('en passant only immediately after a pawn double step',()=>{
  let s=fromFEN();for(const u of ['e2e4','a7a6','e4e5','d7d5'])s=play(s,u);
  const m=moveFromUci(s,'e5d6');assert.ok(m?.ep);s=makeMove(s,m);
  assert.equal(s.board[sqIndex('d5')],null);assert.equal(s.board[sqIndex('d6')],'P');
  s=play(s,'g8f6');assert.equal(s.ep,-1);
});
test('both directions of castling move the rook and revoke rights',()=>{
  const fen='r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
  const s=fromFEN(fen);
  assert.ok(moveFromUci(s,'e1g1'));assert.ok(moveFromUci(s,'e1c1'));
  const kingSide=play(s,'e1g1');
  assert.equal(kingSide.board[sqIndex('f1')],'R');assert.equal(kingSide.board[sqIndex('h1')],null);
  assert.equal(kingSide.castling,'kq');
  const queenSide=play(s,'e1c1');
  assert.equal(queenSide.board[sqIndex('d1')],'R');
});
test('castling through attack is forbidden',()=>{
  const s=fromFEN('r3k2r/8/8/8/2b5/8/8/R3K2R w KQkq - 0 1');
  assert.equal(moveFromUci(s,'e1g1'),undefined);
});
test('promotion choices are all available',()=>{
  const s=fromFEN('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
  const promos=legalMoves(s).filter(m=>m.from===sqIndex('a7')&&m.to===sqIndex('a8'));
  assert.equal(promos.length,4);
  const next=play(s,'a7a8n');assert.equal(next.board[sqIndex('a8')],'N');
});
test('a pinned rook cannot expose its king',()=>{
  const s=fromFEN('4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1');
  assert.equal(moveFromUci(s,'e2f2'),undefined);
  assert.ok(moveFromUci(s,'e2e3'));
});
test('stalemate and insufficient material are draws',()=>{
  assert.deepEqual(gameStatus(fromFEN('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')),{over:true,result:'1/2-1/2',reason:'Stalemate'});
  assert.deepEqual(gameStatus(fromFEN('7k/8/8/8/8/8/8/K7 w - - 0 1')),{over:true,result:'1/2-1/2',reason:'Insufficient material'});
});
test('threefold repetition ends in draw',()=>{
  let s=fromFEN();let positions=[positionKey(s)];
  for(const u of ['g1f3','g8f6','f3g1','f6g8','g1f3','g8f6','f3g1','f6g8']){s=play(s,u);positions.push(positionKey(s));}
  assert.deepEqual(gameStatus(s,positions),{over:true,result:'1/2-1/2',reason:'Threefold repetition'});
});
test('Fabric Bot selects a legal move for each level',()=>{
  let s=fromFEN();s=play(s,'e2e4');
  for(const level of ['easy','medium','hard']) {
    const choice=chooseBotMove(s,level);
    assert.ok(legalMoves(s).some(m=>m.from===choice.from && m.to===choice.to && m.promotion===choice.promotion),`Invalid bot ${level}`);
  }
});
