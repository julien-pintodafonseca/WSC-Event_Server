'use strict';

const express = require('express');
const router = express.Router();
const {User} = require('../schema');
const adduser = require('../util/adduser');
const testtoken = require('../util/testtoken');

/**
 * Permet à l'utilisateur de s'inscrire.
 * Paramètres :
 * prenom (String) : prénom de l'utilisateur
 * nom (String) : nom de l'utilisateur
 * email (String) : email (valide) de l'utilisateur
 * password (String) : password clair de l'utilisateur
 * phone (String) : numéro de téléphone de l'utilisateur.
 */
router.post('/signup', function(req, res) {
  if(!req.body.prenom || !req.body.nom || !req.body.email || !req.body.password || !req.body.phone) {
    res.status(400).json({
      code: 'invalid_request',
    });
  }
  else {
    adduser({prenom: req.body.prenom, nom: req.body.nom, email: req.body.email, password: req.body.password, phone: req.body.phone })
      .then((user) => {
        user.save()
          .then(async (user) => {
            res.status(200).json({
              code: 'success',
              token: await user.getToken(),
            });
          })
          .catch(err => {
            console.error(err);
            res.status(500).json({
              text: 'internal_error',
            });
          });
      }).catch((err) => {
        res.status(err.code).json({
          code: err.text,
        });
      });
  }
});

/**
 * Permet à l'utilisateur de se connecter.
 * Paramètres :
 * email (String) : adresse mail
 * password (String) : mot de passe en clair
 */
router.post('/signin', async (req, res) => {
  try {
    if(!req.body.email || !req.body.password) {
      res.status(400).json({code: 'invalid_request'});
      return;
    }
    else {
      const email = req.body.email;
      const password = req.body.password;
      const result = await User.findOne({
        email,
      }, '+password').exec();
      console.log(result);

      if(!result) {
        res.status(401).json({
          code: 'bad_credentials',
        });
      }
      else {
        // console.log(result.getToken());
        const goodPassword = await result.authenticate(password);
        if(!goodPassword) {
          res.status(401).json({
            code: 'bad_credentials',
          });
        }
        else {
          console.log('token');
          res.status(200).json({
            code: 'success',
            token: await result.getToken(),
          });
        }
      }
    }
  }
  catch(error) {
    console.error(error);
    res.status(500).json({
      code: 'internal_error',
    });
  }
});

/**
 * Permet d'obtenir les informations d'un utilisateur.
 * Paramètres :
 * token (String) : Token de l'utilisateur
 * id (ID sous forme de String) : Identifiant de l'utilisateur (facultatif, si non spécifié, retourne les infos de l'utilisateur connecté).
 * admin (Booléen) : Permet de dire si l'on souhaite davantage d'informations sur l'utilisateur. L'utilisateur dont on envoie le token doit alors ̂être admin (facultatif, faux par défaut).
 */
router.get('/get', (req, res) => {
  if(!req.query.token) {
    res.status(400).json({code: 'invalid_request'});
  }
  else {
    testtoken(req.query.token)
      .then(tokenData => {
        const autoMode = req.query.id ? false : true;
        const userid = autoMode ? tokenData.id : req.query.id;
        const adminInfos = req.query.admin;
        User.findById(tokenData.id).lean({virtuals: true}).exec((err, askingUser) => {
          if(err) {
            console.error(err);
            res.status(500).json({code: 'internal_error'});
          }
          else if(!askingUser) {
            res.status(403).json({code: 'invalid_token'});
          }
          else if(adminInfos && !askingUser.admin) {
            res.status(403).json({code: 'not_admin'});
          }
          else if(autoMode) {
            askingUser.avatar_url = askingUser.avatar;
            res.status(200).json({code: 'success', user: askingUser});
          }
          else {
            const projection = adminInfos ? '' : '-admin';
            User.findById(userid, projection).lean({virtuals: true}).exec((err, askedUser) => {
              if(err) {
                console.error(err);
                res.status(500).json({code: 'internal_error'});
              }
              else if(!askedUser) {
                res.status(404).json({code: 'user_not_found'});
              }
              else {
                if(!adminInfos) {
                  askedUser.email = undefined;
                }
                res.status(200).json({code: 'success', user: askedUser});
              }
            });
          }
        });
      })
      .catch(() => {
        res.status(403).json({code: 'invalid_token'});
      });
  }
});

module.exports = router;
