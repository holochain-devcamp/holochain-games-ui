// for agent 1 build :
const INSTANCE_ID = "holochain-checkers-instance";

// for agent 2 build :
// const INSTANCE_ID = "holochain-checkers-instance-two";

//////////////////////////////////////////////////////////////////
              // Holochain API Call Function:
//////////////////////////////////////////////////////////////////
const callHCApi = (zome, funcName, params) => {
  const response = window.holochainclient.connect().then(async({callZome, close}) => {
      return await callZome(INSTANCE_ID, zome, funcName)(params)
  })
  return response;
}
//////////////////////////////////////////////////////////////////

$(document).ready(function(){
///////////////////////////
// Global Vars:
///////////////////////////
const gameMsgs = {
  a: "Game In Process",
  // c: "You Resigned.", // note: currently api for resignation not in place.
  d: "You Won!",
  e: "You Lost.",
  f: "N/A"
}
let whoami = "";
let amAuthor = false;
let presentGame = {};
let gameErrorMessage = "";
let winnerMessage = "";

class Game {
  constructor() {
    this.id = "game_hash",
    this.timestamp = 0,
    this.players = {
      player1: "",
      player2: ""
    };
  }
}

///////////////////////////
// helper function :
//////////////////////////
const rerenderGameState = (agent1state, agent2state) => {
  //diplay tokens for each agent (red and black)
  document.getElementById("player1State").innerHTML = "<div style='color:black'>" + agent1state + "</div>"
  document.getElementById("player2State").innerHTML = "<div style='color:black'>" + agent2state  + "</div>"
}


//////////////////////////////////////////////////////////////////
              // ON Init functions:
//////////////////////////////////////////////////////////////////
// On mount, do the following right away:
(function onMount (){
  callHCApi("main", "whoami", {}).then(agent_hash => {
    author_opponent = JSON.parse(agent_hash).Ok;
    // set global ref to agent ID
    whoami = JSON.parse(agent_hash).Ok;
  })
  .then(() => {
    // Set game status for both players
    rerenderGameState(gameMsgs.f, gameMsgs.f);

    //grab url vars:
    const urlHash = window.location.href;
    const urlParirs = urlHash.split("?")[1].split("&");
    const proposal_addr = urlParirs[0].split("=")[1];
    const game_author = urlParirs[1].split("=")[1];
    const url_timestamp = parseInt(urlParirs[2].split("=")[1]);

    console.log("url_timestamp", url_timestamp);
    console.log("type of url_timestamp", typeof url_timestamp);
    console.log("proposal_addr from url", proposal_addr);
    // set timestamp to be global var (current hack prior to int size issue)
    presentGame = new Game;
    let {timestamp} = presentGame;
    timestamp = url_timestamp;
    presentGame = {...presentGame, timestamp}

    if(whoami === game_author) {
      amAuthor = true;
      console.log("amAuthor : ", amAuthor);
      document.getElementById("agent2").innerHTML = 'Me'
      return checkResponse(proposal_addr)
    }
    else {
      console.log("amAuthor (should be false): ", amAuthor);
      document.getElementById("agent1").innerHTML = "Me"
    }

    callHCApi("main", "check_responses", {proposal_addr}).then((games) => {
      let currentGame = JSON.parse(games);
      // console.log("accepted games array length", currentGame.Ok.length);
      if(!currentGame.Err && currentGame.Ok.length > 0){
        // find the first response to game proposal to which opponent has agreed
        const opponentRejoinGame = currentGame.Ok.find(game => {
          return game.entry.player_1 === whoami
        })

        if(opponentRejoinGame) {
          // set global var reference
          let {players} = presentGame;
          players = {player1: opponentRejoinGame.entry.player_1, player2: opponentRejoinGame.entry.player_2};
          presentGame = {...presentGame, players}

          // redetermine previous game hash
          createGame(opponentRejoinGame);
        }
      }
      else {
          // accept proposal, and if pass validation without errors, proceed to creating the game!
          callHCApi("main", "accept_proposal", {proposal_addr, created_at: presentGame.timestamp}).then((gameHash) => {
            let parsedHash = JSON.parse(gameHash);
            if(!parsedHash.Err){
              console.log("no error, here is proposal_addr", proposal_addr);
              console.log("parsedHash", parsedHash);
              checkResponse(proposal_addr);
            }
            else {
              console.log("Failed to Accept Proposal. Error: ", parsedHash.Err.Internal);

              gameErrorMessage = "\n Hey there! \n \n It looks like you're visiting a game you authored.  Feel free to look around, but you'll need a second player in order to start the game. \n \n Game Rule: " + parsedHash.Err.Internal;
              $('#gameModalLabel').html("Notice");
              $('#gameMessage').html(gameErrorMessage);
              $('#gameModal').modal("show");
          }
        });
      }
    })
  });
})();

// trigger refresh of game state...
(function refreshBoardTimer(){
  setTimeout("location.reload(true);",50000);
})();


////////////////////////////////
// Verify Proposal Function
///////////////////////////////
// verify at least one proposal response exists, choose 1st one (for now), and create game:
checkResponse = (proposal_addr) => {
  callHCApi("main", "check_responses", {proposal_addr}).then((games) => {
    console.log("games", games);
    let currentGame = JSON.parse(games);
    // console.log("accepted games array length", currentGame.Ok.length);
    if(!currentGame.Err && currentGame.Ok.length > 0){
      // Choose first game in array.
      // NOTE : Later iterations can include an ability to choose between different responses to this game proposal, which would lead to diff games.)
      currentGame = currentGame.Ok[0];

      if(currentGame.entry && currentGame.entry.player_1 && currentGame.entry.player_2){
        let {players} = presentGame;
        players = {player1: currentGame.entry.player_1, player2: currentGame.entry.player_2 };
        presentGame = {...presentGame, players}
        createGame(currentGame);
      }
      else {}
    }
    else if (currentGame.Ok.length <= 0) {
      console.log("Error: Two players were not found for this game. Check for errors in network tab.");

      gameErrorMessage = "\n Hey there! \n \n It looks like you're visiting a game you authored.  Feel free to look around, but you'll need a second player in order to start the game."
      $('#gameModalLabel').html("Notice");
      $('#gameMessage').html(gameErrorMessage);
      $('#gameModal').modal("show");
    }
    else {
      console.log("Failed to create game. Error: ", JSON.parse(currentGame.Err.Internal).kind.ValidationFailed);

      gameErrorMessage = "\n Oops... looks like there was an error. Error: "+ JSON.parse(JSON.parse(gameHash).Err.Internal).kind.ValidationFailed;

      $('#gameModalLabel').html("Notice");
      $('#gameMessage').html(gameErrorMessage);
      $('#gameModal').modal("show");
    }
  });
}

///////////////////////////
// Create Game Function
//////////////////////////

const startGame = (myOpponent, ZomeFn) => {
  console.log("presentGame.timestamp", presentGame.timestamp);
  callHCApi("main", ZomeFn, {opponent:myOpponent, timestamp: presentGame.timestamp}).then(gameHash => {
    let parsedGameHash = JSON.parse(gameHash);
    if(!parsedGameHash.Err){
      const game = parsedGameHash.Ok;
      console.log("You are playing the following game : ", game);

      // update global game var
      let {id} = presentGame;
      id = game;
      presentGame = {...presentGame, id}
      console.log("local state record: presentGame", presentGame);

      // set board scene
      boardState(game);
    }
    else{
      console.log("Failed to get game hash. Error: ", JSON.parse(JSON.parse(gameHash).Err.Internal).kind.ValidationFailed);

      gameErrorMessage = "Error: "+ JSON.parse(JSON.parse(gameHash).Err.Internal).kind.ValidationFailed;

      $('#gameModalLabel').html("Notice");
      $('#gameMessage').html(gameErrorMessage);
      $('#gameModal').modal("show");
    }
  });
}


const createGame = (currentGame) => {
  // Update game status for both players :
  rerenderGameState(gameMsgs.a, gameMsgs.a);
  // based on player id, determine the game opponent
  const myOpponent = currentGame.entry.player_1 === whoami ? currentGame.entry.player_2 : currentGame.entry.player_1;
  // based on player id, either create the game hash or retrieve the game hash that game opponent created
  const ZomeFn = currentGame.entry.player_1 === whoami ? "create_game" : "get_game_hash";
  startGame(myOpponent, ZomeFn);
 }

 //////////////////////////////////////////////////////////////////
               // Set/Reset Board State Logic:
 //////////////////////////////////////////////////////////////////
const boardState = (game_address) => {
  callHCApi("main", "get_state", {game_address}).then(state => {
    playerState = JSON.parse(state).Ok;

    // deliver game start instructions
    if(playerState.moves && playerState.moves.length<=0) {
      winnerMessage = 'Welcome. \n \n You will now begin the game of Holochain Simple Checkers.  \n \n To determine which player and color you are, reference the Game Board. This is a simple game of checkers, wherein no Kings exist and skipping pawns is not allowed. \n \n The player who first reaches the opposing side of the board is the winner.  \n \n Player 2 will begin.  \n \n Good luck.'
      $('#gameModalLabel').html("Game Play");
      $('#gameMessage').html(winnerMessage);
      $('#gameModal').modal("show");
    }
    else {
      console.log("game state moves # = ", playerState.moves.length);
    }

    refactorState(playerState);
  })
}
const refactorState = (playerState) => {
  determineWinner();

// NOTE: Currently irrelevant while DNA does not allow for skipping tokens, and thus determining a winner by traditional means.
 //  if (playerState.player_1.winner){
 //    // Update game status for both players
 //    rerenderGameState(gameMsgs.d, gameMsgs.e);
 //  }
 //  else if(playerState.player_2.winner){
 //    // Update game status for both players
 //    rerenderGameState(gameMsgs.e, gameMsgs.d);
 //  }
// NOTE: Currently irrelevant while API doesn't exist for resignation
 // else if(playerState.player_1.resigned){
 //    // Update game status for both players
 //    rerenderGameState(gameMsgs.c, gameMsgs.d);
 //  }
 //  else if(playerState.player_2.resigned){
 //    // Update game status for both players
 //    rerenderGameState(gameMsgs.d, gameMsgs.c);
 //  }

  // set pieces onto board
  p1 = refactorPieces(playerState.player_1.pieces)
  p2 = refactorPieces(playerState.player_2.pieces)
  setBoardP1(p1);
  setBoardP2(p2);
}
const refactorPieces = (pieces) => {
  let refactoredArray=[];
  for(i=0;i<pieces.length;i++){
    refactoredArray.push([pieces[i].x,pieces[i].y])
  }
  return refactoredArray;
}
  // initialize board spaces:
  function setBoardP1(items){
    for(i=0;i<items.length;i++) {
      document.getElementById(items[i][0]+"x"+items[i][1]).innerHTML = `<span class="red-piece"></span>`;
    }
  }
  function setBoardP2(items){
    for(i=0;i<items.length;i++) {
      document.getElementById(items[i][0]+"x"+items[i][1]).innerHTML = `<span class="black-piece"></span>`;
    }
  }

  /////////////////////////////////////////////////////////////////
                // : game movement logic:
  /////////////////////////////////////////////////////////////////
  ///////////////////////////
  // helper functions :
  //////////////////////////
  // helper function to remove highlight class
  function clearPath() {
    for(i=0;i<=7;i++) {
      for(j=0;j<=7; j++) {
        if($(`#${i}x${j}`).hasClass("highlight-path")) {
          $(`#${i}x${j}`).removeClass("highlight-path");
        }
      }
    }
  }

  // helper function to trigger new placement of token
  function initiateMove (x,y){
     newPlacement = {x, y};
     presentGame = {...presentGame, requestedMove:newPlacement }

     // call make_move api
     makeMove();
     // remove hightlight path
     clearPath()
  }

///////////////////////////
// triggered event handler
///////////////////////////
// on clicking any spae on the checker table, determine if the selection is valid, and if
$('#checkerTable tbody').on('click','td',function() {
  console.log("token click attempt : (row, col) : ", $(this).closest("tr").index(), $(this).closest("td").index());
  const y = $(this).closest("tr").index();
  const x = $(this).closest("td").index();
  const tokenId = `${x}x${y}`;

  let tokenSelected;
  if($(`#${tokenId}`)) {
    tokenSelected = `#${tokenId}`;
  }

  if($(tokenSelected).hasClass("highlight-path")){
    initiateMove(x,y)
  }
  else {
    const playerColor = presentGame.players.player1 === whoami? 'red-piece' : 'black-piece';
    if(!$(tokenSelected).find("span").hasClass(playerColor)){
      return null;
    }

    if($(tokenSelected).find("span").hasClass(playerColor) && $('.hightlight-path')){
      // if player selects diff token, remove all spaces with highlight-path classes (in order to create new/correct ones)
      clearPath()
    }

    previousPlacement = {x, y};
    presentGame = {...presentGame, previousMove:previousPlacement }
    hightlightPath(playerColor)
  }
});

// helper fn to determine valid space index nums
validNumbers = (number) => {
  if (number>=0 && number<=7) return true;
  else return false;
}

///////////////////////////
// main move functions
//////////////////////////
// highlight the availble spaces to move token
const hightlightPath = (playerColor) => {
  // console.log("chosen token: playerColor, previousPlacement = ", playerColor, previousPlacement);
  const {x:currentX , y:currentY} = previousPlacement;
  // generate (x,y) pairs to form a hightlighted v-shaped path
  let rightXPath = currentX;
  let leftXPath = currentX;
  let forwardPath = currentY;

// NOTE: Remove the ability to select a path that is beyond one row out >> DNA does *not* allow for skipping right now.
  // for(i=0;i<6;i++){
    rightXPath += 1;
    leftXPath -= 1;

    if(playerColor === 'red-piece') {
      forwardPath += 1
    }
    else {
      forwardPath -= 1
    }

    // set class for css to recognize and highlight path
    if (validNumbers(forwardPath)) {
      if (validNumbers(leftXPath))  {
        $(`#${leftXPath}x${forwardPath}`).addClass("highlight-path");
      }
      if (validNumbers(rightXPath)) {
        $(`#${rightXPath}x${forwardPath}`).addClass("highlight-path");
      }
    }
  // };
}

// note: previousPlacement & newPlacement are in the format: {x:number, y:number}
// call make_move api, change game state, refresh board to reset board
const makeMove = () => {
  const from = presentGame.previousMove;
  const to = presentGame.requestedMove;

  const new_move = {
    game: presentGame.id,
    timestamp: Math.floor(Math.random() * Math.pow(2, 32)),
    move_type: {MovePiece: { from, to }}
  }
  callHCApi("main", "make_move", {new_move}).then(moveHash => {
    const parsedMoveHash = JSON.parse(moveHash);
    if(!parsedMoveHash.Err) {
      console.log("Move made:",parsedMoveHash.Ok);
      document.location.reload(true);
    }
    else {
      console.log("Failed to make move. Error: ", parsedMoveHash.Err);
      alert("Error: "+ JSON.parse(parsedMoveHash.Err.Internal).kind.ValidationFailed);
    }
  });
 }

// Temporary approch to create winner while DNA doesn't allow for token skipping. (hack)
 const determineWinner = () => {
   const player1tokens = playerState.player_1.pieces;
   const player2tokens = playerState.player_2.pieces;

   // player 1 === red token player
   const player1wins = player1tokens.find(piece => piece.y === 7);

   // player 2 === black token player
   const player2wins = player2tokens.find(piece => piece.y === 0);

   if (player1wins) {
     rerenderGameState(gameMsgs.d, gameMsgs.e);
     winnerMessage = "Player 1 won!";
     $('#winnerMessage').html(winnerMessage);
     $('#winnerModal').modal("show");
   }

   if (player2wins) {
     rerenderGameState(gameMsgs.e, gameMsgs.d);
     winnerMessage = "Player 2 won!";
     $('#winnerMessage').html(winnerMessage);
     $('#winnerModal').modal("show");
   }
 }

});
