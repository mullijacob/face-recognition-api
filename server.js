const express = require('express');
const bcrypt = require('bcrypt-nodejs')
const cors = require('cors');
const knex = require('knex')({
	client: 'pg',
  	connection: {
    host : '127.0.0.1',
    user : 'postgres',
    password : 'Niara_254',
    database : 'facerecognitiondb'
  }
});
const clarifai = require('clarifai');

const appClarifai = new Clarifai.App({
  apiKey: 'db2cae8c4a7f4566a56aace7e6acd71c'
});
const app = express();
const PORT = process.env.PORT

app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.use(cors());

const apiCall = (req, res) => {
	appClarifai.models
    	.predict(Clarifai.FACE_DETECT_MODEL, req.body.input)
    	.then(data => {
    		res.json(data);
    	})
    	.catch(err => res.status(400).json('unable to work with api'))
}

app.get('/', (req, res) => {
	res.send('success');
})

app.post('/signin', (req, res) => {
	const { email, password } = req.body;
	if(!email || !password) {
		return res.status(400).json('Incorrect form submission');
	}
	knex.select('email', 'hash').from('login')
		.where('email', '=', email)
		.then(data => {
			const isValid = bcrypt.compareSync(password, data[0].hash);
			if(isValid) {
				return knex.select('*').from('users')
				.where('email', '=', email)
				.then(user => {
					res.json(user[0])
				})
				.catch(err => res.status(400).json('Unable to get user'))
			} else {
				res.status(400).json('wrong credentials')
			}

		})
	.catch(err => res.status(400).json('Wrong credentials'))
})

app.post('/register', (req, res) => {
	const { email, name, password } = req.body;
	if(!email || !name || !password) {
		return res.status(400).json('Incorrect form submission');
	}
	const hash = bcrypt.hashSync(password);
	knex.transaction(trx => {
		trx.insert({
			hash: hash,
			email: email
		})
		.into('login')
		.returning('email')
		.then(loginEmail => {
			return trx('users')
				.returning('*')
				.insert({
					email: loginEmail[0],
					name: name,
					joined: new Date()
				})
				.then(user => {
					res.json(user[0]);
				})
		})
		.then(trx.commit)
		.catch(trx.rollback)
	})
		
	.catch(err => res.status(400).json('Unable to register'))
})

app.get('/profile/:id', (req, res) => {
	const { id } = req.params;
	knex.select('*').from('users').where({ id })
		.then(user => {
			if(user.length) {
				res.json(user[0])
			} else {
				res.status(400).json('Not found')
			}
		})
		.catch(err => res.status(400).json('Error getting user'))
})

app.put('/image', (req, res) => {
	const { id } = req.body;
	knex ('users')
  		.where('id', '=', id)
  		.increment('entries', 1)
  		.returning('entries')
  		.then(entries => res.json(entries[0]))
  		.catch(err => res.status(400).json('unable to get entries'))
})

app.post('/imageurl', (req, res) => {
	apiCall(req, res);	
})

app.listen(PORT, () => {
	console.log(`app is running on Port ${PORT}`)
}) 