const Alexa = require('ask-sdk-core');
const AmazonDateParser = require('amazon-date-parser');
const anilist = require('anilist-node');
const Anilist = new anilist(/*settings.token*/);

function getAnimeList(nameOrID) {
    return Anilist.lists.anime(nameOrID)
}

function getAnime(ID) {
    return Anilist.media.anime(ID)
}

function amazonifyDate(date) {
    // from https://stackoverflow.com/questions/3552461/how-to-format-a-javascript-date
    const ye = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(date);
    const mo = new Intl.DateTimeFormat('en', { month: 'numeric' }).format(date);
    const da = new Intl.DateTimeFormat('en', { day: 'numeric' }).format(date);
    return (`${ye}-${mo}-${da}`);
}

function stringifyDate(date) {
    // from https://stackoverflow.com/questions/3552461/how-to-format-a-javascript-date
    const ye = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(date);
    const mo = new Intl.DateTimeFormat('en', { month: 'long' }).format(date);
    const da = new Intl.DateTimeFormat('en', { day: 'numeric' }).format(date);
    return (`${mo} ${da}`);
    //return (`${da}-${mo}-${ye}`);
}

function stringifySeconds(seconds) {
    // from https://stackoverflow.com/questions/36098913/convert-seconds-to-days-hours-minutes-and-seconds
    var secs = parseInt(seconds, 10);
    var days = Math.floor(secs / (3600*24));
    secs  -= days*3600*24;
    var hrs   = Math.floor(secs / 3600);
    secs  -= hrs*3600;
    var mnts = Math.floor(secs / 60);
    secs  -= mnts*60;

    var returnStatement = "";
    var started = false;
    if (days !==0) {
        returnStatement += (days+" days");
        started = true;
    }
    if (hrs !== 0) {
        if (started) {
            returnStatement += ", ";
        }
        returnStatement += (hrs+" hrs");
        started = true;
    }
    if (mnts !== 0) {
        if (started) {
            returnStatement += ", ";
        }
        returnStatement += (mnts+" minutes");
        started = true;
    }
    /*
    if (secs != 0) {
        if (started) {
            returnStatement += ", and ";
        }
        returnStatement += (secs+" seconds");
    }*/
    return returnStatement
}

async function getAiringAnimeOnDate(date) {
        
    try {
        const startDate = new AmazonDateParser(date).startDate;
        const endDate = new AmazonDateParser(date).endDate;

        // userLists is an Array.<UserLists>
        // must be narrowed down to the current list
        let userLists = await getAnimeList("airinganime");

        const userListsLength = userLists.length;
        let currentList
        let i;
        for (i = 0; i < userListsLength; i++) {
            if (userLists[i].status === "CURRENT") {
                currentList = userLists[i].entries;
                break
            }
        }
            
        // currentList is an Array.<ListEntry>
        // each episode of each entry must be verified to be currently airing
        // by cross checking ListEntry objects against AnimeEntry objects
        // each AnimeEntry's list of episodes will be checked for matches against the submitted date
        // creates an array of literals in format: {anime: String, episode: String, date: Date(), timeUntil: Number (in seconds)}
        const currentListLength = userLists.length;
        let currentAiringEpisodesList = [];
        let promises = []; // list of promises to settle before proceeding
        for (i = 0; i < currentListLength; i++) {
            let currentAnime = await getAnime(currentList[i].media.id)
            const animeTitle = currentAnime.title.english/*userPreferred*/;
            const currentAnimeAiringSchedule = currentAnime.airingSchedule;
            const currentAnimeAiringScheduleLength = currentAnimeAiringSchedule.length;
            let j;
            for (j = 0; j < currentAnimeAiringScheduleLength; j++) {
                const episodeDate = new Date(currentAnimeAiringSchedule[j].airingAt * 1000);
                if (startDate <= episodeDate && episodeDate <= endDate) {
                    const episodeNumber = currentAnimeAiringSchedule[j].episode;
                    const timeUntil = currentAnimeAiringSchedule[j].timeUntilAiring;
                    currentAiringEpisodesList.push({anime: animeTitle, episode: episodeNumber, date: episodeDate, timeUntil: timeUntil});
                }
            }  
        }

        console.log("successfully retrieved airing anime");
        // array of literals in format: {anime: String, episode: String, date: Date(), timeUntil: Number (in seconds)}
        return currentAiringEpisodesList;
    
    } catch(err) {
        console.log("unable to retrieve airing anime");
        console.log(err.toString());
        return [];
    }
}

async function speakifyAiringAnimeOnDate(date) {
    let speakOutput = "";
    const currentAiringEpisodesList = await getAiringAnimeOnDate(date);
    let i;
    for (i = 0; i < currentAiringEpisodesList.length; i++) {
        const currentEpisode = currentAiringEpisodesList[i];
        speakOutput += (currentEpisode.anime + " episode " + currentEpisode.episode + " airs on " + stringifyDate(currentEpisode.date) + " in " + stringifySeconds(currentEpisode.timeUntil) + ".\n");
    }
    if (currentAiringEpisodesList.length === 0) {
        speakOutput = "You are not watching any anime airing on that day."
    }
    return speakOutput;
}


const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Welcome, you can ask me questions like. What is airing today?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const HelloWorldIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'HelloWorldIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Hello World!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};


const GetAiringScheduleIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetAiringScheduleIntent';
    },
    async handle(handlerInput) {
        const date = handlerInput.requestEnvelope.request.intent.slots.Date.value;
        let speakOutput = await speakifyAiringAnimeOnDate(date);
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};


const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        HelloWorldIntentHandler,
        GetAiringScheduleIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();