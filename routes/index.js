var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var twilioClient = require('twilio')('AC1cf26d4c223b99bbe05fc0e24fa2b97e', 'ad5dc75c7a4a51b2a68fe2ed8a7386eb');

var Todo = mongoose.model('Todo', {
	title: String,
	date: String,
	done: { type: Boolean, default: false }
});

var TwilioInfo = mongoose.model('TwilioInfo', {
    name: { type: String, default: "XCX" },
    tel: { type: String, default: "+14803300088" },
    push: { type: Boolean, default: false }
});

var twilioInfo = TwilioInfo.find(function(err, data) {
    if (err) { return next(err); }
});
/* GET home page. */

router.get('/', function(req, res, next) {
  	res.render('index', { title: "XCX's To-do List" });
});

router.get('/todos', function(req, res, next) {
	Todo.find(function(err, todos) {
		if (err) { return next(err); }
		res.json(todos);
	});
});

router.post('/todos', function(req, res, next) {
	var todo = new Todo(req.body);
	
	todo.save(function(err, todo) {
		if (err) { return next(err); }
		
		res.json(todo);
	});
});

router.put('/todos/:todo_id/switchStatus', function(req, res, next) {
    if (req.body.done) {
        TwilioInfo.find(function(err, info) {
            if (err) { return next(err); }           
            if (info.length && info[0].push) {                
                twilioClient.sendMessage({       
                    to: '+1' + info[0].tel, // Any number Twilio can deliver to
                    from: '+19073122267', // A number you bought from Twilio and can use for outbound communication
                    body: "Congratulations, " + info[0].name + "! Task Completed: " + req.body.date + " - " + req.body.title // body of the SMS message
                }, function(err, responseData) { //this function is executed when a response is received from Twilio
                    if (!err) { 
                        console.log(responseData.from); 
                        console.log(responseData.body); 
                    }
                });                
            }
        });
    }
    return Todo.findById(req.body._id, function(err, todo) {
        
		todo.done = req.body.done;
		return todo.save(function (err) {
			if (err) { return next(err); }
				
			res.json(todo);
		});
	});
});

router.put('/todos/:todo_id/editContent', function(req, res, next) {
	return Todo.findById(req.body._id, function(err, todo) {
		todo.title = req.body.title;
		return todo.save(function(err) {
			if (err) { return next(err); }
			
			res.json(todo);
		});
	});
});

router.delete('/todos/:todo_id', function(req, res, next) {
	Todo.remove({ _id: req.params.todo_id }, function(err) {
		if (err) { return next(err); }
		
		Todo.find(function(err, todos) {
			if (err) { return next(err); }
			res.json(todos);
		});		
	});
});

router.get('/twilio', function(req, res, next) {
	TwilioInfo.find(function(err, info) {
		if (err) { return next(err); }
		
		res.json(info);
	});
});

router.post('/twilio', function(req, res, next) {
    TwilioInfo.remove({}, function(err) {
        if (err) { return next(err); }
        
        info = new TwilioInfo(req.body);
        
        info.save(function(err, info) {
            if (err) { return next(err) }
            
            res.json(info);
        })
    })
});


module.exports = router;
