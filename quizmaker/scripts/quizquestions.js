var questions = [
    {
        label: 'Which of the following is NOT an interpreted language?',
        options: ['JavaScript', 'Lisp', 'Go', 'Python'],
        answer: ['Go'],
        forceAnswer: true
    }, 
    {
        label: 'What is the result of the following Java function?<br/>public boolean canAdvance()<br>\u007B<br/>&nbsp;\tint val\u003B<br/>&nbsp;\treturn (val > 4) ? true : false\u003B<br/> \u007D<br/>',
        options: ['Compilation error', 'true', 'false'],
        answer: ['Compilation error']
    }, 
    {
        label: 'Which of the following reggae groups are NOT Jamaican?',
        options: ['Toots & The Maytels', 'UB40', 'Third World', 'Steel Pulse'],
        answer: [1, 3] // refers to the second and third option
    }, 
    {
        label: 'How many presidents have ruled Colombia?',
        options: ['44', '34', '32', '43'],
        answer: ['32']
    }, 
    {
        label: 'Which of the following countries does NOT share a maritime border with Colombia?',
        options: ['Nicaragua', 'Brazil', 'Jamaica'],
        answer: ['Brazil']
    }, 
    {
        label: 'In which country were the last summer olympics held?',
        options: ['Beijing', 'Athens', 'Sochi'],
        answer: ['Beijing']
    }
];

// EVENT HANDLERS
function showScore()
{
    var score = quizMaker.getScore();
    
    var el = new Element('div');
    el.set('html', '<b>Thank you for participating!</b><br>');
    $('result').adopt(el);
    
    var el = new Element('div');
    el.set('html', '<b>Score: ' + score.numCorrectAnswers + ' of ' + score.numQuestions + '</b><br>');
    $('result').adopt(el);
    
    if (score.incorrectAnswers.length > 0) {
        var el = new Element('div');
        el.set('html', '<b>Incorrect answers:</b>');
        $('result').adopt(el);
        
        for (var i = 0; i < score.incorrectAnswers.length; i++) {
            var incorrectAnswer = score.incorrectAnswers[i];
            var el = new Element('div');
            el.set('html', '<b>' + incorrectAnswer.questionNumber + ': ' + incorrectAnswer.label + '</b>');
            $('result').adopt(el);
            
            var el = new Element('div');
            el.set('html', 'Correct answer : ' + incorrectAnswer.correctAnswer);
            $('result').adopt(el);
            var el = new Element('div');
            el.set('html', 'Your answer : ' + incorrectAnswer.userAnswer);
            $('result').adopt(el);
        
        }
    }
}

function showAnswerAlert()
{
    $('error').set('html', 'You have to answer before you continue to the next question');
}

function clearErrorBox()
{
    $('error').set('html', '');
}


var quizMaker = new DG.QuizMaker({
    questions: questions,
    forceAnswer : true,
    el: 'questions',
    listeners: {
        'finish': showScore,
        'missinganswer': showAnswerAlert,
        'sendanswer': clearErrorBox
    }
});

quizMaker.start();