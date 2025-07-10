const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    problem: {
        type: String,
        required: true
    },
    answers: [{
        value: Number,
        isCorrect: Boolean
    }]
});

const Question = mongoose.model('Question', questionSchema);
module.exports = Question;

