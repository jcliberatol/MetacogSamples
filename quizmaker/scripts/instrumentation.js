/**
*   Quiz Widget Instrumentation
*   Philip Ragan
*   Last Modified: 2014-04-30
*/

var studentId = "7ce0359f12857f2a90c7de465f40a95f01cb5da9";
var sessionId = "4d28f694bd54591ed92a74d1f908f32be5f630de";

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

var elapsedTime;
var timerId;

jQuery(document).ready(function()
{
	startTimer();

	jQuery(document).on('click', ":input", function(e)
	{
		logAnswerClicked(e);
	});
});


function resetTimer()
{
	elapsedTime = 0;
	stopTimer();
	startTimer();
}

function startTimer()
{
	elapsedTime = 0;
	timerId = setInterval(updateTimer, 1000);
}

function stopTimer()
{
	clearInterval(timerId);
}

function updateTimer()
{
	elapsedTime++;
}

function logAnswerClicked(e)
{
	if(!(e.target.type != "button")) { return; }
	console.log("Answer clicked");
	var currentquesno = ((quizMaker.internal.questionIndex) + 1);
	logger.logEvent('answerClicked', { question: (currentquesno), answer: e.target.defaultValue }, MetaLogger.EVENT_TYPE.UI);
}

function logCorrectAnswer()
{
	if (quizMaker.internal.questionIndex >= quizMaker.internal.questions.length) { return; }
	console.log("Answer correct");
	var currentquesno = ((quizMaker.internal.questionIndex) + 1);
	logger.logEvent('correctanswer', { QuestionNo: currentquesno, TotalTime : elapsedTime }, MetaLogger.EVENT_TYPE.MODEL);
}

function logIncorrectAnswer()
{
	console.log("Answer incorrect");
}

function logAnswerSent()
{
	resetTimer();
	console.log("Question " + quizMaker.internal.questionIndex + ": Answer Sent");
}

function logMissingAnswer()
{
	console.log("Missing answer");
}

function logUserScore()
{
	stopTimer();

	console.log("Score Generated.");
	var rslt = quizMaker.getScore();
	var incorrectans = (questions.length - rslt.numCorrectAnswers);
	logger.logEvent('getScore', { CorrectAnswers: rslt.numCorrectAnswers, IncorrectAnswers: incorrectans, Score: rslt.percentageCorrectAnswers }, MetaLogger.EVENT_TYPE.MODEL);
}


/**
* Instrumentation configuration 
*/
logger.configure_instrumentation("quizMaker", function ()
{
	console.log("Initialising Instrumentation configuration...");

	logger.start();

	// quizMaker.addEvent("correctanswer", logCorrectAnswer);
	// quizMaker.addEvent("wronganswer", logIncorrectAnswer);

	logger.logMethod(
	{
		targetMethodName:"_sendAnswer",
		postCallback: logAnswerSent,
		targetObject: quizMaker
	});

	// logger.logMethod(
	// {
	// 	targetMethodName:"_hasAnsweredCorrectly",
	// 	postCallback:logCorrectAnswer,
	// 	targetObject: quizMaker
	// });

	logger.logMethod(
	{
		targetMethodName:"showScore",
		postCallback:logUserScore
	});

	console.log("Instrumentation configured.");
});