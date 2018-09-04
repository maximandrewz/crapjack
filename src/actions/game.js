import {
    GAME_CLEAR,
    GAME_SET_DECK,
    GAME_DRAW_PLAYER,
    GAME_DRAW_DEALER,
    GAME_SET_PROGRESS,
    GAME_SET_SCORE
  } from '../constants';

export function drawPlayer() {
  return dispatch => {
    dispatch({
      type: GAME_SET_PROGRESS,
      payload: true
    });
    dispatch({
      type: GAME_CLEAR,
      payload: {
        deck: {},
        player: [],
        dealer: []
      }
    });
    makeDraw(GAME_DRAW_PLAYER, dispatch)
      .then(() => {
        dispatch({
          type: GAME_SET_PROGRESS,
          payload: false
        });
      });
  }
}

export function drawDealer() {
  return (dispatch, getState) => {
    let game = getState().game;
    dispatch({
      type: GAME_SET_PROGRESS,
      payload: true
    });

    makeDraw(GAME_DRAW_DEALER, dispatch, game)
      .then(() => {
        let latestGame = getState().game;
        let pScore = scorePlayer(latestGame.cards.player);
        let dScore = scorePlayer(latestGame.cards.dealer);

        let isDraw = pScore === dScore || (pScore > 21 && dScore > 21);

        dispatch({
          type: GAME_SET_SCORE,
          payload: isDraw ? 'draw' : ((pScore > dScore && pScore < 22) || dScore > 21 ? 'player':'dealer')
        });

        dispatch({
          type: GAME_SET_PROGRESS,
          payload: false
        });
      });
  }
}

function makeDraw(type, dispatch, game) {
  return fetch('https://deckofcardsapi.com/api/deck/' + (type === GAME_DRAW_PLAYER ? 'new':game.deck.deck_id) + '/draw/?count=3', {
    method: 'GET',
    redirect: 'follow',
    mode: 'cors',
    headers: new Headers({
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': '*/*'
    })
  })
  .then(response => response.json())
  .then(processResponse.bind(null, type, dispatch))
  .catch(() => {
    console.log('Check your Internet connection!');
  });
}

function processResponse(type, dispatch, res) {
  return new Promise(resolve => {
    dispatch({
      type: GAME_SET_DECK,
      payload: { ...res, cards: null }
    });

    let images = [];

    res.cards.forEach(card => {
      images.push(loadImage(card.images.svg));
    });

    Promise.all(images).then(() => {
      setTimeout(drawByOneCard.bind(null, type, res.cards, dispatch, resolve), 1000);
    });
  });
}

export function loadImage(image) {
  return new Promise(resolve => {
    var img = new Image();
    img.addEventListener('load', () =>  {
      resolve();
    }, false);
    img.src = image;
  });
}

function drawByOneCard(type, cards, dispatch, resolve) {
  if (!Array.isArray(cards) || cards.length === 0) {
    resolve();
    return;
  }

  let card = cards.shift();
  dispatch({
    type: type,
    payload: card
  });

  setTimeout(drawByOneCard.bind(null, type, cards, dispatch, resolve), 1000);
}

export function scorePlayer(cards) {
  let sum = 0;
  cards.forEach(card => {
    sum += scoreCard(card.value);
  });

  return sum;
}

export function scoreCard(str) {
  return str.match(/^\d+$/) ? parseInt(str, 10):10;
}
