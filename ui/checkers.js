const WS_PORT = "ws://localhost:3001";
const INSTANCE_ID = "holochain-checkers-instance";

const callHCApi = (zome, funcName, params) => {
  const response = window.holochainclient.connect(WS_PORT).then(async({callZome, close}) => {
      return await callZome(INSTANCE_ID, zome, funcName)(params)
  })
  return response;
}

$(document).ready(function(){
////////
const gameMsgs = {
  one: "Your turn",
  two: "Await Player 1",
  three: "Await Player 2",
  four: "You Won!",
  five: "You Lost."
}

class Game {
  constructor() {
    this.id = "game_hash",
    this.timestamp= 0,
    this.name = "",
    this.players = {
      player1: "",
      player2: ""
    };
  }
}

let whoami = "";
let currentGame = {};
let player1State = gameMsgs.one;
let player2State = gameMsgs.two;
////////

(function onMount() {
  // on mount, do the following right away:
  callHCApi("main", "whoami", {}).then(agent_hash => {
    author_opponent = JSON.parse(agent_hash).Ok;
    // set global ref to agent ID
    whoami = JSON.parse(agent_hash).Ok;
  })
  .then(() => {
    const timestamp = 0; // timestamp as number
    const urlHash = this.window.location.href;
    const proposal_addr = urlHash.split("?")[1].split("=")[1];
    console.log("proposal_addr : ", proposal_addr);

    callHCApi("main", "accept_proposal", {proposal_addr, created_at: timestamp}).then((gameHash) => {
      let parsedHash = JSON.parse(gameHash);
      if(!parsedHash.Err){
        callHCApi("main", "check_responses", {proposal_addr:parsedHash.Ok}).then((game) => {
          let currentGame = JSON.parse(game).Ok;
          console.log("current game", currentGame);

          if(currentGame.entry && currentGame.entry.player_1 && currentGame.entry.player_2){
            console.log("two players exist.. moving to game board... (player: 1, 2) >>", currentGame.entry.player_1, currentGame.entry.player_2 );
            currentGame = new Game;
            let {players, id} = currentGame;
            players = {...players, player1: chosenGame.entry.player_1, player2: chosenGame.entry.player_2 };
            id = gameHash;
            currentGame = {...currentGame, players, id}
            console.log("currentGame", currentGame);

            createGame();
          }
          else {
            console.log("Notice: Two players don't exist for this game.");
              alert("Notice: Two players don't exist for this game.");
          }
        });
      }
      else{
          console.log("Failed to Accept Proposal");
          alert("Error:"+ JSON.parse(JSON.parse(gameHash).Err.Internal).kind.ValidationFailed)
      }
    })
  });
})();

// on mount fetch game info
const createGame = () => {
// supply game board with agent icons
  // agent 1
  document.getElementById("player2Icon").setAttribute('data-jdenticon-value', currentGame.players.player1);
  // agent 2
  document.getElementById("player2Icon").setAttribute('data-jdenticon-value', currentGame.players.player2);

  // game status for both players
  document.getElementById("player1State").innerHTML("<div>" + player1State + "</div>")
  document.getElementById("player2State").innerHTML("<div>" + player2State  + "</div>")

  callHCApi("main", "create_game", {opponent:newGame.player.player2, timestamp:0}).then(gameHash => {
     const game = JSON.parse(gameHash).Ok;
     console.log("Current came", game);
     console.log("Following game has started: ", currentGame);

     setBoard();
   });
 }

  // initialize board spaces:
  function setBoard(){
    const items = [
      [0, 0],
      [0, 2],
      [1, 1],
      [2, 0],
      [2, 2],
      [3, 1],
      [4, 0],
      [4, 2],
      [5, 1],
      [6, 0],
      [6, 2],
      [7, 1],
    ];
    for(i=0;i<items.length;i++) {
      // console.log("i:",i)
      // console.log("items0: ",items[i][0]);
      // console.log("items1: ",items[i][1]);
      document.getElementById(items[i][0]+"x"+items[i][1]).innerHTML = `<span class="red-piece"></span>`;
      // document.getElementById(items[i][0]+"x"+items[i][1]).innerHTML = `<span class="black-piece"></span>`;
    }
  }

  // $('#checkerTable').on('click','td',function() {
  //   onMount();
  //   setBoard();
  // });

/////////////////////////////
// game movement logic:
  // $('#checkerTable tbody').on('click','td',function() {
  //     console.log("click")
  //     alert('Row ' + $(this).closest("tr").index());
  //     alert('Column ' + $(this).closest("td").index());
  // });

///////
}); // end of file
