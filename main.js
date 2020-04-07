'use strict';
console.log('Encendiendo BOT');
///////////DEPENDENCIAS
//twit
const Twit = require('twit');
//google sheets
const {GoogleSpreadsheet} = require('google-spreadsheet');

//instanciamos el objeto del documento
async function loadDoc(){
     const doc = new GoogleSpreadsheet('1_9MeTIxre5iDz6IJMmPBuiTKs9OWJJ5_iFAyltpVf5Y');
     await doc.useServiceAccountAuth(require('../bot-tw/client_secret.json'));
     await doc.loadInfo();
    
      const promesa = new Promise((resolve, reject) => {
      if (typeof doc != 'undefined') {
        resolve(doc);
      } else {
        reject('erroe en la carga del documento');
      }
    })
    return promesa;
}
//Carga la pagina del Documento 
async function loadSheet(doc,numberOfSheet){
  const sheet = doc.sheetsByIndex[numberOfSheet];
  const promesa = new Promise((resolve, reject) => {
    if (typeof sheet != 'undefined') {
      resolve(sheet);
    } else {
      reject('erroe en la carga de la hoja');
    }
  })
  return promesa;
}
//Carga las filas de la hoja
async function loadRows(sheet){
  const rows = await sheet.getRows();
  const promesa = new Promise((resolve , reject) => {
    if (typeof rows != 'undefined') {
      resolve(rows);
    } else {
      reject('erroe en la carga de las filas');
    }
  })
  return promesa;
}

//Conecta a la API de twitter
var twitterConfig = require('./twitterconfig');
var twitter = new Twit(twitterConfig);

//Logica
//var newRandomIndex = 0;
responderMensiones(120000); //cada 10 minutos

//**************************Funciones*************************

//recursivo
function responderMensiones(tiempo){
    intervalo(tiempo).then(() => {
        buscoTweets('@twitter_account').then( data => {
            responderTweets(data);
        })

        //loop infinito
        console.log('\n' + "----RESPONDIENDO MENCIONES----");
        responderMensiones(tiempo);
    })
}

//Funciones para el tiempo
async function intervalo(tiempo){
  await sleep(tiempo);
}

function sleep(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buscoTweets(busqueda) {

  const promesa = new Promise((resolve, reject) => {
    twitter.get('search/tweets', { q: busqueda }, function (err, data, response) {
      if (!err) {
        resolve(data);
      } else {
        reject(err);
      }
    })
  })
  return promesa;
}

async function responderTweets(tweets) {

  var gsIds = await traerIdsGS();

  for (let i = 0; i < tweets.statuses.length; i++) {

    if (tweets.statuses[i].user.screen_name === "@twitter_accunt"                                                              ) {
      console.log("Tweet propio");
      continue;
    }
    else if (gsIds.includes(tweets.statuses[i].id_str)) {
      console.log("Tweet [" + tweets.statuses[i].id_str + "] ya respondido");
      continue;
    }
    else {

      let tweet = {
        id: tweets.statuses[i].id_str,
        usuario: tweets.statuses[i].user.screen_name,
        creacion: tweets.statuses[i].created_at
      }

      let frases = await traerFrasesGS();
      let tw_frase = await generarFraseRandom(frases);
      let tweeteado = await tweetear(tweet.usuario, tw_frase, tweet.id);
      console.log(tweeteado);
      let faveado = await favearTweet(tweet.id);
      console.log(faveado);
      let fbase = await pushToGS(tweet.id);
      console.log(fbase);
    }

  }
}
//FUNCIONA
async function traerIdsGS(){

    var Ids = [];
    var doc = await loadDoc();
    var sheet = await loadSheet(doc,0);
    var rows = await loadRows(sheet);

    for(var row in rows){
      Ids.push(rows[row].id);
    }
   return Ids;
}
////FUNCIONA
async function traerFrasesGS(){
  var frases = [];
    var doc = await loadDoc();
    var sheet = await loadSheet(doc,1);
    var rows = await loadRows(sheet);

    for(var row in rows){
      frases.push(rows[row].frases);
    }
   return frases;
}
///FUNCIONA
function generarFraseRandom(quotes){
  const promesa = new Promise((resolve, reject) => {
    let quote;
    let numeroRandom = numeroAleatorio(0,(quotes.length -1));

    quote = quotes[numeroRandom];
      if (quote != undefined) {
        resolve(quote);
      }
      else {
        reject("Error obteniendo indices");
      }
  })

    return promesa;
}
//FUNCIONA
function numeroAleatorio(min, max) {
  return Math.round(Math.random() * (max - min) + min);
}

function tweetear(nombre, frase, id) {

  const promesa = new Promise(function (resolve, reject) {

    let respuesta;
    let tweetToTweet = "@" + nombre + " " + frase;

    var params = {
      status: tweetToTweet,
      in_reply_to_status_id: id
    };

    twitter.post('statuses/update', params, function (err, data, response) {
      if (err !== undefined) {
        reject('Error al tweetar ' + err);
      } else {
        respuesta = '-> 1 | TweetId: [' + id + "] Respondido con exito, respuesta: [" + tweetToTweet + "]";
        resolve(respuesta);
      }
    });
  });

  return promesa;
}

function favearTweet(id) {

  const promesa = new Promise((resolve, reject) => {
    twitter.post('favorites/create', { id: id }, (err, response) => {
      if (err) {
        reject(err);
      }
      else {
        resolve("-> 2 | TweetId: [" + id + "] faveado con éxito");
      }
    })
  })
  return promesa;
}

//FUNCIONA
async function pushToGS(idtweet){
  var doc = await loadDoc();
  var sheet = await loadSheet(doc,0);

  const promesa = new Promise((resolve,reject) => {
    sheet.addRow({ id: idtweet });
    
    if(idtweet != 0){
      resolve('Id guardado correctamente');
    }
    else{
      reject('No se pudo guardar correctamente el id');
    }
  })
  return promesa;
}
