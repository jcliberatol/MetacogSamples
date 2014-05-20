/**
*   Quiz Widget Instrumentation
*   Philip Ragan
*   Last Modified: 2014-05-16
*/

// Sample student id
var studentId = "7ce0359f12857f2a90c7de465f40a95f01cb5da9";

// Sample session id
var sessionId = "4d28f694bd54591ed92a74d1f908f32be5f630de";

// Create a new instance of the metacog logger and initialize it with session variables
var logger = new MetaLogger.Logger({
	"widget": "DISC-01",
	"widgetVersion": "1.0.0",
	"session": {
		"publisher_id": '3ccf4767',
		"application_id": '07cb1ab87673db605dbfb1fe0dfc1eb1',
		"widget_id": 'DSC001',
		"learner_id": studentId,
		"session_id": sessionId
	},
	"verbose": true
});


console.log("Initialising Instrumentation configuration...");

// Adds a 'finish' event and respective listener to the quizmaker object. This event isfired at the end of the quiz
quizMaker.addEvent("finish", logUserScore);

// Adds the event 'sendanswer' and listener to the quizmaker object. This event is fired after each time a question is aswered
quizMaker.addEvent("sendanswer", logAnswerSent);

// Adds the 'correctanswer' event and respective listener to the quizmaker object. This event is fired after a question is answered correctly
quizMaker.addEvent("correctanswer", logCorrectAnswer);

// Adds the 'wronganwer' event and respective listener to the quizmaker object. This event is fired after a question is answered incorrectly
quizMaker.addEvent("wronganswer", logIncorrectAnswer);

// Adds a 'missinganswer' event and respective listener to the quizmaker object. This event is fired if no answer was selected before a question was submitted
quizMaker.addEvent("missinganswer", logMissingAnswer);

// Intercept all click events in the DOM and handle the event if the control is an input control
jQuery(document).ready(function()
{
	jQuery(document).on('click', ":input", function(e)
	{
		logAnswerClicked(e);
	});
});


/** 
  * @desc Generates a metacog log entry each time an answer is clicked
  * @param eventargs e - info about the clicked element 
  * @return void
*/  
function logAnswerClicked(e)
{
	if(!(e.target.type != "button")) { return; }
	console.log("Answer clicked");
	var currentquesno = ((quizMaker.internal.questionIndex) + 1);
	logger.logEvent('answerClicked', { question: (currentquesno), answer: e.target.defaultValue }, MetaLogger.EVENT_TYPE.UI);
}

/** 
  * @desc Generates a correct answer log entry
  * @return void
*/  
function logCorrectAnswer()
{
	if (quizMaker.internal.questionIndex >= quizMaker.internal.questions.length) { return; }
	console.log("Answer correct");
	var currentquesno = ((quizMaker.internal.questionIndex) + 1);
	logger.logEvent('correctanswer', { QuestionNo: currentquesno }, MetaLogger.EVENT_TYPE.MODEL);
}

/** 
  * @desc Generates an incorrect answer metacog log entry
  * @return void
*/  
function logIncorrectAnswer()
{
	console.log("Answer incorrect");
	var currentquesno = ((quizMaker.internal.questionIndex) + 1);
	logger.logEvent('incorrectanswer', { QuestionNo: currentquesno }, MetaLogger.EVENT_TYPE.MODEL);
}

/** 
  * @desc Generates a log entry in response to an answer being submitted
  * @return void
*/  
function logAnswerSent()
{
	var currentquesno = ((quizMaker.internal.questionIndex) + 1);
	console.log("Question " + currentquesno + ": Answer Sent");
	logger.logEvent('answersent', { QuestionNo: currentquesno }, MetaLogger.EVENT_TYPE.MODEL);
}

/** 
  * @desc Generates a metacog log entry in response to a missinganswer
  * @return void
*/  
function logMissingAnswer()
{
	console.log("Missing answer");
	var currentquesno = ((quizMaker.internal.questionIndex) + 1);
	logger.logEvent('missinganswer', { QuestionNo: currentquesno }, MetaLogger.EVENT_TYPE.MODEL);
}

function logUserScore()
{
	console.log("Score Generated.");
	var rslt = quizMaker.getScore();
	var incorrectans = (questions.length - rslt.numCorrectAnswers);
	logger.logEvent('getScore', { CorrectAnswers: rslt.numCorrectAnswers, IncorrectAnswers: incorrectans, Score: rslt.percentageCorrectAnswers }, MetaLogger.EVENT_TYPE.MODEL);
}

// Starts the metacog logger
logger.start();

console.log("Instrumentation configured.");