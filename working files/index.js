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


async function handle() {
    const date = "2021-2-18"
    let speakOutput = await speakifyAiringAnimeOnDate(date);
    console.log(speakOutput);

    let speakOutput = await speakifyAiringAnimeOnDate(date);
    console.log(speakOutput);
}

handle();